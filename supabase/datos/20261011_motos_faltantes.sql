-- PiezaCerca · 12 motos que faltaban (investigación del 2026-10-10, aprobado por Yeison el 2026-10-11)
-- Aplicado el 2026-10-11 desde Claude con el conector de Supabase. Si una moto ya existe, la salta.
-- OJO: los años "desde" son aproximados. Confirmarlos con mecánicos y corregirlos
-- en el panel de administrador (Motos > tocar la moto). "anio_hasta" vacío = se sigue vendiendo
-- (o no sabemos cuándo dejó de venderse).

insert into public.motos (marca, modelo, cilindraje, anio_desde, anio_hasta) values
  ('Yamaha',  'XTZ',         125, 2008, null),
  ('Honda',   'CB',          110, 2014, null),
  ('Yamaha',  'BWS',         125, 2006, null),
  ('Suzuki',  'AX',          100, 2000, null),
  ('AKT',     'AK',          125, 2010, null),
  ('Honda',   'CB 160F',     160, 2019, null),
  ('TVS',     'Sport',       100, 2012, null),
  ('TVS',     'Apache RTR',  160, 2012, null),
  ('Hero',    'Eco Deluxe',  100, 2014, null),
  ('Bajaj',   'Platino',     110, 2014, null),
  ('Victory', 'One',         100, 2018, null),
  ('Yamaha',  'Libero',      125, 2005, null)
on conflict (marca, modelo, cilindraje, anio_desde) do nothing;
