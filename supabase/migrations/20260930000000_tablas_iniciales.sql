-- PiezaCerca · tablas iniciales (diseño aprobado el 2026-09-30, ver CLAUDE.md > Datos)
-- Se ejecuta una sola vez en Supabase > SQL Editor. Si algo falla, no queda nada a medias.

begin;

-- Extensiones para el buscador (palabras parecidas y sin tildes). Se usan en la semana 2.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.categoria_pieza as enum ('frenos', 'luces', 'arrastre', 'electrico', 'motor', 'otros');
create type public.estado_tienda   as enum ('sin_confirmar', 'activa');
create type public.rol_tienda      as enum ('dueno', 'empleado');

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
create table public.motos (
  id          bigint generated always as identity primary key,
  marca       text not null,
  modelo      text not null,
  cilindraje  integer not null check (cilindraje > 0),
  anio_desde  integer not null,
  anio_hasta  integer,
  check (anio_hasta is null or anio_hasta >= anio_desde),
  unique (marca, modelo, cilindraje, anio_desde)
);

create table public.piezas (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  categoria  public.categoria_pieza not null,
  sinonimos  text[] not null default '{}'
);

create table public.compatibilidades (
  pieza_id  bigint not null references public.piezas (id) on delete cascade,
  moto_id   bigint not null references public.motos (id) on delete cascade,
  primary key (pieza_id, moto_id)
);

-- ---------------------------------------------------------------------------
-- Personas
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text,
  es_admin   boolean not null default false,
  moto_id    bigint references public.motos (id) on delete set null,  -- "mi moto"
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tiendas
-- ---------------------------------------------------------------------------
create table public.tiendas (
  id                             uuid primary key default gen_random_uuid(),
  nombre                         text not null,
  direccion                      text not null,
  lat                            double precision not null,
  lng                            double precision not null,
  estado                         public.estado_tienda not null default 'sin_confirmar',
  tiempo_promedio_respuesta_seg  integer,
  creada_en                      timestamptz not null default now()
);

create table public.tienda_contacto (
  tienda_id  uuid primary key references public.tiendas (id) on delete cascade,
  whatsapp   text not null
);

create table public.tienda_categorias (
  tienda_id  uuid not null references public.tiendas (id) on delete cascade,
  categoria  public.categoria_pieza not null,
  primary key (tienda_id, categoria)
);

create table public.tienda_marcas (
  tienda_id  uuid not null references public.tiendas (id) on delete cascade,
  marca      text not null,  -- marca de moto, igual que motos.marca
  primary key (tienda_id, marca)
);

create table public.codigos_activacion (
  tienda_id  uuid primary key references public.tiendas (id) on delete cascade,
  codigo     text not null unique,
  creado_en  timestamptz not null default now(),
  usado_en   timestamptz
);

create table public.usuarios_tienda (
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  tienda_id   uuid not null references public.tiendas (id) on delete cascade,
  rol         public.rol_tienda not null default 'empleado',
  primary key (usuario_id, tienda_id)
);

-- ---------------------------------------------------------------------------
-- Solicitudes y respuestas
-- ---------------------------------------------------------------------------
create table public.solicitudes (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  moto_id     bigint references public.motos (id) on delete set null,
  lat         double precision not null,
  lng         double precision not null,
  creada_en   timestamptz not null default now(),
  vence_en    timestamptz not null default now() + interval '10 minutes'
);

create table public.solicitud_items (
  id            bigint generated always as identity primary key,
  solicitud_id  uuid not null references public.solicitudes (id) on delete cascade,
  pieza_id      bigint not null references public.piezas (id),
  cantidad      integer not null default 1 check (cantidad > 0)
);

create table public.solicitud_tiendas (
  solicitud_id   uuid not null references public.solicitudes (id) on delete cascade,
  tienda_id      uuid not null references public.tiendas (id) on delete cascade,
  enviada_en     timestamptz not null default now(),
  respondida_en  timestamptz,  -- vacío y vencida = "no respondió"
  primary key (solicitud_id, tienda_id)
);

create table public.respuestas (
  solicitud_id    uuid not null,
  tienda_id       uuid not null,
  item_id         bigint not null references public.solicitud_items (id) on delete cascade,
  tiene           boolean not null,
  precio          integer,  -- pesos colombianos, sin decimales
  respondido_por  uuid default auth.uid() references public.perfiles (id) on delete set null,
  respondida_en   timestamptz not null default now(),
  primary key (tienda_id, item_id),
  foreign key (solicitud_id, tienda_id)
    references public.solicitud_tiendas (solicitud_id, tienda_id) on delete cascade,
  check ((tiene and precio is not null and precio >= 0) or (not tiene and precio is null))
);

