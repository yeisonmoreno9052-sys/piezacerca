-- PiezaCerca · notificaciones push a las tiendas (semana 4)
-- Se ejecuta una sola vez en Supabase > SQL Editor. Si algo falla, no queda nada a medias.
-- Después hay que correr el archivo SECRETO .secretos/configurar-push.sql (no está en GitHub).

begin;

-- pg_net: deja que la base de datos llame a la app (https://piezacerca.vercel.app/api/push).
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Configuración privada (dirección del aviso y clave secreta compartida con la app).
-- Con RLS y sin permisos: nadie la puede leer desde la app, solo las funciones de la base de datos.
-- ---------------------------------------------------------------------------
create table public.configuracion_privada (
  clave  text primary key,
  valor  text not null
);
alter table public.configuracion_privada enable row level security;
revoke all on public.configuracion_privada from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Celulares/PCs de cada usuario que activaron las notificaciones.
-- ---------------------------------------------------------------------------
create table public.push_suscripciones (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  creada_en   timestamptz not null default now()
);
create index on public.push_suscripciones (usuario_id);
alter table public.push_suscripciones enable row level security;
create policy "mis suscripciones" on public.push_suscripciones for select
  using (usuario_id = (select auth.uid()));
create policy "borrar mis suscripciones" on public.push_suscripciones for delete
  using (usuario_id = (select auth.uid()));

-- Guardar el celular actual (si ese celular ya estaba con otra cuenta, pasa a esta).
create function public.guardar_suscripcion_push(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Debes entrar con tu cuenta.' using errcode = 'P0001', hint = 'sin_sesion';
  end if;
  if length(p_endpoint) > 1000 or p_endpoint !~ '^https://' then
    raise exception 'Suscripción no válida.' using errcode = 'P0001', hint = 'suscripcion';
  end if;
  delete from public.push_suscripciones s where s.endpoint = p_endpoint;
  insert into public.push_suscripciones (usuario_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth);
end;
$$;
revoke execute on function public.guardar_suscripcion_push(text, text, text) from public, anon;
grant execute on function public.guardar_suscripcion_push(text, text, text) to authenticated;

-- La app avisa cuando un celular ya no existe (desinstalaron o quitaron el permiso). Pide la clave secreta.
create function public.borrar_suscripcion_push(p_endpoint text, p_secreto text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_secreto is distinct from (select c.valor from public.configuracion_privada c where c.clave = 'push_secreto') then
    raise exception 'No autorizado.' using errcode = 'P0001';
  end if;
  delete from public.push_suscripciones s where s.endpoint = p_endpoint;
end;
$$;
revoke execute on function public.borrar_suscripcion_push(text, text) from public;
grant execute on function public.borrar_suscripcion_push(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- El aviso: cuando a una tienda le llega una solicitud, o un cliente toca "Voy para allá",
-- la base de datos le pide a la app que mande la notificación a los celulares de esa tienda.
-- Si algo falla aquí, la solicitud igual se guarda (el aviso nunca bloquea).
-- ---------------------------------------------------------------------------
create function public.avisar_tienda_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tipo text;
  url text;
  secreto text;
  suscripciones jsonb;
  piezas integer;
  que text;
  moto text;
  metros double precision;
  distancia text;
begin
  if tg_op = 'INSERT' then
    tipo := 'nueva';
  elsif new.va_para_alla_en is not null and old.va_para_alla_en is null then
    tipo := 'va';
  else
    return new;
  end if;

  begin
    select c.valor into url from public.configuracion_privada c where c.clave = 'push_url';
    select c.valor into secreto from public.configuracion_privada c where c.clave = 'push_secreto';
    if url is null or secreto is null then
      return new;
    end if;

    select jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth))
    into suscripciones
    from public.push_suscripciones ps
    join public.usuarios_tienda ut on ut.usuario_id = ps.usuario_id
    where ut.tienda_id = new.tienda_id;
    if suscripciones is null then
      return new;
    end if;

    select count(*) into piezas from public.solicitud_items si where si.solicitud_id = new.solicitud_id;
    if piezas > 1 then
      que := 'Lista de ' || piezas || ' piezas';
    else
      select p.nombre || case when si.cantidad > 1 then ' × ' || si.cantidad else '' end
      into que
      from public.solicitud_items si join public.piezas p on p.id = si.pieza_id
      where si.solicitud_id = new.solicitud_id
      limit 1;
    end if;

    select m.marca || ' ' || m.modelo || ' ' || m.cilindraje,
           public.distancia_m(t.lat, t.lng, s.lat, s.lng)
    into moto, metros
    from public.solicitudes s
    join public.tiendas t on t.id = new.tienda_id
    left join public.motos m on m.id = s.moto_id
    where s.id = new.solicitud_id;

    distancia := case
      when metros < 1000 then (greatest(50, round(metros / 50) * 50))::integer || ' m'
      else replace(to_char(metros / 1000, 'FM990.0'), '.', ',') || ' km'
    end;

    perform net.http_post(
      url := url,
      body := jsonb_build_object(
        'tipo', tipo,
        'titulo', case when tipo = 'nueva' then 'Nueva solicitud' else 'El cliente va para allá: apártala' end,
        'cuerpo', coalesce(que, 'Pieza') || ' · ' || coalesce(moto, 'cualquier moto')
                  || case when tipo = 'nueva' then ' · cliente a ' || distancia else '' end,
        'etiqueta', tipo || ':' || new.solicitud_id,
        'url', '/tienda',
        'suscripciones', suscripciones
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secreto', secreto),
      timeout_milliseconds := 5000
    );
  exception when others then
    -- El aviso es un extra: nunca debe impedir que la solicitud llegue.
    raise warning 'avisar_tienda_push: %', sqlerrm;
  end;

  return new;
end;
$$;

create trigger al_llegar_o_ir_para_alla
  after insert or update of va_para_alla_en on public.solicitud_tiendas
  for each row execute function public.avisar_tienda_push();

commit;
