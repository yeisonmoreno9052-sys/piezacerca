-- PiezaCerca · activar tiendas con código y agregar empleados (semana 5, tarea 1)
-- Se ejecuta una sola vez en Supabase > SQL Editor. Si algo falla, no queda nada a medias.

begin;

-- Los códigos de activación vencen (30 días) para que uno viejo no quede servible para siempre.
alter table public.codigos_activacion add column expira_en timestamptz not null default now() + interval '30 days';

-- Códigos para que el dueño agregue empleados (de un solo uso, vencen en 48 horas).
create table public.codigos_empleado (
  codigo      text primary key,
  tienda_id   uuid not null references public.tiendas (id) on delete cascade,
  creado_por  uuid not null references public.perfiles (id) on delete cascade,
  creado_en   timestamptz not null default now(),
  expira_en   timestamptz not null default now() + interval '48 hours',
  usado_por   uuid references public.perfiles (id) on delete set null,
  usado_en    timestamptz
);
alter table public.codigos_empleado enable row level security;
create policy "admin ve" on public.codigos_empleado for select using (public.es_admin());

-- Intentos de usar un código: máximo 10 por hora por persona, para que nadie los adivine probando.
create table public.intentos_codigo (
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  en          timestamptz not null default now()
);
create index on public.intentos_codigo (usuario_id, en);
alter table public.intentos_codigo enable row level security;

-- Código legible: 6 letras/números sin los que se confunden (0, O, 1, I, L).
create function public.codigo_al_azar(prefijo text) returns text
language sql volatile set search_path = '' as $$
  select prefijo || '-' || string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::integer, 1), '')
  from generate_series(1, 6);
$$;

