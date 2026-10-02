"use client";

import { useState } from "react";
import { guardarUbicacion } from "@/lib/guardado-local";
import { ZONAS, type Ubicacion } from "@/lib/zonas";

// Panel para decir dónde está el cliente: GPS del celular o una zona del piloto.
export function SelectorUbicacion({
  mensaje,
  alElegir,
  alCancelar,
}: {
  mensaje?: string;
  alElegir: (ubicacion: Ubicacion) => void;
  alCancelar: () => void;
}) {
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegir(ubicacion: Ubicacion) {
    guardarUbicacion(ubicacion);
    alElegir(ubicacion);
  }

  function usarGps() {
    if (!navigator.geolocation) {
      setError("Este navegador no permite usar la ubicación. Escoge tu zona de la lista.");
      return;
    }
    setBuscandoGps(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setBuscandoGps(false);
        elegir({
          tipo: "gps",
          nombre: "Mi ubicación",
          lat: Number(posicion.coords.latitude.toFixed(5)),
          lng: Number(posicion.coords.longitude.toFixed(5)),
        });
      },
      (e) => {
        setBuscandoGps(false);
        setError(
          e.code === e.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Escoge tu zona de la lista, o actívalo en el navegador (el candado junto a la dirección)."
            : "No se pudo obtener tu ubicación. Revisa que el GPS esté encendido, o escoge tu zona de la lista.",
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-white p-4 text-tinta">
      <p className="font-semibold">¿Dónde estás?</p>
      <p className="mt-1 text-sm opacity-70">
        {mensaje ?? "Así te mostramos las tiendas más cercanas."}
      </p>

      <button
        type="button"
        onClick={usarGps}
        disabled={buscandoGps}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-naranja px-4 font-semibold text-white disabled:opacity-60"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="7" />
        </svg>
        {buscandoGps ? "Buscando tu ubicación…" : "Usar mi ubicación (GPS)"}
      </button>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider opacity-60">O escoge tu zona</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {ZONAS.map((zona) => (
          <button
            key={zona.id}
            type="button"
            onClick={() => elegir({ tipo: "zona", nombre: zona.nombre, lat: zona.lat, lng: zona.lng })}
            className="min-h-12 rounded-xl border border-tinta/15 px-3 font-medium"
          >
            {zona.nombre}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={alCancelar}
        className="mt-3 min-h-11 w-full rounded-xl text-sm font-medium underline"
      >
        Cancelar
      </button>
    </div>
  );
}
