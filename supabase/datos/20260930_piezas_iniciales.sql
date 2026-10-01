-- PiezaCerca · primeras piezas (genéricas, sin moto; la moto la escoge el cliente al buscar)
-- Se ejecuta en Supabase > SQL Editor. Si una pieza ya existe (mismo nombre), la salta.
-- Revisar nombres y "otros nombres" con mecánicos; se corrigen en el panel (Piezas > tocar la pieza).

insert into public.piezas (nombre, categoria, sinonimos)
select v.nombre, v.categoria::public.categoria_pieza, v.sinonimos
from (values
  -- Frenos
  ('Pastillas de freno delanteras', 'frenos',   array['pastillas delanteras','pastillas de disco','pastillas']),
  ('Pastillas de freno traseras',   'frenos',   array['pastillas traseras']),
  ('Bandas de freno',               'frenos',   array['bandas','zapatas','bandas traseras']),
  ('Disco de freno delantero',      'frenos',   array['disco delantero','disco de freno']),
  ('Disco de freno trasero',        'frenos',   array['disco trasero']),
  ('Bomba de freno',                'frenos',   array['bomba de freno delantera','cilindro maestro']),
  ('Caliper',                       'frenos',   array['cáliper','mordaza','calibrador']),
  ('Líquido de frenos',             'frenos',   array['liquido de frenos','DOT 4','DOT 3']),
  ('Guaya de freno',                'frenos',   array['cable de freno']),
  ('Manigueta de freno',            'frenos',   array['manigueta','palanca de freno']),
  ('Pedal de freno',                'frenos',   array['pedal freno']),

  -- Luces
  ('Farola',                        'luces',    array['faro','farol','luz delantera','foco delantero']),
  ('Bombillo de farola',            'luces',    array['bombillo','bombilla','foco']),
  ('Stop',                          'luces',    array['calavera','luz trasera','stop trasero']),
  ('Bombillo de stop',              'luces',    array['bombilla de stop']),
  ('Direccionales',                 'luces',    array['direccional','vías','luces de giro','pilotos']),
  ('Bombillo de direccional',       'luces',    array['bombilla de direccional']),
  ('Exploradoras',                  'luces',    array['luces auxiliares','luces LED','neblineros']),

  -- Arrastre
  ('Kit de arrastre',               'arrastre', array['kit arrastre','kit de cadena','cadena piñón y corona']),
  ('Cadena',                        'arrastre', array['cadena de arrastre']),
  ('Piñón',                         'arrastre', array['piñon','piñón de salida','piñón delantero']),
  ('Corona',                        'arrastre', array['catalina','piñón trasero','sprocket']),
  ('Cauchos de la corona',          'arrastre', array['cauchos del porta corona','cauchos del rin trasero','amortiguadores de corona']),
  ('Guía de cadena',                'arrastre', array['guía cadena','deslizador de cadena']),
  ('Tensores de cadena',            'arrastre', array['templadores','tensor de cadena']),

  -- Eléctrico
  ('Batería',                       'electrico', array['bateria','acumulador']),
  ('Bujía',                         'electrico', array['bujia']),
  ('Capuchón de bujía',             'electrico', array['capuchon','pipa de bujía']),
  ('Bobina de alta',                'electrico', array['bobina','bobina de encendido']),
  ('CDI',                           'electrico', array['módulo de encendido','caja negra']),
  ('Regulador',                     'electrico', array['regulador rectificador','rectificador']),
  ('Estator',                       'electrico', array['bobina de carga','plato de bobinas','corona de bobinas']),
  ('Motor de arranque',             'electrico', array['burro','burro de arranque','arranque eléctrico']),
  ('Relé de arranque',              'electrico', array['relay','relé','automático de arranque']),
  ('Suiche de encendido',           'electrico', array['suiche','switch','chapa','interruptor de encendido']),
  ('Comandos',                      'electrico', array['comando de luces','mando de luces','comando']),
  ('Pito',                          'electrico', array['bocina','claxon']),
  ('Fusible',                       'electrico', array['fusibles']),
  ('Tablero',                       'electrico', array['velocímetro','cuentakilómetros','odómetro']),

  -- Motor
  ('Aceite de motor',               'motor',    array['aceite','aceite 20W50','aceite 4T']),
  ('Filtro de aceite',              'motor',    array['filtro aceite']),
  ('Filtro de aire',                'motor',    array['filtro del aire','elemento filtrante']),
  ('Kit de clutch',                 'motor',    array['clutch','discos de clutch','embrague','discos de embrague']),
  ('Guaya del clutch',              'motor',    array['guaya clutch','cable del clutch','cable de embrague']),
  ('Guaya del acelerador',          'motor',    array['guaya acelerador','cable del acelerador']),
  ('Carburador',                    'motor',    array['carbu']),
  ('Kit de cilindro',               'motor',    array['cilindro','kit de pistón','pistón y anillos']),
  ('Anillos',                       'motor',    array['anillos de pistón','aros']),
  ('Empaques de motor',             'motor',    array['kit de empaques','empaquetadura','empaques']),
  ('Cadenilla de distribución',     'motor',    array['cadenilla','cadena de distribución','cadenilla de leva']),
  ('Tensor de cadenilla',           'motor',    array['tensor de distribución']),
  ('Válvulas',                      'motor',    array['valvulas','válvula de admisión','válvula de escape']),
  ('Retenedores de motor',          'motor',    array['retenedor','sellos']),
  ('Bomba de aceite',               'motor',    array['bomba aceite']),

  -- Otros
  ('Llanta delantera',              'otros',    array['llanta','llanta de adelante']),
  ('Llanta trasera',                'otros',    array['llanta de atrás']),
  ('Neumático',                     'otros',    array['tubo','cámara','neumático de llanta']),
  ('Rin',                           'otros',    array['rines','aro']),
  ('Espejos',                       'otros',    array['espejo','retrovisores','retrovisor']),
  ('Manubrio',                      'otros',    array['timón','manillar']),
  ('Puños',                         'otros',    array['puño','manijas']),
  ('Amortiguadores traseros',       'otros',    array['amortiguador','amortiguadores','shock']),
  ('Barras de suspensión',          'otros',    array['barras','telescópicos','suspensión delantera']),
  ('Retenedores de barras',         'otros',    array['retenedores de suspensión','sellos de barras']),
  ('Balineras',                     'otros',    array['balinera','rodamientos','rodamiento']),
  ('Cunas de dirección',            'otros',    array['cunas','rodamientos de dirección']),
  ('Sillín',                        'otros',    array['sillin','asiento','silla']),
  ('Guardabarros',                  'otros',    array['guardabarro','guardafangos','salpicadera']),
  ('Carenaje',                      'otros',    array['carenajes','plásticos','kit de plásticos']),
  ('Pata de lado',                  'otros',    array['pata lateral','gato lateral','parador lateral']),
  ('Gato central',                  'otros',    array['parador central','pata central']),
  ('Estribos',                      'otros',    array['posapiés','reposapiés','pisaderas']),
  ('Palanca de cambios',            'otros',    array['pedal de cambios','palanca cambios']),
  ('Exosto',                        'otros',    array['mofle','silenciador','escape','tubo de escape']),
  ('Tanque de gasolina',            'otros',    array['tanque']),
  ('Llave de gasolina',             'otros',    array['grifo de gasolina','llave de paso'])
) as v(nombre, categoria, sinonimos)
where not exists (
  select 1 from public.piezas p where lower(p.nombre) = lower(v.nombre)
);
