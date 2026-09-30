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

## Datos (propuesta inicial, confirmar antes de crear)

- `tiendas`: nombre, dirección, lat/lng, whatsapp, estado (sin_confirmar / activa), líneas y marcas que maneja, tiempo promedio de respuesta
- `usuarios_tienda`: usuario ↔ tienda (varios por tienda)
- `motos`: marca, modelo, cilindraje, años
- `piezas`: nombre, categoría (frenos, luces, arrastre, eléctrico, motor, otros), otros nombres (sinónimos)
- `compatibilidades`: pieza ↔ moto
- `solicitudes`: cliente, pieza o lista, moto, ubicación, fecha, vence_en (10 min)
- `solicitud_items`: para listas de varias piezas, con cantidad
- `respuestas`: solicitud, tienda, tiene (sí/no) por ítem, precio, fecha de respuesta

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

## Pendiente por decidir

- Zona de Medellín para el piloto.
- Lista final de motos (confirmar con mecánicos).
- Proveedor de mapas.
- Nombre definitivo (PiezaCerca es provisional).

## Negocio (referencia, no se construye en la versión 1)

- Clientes: gratis siempre.
- Tiendas fundadoras: 3 meses gratis, luego mitad de precio del mes 4 al 6, y precio especial permanente.
- Plan básico (aparecer y recibir solicitudes): $39.000 – $49.000 al mes.
- Plan inventario (app de inventario + disponibilidad automática + prioridad): $89.000 – $129.000 al mes.
- Destacado en su zona: +$20.000 – $30.000 al mes.

## Notas técnicas de Next.js

@AGENTS.md
