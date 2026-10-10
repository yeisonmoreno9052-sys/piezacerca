-- PiezaCerca · mejoras antes del piloto (aprobadas por el dueño el 2026-10-10):
--   1. "Estoy cerrado": la tienda deja de recibir preguntas mientras está cerrada.
--   2. Privacidad: la tienda ve a qué distancia está el cliente, nunca su punto exacto.
--   3. Búsquedas sin resultado: se guardan para saber qué piezas y motos faltan.
--   4. Números para el administrador (pestaña "Números" en /admin).
-- Aplicado el 2026-10-10 desde Claude con el conector de Supabase (en 4 partes). No volver a ejecutar.

begin;

-- ---------------------------------------------------------------------------
-- 1. "Estoy cerrado"
-- ---------------------------------------------------------------------------

-- Vacío = abierta. Con fecha = cerrada desde esa hora (el administrador ve desde cuándo).
alter table public.tiendas add column cerrada_desde timestamptz;

-- Cualquier usuario de la tienda (dueño o empleado) la cierra o la abre; el administrador también.
create function public.cambiar_cerrada(tienda uuid, cerrada boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.es_miembro_tienda(tienda) or public.es_admin()) then
    raise exception 'No eres de esta tienda.' using errcode = 'P0001', hint = 'ajena';
  end if;
  update public.tiendas t
  set cerrada_desde = case when cerrada then coalesce(t.cerrada_desde, now()) end
  where t.id = tienda;
end;
$$;

revoke execute on function public.cambiar_cerrada(uuid, boolean) from public, anon;
grant execute on function public.cambiar_cerrada(uuid, boolean) to authenticated;

-- `tiendas_cercanas` ahora dice si la tienda está cerrada; una tienda cerrada sale en la lista
-- pero no se le puede preguntar. Cambia lo que devuelve, por eso la anterior se renombra
-- (`tiendas_cercanas_anterior`, ya no se usa) y se crea de nuevo.
alter function public.tiendas_cercanas(double precision, double precision, public.categoria_pieza, text)
  rename to tiendas_cercanas_anterior;

create function public.tiendas_cercanas(
  cliente_lat double precision,
  cliente_lng double precision,
  linea public.categoria_pieza,
  marca_moto text default null
)
returns table (
  id uuid, nombre text, direccion text, lat double precision, lng double precision,
  estado public.estado_tienda, distancia_m integer, puede_preguntar boolean,
  tiempo_promedio_respuesta_seg integer, radio_km integer, cerrada boolean
)
language sql stable set search_path = '' as $$
  with candidatas as (
    select t.id, t.nombre, t.direccion, t.lat, t.lng, t.estado, t.tiempo_promedio_respuesta_seg,
      t.cerrada_desde is not null as cerrada,
      public.distancia_m(cliente_lat, cliente_lng, t.lat, t.lng) as metros,
      exists (
        select 1 from public.tienda_categorias tc
        where tc.tienda_id = t.id and tc.categoria = linea
      )
      and (
        marca_moto is null
        or exists (
          select 1 from public.tienda_marcas tm
          where tm.tienda_id = t.id
            and (tm.marca = 'Todas' or public.normalizar(tm.marca) = public.normalizar(marca_moto))
        )
      ) as maneja
    from public.tiendas t
  ),
  radio as (
    -- Regla de 5 km / 10 km: cuentan solo las tiendas a las que hoy sí se les puede preguntar.
    select case
      when exists (
        select 1 from candidatas where estado = 'activa' and maneja and not cerrada and metros <= 5000
      ) then 5000
      else 10000
    end as metros
  )
  select c.id, c.nombre, c.direccion, c.lat, c.lng, c.estado,
    round(c.metros)::integer,
    (c.estado = 'activa' and c.maneja and not c.cerrada),
    c.tiempo_promedio_respuesta_seg,
    (r.metros / 1000)::integer,
    c.cerrada
  from candidatas c, radio r
  where c.metros <= r.metros
    and c.maneja
  order by (c.estado = 'activa') desc, c.metros
  limit 30
$$;

-- ---------------------------------------------------------------------------
-- 2. Privacidad: la distancia se guarda al enviar; nadie lee el punto exacto del cliente.
-- ---------------------------------------------------------------------------

alter table public.solicitud_tiendas add column metros integer;

