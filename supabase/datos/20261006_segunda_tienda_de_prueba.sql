-- PiezaCerca · SOLO PARA PROBAR: segunda tienda de prueba en Robledo, activa, con su usuario.
-- Sirve para probar "¿Quién tiene todo?" y la combinación de dos tiendas.
-- BORRARLA antes del piloto (Panel > Tiendas > tocarla > Borrar tienda).
-- ANTES: crear el usuario en Supabase > Authentication > Users > "Add user" > "Create new user"
-- (correo y contraseña, marcando "Auto Confirm User").
-- CAMBIAR el correo de abajo por el de ese usuario. La contraseña nunca va aquí.

with nueva as (
  insert into public.tiendas (nombre, direccion, lat, lng, estado)
  select 'Tienda de prueba 2 Robledo (borrar)', 'Robledo, Medellín (dirección de prueba 2)', 6.2860, -75.5930, 'activa'
  where not exists (select 1 from public.tiendas where nombre = 'Tienda de prueba 2 Robledo (borrar)')
  returning id
),
lineas as (
  insert into public.tienda_categorias (tienda_id, categoria)
  select nueva.id, c::public.categoria_pieza
  from nueva, unnest(array['frenos','luces','arrastre','electrico','motor','otros']) as c
),
marcas as (
  insert into public.tienda_marcas (tienda_id, marca)
  select id, 'Todas' from nueva
)
insert into public.usuarios_tienda (usuario_id, tienda_id, rol)
select u.id, nueva.id, 'dueno'
from nueva, auth.users u
where u.email = 'CORREO-DE-LA-TIENDA-2@ejemplo.com';

-- Revisión: deben salir las dos tiendas de prueba, cada una con su correo.
select t.nombre, t.estado, u.email
from public.tiendas t
left join public.usuarios_tienda ut on ut.tienda_id = t.id
left join auth.users u on u.id = ut.usuario_id
where t.nombre like 'Tienda de prueba%'
order by t.nombre;