create table public.listas_guardadas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  nombre      text not null,
  moto_id     bigint references public.motos (id) on delete set null,
  creada_en   timestamptz not null default now()
);

create table public.lista_items (
  lista_id  uuid not null references public.listas_guardadas (id) on delete cascade,
  pieza_id  bigint not null references public.piezas (id) on delete cascade,
  cantidad  integer not null default 1 check (cantidad > 0),
  primary key (lista_id, pieza_id)
);

-- Índices para las consultas más comunes
create index on public.compatibilidades (moto_id);
create index on public.usuarios_tienda (tienda_id);
create index on public.solicitudes (cliente_id);
create index on public.solicitud_items (solicitud_id);
create index on public.solicitud_tiendas (tienda_id);
create index on public.respuestas (solicitud_id, tienda_id);
create index on public.listas_guardadas (cliente_id);

-- ---------------------------------------------------------------------------
-- Funciones de ayuda para los permisos
-- (security definer: consultan sin pasar por los candados, para evitar ciclos)
-- ---------------------------------------------------------------------------
create function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.es_admin from public.perfiles p where p.id = auth.uid()), false);
$$;

create function public.es_miembro_tienda(p_tienda uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios_tienda ut
    where ut.tienda_id = p_tienda and ut.usuario_id = auth.uid()
  );
$$;

create function public.es_cliente_solicitud(p_solicitud uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.solicitudes s
    where s.id = p_solicitud and s.cliente_id = auth.uid()
  );
$$;

create function public.tienda_recibio_solicitud(p_solicitud uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.solicitud_tiendas st
    join public.usuarios_tienda ut on ut.tienda_id = st.tienda_id
    where st.solicitud_id = p_solicitud and ut.usuario_id = auth.uid()
  );
$$;

create function public.es_cliente_lista(p_lista uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listas_guardadas l
    where l.id = p_lista and l.cliente_id = auth.uid()
  );
$$;

