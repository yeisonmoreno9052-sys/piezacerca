# PiezaCerca — contexto del proyecto

Lee este archivo completo antes de cualquier tarea. Es la fuente de verdad del proyecto.
Si algo que te pidan contradice este archivo, pregunta antes de hacerlo.

## Qué es

PiezaCerca es una aplicación web para Medellín (Colombia) que conecta a **talleres y motociclistas**
con **tiendas de repuestos de moto cercanas**. El usuario busca una pieza (ej. "farola Libero 125")
y ve qué tiendas cerca de su ubicación la tienen, ordenadas por distancia.

El problema que resuelve: hoy los mecánicos llaman o escriben por WhatsApp a varias tiendas
preguntando si tienen una pieza y a cómo. Pierden horas y la moto queda parada.

## Quién la usa

- **Cliente** (taller o motociclista): busca piezas. Usa la app gratis, siempre.
- **Tienda** (almacén de repuestos): recibe solicitudes y responde. Paga mensualidad después del periodo gratis.
- **Administrador** (el dueño del proyecto): carga tiendas, motos y piezas; activa tiendas.

## Cómo funciona

### 1. Búsqueda
- El cliente escribe la pieza y su moto (puede guardar "mi moto" para no repetirla).
- El buscador debe entender nombres distintos para la misma pieza (farola / faro / luz delantera)
  y errores de escritura.
- Se pide la ubicación y se muestran las tiendas en mapa y lista, ordenadas por distancia.

### 2. Dos niveles de disponibilidad
- **Disponible (verde):** la tienda tiene inventario conectado y la pieza está en existencia.
  Solo se muestra sí/no. **Queda para después de la versión 1.**
- **Maneja la pieza (amarillo):** la tienda declaró que trabaja esa línea de piezas o marca.
  El cliente toca "Preguntar si la tiene" y se envía una solicitud.
- **Sin confirmar (gris):** tienda cargada por el administrador que aún no activó su cuenta.
  Aparece con nombre y ubicación, **nunca con disponibilidad**.

### 3. Solicitud y respuesta
- La solicitud llega a las tiendas cercanas en tiempo real (Supabase Realtime).
- La tienda responde con un toque: **"La tengo"** (y escribe el precio) o **"No la tengo"**. No se escribe texto libre.
- Cualquier usuario de la tienda puede responder (dueño o empleados; una tienda tiene varios usuarios).
- **Límite de 10 minutos:** si la tienda no responde, el cliente ve "no respondió".
- Se guarda el tiempo de respuesta de cada tienda. Las tiendas que responden más rápido salen primero.
- El precio respondido se guarda para sugerirlo la próxima vez que pregunten por esa pieza.

### 4. Lista de varias piezas
- El cliente arma una lista con cantidades (ej. mantenimiento: pastillas, kit de arrastre, guaya, bombillo, aceite) y la puede guardar.
- La tienda recibe la lista completa y marca pieza por pieza lo que tiene, más un total.
- Pantalla "¿Quién tiene todo?": tiendas ordenadas por cuántas piezas tienen ("5 de 5", "4 de 5 — le falta X")
  y una combinación sugerida de dos tiendas cercanas si ninguna tiene todo.

### 5. Avisos a la tienda
- La app es una PWA instalable desde el navegador (sin Play Store ni App Store en la versión 1).
- Avisos (web push) en Android, iPhone (agregada a la pantalla de inicio) y PC con Chrome o Edge.
- **Modo mostrador** para PC: pantalla grande de solicitudes con sonido fuerte.
- Respaldo por WhatsApp si no responden: **queda para después**.

## Reglas que nunca se rompen

1. **Nunca mostrar cantidades de inventario, costos ni ventas de una tienda** a nadie más.
   El precio de una respuesta solo lo ve el cliente que preguntó.
2. **Nunca mostrar disponibilidad inventada.** Una tienda sin confirmar no muestra disponibilidad.
3. Una tienda puede pedir salir de la app y se elimina.
4. Todo el texto de la app en **español de Colombia**. Pesos colombianos con formato `$ 45.000`.
5. Diseño pensado **primero para celular**.
6. Claves y secretos en variables de entorno (`.env`), nunca en el código ni en GitHub.

## Tecnología

- **Next.js** (aplicación web + PWA)
- **Supabase**: base de datos Postgres, inicio de sesión (correo o Google), Realtime y almacenamiento de fotos
- **Vercel** para publicar
- **GitHub** para el código
- Mapas: Google Maps o una alternativa gratuita (decidir en la semana 2)

