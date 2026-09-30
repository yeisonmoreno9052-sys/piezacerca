import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { crearMoto } from "../acciones";
import { FormularioMoto } from "../formulario-moto";

export default async function NuevaMoto() {
  const supabase = await exigirAdmin();
  const { data } = await supabase.from("motos").select("marca");
  const marcas = [...new Set((data ?? []).map((m) => m.marca))].sort();

  return (
    <>
      <Link href="/admin/motos" className="text-sm font-medium underline">
        ← Volver a motos
      </Link>
      <h1 className="mb-4 mt-3 font-titulo text-2xl font-semibold">Agregar moto</h1>
      <FormularioMoto accion={crearMoto} marcas={marcas} textoBoton="Guardar moto" />
    </>
  );
}
