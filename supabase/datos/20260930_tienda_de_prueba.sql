-- PiezaCerca · UNA tienda DE PRUEBA en Robledo (no es una tienda real).
-- Sirve para ver cómo se ve una tienda en el panel y, más adelante, en el buscador.
-- BORRARLA antes de la prueba con tiendas reales (Panel > Tiendas > tocarla > Borrar tienda).
-- Se ejecuta en Supabase > SQL Editor. Si ya existe, no la repite.

with nueva as (
  insert into public.tiendas (nombre, direccion, lat, lng, estado)
  select 'Tienda de prueba Robledo (borrar)', 'Robledo, Medellín (dirección de prueba)', 6.2790, -75.5960, 'sin_confirmar'
  where not exists (
    select 1 from public.tiendas where nombre = 'Tienda de prueba Robledo (borrar)'
  )
  returning id
),
lineas as (
  insert into public.tienda_categorias (tienda_id, categoria)
  select nueva.id, c::public.categoria_pieza
  from nueva, unnest(array['frenos','luces','arrastre','electrico','motor','otros']) as c
)
insert into public.tienda_marcas (tienda_id, marca)
select id, 'Todas' from nueva;
