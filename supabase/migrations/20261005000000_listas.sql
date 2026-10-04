-- PiezaCerca · lista de varias piezas (semana 4, tarea 1)
-- Se ejecuta una sola vez en Supabase > SQL Editor. Si algo falla, no queda nada a medias.

begin;

-- ---------------------------------------------------------------------------
-- Paquetes ya armados ("Mantenimiento básico", "Frenos"…). Los ve todo el mundo;
-- solo el administrador los cambia.
-- ---------------------------------------------------------------------------
create table public.paquetes (
  id      bigint generated always as identity primary key,
  nombre  text not null unique,
  orden   integer not null default 0
);

create table public.paquete_items (
  paquete_id  bigint not null references public.paquetes (id) on delete cascade,
  pieza_id    bigint not null references public.piezas (id) on delete cascade,
  cantidad    integer not null default 1 check (cantidad between 1 and 20),
  primary key (paquete_id, pieza_id)
);

alter table public.paquetes enable row level security;
alter table public.paquete_items enable row level security;
create policy "paquetes publicos" on public.paquetes for select using (true);
create policy "paquetes publicos" on public.paquete_items for select using (true);
create policy "admin edita" on public.paquetes for all using (public.es_admin()) with check (public.es_admin());
create policy "admin edita" on public.paquete_items for all using (public.es_admin()) with check (public.es_admin());

-- Los 4 paquetes aprobados (2026-10-05). Si alguna pieza fue renombrada en el panel, se salta.
insert into public.paquetes (nombre, orden) values
  ('Mantenimiento básico', 1), ('Frenos', 2), ('Arrastre completo', 3), ('Bombillos', 4);

insert into public.paquete_items (paquete_id, pieza_id)
select pq.id, p.id
from (values
  ('Mantenimiento básico', 'Aceite de motor'),
  ('Mantenimiento básico', 'Filtro de aceite'),
  ('Mantenimiento básico', 'Bujía'),
  ('Mantenimiento básico', 'Filtro de aire'),
  ('Frenos', 'Pastillas de freno delanteras'),
  ('Frenos', 'Bandas de freno'),
  ('Frenos', 'Líquido de frenos'),
  ('Arrastre completo', 'Kit de arrastre'),
  ('Arrastre completo', 'Cauchos de la corona'),
  ('Arrastre completo', 'Guía de cadena'),
  ('Bombillos', 'Bombillo de farola'),
  ('Bombillos', 'Bombillo de stop'),
  ('Bombillos', 'Bombillo de direccional')
) as v(paquete, pieza)
join public.paquetes pq on pq.nombre = v.paquete
join public.piezas p on p.nombre = v.pieza;

-- ---------------------------------------------------------------------------
-- Preguntar una LISTA: items = [{"pieza": 12, "cantidad": 2}, ...] (de 1 a 15 piezas, sin repetir).
-- Le llega a las tiendas activas cercanas que manejan AL MENOS UNA de las piezas.
-- ---------------------------------------------------------------------------
create function public.enviar_solicitud_lista(
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

  insert into public.solicitud_tiendas (solicitud_id, tienda_id)
  select distinct nueva, c.id
  from (
    select distinct p.categoria
    from public.piezas p
    where p.id in (select (e ->> 'pieza')::bigint from jsonb_array_elements(items) e)
  ) lineas
  cross join lateral public.tiendas_cercanas(cliente_lat, cliente_lng, lineas.categoria, marca) c
  where c.puede_preguntar;
  get diagnostics enviadas = row_count;

  if enviadas = 0 then
    raise exception 'Ninguna tienda confirmada cerca maneja estas piezas.' using errcode = 'P0001', hint = 'sin_tiendas';
  end if;

  return nueva;
end;
$$;

revoke execute on function public.enviar_solicitud_lista(jsonb, bigint, double precision, double precision) from public, anon;
grant execute on function public.enviar_solicitud_lista(jsonb, bigint, double precision, double precision) to authenticated;

-- Preguntar UNA pieza es una lista de 1 (CLAUDE.md): un solo camino para las dos cosas.
create or replace function public.enviar_solicitud(
  pieza bigint,
  cantidad integer,
  moto bigint,
  cliente_lat double precision,
  cliente_lng double precision
) returns uuid
language sql security definer set search_path = '' as $$
  select public.enviar_solicitud_lista(
    jsonb_build_array(jsonb_build_object('pieza', pieza, 'cantidad', cantidad)),
    moto, cliente_lat, cliente_lng
  );
$$;

-- "Mis listas": el cliente guarda listas para reutilizarlas (tablas creadas en la semana 1).
-- Una lista guardada tiene como máximo 15 piezas.
create function public.limitar_lista() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.lista_items where lista_id = new.lista_id) >= 15 then
    raise exception 'Una lista puede tener máximo 15 piezas.' using errcode = 'P0001', hint = 'lista_tamano';
  end if;
  return new;
end;
$$;

create trigger al_agregar_a_lista
  before insert on public.lista_items
  for each row execute function public.limitar_lista();

commit;
