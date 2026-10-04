import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";
import { PanelTienda } from "./panel";

export const metadata: Metadata = {
  title: "Modo tienda · PiezaCerca",
};

export default async function Tienda() {
  const { supabase, usuarioId } = await obtenerSesion();
  if (!usuarioId) redirect(`/entrar?volver=${encodeURIComponent("/tienda")}`);

  // La tienda de este usuario (puede ser dueño o empleado). Si tiene varias, se usa la primera.
  const { data: vinculo } = await supabase
    .from("usuarios_tienda")
    .select("tienda_id, tiendas(nombre, lat, lng, estado, tiempo_promedio_respuesta_seg)")
    .eq("usuario_id", usuarioId)
    .limit(1)
    .maybeSingle();

  const tienda = vinculo?.tiendas as unknown as {
    nombre: string;
    lat: number;
    lng: number;
    estado: string;
    tiempo_promedio_respuesta_seg: number | null;
  } | null;

  if (!vinculo || !tienda) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <Link href="/" className="font-titulo text-2xl font-bold">
          Pieza<span className="text-naranja">Cerca</span>
        </Link>
        <p className="mt-8 rounded-2xl bg-white p-4 text-sm">
          Tu cuenta todavía no está conectada a ninguna tienda. Si tienes una tienda de repuestos,
          habla con PiezaCerca para activarla.
        </p>
      </main>
    );
  }

  const inicioDelDia = new Date();
  inicioDelDia.setHours(0, 0, 0, 0);
  const { count: clientesHoy } = await supabase
    .from("solicitud_tiendas")
    .select("solicitud_id", { count: "exact", head: true })
    .eq("tienda_id", vinculo.tienda_id)
    .gte("enviada_en", inicioDelDia.toISOString());

  const promedio = tienda.tiempo_promedio_respuesta_seg;

  return (
    <main className="mx-auto w-full max-w-md flex-1">
      <div className="rounded-b-[28px] bg-tienda px-4 pb-5 pt-5 text-fondo">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9FD8B8]">Modo tienda</p>
            <h1 className="truncate font-titulo text-2xl font-bold">{tienda.nombre}</h1>
          </div>
          <Link href="/?modo=cliente" className="flex min-h-11 shrink-0 items-center rounded-full bg-white/10 px-4 text-sm font-semibold">
            Salir del modo
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[#1E5540] p-3">
            <p className="font-titulo text-2xl font-bold">
              {promedio ? `~${Math.max(1, Math.round(promedio / 60))} min` : "—"}
            </p>
            <p className="text-sm text-[#C8E6D5]">Tu tiempo de respuesta</p>
          </div>
          <div className="rounded-2xl bg-[#1E5540] p-3">
            <p className="font-titulo text-2xl font-bold">{clientesHoy ?? 0}</p>
            <p className="text-sm text-[#C8E6D5]">Clientes hoy</p>
          </div>
        </div>
        {tienda.estado !== "activa" && (
          <p className="mt-3 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
            Tu tienda todavía no está activa: los clientes aún no te pueden preguntar.
          </p>
        )}
      </div>

      <PanelTienda tiendaId={vinculo.tienda_id} tiendaLat={tienda.lat} tiendaLng={tienda.lng} />
    </main>
  );
}