## Datos (aprobado 2026-09-30; el SQL está en `supabase/migrations/`)

- `perfiles`: una fila por usuario (nombre, es_admin, "mi moto"). Se crea sola al registrarse.
- `motos`: marca, modelo, cilindraje, año desde / hasta
- `piezas`: nombre, categoría (frenos, luces, arrastre, eléctrico, motor, otros), sinónimos
- `compatibilidades`: pieza ↔ moto
- `tiendas`: nombre, dirección, lat/lng, estado (sin_confirmar / activa), tiempo promedio de respuesta
- `tienda_contacto`: WhatsApp (aparte, para mostrarlo solo si la tienda está activa)
- `tienda_categorias` / `tienda_marcas`: líneas de piezas y marcas de moto que atiende
- `codigos_activacion`: código para activar una tienda (solo administrador)
- `usuarios_tienda`: usuario ↔ tienda, rol dueño / empleado (varios por tienda)
- `solicitudes`: cliente, moto, ubicación, creada_en, vence_en (10 min, lo fija la base de datos)
- `solicitud_items`: piezas pedidas con cantidad. **Una pregunta de una sola pieza es una lista de 1 ítem.**
- `solicitud_tiendas`: a qué tiendas llegó y cuándo respondió. "No respondió" = sin respuesta y ya venció.
- `respuestas`: por tienda y por ítem: tiene sí/no, precio (entero en pesos), quién respondió
- `listas_guardadas` / `lista_items`: listas que el cliente guarda para reutilizar
- El precio sugerido se calcula de las respuestas anteriores de la misma tienda (sin tabla propia).

Permisos (RLS): catálogo y datos básicos de tiendas son públicos; el precio de una respuesta solo lo ven
el cliente de esa solicitud y la tienda que respondió; tiendas sin confirmar no reciben solicitudes;
el administrador ve todo.

## Alcance de la versión 1 (6 semanas)

**Entra:** búsqueda, mapa, solicitud, panel de tienda con botones, avisos en celular y PC, modo mostrador,
lista de varias piezas, "quién tiene todo", panel de administrador para cargar tiendas y motos,
activación de tienda con código.

**No entra todavía (no construir sin que se pida):** conexión automática con inventario, cobros y facturación,
apps en tiendas de aplicaciones, estadísticas avanzadas, respaldo automático por WhatsApp Business,
repuestos de carro, reseñas y calificaciones.

## Plan por semanas

1. Base: proyecto, tablas, inicio de sesión, panel de administrador, publicado en Vercel.
2. Catálogo y búsqueda: 10 a 20 motos comunes, piezas por categoría, buscador con sinónimos, mapa por distancia.
3. Solicitudes y panel de tienda: botones, precio, tiempo real, límite de 10 minutos, varios usuarios por tienda.
4. Avisos y lista: PWA, web push, modo mostrador, lista de varias piezas, "quién tiene todo".
5. Datos reales: tiendas de la zona piloto (sin confirmar), activación con código, precio sugerido, pruebas en Android, iPhone y PC.
6. Prueba real con 3 tiendas y 2 talleres; medir tiempo de respuesta y búsquedas encontradas; corregir.

## Diseño

Prototipo de referencia (7 pantallas): https://claude.ai/artifact/DWPjZor6c5SZ7HN5sJDyLR

- Fondo `#F5F3EE`, texto y encabezados `#1B1F24`
- Acción principal naranja `#E0621B`
- Disponible / "La tengo": verde `#1F7A4D` (fondo suave `#DDF1E5`)
- Maneja la pieza / pendiente: texto `#6B4600` sobre `#FBEBC8`
- Modo tienda: encabezado verde oscuro `#123B2B`
- Tipografía: Bricolage Grotesque (títulos) y Figtree (texto)
- Botones de al menos 44 px de alto; sin emojis en la interfaz

## Cómo trabajar en este proyecto

1. **Una tarea a la vez.** Antes de escribir código, explica el plan en pocas líneas y espera aprobación.
2. **No agregues funciones fuera del alcance** de la versión 1. Si crees que algo hace falta, propónlo y pregunta.
3. Cambios pequeños, cada uno con su commit y un mensaje claro en español.
4. Después de cada tarea, di cómo probarla en el celular.
5. Si tomas una decisión nueva (nombre, regla, librería), **agrégala a la sección "Decisiones" de este archivo**.
6. Explica en lenguaje sencillo: el dueño del proyecto no es programador de profesión.

