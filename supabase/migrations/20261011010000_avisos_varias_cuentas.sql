-- PiezaCerca · un mismo celular puede recibir avisos de varias cuentas
-- Antes, cada celular quedaba amarrado a UNA cuenta. Si el celular ya tenía avisos como tienda y luego se
-- usaba como cliente, el botón decía "activadas" pero los avisos del cliente no llegaban.
-- Ahora la suscripción es por (cuenta, celular): el mismo celular recibe los avisos de cada cuenta que los activó.

begin;

alter table public.push_suscripciones drop constraint push_suscripciones_endpoint_key;
alter table public.push_suscripciones
  add constraint push_suscripciones_usuario_endpoint_key unique (usuario_id, endpoint);

-- Guardar el celular actual para la cuenta actual (si ya estaba, solo se actualizan las llaves).
create or replace function public.guardar_suscripcion_push(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Debes entrar con tu cuenta.' using errcode = 'P0001', hint = 'sin_sesion';
  end if;
  if length(p_endpoint) > 1000 or p_endpoint !~ '^https://' then
    raise exception 'Suscripción no válida.' using errcode = 'P0001', hint = 'suscripcion';
  end if;
  insert into public.push_suscripciones (usuario_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (usuario_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

commit;
