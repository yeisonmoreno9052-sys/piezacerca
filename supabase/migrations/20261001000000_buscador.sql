-- PiezaCerca · buscador de piezas y motos, y tiendas cercanas (semana 2, tarea 1)
-- Se ejecuta una sola vez en Supabase > SQL Editor. Si algo falla, no queda nada a medias.

begin;

-- Texto en minúsculas y sin tildes, para comparar "Farola" con "farola" y "Bujía" con "bujia".
create function public.normalizar(texto text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(texto, '')));
$$;

-- Qué tanto se parece lo que escribió el cliente a un nombre (0 = nada, 1 = igual).
-- Se mide en las dos direcciones y se promedia: así "farola" prefiere "Farola" antes que
-- "Bombillo de farola", y "pastillas traseras" prefiere las traseras antes que las delanteras.
-- Sirve con palabras de más ("farola nkd"), errores de escritura ("farla", "pastiyas")
-- y búsquedas a medio escribir ("pastil").
create function public.parecido(consulta text, nombre text) returns real
language sql immutable parallel safe set search_path = '' as $$
  select greatest(
    (extensions.word_similarity(public.normalizar(nombre), public.normalizar(consulta))
     + extensions.word_similarity(public.normalizar(consulta), public.normalizar(nombre))) / 2,
    case
      when length(public.normalizar(consulta)) >= 3
       and public.normalizar(nombre) like public.normalizar(consulta) || '%'
      then 0.9 else 0
    end
  )::real;
$$;

-- Piezas que se parecen a lo que escribió el cliente, buscando en el nombre y en los "otros nombres",
-- de la más parecida a la menos. `coincidencia` dice por cuál nombre la encontró ("faro" → Farola).
create function public.sugerir_piezas(consulta text, limite integer default 8)
returns table (id bigint, nombre text, categoria public.categoria_pieza, coincidencia text, puntaje real)
language sql stable set search_path = '' as $$
  select * from (
    select distinct on (p.id)
      p.id, p.nombre, p.categoria, t.termino as coincidencia,
      public.parecido(consulta, t.termino) as puntaje
    from public.piezas p
    cross join lateral unnest(array[p.nombre] || p.sinonimos) as t(termino)
    where length(trim(consulta)) >= 2
    order by p.id, public.parecido(consulta, t.termino) desc, (t.termino = p.nombre) desc
  ) mejores
  where mejores.puntaje >= 0.4
  order by mejores.puntaje desc, mejores.nombre
  limit greatest(1, least(limite, 20));
$$;

-- Motos que se parecen a lo que escribió el cliente ("nkd", "pulsar ns", "dr150", "pulsar 200").
-- Si escribió el cilindraje ("200"), las motos con ese cilindraje suben en la lista.
create function public.sugerir_motos(consulta text, limite integer default 5)
returns table (id bigint, marca text, modelo text, cilindraje integer, puntaje real)
language sql stable set search_path = '' as $$
  select candidatas.id, candidatas.marca, candidatas.modelo, candidatas.cilindraje,
    least(1, candidatas.base + candidatas.bono)::real
  from (
    select m.id, m.marca, m.modelo, m.cilindraje,
      greatest(
        public.parecido(consulta, m.modelo),
        public.parecido(consulta, m.modelo || ' ' || m.cilindraje),
        public.parecido(consulta, m.marca || ' ' || m.modelo || ' ' || m.cilindraje),
        -- "dr150" igual que "DR 150"
        public.parecido(replace(consulta, ' ', ''), replace(m.modelo || m.cilindraje, ' ', ''))
      ) as base,
      case when consulta ~ ('(^|[^0-9])' || m.cilindraje || '([^0-9]|$)') then 0.2 else 0 end as bono
    from public.motos m
    where length(trim(consulta)) >= 2
  ) candidatas
  where candidatas.base >= 0.5
  order by candidatas.base + candidatas.bono desc, candidatas.marca, candidatas.modelo, candidatas.cilindraje
  limit greatest(1, least(limite, 20));
$$;

-- Distancia en metros entre dos puntos (fórmula de haversine).
create function public.distancia_m(lat1 double precision, lng1 double precision,
                                   lat2 double precision, lng2 double precision)
returns double precision
language sql immutable parallel safe set search_path = '' as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Tiendas cercanas para una pieza (por su categoría) y una moto (por su marca).
-- Regla (CLAUDE.md): tiendas a 5 km o menos; si ninguna activa maneja la pieza, se amplía a 10 km.
-- `puede_preguntar` solo es verdadero en tiendas ACTIVAS que manejan esa línea y esa marca.
-- Las tiendas sin confirmar salen informativas (gris), nunca con disponibilidad.
create function public.tiendas_cercanas(
  cliente_lat double precision,
  cliente_lng double precision,
  linea public.categoria_pieza,
  marca_moto text default null
)
returns table (
  id uuid, nombre text, direccion text, lat double precision, lng double precision,
  estado public.estado_tienda, distancia_m integer, puede_preguntar boolean,
  tiempo_promedio_respuesta_seg integer, radio_km integer
)
language sql stable set search_path = '' as $$
  with candidatas as (
    select t.id, t.nombre, t.direccion, t.lat, t.lng, t.estado, t.tiempo_promedio_respuesta_seg,
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
    select case
      when exists (select 1 from candidatas where estado = 'activa' and maneja and metros <= 5000) then 5000
      else 10000
    end as metros
  )
  select c.id, c.nombre, c.direccion, c.lat, c.lng, c.estado,
    round(c.metros)::integer,
    (c.estado = 'activa' and c.maneja),
    c.tiempo_promedio_respuesta_seg,
    (r.metros / 1000)::integer
  from candidatas c, radio r
  where c.metros <= r.metros
    and c.maneja
  order by (c.estado = 'activa') desc, c.metros
  limit 30
$$;

commit;
