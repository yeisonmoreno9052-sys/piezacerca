import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { textoCategoria } from "@/lib/catalogo";
import { BotonBorrar } from "../../boton-borrar";
import { actualizarPieza, borrarPieza } from "../acciones";
import { FormularioPieza } from "../formulario-pieza";

export default async function EditarPieza({
  params,
  searchParams,
}: PageProps<"/admin/piezas/[id]">) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const idPieza = Number(id);
  if (!Number.isInteger(idPieza)) notFound();

  const supabase = await exigirAdmin();
  const { data: pieza } = await supabase
    .from("piezas")
    .select("nombre, categoria, sinonimos")
    .eq("id", idPieza)
    .single();
  if (!pieza) notFound();

  return (
    <>
      <Link href="/admin/piezas" className="text-sm font-medium underline">
        ← Volver a piezas
      </Link>
      <h1 className="mt-3 font-titulo text-2xl font-semibold">{pieza.nombre}</h1>
      <p className="mb-4 text-sm opacity-70">{textoCategoria(pieza.categoria)}</p>

      <FormularioPieza
        accion={actualizarPieza.bind(null, idPieza)}
        pieza={pieza}
        textoBoton="Guardar cambios"
      />

      <section className="mt-10 border-t border-tinta/10 pt-6">
        <h2 className="font-semibold">Borrar esta pieza</h2>
        {error === "en-uso" ? (
          <p role="alert" className="mt-2 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
            No se puede borrar: esta pieza ya aparece en solicitudes de clientes. Puedes
            cambiarle el nombre o los otros nombres.
          </p>
        ) : (
          <p className="mt-1 text-sm opacity-80">Esto no se puede deshacer.</p>
        )}
        <BotonBorrar accion={borrarPieza.bind(null, idPieza)} texto="Borrar pieza" />
      </section>
    </>
  );
}