## Decisiones

- 2026-09-29: se construye como aplicación web (PWA) con Next.js + Supabase + Vercel.
- 2026-09-29: se empieza solo con motos; los repuestos de carro quedan para después.
- 2026-09-29: las tiendas responden con botones, sin texto libre.
- 2026-09-30: base creada con Next.js 16 (App Router, TypeScript, carpeta `src/`) y Tailwind CSS 4.
  Los colores del diseño están como clases de Tailwind en `src/app/globals.css`
  (`bg-fondo`, `text-tinta`, `bg-naranja`, `text-verde`, `bg-verde-suave`, `text-ambar`, `bg-ambar-suave`, `bg-tienda`)
  y las tipografías como `font-titulo` (Bricolage Grotesque) y `font-sans` (Figtree).
- 2026-09-30: Supabase conectado (proyecto en São Paulo). Datos en `.env.local` (no se sube a GitHub):
  `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Las conexiones se crean con
  `crearClienteNavegador()` (`src/lib/supabase/client.ts`) y `crearClienteServidor()` (`src/lib/supabase/server.ts`).
  La clave secreta de Supabase nunca va en la app ni en el chat.
- 2026-09-30: diseño de tablas aprobado (ver sección "Datos").
- 2026-09-30: los cambios a la base de datos van como archivos en `supabase/migrations/` y el dueño los
  ejecuta en Supabase > SQL Editor (pegar y Run). `20260930000000_tablas_iniciales.sql` ya está aplicado.
  Nunca editar una migración ya aplicada: los cambios nuevos van en un archivo nuevo.
- 2026-09-30: "marcas que maneja" una tienda = marcas **de moto** (Honda, AKT, Yamaha…).
- 2026-09-30: el WhatsApp de una tienda lo ve el cliente **solo si la tienda está activa**.
- 2026-09-30: una solicitud llega a las tiendas activas a **5 km o menos** que manejen esa línea;
  si no hay ninguna, se amplía a **10 km**.
- 2026-09-30: **buscar no requiere cuenta**; **preguntar a las tiendas sí** (correo o Google).
- 2026-09-30: inicio de sesión sin contraseña: se pide el correo en `/entrar` y llega un enlace
  (y un código cuando haya correo propio). Google queda para cuando se publique en Vercel.
- 2026-09-30 (cambio aprobado): además existe **"Entrar con contraseña"** (correo + contraseña, no envía
  correo). La usa el administrador y, más adelante, las tiendas. Los clientes siguen con el enlace al correo.
  La contraseña del administrador la pone el dueño en el SQL Editor (nunca pasa por el chat ni por el código).
- 2026-09-30: un administrador se nombra solo desde Supabase > SQL Editor
  (`update public.perfiles set es_admin = true where id = (select id from auth.users where email = '...')`).
  Yeison (yeisonmoreno9052@gmail.com) ya es administrador.
- 2026-09-30: panel de administrador en `/admin` con **pestañas arriba** (Motos / Piezas / Tiendas),
  motos agrupadas por marca. Editar y borrar solo dentro de la ficha de cada registro, nunca en la lista;
  borrar pide un segundo toque de confirmación.
- 2026-09-30: datos de carga inicial en `supabase/datos/` (se pegan en el SQL Editor).
  Los años de las 20 motos iniciales son aproximados: confirmar con mecánicos.
- 2026-09-30: publicada en Vercel (plan Hobby): **https://piezacerca.vercel.app**. Código en GitHub
  (privado): `yeisonmoreno9052-sys/piezacerca`. Cada `git push` a `main` publica solo.
  Las dos variables de Supabase están cargadas en Vercel > Settings > Environment Variables.
- 2026-09-30: las piezas son **genéricas** (tipo de repuesto: "Farola", "Kit de arrastre"), no por referencia
  exacta de moto. La moto la escoge el cliente al buscar y va en la solicitud. La tabla `compatibilidades`
  no se usa en la versión 1. No puede haber dos piezas con el mismo nombre. Lista inicial de 76 piezas en
  `supabase/datos/20260930_piezas_iniciales.sql` (revisar con mecánicos).
- 2026-09-30: **zona del piloto: barrio Robledo (Medellín) y el corregimiento de San Cristóbal**, cerca de
  donde vive el dueño.
- 2026-09-30: panel de Tiendas. La ubicación se carga pegando el enlace de Google Maps (largo o corto de
  "Compartir") o coordenadas; `src/lib/ubicacion.ts` la extrae y rechaza puntos fuera del Valle de Aburrá.
  WhatsApp se guarda como `+57` + 10 dígitos. En `tienda_marcas`, la marca `"Todas"` (`MARCA_TODAS`) significa
  que atiende cualquier marca. Toda tienda nueva queda "sin confirmar"; se activa con código (semana 5).
  El campo de ubicación (`campo-ubicacion.tsx`) acepta el texto completo de "Compartir" (dirección + enlace),
  tiene botón "Usar mi ubicación actual" (GPS del celular) y muestra el punto encontrado antes de guardar.
- 2026-09-30: **un formulario nunca debe borrar lo escrito cuando hay un error.** En el panel se usa
  `useFormularioAdmin()` (`src/app/admin/usar-formulario.ts`) con `<form onSubmit={alEnviar}>`, no `<form action>`
  (que vacía el formulario al terminar). Usar el mismo patrón en formularios nuevos.
- 2026-10-01: **mapas con MapTiler** (gratis hasta 100.000 cargas al mes, sin tarjeta, se detiene en vez de
  cobrar). Proveedor de mapas decidido.
- 2026-10-01: pantalla de resultados = **opción B**: pestañas **Lista** y **Mapa** al mismo nivel (la app recuerda la
  que prefiere cada persona), tarjeta de tienda al tocar un punto, botón "Cómo llegar" (abre Google Maps/Waze
  del celular). **Un solo botón "Preguntar a las N tiendas"** (la solicitud va a todas las cercanas a la vez).
  Del prototipo se quitan para la v1: "Disponible" en verde, "Con domicilio", horarios y buscar con foto.
- 2026-10-01: buscador en la base de datos (`supabase/migrations/20261001000000_buscador.sql`):
  `sugerir_piezas(consulta)`, `sugerir_motos(consulta)` y `tiendas_cercanas(lat, lng, linea, marca_moto)`.
  Usa nombre + otros nombres, sin tildes, tolera errores de escritura. `tiendas_cercanas` aplica la regla de
  5 km / 10 km; `puede_preguntar` solo es verdadero en tiendas activas que manejan la línea y la marca.
- 2026-10-01: pantalla de inicio (`src/app/page.tsx` + `buscador.tsx`) como el prototipo: buscador con
  sugerencias (`sugerir_piezas`), "Mi moto", categorías y búsquedas recientes. "Mi moto" se guarda en
  `perfiles.moto_id` si hay sesión y en el celular (localStorage) siempre; las búsquedas recientes solo en el
  celular (`src/lib/guardado-local.ts`). Al escoger una pieza se va a `/buscar?pieza=ID&moto=ID`.
- 2026-10-01: ubicación del cliente: GPS o zona del piloto (Robledo / San Cristóbal, `src/lib/zonas.ts`, centros
  aproximados por confirmar). Se guarda **solo en el celular** (localStorage), nunca en la URL ni en la base de
  datos. Si escoge una pieza sin ubicación, la app la pide en ese momento y sigue con la búsqueda.
- 2026-10-01: pantalla de resultados `/buscar` (opción B): pestañas Lista / Mapa (la elegida se recuerda en el
  celular), tiendas de `tiendas_cercanas`, "Cómo llegar" abre la ruta en Google Maps, botón "Preguntar a las N
  tiendas" visible pero desactivado ("muy pronto", semana 3). Mapa con MapLibre (`maplibre-gl`) y el estilo
  `streets-v2` de MapTiler; clave en `NEXT_PUBLIC_MAPTILER_KEY` (`.env.local` y Vercel). Sin clave, la pestaña
  Mapa avisa y la Lista sigue funcionando.
- 2026-10-02: el "worker" de MapLibre (dibuja las calles) se copia a `public/maplibre/` con
  `scripts/copiar-maplibre.mjs`, que corre solo antes de `npm run dev` y `npm run build` (Next.js no lo incluye).
  La clave de MapTiler en Vercel es tipo **Config** (pública) y en MapTiler solo funciona desde
  `piezacerca.vercel.app` y `localhost:3000` (orígenes sin `https://`; el campo user-agent debe quedar vacío).
  **Semana 2 terminada.**
