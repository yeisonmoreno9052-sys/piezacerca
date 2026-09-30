-- PiezaCerca · primeras motos (lista de Yeison, 2026-09-30)
-- Se ejecuta en Supabase > SQL Editor. Si una moto ya existe, la salta.
-- OJO: los años "desde" son aproximados. Confirmarlos con mecánicos y corregirlos
-- en el panel de administrador (Motos > tocar la moto).
-- "anio_hasta" vacío (null) = se sigue vendiendo.

insert into public.motos (marca, modelo, cilindraje, anio_desde, anio_hasta) values
  ('AKT',    'NKD',        125, 2012, null),
  ('AKT',    'Special',    110, 2010, null),
  ('AKT',    'Dynamic',    125, 2015, null),
  ('Bajaj',  'Boxer CT',   100, 2014, null),
  ('Bajaj',  'Boxer CT',   125, 2020, null),
  ('Bajaj',  'Pulsar NS',  160, 2017, null),
  ('Bajaj',  'Pulsar NS',  200, 2013, null),
  ('Bajaj',  'Pulsar',     180, 2008, null),
  ('Bajaj',  'Pulsar',     125, 2019, null),
  ('Honda',  'XR 150L',    150, 2015, null),
  ('Suzuki', 'GN',         125, 2004, null),
  ('Suzuki', 'DR',         150, 2018, null),
  ('Suzuki', 'Gixxer',     150, 2015, null),
  ('TVS',    'Raider',     125, 2022, null),
  ('Yamaha', 'NMAX',       155, 2016, null),
  ('Yamaha', 'XTZ',        150, 2015, null),
  ('Yamaha', 'Crypton FI', 115, 2017, null),
  ('Yamaha', 'Finn',       115, 2021, null),
  ('Yamaha', 'FZ',         150, 2011, null),
  ('Yamaha', 'FZ',         250, 2017, null)
on conflict (marca, modelo, cilindraje, anio_desde) do nothing;
