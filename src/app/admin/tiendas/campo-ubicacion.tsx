"use client";

import { useRef, useState } from "react";
import { revisarUbicacion } from "./acciones";

type Revision =
  | { tipo: "nada" }
  | { tipo: "revisando" }
  | { tipo: "ok"; lat: number; lng: number; lugar: string | null; precision?: number }
  | { tipo: "error"; mensaje: string };

const campo =
  "mt-1 min-h-11 w-full rounded-xl border border-tinta/20 bg-white px-4 py-3 text-base outline-none focus:border-naranja";

function revisionInicial(valor: string): Revision {
  const m = valor.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  return m ? { tipo: "ok", lat: Number(m[1]), lng: Number(m[2]), lugar: null } : { tipo: "nada" };
}

// Campo "Ubicación en el mapa": acepta enlace de Google Maps, coordenadas o el GPS del celular,
// y muestra el punto encontrado antes de guardar.
export function CampoUbicacion({ valorInicial = "" }: { valorInicial?: string }) {
  const [texto, setTexto] = useState(valorInicial);
  const [revision, setRevision] = useState<Revision>(() => revisionInicial(valorInicial));
  const [buscandoGps, setBuscandoGps] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaRevision = useRef(0);

  async function revisar(valor: string, precision?: number) {
    const numero = ++ultimaRevision.current;
    const resultado = await revisarUbicacion(valor);
    if (numero !== ultimaRevision.current) return; // llegó una revisión más nueva
    setRevision(
      "error" in resultado
        ? { tipo: "error", mensaje: resultado.error }
        : { tipo: "ok", ...resultado, precision },
    );
  }

  function alEscribir(valor: string) {
    setTexto(valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    if (!valor.trim()) {
      ultimaRevision.current++;
      setRevision({ tipo: "nada" });
      return;
    }
    setRevision({ tipo: "revisando" });
    temporizador.current = setTimeout(() => revisar(valor), 700);
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setRevision({ tipo: "error", mensaje: "Este navegador no permite usar la ubicación." });
      return;
    }
    if (temporizador.current) clearTimeout(temporizador.current);
    setBuscandoGps(true);
    setRevision({ tipo: "revisando" });
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setBuscandoGps(false);
        const valor = `${posicion.coords.latitude.toFixed(6)}, ${posicion.coords.longitude.toFixed(6)}`;
        setTexto(valor);
        revisar(valor, Math.round(posicion.coords.accuracy));
      },
      (error) => {
        setBuscandoGps(false);
        ultimaRevision.current++;
        setRevision({
          tipo: "error",
          mensaje:
            error.code === error.PERMISSION_DENIED
              ? "No diste permiso de ubicación. Actívalo para esta página en el navegador (el candado junto a la dirección) y vuelve a intentar."
              : "No se pudo obtener tu ubicación. Revisa que el GPS esté encendido, sal a un lugar abierto e intenta de nuevo.",
        });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium">
        Ubicación en el mapa
        <textarea
          name="ubicacion"
          required
          rows={2}
          placeholder="Pega el enlace de Google Maps o las coordenadas"
          value={texto}
          onChange={(e) => alEscribir(e.target.value)}
          className={campo}
        />
      </label>

      <button
        type="button"
        onClick={usarMiUbicacion}
        disabled={buscandoGps}
        className="mt-2 min-h-11 w-full rounded-xl border border-tinta/20 bg-white px-4 text-sm font-medium disabled:opacity-60"
      >
        {buscandoGps ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}
      </button>
      <p className="mt-1 text-xs opacity-70">
        Úsalo cuando estés dentro de la tienda. O pega el enlace de &quot;Compartir&quot; de Google
        Maps, o coordenadas como 6.2775, -75.5964.
      </p>

      {revision.tipo === "revisando" && (
        <p className="mt-2 rounded-xl bg-white p-3 text-sm opacity-70">Revisando la ubicación…</p>
      )}

      {revision.tipo === "error" && (
        <p role="alert" className="mt-2 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {revision.mensaje}
        </p>
      )}

      {revision.tipo === "ok" && (
        <div className="mt-2 rounded-xl bg-verde-suave p-3 text-sm text-verde">
          <p className="font-semibold">Ubicación encontrada</p>
          {revision.lugar && <p className="mt-1">{revision.lugar}</p>}
          <p className="mt-1 text-xs">
            {revision.lat}, {revision.lng}
            {revision.precision !== undefined && ` · precisión de ${revision.precision} m`}
          </p>
          {revision.precision !== undefined && revision.precision > 50 && (
            <p className="mt-1 text-xs">
              La precisión es baja. Si puedes, acércate a la puerta o sal a la calle y vuelve a
              tocar el botón.
            </p>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${revision.lat},${revision.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-white px-4 font-medium text-verde"
          >
            Ver el punto en el mapa
          </a>
        </div>
      )}
    </div>
  );
}
