-- PiezaCerca · SOLO PARA PROBAR la semana 3: conecta un usuario con la tienda de prueba de Robledo
-- y la deja activa, para que pueda recibir y responder solicitudes en /tienda.
-- ANTES: crear el usuario en Supabase > Authentication > Users > "Add user" > "Create new user"
-- (con correo y contraseña, y marcando "Auto Confirm User").
-- CAMBIAR el correo de abajo por el de ese usuario. La contraseña nunca va aquí.

update public.tiendas
set estado = 'activa'
where nombre = 'Tienda de prueba Robledo (borrar)';

insert into public.usuarios_tienda (usuario_id, tienda_id, rol)
select u.id, t.id, 'dueno'
from auth.users u, public.tiendas t
where u.email = 'CORREO-DE-LA-TIENDA@ejemplo.com'
  and t.nombre = 'Tienda de prueba Robledo (borrar)'
on conflict do nothing;

-- Revisión: debe mostrar 1 fila con el correo y la tienda.
select u.email, t.nombre, t.estado, ut.rol
from public.usuarios_tienda ut
join auth.users u on u.id = ut.usuario_id
join public.tiendas t on t.id = ut.tienda_id;
