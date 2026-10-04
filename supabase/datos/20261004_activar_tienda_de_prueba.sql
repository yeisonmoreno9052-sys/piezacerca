-- PiezaCerca · SOLO PARA PROBAR la semana 3: activa la tienda de prueba de Robledo.
-- Así el cliente puede preguntarle y verla en la pantalla en vivo.
-- (La activación real con código es de la semana 5. Esta tienda se borra antes del piloto.)

update public.tiendas
set estado = 'activa'
where nombre = 'Tienda de prueba Robledo (borrar)';

-- Debe responder: 1 fila (UPDATE 1).
