// Saca la ubicación (lat, lng) de lo que pegue el administrador:
// un enlace de Google Maps (largo o corto, de "Compartir") o unas coordenadas "6.2442, -75.5812".

type Resultado = { lat: number; lng: number } | { error: string };

// Valle de Aburrá con margen (incluye Robledo y San Cristóbal).
const ZONA = { latMin: 5.95, latMax: 6.55, lngMin: -75.8, lngMax: -75.25 };

const HOSTS_GOOGLE = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "google.com",
  "www.google.com",
  "maps.google.com",
  "google.com.co",
  "www.google.com.co",
]);

const NUM = String.raw`(-?\d{1,3}\.\d+)`;
const PATRONES = [
  new RegExp(String.raw`!3d${NUM}!4d${NUM}`), // pin exacto del lugar
  new RegExp(String.raw`[?&](?:q|ll|query|center|destination)=${NUM},\s*${NUM}`),
  new RegExp(String.raw`@${NUM},${NUM}`), // centro del mapa
  new RegExp(String.raw`^\s*${NUM}\s*,\s*${NUM}\s*$`), // coordenadas sueltas
];

function buscarCoordenadas(texto: string) {
  let limpio = texto;
  try {
    limpio = decodeURIComponent(texto);
  } catch {
    // Texto con "%" sueltos: se busca tal cual.
  }
  for (const patron of PATRONES) {
    const m = limpio.match(patron);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

// Los enlaces cortos (maps.app.goo.gl/...) hay que abrirlos para ver a dónde llevan.
async function expandirEnlace(enlace: string) {
  let actual = enlace;
  for (let i = 0; i < 4; i++) {
    const url = new URL(actual);
    if (!HOSTS_GOOGLE.has(url.hostname)) return actual;
    if (buscarCoordenadas(actual)) return actual;
    const respuesta = await fetch(actual, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    const siguiente = respuesta.headers.get("location");
    if (!siguiente) return actual;
    actual = new URL(siguiente, actual).toString();
  }
  return actual;
}

export async function leerUbicacion(entrada: string): Promise<Resultado> {
  const texto = entrada.trim();
  if (!texto) return { error: "Pega el enlace de Google Maps o las coordenadas de la tienda." };

  // Al "Compartir" desde el celular, a veces se copia el nombre o la dirección junto con el enlace:
  // se busca el enlace en cualquier parte del texto.
  const enlace = texto.match(/https?:\/\/\S+/i)?.[0];
  if (enlace) {
    let host: string;
    try {
      host = new URL(enlace).hostname;
    } catch {
      return { error: "Ese enlace no se entiende. Cópialo otra vez desde Google Maps." };
    }
    if (!HOSTS_GOOGLE.has(host)) {
      return { error: "El enlace debe ser de Google Maps." };
    }
  }

  let coordenadas = buscarCoordenadas(enlace ?? texto);
  if (!coordenadas && enlace) {
    try {
      coordenadas = buscarCoordenadas(await expandirEnlace(enlace));
    } catch {
      coordenadas = null;
    }
  }

  if (!coordenadas) {
    return {
      error:
        "No encontré la ubicación en ese enlace. En Google Maps deja el dedo presionado sobre la tienda, copia los números que aparecen arriba (ej. 6.2442, -75.5812) y pégalos aquí.",
    };
  }

  const { lat, lng } = coordenadas;
  if (lat < ZONA.latMin || lat > ZONA.latMax || lng < ZONA.lngMin || lng > ZONA.lngMax) {
    return {
      error: `Esa ubicación (${lat.toFixed(5)}, ${lng.toFixed(5)}) queda fuera del Valle de Aburrá. Revisa el enlace.`,
    };
  }

  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

// WhatsApp colombiano: 10 dígitos (celular 3xx o fijo 60x). Se guarda como +57XXXXXXXXXX.
export function leerWhatsapp(entrada: string): { numero: string | null } | { error: string } {
  let digitos = entrada.replace(/\D/g, "");
  if (!digitos) return { numero: null };
  if (digitos.length === 12 && digitos.startsWith("57")) digitos = digitos.slice(2);
  if (digitos.length !== 10 || !/^(3|60)/.test(digitos)) {
    return { error: "El WhatsApp debe tener 10 dígitos, por ejemplo 300 123 4567." };
  }
  return { numero: `+57${digitos}` };
}

export function mostrarWhatsapp(numero: string) {
  const d = numero.replace(/^\+57/, "");
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}