-- La tienda puede responder si: es de esa tienda, la solicitud le llegó, no ha vencido
-- y el ítem pertenece a esa solicitud.
create function public.puede_responder(p_solicitud uuid, p_tienda uuid, p_item bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_miembro_tienda(p_tienda)
    and exists (
      select 1
      from public.solicitud_tiendas st
      join public.solicitudes s on s.id = st.solicitud_id
      join public.solicitud_items si on si.solicitud_id = s.id
      where st.solicitud_id = p_solicitud
        and st.tienda_id = p_tienda
        and si.id = p_item
        and s.vence_en > now()
    );
$$;

-- ---------------------------------------------------------------------------
-- Automatismos
-- ---------------------------------------------------------------------------

-- Al registrarse alguien, se le crea su perfil.
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- La hora y el vencimiento de una solicitud los fija la base de datos, no el celular.
create function public.fijar_vencimiento() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.creada_en := now();
  new.vence_en := now() + interval '10 minutes';
  return new;
end;
$$;

create trigger al_crear_solicitud
  before insert on public.solicitudes
  for each row execute function public.fijar_vencimiento();

-- Cuando una tienda responde, se marca la hora de respuesta.
create function public.marcar_respondida() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.solicitud_tiendas
  set respondida_en = now()
  where solicitud_id = new.solicitud_id
    and tienda_id = new.tienda_id
    and respondida_en is null;
  return new;
end;
$$;

create trigger al_responder
  after insert on public.respuestas
  for each row execute function public.marcar_respondida();

-- ---------------------------------------------------------------------------
-- Candados (Row Level Security)
-- ---------------------------------------------------------------------------
alter table public.motos              enable row level security;
alter table public.piezas             enable row level security;
alter table public.compatibilidades   enable row level security;
alter table public.perfiles           enable row level security;
alter table public.tiendas            enable row level security;
alter table public.tienda_contacto    enable row level security;
alter table public.tienda_categorias  enable row level security;
alter table public.tienda_marcas      enable row level security;
alter table public.codigos_activacion enable row level security;
alter table public.usuarios_tienda    enable row level security;
alter table public.solicitudes        enable row level security;
alter table public.solicitud_items    enable row level security;
alter table public.solicitud_tiendas  enable row level security;
alter table public.respuestas         enable row level security;
alter table public.listas_guardadas   enable row level security;
alter table public.lista_items        enable row level security;

-- Catálogo: todos lo ven, solo el administrador lo cambia.
create policy "catalogo publico" on public.motos            for select using (true);
create policy "catalogo publico" on public.piezas           for select using (true);
create policy "catalogo publico" on public.compatibilidades for select using (true);
create policy "admin edita" on public.motos            for all using (public.es_admin()) with check (public.es_admin());
create policy "admin edita" on public.piezas           for all using (public.es_admin()) with check (public.es_admin());
create policy "admin edita" on public.compatibilidades for all using (public.es_admin()) with check (public.es_admin());

-- Perfiles: cada uno ve y edita el suyo (solo nombre y "mi moto"); el admin ve todos.
create policy "ver mi perfil" on public.perfiles for select
  using (id = (select auth.uid()) or public.es_admin());
create policy "editar mi perfil" on public.perfiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "admin edita" on public.perfiles for all
  using (public.es_admin()) with check (public.es_admin());
revoke update on public.perfiles from anon, authenticated;
grant update (nombre, moto_id) on public.perfiles to authenticated;

-- Tiendas: datos básicos públicos; solo el administrador las crea o cambia.
create policy "tiendas publicas" on public.tiendas           for select using (true);
create policy "tiendas publicas" on public.tienda_categorias for select using (true);
create policy "tiendas publicas" on public.tienda_marcas     for select using (true);
create policy "admin edita" on public.tiendas           for all using (public.es_admin()) with check (public.es_admin());
create policy "admin edita" on public.tienda_categorias for all using (public.es_admin()) with check (public.es_admin());
create policy "admin edita" on public.tienda_marcas     for all using (public.es_admin()) with check (public.es_admin());

-- WhatsApp: visible solo si la tienda está activa (o para su propia gente y el admin).
create policy "whatsapp de tiendas activas" on public.tienda_contacto for select
  using (
    exists (select 1 from public.tiendas t where t.id = tienda_id and t.estado = 'activa')
    or public.es_miembro_tienda(tienda_id)
    or public.es_admin()
  );
create policy "admin edita" on public.tienda_contacto for all
  using (public.es_admin()) with check (public.es_admin());

-- Códigos de activación: solo el administrador.
create policy "solo admin" on public.codigos_activacion for all
  using (public.es_admin()) with check (public.es_admin());

-- Usuarios de tienda: cada uno ve sus tiendas y compañeros; el admin asigna.
create policy "ver mi tienda" on public.usuarios_tienda for select
  using (usuario_id = (select auth.uid()) or public.es_miembro_tienda(tienda_id) or public.es_admin());
create policy "admin edita" on public.usuarios_tienda for all
  using (public.es_admin()) with check (public.es_admin());

-- Solicitudes: las ve quien preguntó, las tiendas a las que les llegó y el admin.
create policy "ver solicitud" on public.solicitudes for select
  using (cliente_id = (select auth.uid()) or public.tienda_recibio_solicitud(id) or public.es_admin());
create policy "crear mi solicitud" on public.solicitudes for insert to authenticated
  with check (cliente_id = (select auth.uid()));

create policy "ver items" on public.solicitud_items for select
  using (public.es_cliente_solicitud(solicitud_id) or public.tienda_recibio_solicitud(solicitud_id) or public.es_admin());
create policy "agregar items a mi solicitud" on public.solicitud_items for insert to authenticated
  with check (public.es_cliente_solicitud(solicitud_id));

-- A qué tiendas llegó: el envío lo hará una función del servidor (semana 3), no el celular.
create policy "ver envios" on public.solicitud_tiendas for select
  using (public.es_cliente_solicitud(solicitud_id) or public.es_miembro_tienda(tienda_id) or public.es_admin());

-- Respuestas y precios: solo el cliente que preguntó, la tienda que respondió y el admin.
create policy "ver respuestas" on public.respuestas for select
  using (public.es_cliente_solicitud(solicitud_id) or public.es_miembro_tienda(tienda_id) or public.es_admin());
create policy "tienda responde" on public.respuestas for insert to authenticated
  with check (
    respondido_por = (select auth.uid())
    and public.puede_responder(solicitud_id, tienda_id, item_id)
  );

-- Listas guardadas: solo su dueño.
create policy "mis listas" on public.listas_guardadas for all
  using (cliente_id = (select auth.uid())) with check (cliente_id = (select auth.uid()));
create policy "items de mis listas" on public.lista_items for all
  using (public.es_cliente_lista(lista_id)) with check (public.es_cliente_lista(lista_id));

commit;
