"use client";

import { useUbicacion } from "@/lib/guardado-local";

// Muestra desde dónde se busca (la ubicación vive solo en el celular del cliente).
export function ZonaActual() {
  const ubicacion = useUbicacion();
  return (
    <p className="mt-1 text-sm opacity-70">
      {ubicacion ? `Cerca de: ${ubicacion.nombre}` : "Sin ubicación escogida"}
    </p>
  );
}