- 2026-10-02 (aprobado por el dueño): botón **"Voy para allá"** (idea tipo InDrive). Cuando el cliente ve las
  respuestas, escoge una tienda que dijo "La tengo" y a esa tienda le llega el aviso "el cliente va para allá:
  apártala". Sirve para que la pieza no se venda a otro, para que la tienda vea que la app le trae ventas y
  para medir ventas en la prueba de la semana 6. Entra en la semana 3. **No** se copia el regateo de precio.
- 2026-10-02: solicitudes (`supabase/migrations/20261002000000_solicitudes.sql`): el cliente pregunta con
  `enviar_solicitud(pieza, cantidad, moto, lat, lng)`; la base de datos escoge las tiendas (activas que manejan la
  pieza, regla 5/10 km). Máximo 10 preguntas por hora por persona. Las tiendas responden insertando en
  `respuestas` (no se puede cambiar ni borrar una respuesta; no se puede responder después de los 10 min).
  `voy_para_alla(solicitud, tienda)` guarda `solicitud_tiendas.va_para_alla_en` (solo a una tienda que dijo
  "La tengo", solo el cliente dueño). El tiempo promedio de respuesta se recalcula solo (últimas 50).
  En vivo con Supabase Realtime: `solicitud_tiendas` y `respuestas`.
