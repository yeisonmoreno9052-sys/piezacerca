"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Mensajes de la base de datos (campo "hint" de enviar_solicitud) en palabras para el cliente.
const MENSAJES: Record<string, string> = {
  limite: "Hiciste muchas preguntas seguidas. Espera un rato e inténtalo de nuevo.",
  sin_tiendas: "Ninguna tienda confirmada cerca maneja esta pieza en este momento.",
  cantidad: "La cantidad debe estar entre 1 y 20.",
};

// "Preguntar a las N tiendas": pide entrar si hace falta, crea la solicitud y abre la pantalla en vivo.
export function BotonPreguntar({
  cuantas,
  piezaId,
  motoId,
  lat,
  lng,
}: {
  cuantas: number;
  piezaId: number;
  motoId: number | null;
  lat: number;
  lng: number;
}) {
  const router = useRouter();
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function preguntar() {
    setEnviando(true);
    setError(null);
    const supabase = crearClienteNavegador();

    const { data: sesion } = await supabase.auth.getClaims();
    if (!sesion?.claims) {
      const aqui = window.location.pathname + window.location.search;
      router.push(`/entrar?volver=${encodeURIComponent(aqui)}`);
      return;
    }

    const { data, error } = await supabase.rpc("enviar_solicitud", {
      pieza: piezaId,
      cantidad,
      moto: motoId,
      cliente_lat: lat,
      cliente_lng: lng,
    });
    if (error || !data) {
      setEnviando(false);
      setError(MENSAJES[error?.hint ?? ""] ?? "No pudimos enviar la pregunta. Inténtalo de nuevo.");
      return;
    }
    router.push(`/solicitud/${data}`);
  }

  const boton =
    "flex size-11 items-center justify-center rounded-xl border border-tinta/20 bg-white text-lg font-bold disabled:opacity-40";

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">Cantidad</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Una menos"
            disabled={cantidad <= 1}
            onClick={() => setCantidad(cantidad - 1)}
            className={boton}
          >
            −
          </button>
          <span className="w-6 text-center text-lg font-bold" aria-live="polite">
            {cantidad}
          </span>
          <button
            type="button"
            aria-label="Una más"
            disabled={cantidad >= 20}
            onClick={() => setCantidad(cantidad + 1)}
            className={boton}
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={preguntar}
        disabled={enviando}
        className="min-h-13 w-full rounded-2xl bg-naranja px-4 font-bold text-white disabled:opacity-60"
      >
        {enviando
          ? "Enviando…"
          : `Preguntar a ${cuantas === 1 ? "la tienda" : `las ${cuantas} tiendas`}`}
      </button>
      <p className="mt-1 text-center text-xs opacity-70">
        Les llega a todas a la vez y tienen 10 minutos para responderte.
      </p>

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}
    </>
  );
}