-- Las solicitudes que ya existen.
update public.solicitud_tiendas st
set metros = round(public.distancia_m(s.lat, s.lng, t.lat, t.lng))::integer
from public.solicitudes s, public.tiendas t
where s.id = st.solicitud_id and t.id = st.tienda_id;

-- Igual que antes (20261005000000_listas.sql), pero guarda la distancia de cada tienda.
create or replace function public.enviar_solicitud_lista(
  items jsonb,
  moto bigint,
  cliente_lat double precision,
  cliente_lng double precision
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  marca text;
  nueva uuid;
  total integer;
  enviadas integer;
begin
  if yo is null then
    raise exception 'Debes entrar con tu cuenta para preguntar.' using errcode = 'P0001', hint = 'sin_sesion';
  end if;
  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'La lista no es válida.' using errcode = 'P0001', hint = 'lista';
  end if;
  total := jsonb_array_length(items);
  if total < 1 or total > 15 then
    raise exception 'La lista debe tener entre 1 y 15 piezas.' using errcode = 'P0001', hint = 'lista_tamano';
  end if;
  if exists (
    select 1 from jsonb_array_elements(items) e
    where (e ->> 'cantidad')::integer is null
       or (e ->> 'cantidad')::integer not between 1 and 20
  ) then
    raise exception 'Cada cantidad debe estar entre 1 y 20.' using errcode = 'P0001', hint = 'cantidad';
  end if;
  if (select count(distinct (e ->> 'pieza')::bigint) from jsonb_array_elements(items) e) <> total
     or (select count(*) from public.piezas p
         where p.id in (select (e ->> 'pieza')::bigint from jsonb_array_elements(items) e)) <> total then
    raise exception 'Hay piezas repetidas o que no existen en la lista.' using errcode = 'P0001', hint = 'pieza';
  end if;
  -- Contra el abuso: máximo 10 preguntas por hora por persona.
  if (select count(*) from public.solicitudes s
      where s.cliente_id = yo and s.creada_en > now() - interval '1 hour') >= 10 then
    raise exception 'Hiciste muchas preguntas seguidas. Espera un rato e inténtalo de nuevo.'
      using errcode = 'P0001', hint = 'limite';
  end if;

  if moto is not null then
    select m.marca into marca from public.motos m where m.id = moto;
  end if;

  insert into public.solicitudes (cliente_id, moto_id, lat, lng)
  values (yo, moto, cliente_lat, cliente_lng)
  returning id into nueva;

  insert into public.solicitud_items (solicitud_id, pieza_id, cantidad)
  select nueva, (e ->> 'pieza')::bigint, (e ->> 'cantidad')::integer
  from jsonb_array_elements(items) with ordinality as x(e, n)
  order by x.n;

  insert into public.solicitud_tiendas (solicitud_id, tienda_id, metros)
  select nueva, c.id, min(c.distancia_m)
  from (
    select distinct p.categoria
    from public.piezas p
    where p.id in (select (e ->> 'pieza')::bigint from jsonb_array_elements(items) e)
  ) lineas
  cross join lateral public.tiendas_cercanas(cliente_lat, cliente_lng, lineas.categoria, marca) c
  where c.puede_preguntar
  group by c.id;
  get diagnostics enviadas = row_count;

  if enviadas = 0 then
    raise exception 'Ninguna tienda confirmada cerca maneja estas piezas.' using errcode = 'P0001', hint = 'sin_tiendas';
  end if;

  return nueva;
end;
$$;

-- Nadie lee el punto exacto del cliente desde la app (ni el mismo cliente: no lo necesita).
-- Las funciones de la base de datos (avisos, envío) sí lo usan por dentro.
revoke select on public.solicitudes from anon, authenticated;
grant select (id, cliente_id, moto_id, creada_en, vence_en) on public.solicitudes to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Búsquedas sin resultado (piezas o motos que la gente busca y no están cargadas).
-- Solo el administrador las ve. No se guarda quién buscó.
-- ---------------------------------------------------------------------------

create table public.busquedas_sin_resultado (
  id         bigint generated always as identity primary key,
  tipo       text not null check (tipo in ('pieza', 'moto')),
  texto      text not null check (length(texto) between 2 and 80),
  creada_en  timestamptz not null default now()
);

create index on public.busquedas_sin_resultado (creada_en);

alter table public.busquedas_sin_resultado enable row level security;
create policy "admin ve" on public.busquedas_sin_resultado for select using (public.es_admin());

-- La app la llama cuando alguien busca algo y no aparece nada. Funciona sin cuenta.
-- Si el mismo texto ya se anotó en los últimos 2 minutos, no se repite.
create function public.anotar_busqueda_sin_resultado(p_tipo text, p_texto text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  limpio text := left(lower(regexp_replace(trim(coalesce(p_texto, '')), '\s+', ' ', 'g')), 80);
begin
  if p_tipo is null or p_tipo not in ('pieza', 'moto') or length(limpio) < 2 then
    return;
  end if;
  if exists (
    select 1 from public.busquedas_sin_resultado b
    where b.tipo = p_tipo and b.texto = limpio and b.creada_en > now() - interval '2 minutes'
  ) then
    return;
  end if;
  insert into public.busquedas_sin_resultado (tipo, texto) values (p_tipo, limpio);
end;
$$;

revoke execute on function public.anotar_busqueda_sin_resultado(text, text) from public;
grant execute on function public.anotar_busqueda_sin_resultado(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Números para el administrador: los últimos N días (hora de Colombia).
-- ---------------------------------------------------------------------------

create function public.numeros_admin(dias integer default 7) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  desde timestamptz := now() - make_interval(days => greatest(1, least(dias, 365)));
  resultado jsonb;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador.' using errcode = 'P0001', hint = 'admin';
  end if;

  with s as (
    select * from public.solicitudes where creada_en >= desde
  ),
  st as (
    select st.*, s.vence_en
    from public.solicitud_tiendas st join s on s.id = st.solicitud_id
  ),
  por_pregunta as (
    select s.id, s.cliente_id,
      (select min(extract(epoch from (x.respondida_en - x.enviada_en)))
       from st x where x.solicitud_id = s.id and x.respondida_en is not null) as primera_seg,
      exists (select 1 from public.respuestas r where r.solicitud_id = s.id and r.tiene) as alguien_la_tiene,
      exists (select 1 from st x where x.solicitud_id = s.id and x.va_para_alla_en is not null) as voy
    from s
  )
  select jsonb_build_object(
    'dias', greatest(1, least(dias, 365)),
    'totales', (
      select jsonb_build_object(
        'preguntas', count(*),
        'clientes', count(distinct cliente_id),
        'con_respuesta', count(*) filter (where primera_seg is not null),
        'alguien_la_tiene', count(*) filter (where alguien_la_tiene),
        'voy_para_alla', count(*) filter (where voy),
        'primera_respuesta_mediana_seg',
          round(percentile_cont(0.5) within group (order by primera_seg))::integer
      )
      from por_pregunta
    ),
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('dia', dia, 'preguntas', n) order by dia)
      from (
        select (creada_en at time zone 'America/Bogota')::date as dia, count(*) as n
        from s group by 1
      ) d
    ), '[]'::jsonb),
    'por_tienda', coalesce((
      select jsonb_agg(fila order by (fila ->> 'recibidas')::integer desc, fila ->> 'nombre')
      from (
        select jsonb_build_object(
          'nombre', t.nombre,
          'estado', t.estado,
          'cerrada_desde', t.cerrada_desde,
          'recibidas', count(st.solicitud_id),
          'respondidas', count(st.respondida_en),
          'no_respondio', count(*) filter (where st.solicitud_id is not null
                                             and st.respondida_en is null and st.vence_en < now()),
          'promedio_seg', round(avg(extract(epoch from (st.respondida_en - st.enviada_en))))::integer,
          'voy_para_alla', count(st.va_para_alla_en)
        ) as fila
        from public.tiendas t
        left join st on st.tienda_id = t.id
        group by t.id
        having t.estado = 'activa' or count(st.solicitud_id) > 0
      ) f
    ), '[]'::jsonb),
    'sin_resultado', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', tipo, 'texto', texto, 'veces', n) order by n desc, texto)
      from (
        select b.tipo, b.texto, count(*) as n
        from public.busquedas_sin_resultado b
        where b.creada_en >= desde
        group by b.tipo, b.texto
        order by count(*) desc, b.texto
        limit 40
      ) b
    ), '[]'::jsonb)
  ) into resultado;

  return resultado;
end;
$$;

revoke execute on function public.numeros_admin(integer) from public, anon;
grant execute on function public.numeros_admin(integer) to authenticated;

commit;