- 2026-10-04: pantallas de la semana 3: `/solicitud/[id]` (cliente, en vivo con contador y "Voy para allá"; el
  precio que responde la tienda es **por unidad**) y `/tienda` (Modo tienda). Al entrar, la app vuelve a la
  página de origen (`?volver=` / `?siguiente=`, solo rutas internas: `src/lib/ruta-segura.ts`).
  Sonido de aviso en `src/lib/aviso-sonoro.ts` (se activa con un toque; suena con cada solicitud nueva, llegue en
  vivo o por la revisión de respaldo). Usuarios de tienda: entran directo a `/tienda` al abrir el inicio
  ("Salir del modo" lleva a `/?modo=cliente`) y ven en cualquier pantalla la barra "Tienes N solicitudes nuevas"
  (`src/app/aviso-tienda.tsx`). `obtenerSesion()` ahora también trae `tiendaId`.
  Prueba completa con dos celulares hecha el 2026-10-04: funcionó (pregunta, respuesta, precio en vivo, Voy para allá).
- 2026-10-05 (aprobado): lista de varias piezas = opción **A + C**. `/lista`: paquetes ya armados (tabla `paquetes`,
  4 iniciales: Mantenimiento básico, Frenos, Arrastre completo, Bombillos), "Mis listas" y lista en blanco; luego
  se edita (cantidades, quitar, guardar) y se pregunta. Una moto por lista, **máximo 15 piezas**. La tienda marca
  pieza por pieza y envía todo de una vez. El cliente ve "N de M", total y qué le falta (base de "¿Quién tiene
  todo?"). SQL en `supabase/migrations/20261005000000_listas.sql`: `enviar_solicitud_lista(items, moto, lat, lng)`
  (le llega a las tiendas que manejan al menos una pieza); `enviar_solicitud` ahora es una lista de 1.
  La lista en preparación se guarda en el celular (`piezacerca:lista-borrador`).
  Prueba con dos celulares de la lista hecha el 2026-10-05: funcionó.
- 2026-10-06: "¿Quién tiene todo?" con **combinación sugerida**: si ninguna tienda tiene toda la lista, la pantalla
  del cliente busca las dos tiendas que juntas cubren más piezas; a igual cobertura, la de menor total y luego el
  menor recorrido (cliente → tienda más cercana → la otra). Cada pieza se toma de la más barata de las dos.
  Botón "Voy a las dos" → `voy_a_las_dos(solicitud, tienda_a, tienda_b)`
  (`supabase/migrations/20261006000000_combinacion.sql`). Probado con dos tiendas de prueba el 2026-10-06: funcionó.
  Hay dos tiendas de prueba activas en Robledo ("Tienda de prueba … (borrar)"): borrarlas antes del piloto.
- 2026-10-07 (pedido por el dueño, adelantado): **notificaciones push** a las tiendas y app instalable (PWA).
  Al insertar en `solicitud_tiendas` (solicitud nueva) o marcar `va_para_alla_en`, el trigger
  `avisar_tienda_push` llama con pg_net a `/api/push` (clave compartida `PUSH_SECRETO`, guardada en
  `configuracion_privada` y en Vercel), y la ruta manda la notificación con `web-push` a `push_suscripciones`
  de los usuarios de esa tienda. Si el aviso falla, la solicitud igual llega. Claves VAPID: pública en
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Config), privada en `VAPID_PRIVATE_KEY` (Secret). Los secretos están solo en
  `.env.local` y `.secretos/` (ignorados por Git). Service worker `public/sw.js`, manifest `src/app/manifest.ts`,
  íconos `/icono/[96|180|192|512]`. Botón "Activar notificaciones" en el Modo tienda (iPhone: instalar primero).
  No se usa la clave secreta de Supabase.
  Probado el 2026-10-07 con el celular de la tienda bloqueado: llegaron la notificación de la solicitud nueva
  y la de "Voy para allá". Guía para tiendas (instalar, notificaciones, tono, batería) en Claude Docs:
  https://claude.ai/code/artifact/0916e977-fff0-471c-8808-b5ec5802b841
