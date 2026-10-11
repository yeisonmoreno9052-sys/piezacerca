import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";
import { Mostrador } from "./mostrador";

export const metadata: Metadata = {
  title: "Mostrador · PiezaCerca",
};

// Modo mostrador: pantalla grande para el computador de la tienda (tablero de tres columnas, diseño "Taller de noche").
export default async function PaginaMostrador() {
  const { supabase, usuarioId, tiendaId } = await obtenerSesion();
  if (!usuarioId) redirect(`/entrar?volver=${encodeURIComponent("/tienda/mostrador")}`);

  const { data: tienda } = tiendaId
    ? await supabase.from("tiendas").select("nombre, cerrada_desde, tiempo_promedio_respuesta_seg").eq("id", tiendaId).maybeSingle()
    : { data: null };

  if (!tiendaId || !tienda) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <p className="rounded-2xl bg-white p-4 text-sm">
          Tu cuenta todavía no está conectada a ninguna tienda.{" "}
          <Link href="/" className="font-semibold underline">
            Volver al inicio
          </Link>
        </p>
      </main>
    );
  }

  return (
    <Mostrador
      tiendaId={tiendaId}
      nombre={tienda.nombre}
      cerradaDesde={tienda.cerrada_desde}
      tiempoRespuestaSeg={tienda.tiempo_promedio_respuesta_seg}
    />
  );
}
