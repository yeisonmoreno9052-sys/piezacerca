-- PiezaCerca · aviso al cliente cuando una tienda responde
-- Se ejecuta una sola vez en Supabase > SQL Editor. Si algo falla, no queda nada a medias.
-- Usa la misma ruta /api/push y la misma clave secreta de los avisos a tiendas (no hay que configurar nada más).

begin;

-- Cuando una tienda responde (se llena solicitud_tiendas.respondida_en), la base de datos le pide a la app
-- que avise a los celulares del cliente que preguntó. El precio solo viaja a los celulares de ese cliente.
-- La tienda guarda todas sus respuestas de una vez, así que aquí ya están todas.
-- Si algo falla aquí, la respuesta igual se guarda (el aviso nunca bloquea).
create function public.avisar_cliente_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  url text;
  secreto text;
  suscripciones jsonb;
  tienda text;
  pedidas integer;
  tiene_n integer;
  total bigint;
  pieza text;
  precio integer;
  titulo text;
  cuerpo text;
begin
  if old.respondida_en is not null or new.respondida_en is null then
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
    join public.solicitudes s on s.cliente_id = ps.usuario_id
    where s.id = new.solicitud_id;
    if suscripciones is null then
      return new;
    end if;

    select t.nombre into tienda from public.tiendas t where t.id = new.tienda_id;
    select count(*) into pedidas from public.solicitud_items si where si.solicitud_id = new.solicitud_id;

    select count(*) filter (where r.tiene),
           sum(r.precio::bigint * si.cantidad) filter (where r.tiene)
    into tiene_n, total
    from public.respuestas r
    join public.solicitud_items si on si.id = r.item_id
    where r.solicitud_id = new.solicitud_id and r.tienda_id = new.tienda_id;

    if pedidas <= 1 then
      select p.nombre, r.precio into pieza, precio
      from public.solicitud_items si
      join public.piezas p on p.id = si.pieza_id
      left join public.respuestas r on r.item_id = si.id and r.tienda_id = new.tienda_id
      where si.solicitud_id = new.solicitud_id
      limit 1;
      if tiene_n > 0 then
        titulo := coalesce(tienda, 'Una tienda') || ' la tiene';
        cuerpo := coalesce(pieza, 'Pieza')
                  || case when precio is not null
                          then ': $ ' || replace(to_char(precio, 'FM999G999G999'), ',', '.') || ' c/u'
                          else '' end
                  || '. Toca para verla.';
      else
        titulo := coalesce(tienda, 'Una tienda') || ' respondió';
        cuerpo := 'No tiene ' || coalesce(lower(pieza), 'la pieza') || '. Mira si otra tienda la tiene.';
      end if;
    else
      if tiene_n > 0 then
        titulo := coalesce(tienda, 'Una tienda') || ' tiene ' || tiene_n || ' de ' || pedidas;
        cuerpo := case when total is not null
                       then 'Total $ ' || replace(to_char(total, 'FM999G999G999'), ',', '.') || '. '
                       else '' end
                  || 'Toca para ver tu lista.';
      else
        titulo := coalesce(tienda, 'Una tienda') || ' respondió';
        cuerpo := 'No tiene ninguna pieza de tu lista. Mira las otras tiendas.';
      end if;
    end if;

    perform net.http_post(
      url := url,
      body := jsonb_build_object(
        'tipo', 'respuesta',
        'titulo', titulo,
        'cuerpo', cuerpo,
        'etiqueta', 'resp:' || new.solicitud_id || ':' || new.tienda_id,
        'url', '/solicitud/' || new.solicitud_id,
        'suscripciones', suscripciones
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secreto', secreto),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'avisar_cliente_push: %', sqlerrm;
  end;

  return new;
end;
$$;

create trigger al_responder_tienda
  after update of respondida_en on public.solicitud_tiendas
  for each row execute function public.avisar_cliente_push();

commit;
