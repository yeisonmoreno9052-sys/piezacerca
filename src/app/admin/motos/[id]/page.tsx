import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { actualizarMoto, borrarMoto } from "../acciones";
import { FormularioMoto } from "../formulario-moto";
import { BotonBorrar } from "./boton-borrar";

export default async function EditarMoto({ params }: PageProps<"/admin/motos/[id]">) {
  const { id } = await params;
  const idMoto = Number(id);
  if (!Number.isInteger(idMoto)) notFound();

  const supabase = await exigirAdmin();
  const [{ data: moto }, { data: todas }, { count: piezas }] = await Promise.all([
    supabase
      .from("motos")
      .select("marca, modelo, cilindraje, anio_desde, anio_hasta")
      .eq("id", idMoto)
      .single(),
    supabase.from("motos").select("marca"),
    supabase
      .from("compatibilidades")
      .select("pieza_id", { count: "exact", head: true })
      .eq("moto_id", idMoto),
  ]);
  if (!moto) notFound();

  const marcas = [...new Set((todas ?? []).map((m) => m.marca))].sort();

  return (
    <>
      <Link href="/admin/motos" className="text-sm font-medium underline">
        ← Volver a motos
      </Link>
      <h1 className="mb-4 mt-3 font-titulo text-2xl font-semibold">
        {moto.marca} {moto.modelo} {moto.cilindraje}
      </h1>

      <FormularioMoto
        accion={actualizarMoto.bind(null, idMoto)}
        marcas={marcas}
        moto={moto}
        textoBoton="Guardar cambios"
      />

      <section className="mt-10 border-t border-tinta/10 pt-6">
        <h2 className="font-semibold">Borrar esta moto</h2>
        <p className="mt-1 text-sm opacity-80">
          {piezas
            ? `Se quitará de ${piezas} ${piezas === 1 ? "pieza compatible" : "piezas compatibles"}. `
            : ""}
          Esto no se puede deshacer.
        </p>
        <BotonBorrar accion={borrarMoto.bind(null, idMoto)} />
      </section>
    </>
  );
}