- 2026-10-07 (aprobado): **modo mostrador** = opción **A** (tablero de tres columnas: Nuevas · Van para allá ·
  Respondidas hoy) **+ teclas T / N** (Enter envía el precio, Esc vuelve) en la solicitud más antigua.
  `/tienda/mostrador`; el sonido se repite cada 8 s mientras haya solicitudes sin responder. La lógica de cargar
  solicitudes, tiempo real y sonido es compartida en `src/app/tienda/datos.ts` (`useSolicitudesTienda`).
  Sonido de aviso = timbre "din-don" (cambiado el 2026-10-07: el pitido sonaba "rarito").
- 2026-10-08 (aprobado, semana 5 tarea 1): **activación con código**. El administrador genera en la ficha de la
  tienda un código `PC-XXXXXX` (30 días, un solo uso; regenerar invalida el anterior) y lo copia o lo envía por
  WhatsApp. La tienda entra a `/activar`, crea su cuenta (correo + contraseña) y escribe el código: la tienda
  queda **activa** y la persona como **dueño**. El dueño agrega empleados desde "Tu equipo" (Modo tienda) con
  códigos `EM-XXXXXX` (48 h, un solo uso) y puede quitarlos. Máximo 10 intentos de código por hora por persona.
  SQL: `supabase/migrations/20261008000000_activacion.sql` (`generar_codigo_activacion`, `usar_codigo`,
  `generar_codigo_empleado`, `mi_equipo`, `quitar_empleado`). Crear cuenta manda correo de confirmación
  mientras no haya correo propio (límite de ~2 correos por hora).
- 2026-09-30: el proyecto vive en `C:\Proyectos\PiezaCerca` (fuera de OneDrive, que volvía lento el desarrollo).
- 2026-09-30: para saber quién usa la app en el servidor, usar siempre `obtenerSesion()` (`src/lib/sesion.ts`)
  o `exigirAdmin()` (`src/lib/admin.ts`): consultan una sola vez por página y verifican la sesión
  localmente con `getClaims()` (el proyecto usa llaves ES256). No usar `getUser()` en páginas.

## Pendiente por decidir

- Lista final de motos (confirmar con mecánicos). La Yamaha Libero 125 del prototipo no está cargada.
- Foto de la pieza (idea, fuera de la v1 hasta que el dueño decida): 1) foto adjunta a la solicitud (lo más
  simple, candidata a la semana 3 si los mecánicos la piden en el trabajo de campo); 2) foto que reconoce la
  pieza con inteligencia artificial (después); 3) búsqueda de piezas parecidas por foto (no por ahora).
- Nombre definitivo (PiezaCerca es provisional).
- Plan de Vercel: hoy es **Hobby (gratis)**, que según Vercel es para uso no comercial. Antes de empezar
  a cobrarle a las tiendas hay que pasar a Pro (~20 dólares al mes) u otro proveedor.
- Correo propio (SMTP, ej. Resend) para Supabase: hace falta antes de las pruebas con tiendas.
  Sin él, Supabase no deja editar las plantillas (el correo no trae código, solo enlace)
  y solo envía unos pocos correos por hora.

## Negocio (referencia, no se construye en la versión 1)

- Clientes: gratis siempre.
- Tiendas fundadoras: 3 meses gratis, luego mitad de precio del mes 4 al 6, y precio especial permanente.
- Plan básico (aparecer y recibir solicitudes): $39.000 – $49.000 al mes.
- Plan inventario (app de inventario + disponibilidad automática + prioridad): $89.000 – $129.000 al mes.
- Destacado en su zona: +$20.000 – $30.000 al mes.

## Notas técnicas de Next.js

@AGENTS.md
