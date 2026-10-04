import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// La base de datos llama aquí (trigger `avisar_tienda_push`, con pg_net) cuando a una tienda le llega
// una solicitud o un cliente toca "Voy para allá". Esta ruta manda la notificación a cada celular de la tienda.
// Solo acepta llamadas con la clave secreta compartida (PUSH_SECRETO).

type Suscripcion = { endpoint: string; p256dh: string; auth: string };
type Aviso = {
  titulo: string;
  cuerpo: string;
  etiqueta: string;
  url: string;
  suscripciones: Suscripcion[];
};

function claveCorrecta(recibida: string | null) {
  const esperada = process.env.PUSH_SECRETO ?? "";
  if (!recibida || !esperada || recibida.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada));
}

export async function POST(request: Request) {
  if (!claveCorrecta(request.headers.get("x-push-secreto"))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) {
    return Response.json({ error: "Faltan las claves de notificaciones" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:yeisonmoreno9052@gmail.com", publica, privada);

  const aviso = (await request.json()) as Aviso;
  const mensaje = JSON.stringify({
    titulo: aviso.titulo,
    cuerpo: aviso.cuerpo,
    etiqueta: aviso.etiqueta,
    url: aviso.url,
  });

  const vencidas: string[] = [];
  const resultados = await Promise.allSettled(
    (aviso.suscripciones ?? []).map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, mensaje, {
          TTL: 600, // la solicitud dura 10 minutos: después ya no sirve el aviso
          urgency: "high",
        })
        .catch((error: { statusCode?: number }) => {
          // 404/410: ese celular ya no existe (desinstalaron o quitaron el permiso)
          if (error.statusCode === 404 || error.statusCode === 410) vencidas.push(s.endpoint);
          throw error;
        }),
    ),
  );

  if (vencidas.length > 0) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    await Promise.all(
      vencidas.map((endpoint) =>
        supabase.rpc("borrar_suscripcion_push", { p_endpoint: endpoint, p_secreto: process.env.PUSH_SECRETO }),
      ),
    );
  }

  return Response.json({
    enviadas: resultados.filter((r) => r.status === "fulfilled").length,
    fallidas: resultados.filter((r) => r.status === "rejected").length,
    borradas: vencidas.length,
  });
}
