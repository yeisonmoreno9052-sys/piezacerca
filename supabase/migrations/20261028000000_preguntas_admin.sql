-- PiezaCerca · el administrador ve cada pregunta y recibe un aviso cuando alguien pregunta
-- Se ejecuta una sola vez en Supabase > SQL Editor. Si algo falla, no queda nada a medias.
-- Usa la misma ruta /api/push y la misma clave secreta de los otros avisos (no hay que configurar nada más).

begin;

-- ---------------------------------------------------------------------------
-- 1. "Últimas preguntas" (pestaña Preguntas del panel): qué se preguntó, para qué moto,
-- a qué tiendas llegó y qué respondió cada una. Solo responde al administrador.
-- No trae quién preguntó, ni dónde está, ni los precios (regla 1: el precio solo lo ve el cliente).
-- ---------------------------------------------------------------------------
create function public.ultimas_preguntas_admin(limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce((select p.es_admin from public.perfiles p where p.id = auth.uid()), false) then
    raise exception 'Solo el administrador.' using errcode = 'P0001', hint = 'admin';
  end if;

  return coalesce((
    select jsonb_agg(fila order by fila ->> 'creada_en' desc)
    from (
      select jsonb_build_object(
        'id', s.id,
        'creada_en', s.creada_en,
        'vencida', s.vence_en < now(),
        'hace_min', floor(extract(epoch from (now() - s.creada_en)) / 60)::integer,
        'moto', case when m.id is null then null else m.marca || ' ' || m.modelo || ' ' || m.cilindraje end,
        'piezas', (
          select coalesce(jsonb_agg(jsonb_build_object('nombre', p.nombre, 'cantidad', si.cantidad) order by si.id), '[]'::jsonb)
          from public.solicitud_items si join public.piezas p on p.id = si.pieza_id
          where si.solicitud_id = s.id
        ),
        'tiendas', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'nombre', t.nombre,
            'metros', st.metros,
            'respondida_en', st.respondida_en,
            'segundos', extract(epoch from (st.respondida_en - st.enviada_en))::integer,
            'tiene', (select count(*) from public.respuestas r
                      where r.solicitud_id = s.id and r.tienda_id = st.tienda_id and r.tiene),
            'va_para_alla', st.va_para_alla_en is not null
          ) order by st.respondida_en nulls last, t.nombre), '[]'::jsonb)
          from public.solicitud_tiendas st join public.tiendas t on t.id = st.tienda_id
          where st.solicitud_id = s.id
        )
      ) as fila
      from public.solicitudes s
      left join public.motos m on m.id = s.moto_id
      order by s.creada_en desc
      limit greatest(1, least(limite, 200))
    ) ultimas
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.ultimas_preguntas_admin(integer) from public, anon;
grant execute on function public.ultimas_preguntas_admin(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Aviso al administrador: cuando una pregunta llega a las tiendas, la base de datos le pide a la app
-- que avise a los celulares de los administradores ("Nueva pregunta: Farola · Honda CB 110 · a 3 tiendas").
-- Se dispara UNA vez por pregunta (al guardar de una vez todas sus tiendas), no una vez por tienda.
-- Si algo falla aquí, la pregunta igual llega a las tiendas (el aviso nunca bloquea).
-- ---------------------------------------------------------------------------
create function public.avisar_admin_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  url text;
  secreto text;
  suscripciones jsonb;
  pregunta record;
  piezas integer;
  que text;
  moto text;
begin
  begin
    select c.valor into url from public.configuracion_privada c where c.clave = 'push_url';
    select c.valor into secreto from public.configuracion_privada c where c.clave = 'push_secreto';
    if url is null or secreto is null then
      return null;
    end if;

    select jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth))
    into suscripciones
    from public.push_suscripciones ps
    join public.perfiles p on p.id = ps.usuario_id
    where p.es_admin;
    if suscripciones is null then
      return null;
    end if;

    for pregunta in
      select n.solicitud_id, count(*) as tiendas from nuevas n group by n.solicitud_id
    loop
      select count(*) into piezas from public.solicitud_items si where si.solicitud_id = pregunta.solicitud_id;
      if piezas > 1 then
        que := 'lista de ' || piezas || ' piezas';
      else
        select p.nombre || case when si.cantidad > 1 then ' × ' || si.cantidad else '' end
        into que
        from public.solicitud_items si join public.piezas p on p.id = si.pieza_id
        where si.solicitud_id = pregunta.solicitud_id
        limit 1;
      end if;
      select m.marca || ' ' || m.modelo || ' ' || m.cilindraje into moto
      from public.solicitudes s join public.motos m on m.id = s.moto_id
      where s.id = pregunta.solicitud_id;

      perform net.http_post(
        url := url,
        body := jsonb_build_object(
          'tipo', 'admin',
          'titulo', 'Nueva pregunta: ' || coalesce(que, 'pieza'),
          'cuerpo', coalesce(moto, 'Cualquier moto') || ' · a ' || pregunta.tiendas
                    || case when pregunta.tiendas = 1 then ' tienda' else ' tiendas' end,
          'etiqueta', 'admin:' || pregunta.solicitud_id,
          'url', '/admin/preguntas',
          'suscripciones', suscripciones
        ),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secreto', secreto),
        timeout_milliseconds := 5000
      );
    end loop;
  exception when others then
    raise warning 'avisar_admin_push: %', sqlerrm;
  end;

  return null;
end;
$$;

create trigger al_preguntar_avisar_admin
  after insert on public.solicitud_tiendas
  referencing new table as nuevas
  for each statement execute function public.avisar_admin_push();

commit;
