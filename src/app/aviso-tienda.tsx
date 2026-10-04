"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sonarAviso } from "@/lib/aviso-sonoro";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Para usuarios de una tienda: si están en cualquier pantalla de la app (fuera del Modo tienda)
// y llega una solicitud nueva, aparece arriba "Tienes N solicitudes nuevas · Ver", con sonido.
export function AvisoTienda({ tiendaId }: { tiendaId: string }) {
  const ruta = usePathname();
  const [nuevas, setNuevas] = useState(0);
  const anterior = useRef<number | null>(null);
  const enModoTienda = ruta.startsWith("/tienda");

  useEffect(() => {
    if (enModoTienda) return;
    let vigente = true;
    const supabase = crearClienteNavegador();

    async function contar() {
      const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const [{ data: envios }, { data: respuestas }] = await Promise.all([
        supabase
          .from("solicitud_tiendas")
          .select("solicitud_id, solicitudes(vence_en)")
          .eq("tienda_id", tiendaId)
          .is("respondida_en", null)
          .gte("enviada_en", desde),
        supabase.from("respuestas").select("solicitud_id").eq("tienda_id", tiendaId).gte("respondida_en", desde),
      ]);
      if (!vigente) return;
      const respondidas = new Set((respuestas ?? []).map((r) => r.solicitud_id));
      const cuantas = (envios ?? []).filter((e) => {
        const s = (Array.isArray(e.solicitudes) ? e.solicitudes[0] : e.solicitudes) as { vence_en: string } | null;
        return s && new Date(s.vence_en).getTime() > Date.now() && !respondidas.has(e.solicitud_id);
      }).length;
      if (anterior.current !== null && cuantas > anterior.current) sonarAviso();
      anterior.current = cuantas;
      setNuevas(cuantas);
    }

    contar();
    const canal = supabase
      .channel(`aviso-tienda-${tiendaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitud_tiendas", filter: `tienda_id=eq.${tiendaId}` },
        contar,
      )
      .subscribe();
    const respaldo = setInterval(contar, 15000);
    return () => {
      vigente = false;
      clearInterval(respaldo);
      supabase.removeChannel(canal);
    };
  }, [tiendaId, enModoTienda]);

  if (enModoTienda || nuevas === 0) return null;

  return (
    <Link
      href="/tienda"
      role="alert"
      className="sticky top-0 z-50 flex min-h-12 items-center justify-between gap-3 bg-tienda px-4 py-2 text-sm font-semibold text-white"
    >
      <span>
        Tienes {nuevas} {nuevas === 1 ? "solicitud nueva" : "solicitudes nuevas"}
      </span>
      <span className="rounded-full bg-white px-3 py-1 text-tienda">Ver</span>
    </Link>
  );
}