-- ---------------------------------------------------------------------------
-- Administrador: genera (o regenera) el código de activación de una tienda.
-- ---------------------------------------------------------------------------
create function public.generar_codigo_activacion(tienda uuid)
returns table (codigo text, expira_en timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  nuevo text;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede generar códigos.' using errcode = 'P0001', hint = 'no_admin';
  end if;
  if not exists (select 1 from public.tiendas t where t.id = tienda) then
    raise exception 'Esa tienda no existe.' using errcode = 'P0001', hint = 'tienda';
  end if;
  loop
    nuevo := public.codigo_al_azar('PC');
    exit when not exists (select 1 from public.codigos_activacion c where c.codigo = nuevo);
  end loop;
  delete from public.codigos_activacion c where c.tienda_id = tienda;
  return query
    insert into public.codigos_activacion (tienda_id, codigo)
    values (tienda, nuevo)
    returning codigos_activacion.codigo, codigos_activacion.expira_en;
end;
$$;
revoke execute on function public.generar_codigo_activacion(uuid) from public, anon;
grant execute on function public.generar_codigo_activacion(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Dueño de una tienda: genera un código para agregar a un empleado.
-- ---------------------------------------------------------------------------
create function public.generar_codigo_empleado()
returns table (codigo text, expira_en timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  mi_tienda uuid;
  nuevo text;
begin
  select ut.tienda_id into mi_tienda
  from public.usuarios_tienda ut
  where ut.usuario_id = auth.uid() and ut.rol = 'dueno'
  limit 1;
  if mi_tienda is null then
    raise exception 'Solo el dueño de la tienda puede agregar empleados.' using errcode = 'P0001', hint = 'no_dueno';
  end if;
  if (select count(*) from public.codigos_empleado c
      where c.tienda_id = mi_tienda and c.creado_en > now() - interval '1 day') >= 10 then
    raise exception 'Ya generaste muchos códigos hoy. Inténtalo mañana.' using errcode = 'P0001', hint = 'limite';
  end if;
  loop
    nuevo := public.codigo_al_azar('EM');
    exit when not exists (select 1 from public.codigos_empleado c where c.codigo = nuevo);
  end loop;
  return query
    insert into public.codigos_empleado (codigo, tienda_id, creado_por)
    values (nuevo, mi_tienda, auth.uid())
    returning codigos_empleado.codigo, codigos_empleado.expira_en;
end;
$$;
revoke execute on function public.generar_codigo_empleado() from public, anon;
grant execute on function public.generar_codigo_empleado() to authenticated;

-- ---------------------------------------------------------------------------
-- Cualquier persona con cuenta: usa un código.
--   PC-xxxxxx → activa la tienda y queda como DUEÑA.
--   EM-xxxxxx → queda como EMPLEADA de la tienda del dueño que lo generó.
-- Devuelve el nombre de la tienda y el rol (ninguna fila = el código no sirve).
-- ---------------------------------------------------------------------------
create function public.usar_codigo(codigo text)
returns table (tienda text, rol public.rol_tienda)
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  limpio text := upper(regexp_replace(coalesce(codigo, ''), '\s', '', 'g'));
  la_tienda uuid;
begin
  if yo is null then
    raise exception 'Debes entrar con tu cuenta.' using errcode = 'P0001', hint = 'sin_sesion';
  end if;
  if (select count(*) from public.intentos_codigo i where i.usuario_id = yo and i.en > now() - interval '1 hour') >= 10 then
    raise exception 'Hiciste muchos intentos. Espera una hora e inténtalo de nuevo.' using errcode = 'P0001', hint = 'limite';
  end if;
  insert into public.intentos_codigo (usuario_id) values (yo);

  -- Código de activación (dueño)
  select c.tienda_id into la_tienda
  from public.codigos_activacion c
  where c.codigo = limpio and c.usado_en is null and c.expira_en > now();
  if la_tienda is not null then
    update public.codigos_activacion c set usado_en = now() where c.codigo = limpio;
    update public.tiendas t set estado = 'activa' where t.id = la_tienda;
    insert into public.usuarios_tienda (usuario_id, tienda_id, rol)
    values (yo, la_tienda, 'dueno')
    on conflict (usuario_id, tienda_id) do update set rol = 'dueno';
    return query select t.nombre, 'dueno'::public.rol_tienda from public.tiendas t where t.id = la_tienda;
    return;
  end if;

  -- Código de empleado
  select c.tienda_id into la_tienda
  from public.codigos_empleado c
  where c.codigo = limpio and c.usado_en is null and c.expira_en > now();
  if la_tienda is not null then
    update public.codigos_empleado c set usado_en = now(), usado_por = yo where c.codigo = limpio;
    insert into public.usuarios_tienda (usuario_id, tienda_id, rol)
    values (yo, la_tienda, 'empleado')
    on conflict (usuario_id, tienda_id) do nothing;
    return query select t.nombre, 'empleado'::public.rol_tienda from public.tiendas t where t.id = la_tienda;
    return;
  end if;

  -- Código que no sirve: no se devuelve ninguna fila (sin error, para que el intento quede contado
  -- y funcione el límite de 10 por hora). La app muestra "Ese código no sirve".
  return;
end;
$$;
revoke execute on function public.usar_codigo(text) from public, anon;
grant execute on function public.usar_codigo(text) to authenticated;

-- ---------------------------------------------------------------------------
-- El equipo de mi tienda (nombre y rol), y quitar a un empleado (solo el dueño).
-- ---------------------------------------------------------------------------
create function public.mi_equipo()
returns table (usuario_id uuid, nombre text, rol public.rol_tienda, soy_yo boolean)
language sql stable security definer set search_path = '' as $$
  select ut.usuario_id, coalesce(p.nombre, 'Sin nombre'), ut.rol, ut.usuario_id = auth.uid()
  from public.usuarios_tienda ut
  join public.perfiles p on p.id = ut.usuario_id
  where ut.tienda_id = (select x.tienda_id from public.usuarios_tienda x where x.usuario_id = auth.uid() limit 1)
  order by ut.rol, p.nombre;
$$;
revoke execute on function public.mi_equipo() from public, anon;
grant execute on function public.mi_equipo() to authenticated;

create function public.quitar_empleado(usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  mi_tienda uuid;
begin
  select ut.tienda_id into mi_tienda
  from public.usuarios_tienda ut
  where ut.usuario_id = auth.uid() and ut.rol = 'dueno'
  limit 1;
  if mi_tienda is null then
    raise exception 'Solo el dueño puede quitar empleados.' using errcode = 'P0001', hint = 'no_dueno';
  end if;
  delete from public.usuarios_tienda ut
  where ut.tienda_id = mi_tienda and ut.usuario_id = usuario and ut.rol = 'empleado';
end;
$$;
revoke execute on function public.quitar_empleado(uuid) from public, anon;
grant execute on function public.quitar_empleado(uuid) to authenticated;

commit;
