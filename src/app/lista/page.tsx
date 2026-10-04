import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/sesion";
import { ListaSoloNavegador, type ListaLista } from "./lista-solo-navegador";

export const metadata: Metadata = {
  title: "Arma tu lista · PiezaCerca",
};

type FilaItems = { cantidad: number; piezas: { id: number; nombre: string } | { id: number; nombre: string }[] }[];

function aItems(filas: FilaItems | null) {
  return (filas ?? []).flatMap((f) => {
    const p = Array.isArray(f.piezas) ? f.piezas[0] : f.piezas;
    return p ? [{ id: p.id, nombre: p.nombre, cantidad: f.cantidad }] : [];
  });
}

export default async function Lista() {
  const { supabase, usuarioId, perfil } = await obtenerSesion();

  const [{ data: paquetes }, { data: guardadas }, { data: motos }] = await Promise.all([
    supabase
      .from("paquetes")
      .select("id, nombre, paquete_items(cantidad, piezas(id, nombre))")
      .order("orden"),
    usuarioId
      ? supabase
          .from("listas_guardadas")
          .select("id, nombre, creada_en, lista_items(cantidad, piezas(id, nombre))")
          .eq("cliente_id", usuarioId)
          .order("creada_en", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("motos").select("id, marca, modelo, cilindraje"),
  ]);

  const listasListas: ListaLista[] = (paquetes ?? []).map((p) => ({
    tipo: "paquete",
    id: String(p.id),
    nombre: p.nombre,
    items: aItems(p.paquete_items as unknown as FilaItems),
  }));
  const misListas: ListaLista[] = (guardadas ?? []).map((l) => ({
    tipo: "guardada",
    id: l.id as string,
    nombre: l.nombre as string,
    items: aItems(l.lista_items as unknown as FilaItems),
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1">
      <ListaSoloNavegador
        paquetes={listasListas}
        misListas={misListas}
        conSesion={Boolean(usuarioId)}
        motos={(motos ?? []) as { id: number; marca: string; modelo: string; cilindraje: number }[]}
        motoDelPerfil={(perfil?.moto_id as number | null | undefined) ?? null}
      />
    </main>
  );
}
