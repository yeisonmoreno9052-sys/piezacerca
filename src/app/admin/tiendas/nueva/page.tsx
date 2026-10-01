import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { crearTienda } from "../acciones";
import { FormularioTienda } from "../formulario-tienda";
import { marcasDelCatalogo } from "../marcas";

export default async function NuevaTienda() {
  const supabase = await exigirAdmin();
  const marcas = await marcasDelCatalogo(supabase);

  return (
    <>
      <Link href="/admin/tiendas" className="text-sm font-medium underline">
        ← Volver a tiendas
      </Link>
      <h1 className="mt-3 font-titulo text-2xl font-semibold">Agregar tienda</h1>
      <p className="mb-4 text-sm opacity-70">
        Queda como &quot;Sin confirmar&quot; hasta que la tienda active su cuenta con un código.
      </p>
      <FormularioTienda
        accion={crearTienda}
        marcasDisponibles={marcas}
        textoBoton="Guardar tienda"
      />
    </>
  );
}
