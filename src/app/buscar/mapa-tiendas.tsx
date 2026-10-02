"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { TiendaCercana } from "./resultados";

const CLAVE = process.env.NEXT_PUBLIC_MAPTILER_KEY;

// Mapa (MapTiler + MapLibre) con el cliente en azul y las tiendas numeradas:
// ámbar = maneja la pieza (activa), gris = sin confirmar.
export function MapaTiendas({
  centro,
  tiendas,
  seleccionada,
  alSeleccionar,
}: {
  centro: { lat: number; lng: number };
  tiendas: TiendaCercana[];
  seleccionada: string | null;
  alSeleccionar: (id: string) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const marcadores = useRef(new Map<string, HTMLButtonElement>());
  const [error, setError] = useState<string | null>(
    CLAVE ? null : "El mapa todavía no está configurado.",
  );

  useEffect(() => {
    if (!CLAVE || !contenedor.current) return;
    let cancelado = false;
    let quitarMapa: (() => void) | undefined;

    import("maplibre-gl").then(({ Map, Marker, LngLatBounds }) => {
      if (cancelado || !contenedor.current) return;
      const mapa = new Map({
        container: contenedor.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${CLAVE}&language=es`,
        center: [centro.lng, centro.lat],
        zoom: 14,
        attributionControl: { compact: true },
      });
      mapa.on("error", (e) => {
        if (String(e.error?.message ?? "").match(/403|401|Forbidden|restricted/i)) {
          setError("No se pudo cargar el mapa. Usa la pestaña Lista.");
        }
      });

      const yo = document.createElement("div");
      yo.className = "size-4 rounded-full border-[3px] border-white bg-blue-600 shadow";
      yo.setAttribute("aria-label", "Tu ubicación");
      new Marker({ element: yo }).setLngLat([centro.lng, centro.lat]).addTo(mapa);

      const limites = new LngLatBounds([centro.lng, centro.lat], [centro.lng, centro.lat]);
      marcadores.current.clear();
      tiendas.forEach((tienda, i) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = String(i + 1);
        boton.setAttribute("aria-label", `${i + 1}. ${tienda.nombre}`);
        boton.className = `flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white px-2 text-sm font-bold text-white shadow ${
          tienda.puede_preguntar ? "bg-[#8A5A00]" : "bg-[#6B7079]"
        }`;
        boton.addEventListener("click", () => alSeleccionar(tienda.id));
        marcadores.current.set(tienda.id, boton);
        new Marker({ element: boton }).setLngLat([tienda.lng, tienda.lat]).addTo(mapa);
        limites.extend([tienda.lng, tienda.lat]);
      });
      if (tiendas.length > 0) mapa.fitBounds(limites, { padding: 48, maxZoom: 16, duration: 0 });

      quitarMapa = () => mapa.remove();
    });

    return () => {
      cancelado = true;
      quitarMapa?.();
    };
  }, [centro.lat, centro.lng, tiendas, alSeleccionar]);

  // Resalta el punto de la tienda escogida.
  useEffect(() => {
    marcadores.current.forEach((boton, id) => {
      boton.style.transform = id === seleccionada ? "scale(1.3)" : "";
      boton.style.zIndex = id === seleccionada ? "2" : "";
    });
  }, [seleccionada]);

  if (error) {
    return <p className="rounded-2xl bg-white p-4 text-sm">{error}</p>;
  }

  return <div ref={contenedor} className="h-[55vh] min-h-72 w-full overflow-hidden rounded-2xl" />;
}
