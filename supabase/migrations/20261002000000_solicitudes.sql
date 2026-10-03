-- PiezaCerca · solicitudes y respuestas en vivo (semana 3, tarea 1)
-- Se ejecuta una sola vez en Supabase > SQL Editor. Si algo falla, no queda nada a medias.

begin;

-- "Voy para allá": la hora en que el cliente escogió esa tienda.
alter table public.solicitud_tiendas add column va_para_alla_en timestamptz;

-- ---------------------------------------------------------------------------
-- El cliente pregunta: crea la solicitud y la manda a las tiendas cercanas.
-- Las tiendas las escoge la base de datos (regla de 5 km / 10 km), no el celular.
-- Devuelve el id de la solicitud.
-- ---------------------------------------------------------------------------
create function public.enviar_solicitud(
  pieza bigint,
  cantidad integer,
  moto bigint,
  cliente_lat double precision,
  cliente_lng double precision
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  linea public.categoria_pieza;
  marca text;
  nueva uuid;
  enviadas integer;
begin
  if yo is null then
    raise exception 'Debes entrar con tu cuenta para preguntar.' using errcode = 'P0001', hint = 'sin_sesion';
  end if;
  if cantidad is null or cantidad < 1 or cantidad > 20 then
    raise exception 'La cantidad debe estar entre 1 y 20.' using errcode = 'P0001', hint = 'cantidad';
  end if;
  -- Contra el abuso: máximo 10 preguntas por hora por persona.
  if (select count(*) from public.solicitudes s
      where s.cliente_id = yo and s.creada_en > now() - interval '1 hour') >= 10 then
    raise exception 'Hiciste muchas preguntas seguidas. Espera un rato e inténtalo de nuevo.'
      using errcode = 'P0001', hint = 'limite';
  end if;

  select p.categoria into linea from public.piezas p where p.id = pieza;
  if linea is null then
    raise exception 'Esa pieza no existe.' using errcode = 'P0001', hint = 'pieza';
  end if;
  if moto is not null then
    select m.marca into marca from public.motos m where m.id = moto;
  end if;

  insert into public.solicitudes (cliente_id, moto_id, lat, lng)
  values (yo, moto, cliente_lat, cliente_lng)
  returning id into nueva;

  insert into public.solicitud_items (solicitud_id, pieza_id, cantidad)
  values (nueva, pieza, cantidad);

  insert into public.solicitud_tiendas (solicitud_id, tienda_id)
  select nueva, c.id
  from public.tiendas_cercanas(cliente_lat, cliente_lng, linea, marca) c
  where c.puede_preguntar;
  get diagnostics enviadas = row_count;

  if enviadas = 0 then
    raise exception 'Ninguna tienda confirmada cerca maneja esta pieza.' using errcode = 'P0001', hint = 'sin_tiendas';
  end if;

  return nueva;
end;
$$;

revoke execute on function public.enviar_solicitud(bigint, integer, bigint, double precision, double precision) from public, anon;
grant execute on function public.enviar_solicitud(bigint, integer, bigint, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- "Voy para allá": el cliente escoge una tienda que dijo "La tengo".
-- Solo una tienda escogida por solicitud (si cambia de opinión, se mueve).
-- ---------------------------------------------------------------------------
create function public.voy_para_alla(solicitud uuid, tienda uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_cliente_solicitud(solicitud) then
    raise exception 'Esta solicitud no es tuya.' using errcode = 'P0001', hint = 'ajena';
  end if;
  if not exists (
    select 1 from public.respuestas r
    where r.solicitud_id = solicitud and r.tienda_id = tienda and r.tiene
  ) then
    raise exception 'Esa tienda no dijo que tiene la pieza.' using errcode = 'P0001', hint = 'no_la_tiene';
  end if;

  update public.solicitud_tiendas st
  set va_para_alla_en = case when st.tienda_id = tienda then coalesce(st.va_para_alla_en, now()) end
  where st.solicitud_id = solicitud;
end;
$$;

revoke execute on function public.voy_para_alla(uuid, uuid) from public, anon;
grant execute on function public.voy_para_alla(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Al responder: se marca la hora y se recalcula el tiempo promedio de respuesta
-- de la tienda (últimas 50 respuestas). Las tiendas más rápidas salen primero.
-- ---------------------------------------------------------------------------
create or replace function public.marcar_respondida() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.solicitud_tiendas
  set respondida_en = now()
  where solicitud_id = new.solicitud_id
    and tienda_id = new.tienda_id
    and respondida_en is null;

  update public.tiendas t
  set tiempo_promedio_respuesta_seg = (
    select round(avg(extract(epoch from (ultimas.respondida_en - ultimas.enviada_en))))::integer
    from (
      select st.respondida_en, st.enviada_en
      from public.solicitud_tiendas st
      where st.tienda_id = new.tienda_id and st.respondida_en is not null
      order by st.respondida_en desc
      limit 50
    ) ultimas
  )
  where t.id = new.tienda_id;

  return new;
end;
$$;

-- Las tiendas responden con un toque: no se puede cambiar ni borrar una respuesta.
-- (Ya no hay permisos de update/delete en `respuestas`; esto lo deja explícito.)
revoke update, delete on public.respuestas from anon, authenticated;

-- Más rápidas primero: `tiendas_cercanas` ya devuelve el tiempo promedio; el orden final lo hace la app.

-- ---------------------------------------------------------------------------
-- En vivo: las tiendas reciben solicitudes y el cliente ve respuestas sin recargar.
-- (Supabase Realtime respeta los mismos candados RLS: cada quien solo recibe lo suyo.)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.solicitud_tiendas, public.respuestas;

commit;
