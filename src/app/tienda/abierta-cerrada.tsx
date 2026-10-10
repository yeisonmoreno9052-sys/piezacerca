"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

// "Estoy cerrado": mientras la tienda está cerrada, los clientes la ven en la lista pero no le pueden
// preguntar, y así no queda como "no respondió". Cualquier persona de la tienda la cierra o la abre.
export function AbiertaCerrada({
  tiendaId,
  cerradaDesde,
  oscuro = false,
}: {
  tiendaId: string;
  cerradaDesde: string | null;
  oscuro?: boolean;
}) {
  const router = useRouter();
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cerrada = cerradaDesde !== null;

  async function cambiar() {
    setCambiando(true);
    setError(null);
    const { error } = await crearClienteNavegador().rpc("cambiar_cerrada", {
      tienda: tiendaId,
      cerrada: !cerrada,
    });
    if (error) setError("No se pudo cambiar. Revisa la conexión e inténtalo de nuevo.");
    router.refresh();
    setCambiando(false);
  }

  if (cerrada) {
    const desde = new Date(cerradaDesde).toLocaleString("es-CO", {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    });
    return (
      <div className="rounded-2xl border-2 border-ambar bg-ambar-suave p-4 text-ambar">
        <p className="font-bold">Estás cerrado: los clientes no te pueden preguntar</p>
        <p className="mt-1 text-sm">Cerraste el {desde}. Cuando abras, toca el botón para volver a recibir preguntas.</p>
        <button
          type="button"
          onClick={cambiar}
          disabled={cambiando}
          className="mt-3 min-h-12 w-full rounded-xl bg-verde px-4 font-bold text-white disabled:opacity-60"
        >
          {cambiando ? "Abriendo…" : "Ya abrí: recibir preguntas"}
        </button>
        {error && <p role="alert" className="mt-2 text-sm font-semibold">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={cambiar}
        disabled={cambiando}
        className={`min-h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-60 ${
          oscuro ? "bg-white/15 text-white" : "w-full border border-tinta/20 bg-white text-tinta"
        }`}
      >
        {cambiando ? "Cerrando…" : "Estoy cerrado (no recibir preguntas)"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-ambar">{error}</p>}
    </div>
  );
}
