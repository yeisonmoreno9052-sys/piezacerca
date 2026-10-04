-- PiezaCerca · "¿Quién tiene todo?": ir a DOS tiendas (semana 4, tarea 2)
-- Se ejecuta una sola vez en Supabase > SQL Editor.

-- "Voy a las dos": el cliente escoge la combinación sugerida y a las dos tiendas les llega
-- el aviso de apartar. Cada una tiene que haber dicho "La tengo" en al menos una pieza.
create function public.voy_a_las_dos(solicitud uuid, tienda_a uuid, tienda_b uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_cliente_solicitud(solicitud) then
    raise exception 'Esta solicitud no es tuya.' using errcode = 'P0001', hint = 'ajena';
  end if;
  if tienda_a = tienda_b then
    raise exception 'Escoge dos tiendas distintas.' using errcode = 'P0001', hint = 'misma_tienda';
  end if;
  if (select count(distinct r.tienda_id) from public.respuestas r
      where r.solicitud_id = solicitud and r.tienda_id in (tienda_a, tienda_b) and r.tiene) <> 2 then
    raise exception 'Las dos tiendas deben tener alguna de las piezas.' using errcode = 'P0001', hint = 'no_la_tiene';
  end if;

  update public.solicitud_tiendas st
  set va_para_alla_en = case
    when st.tienda_id in (tienda_a, tienda_b) then coalesce(st.va_para_alla_en, now())
  end
  where st.solicitud_id = solicitud;
end;
$$;

revoke execute on function public.voy_a_las_dos(uuid, uuid, uuid) from public, anon;
grant execute on function public.voy_a_las_dos(uuid, uuid, uuid) to authenticated;
