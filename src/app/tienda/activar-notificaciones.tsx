"use client";

import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Estado =
  | "revisando"
  | "no-soportado" // navegador sin notificaciones
  | "iphone-instalar" // iPhone: primero hay que agregar la app a la pantalla de inicio
  | "bloqueado" // la persona negó el permiso
  | "apagado" // se puede activar
  | "activando"
  | "activo";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function aBytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

function esIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function instalada() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
}

async function revisar(): Promise<Estado> {
  const soporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!soporta) return esIphone() && !instalada() ? "iphone-instalar" : "no-soportado";
  if (!CLAVE_PUBLICA) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  const registro = await navigator.serviceWorker.getRegistration("/");
  const suscripcion = await registro?.pushManager.getSubscription();
  return suscripcion && Notification.permission === "granted" ? "activo" : "apagado";
}

// "Activar notificaciones": así la tienda recibe las solicitudes aunque tenga la app cerrada.
export function ActivarNotificaciones() {
  const [estado, setEstado] = useState<Estado>("revisando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    revisar().then((e) => vigente && setEstado(e));
    return () => {
      vigente = false;
    };
  }, []);

  async function activar() {
    setError(null);
    setEstado("activando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }
      const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const suscripcion =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA) }));
      const datos = suscripcion.toJSON();
      const { error } = await crearClienteNavegador().rpc("guardar_suscripcion_push", {
        p_endpoint: datos.endpoint,
        p_p256dh: datos.keys?.p256dh,
        p_auth: datos.keys?.auth,
      });
      if (error) throw error;
      setEstado("activo");
    } catch {
      setEstado("apagado");
      setError("No se pudieron activar las notificaciones. Inténtalo de nuevo.");
    }
  }

  if (estado === "revisando") return null;

  if (estado === "activo") {
    return (
      <p className="rounded-2xl bg-verde-suave p-3 text-sm text-verde">
        <strong>Notificaciones activadas en este celular.</strong> Te llegan las solicitudes aunque tengas la app cerrada.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-tienda bg-white p-4">
      <p className="font-bold text-tienda">Recibe las solicitudes con la app cerrada</p>

      {estado === "iphone-instalar" && (
        <p className="mt-1 text-sm">
          En iPhone primero instala PiezaCerca: toca el botón <strong>Compartir</strong> de Safari (el cuadro con la
          flecha hacia arriba), luego <strong>&quot;Agregar a inicio&quot;</strong>. Abre la app desde ese ícono y vuelve
          aquí para activar las notificaciones.
        </p>
      )}

      {estado === "no-soportado" && (
        <p className="mt-1 text-sm">
          Este navegador no permite notificaciones. Usa <strong>Chrome</strong> en Android o en el PC, o instala la app
          en tu iPhone.
        </p>
      )}

      {estado === "bloqueado" && (
        <p className="mt-1 text-sm">
          Las notificaciones están bloqueadas para PiezaCerca. Toca el candado junto a la dirección de la página,
          entra a <strong>Permisos → Notificaciones</strong>, escoge <strong>Permitir</strong> y recarga la página.
        </p>
      )}

      {(estado === "apagado" || estado === "activando") && (
        <>
          <p className="mt-1 text-sm">Como WhatsApp: te suena aunque estés en otra app o con el celular guardado.</p>
          <button
            type="button"
            onClick={activar}
            disabled={estado === "activando"}
            className="mt-3 min-h-12 w-full rounded-xl bg-tienda px-4 font-bold text-white disabled:opacity-60"
          >
            {estado === "activando" ? "Activando…" : "Activar notificaciones"}
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}
    </div>
  );
}
