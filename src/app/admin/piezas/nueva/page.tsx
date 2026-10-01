import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { crearPieza } from "../acciones";
import { FormularioPieza } from "../formulario-pieza";

export default async function NuevaPieza() {
  await exigirAdmin();

  return (
    <>
      <Link href="/admin/piezas" className="text-sm font-medium underline">
        ← Volver a piezas
      </Link>
      <h1 className="mb-4 mt-3 font-titulo text-2xl font-semibold">Agregar pieza</h1>
      <FormularioPieza accion={crearPieza} textoBoton="Guardar pieza" />
    </>
  );
}
