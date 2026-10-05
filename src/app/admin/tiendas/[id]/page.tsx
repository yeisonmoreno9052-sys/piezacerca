import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { MARCA_TODAS } from "@/lib/catalogo";
import { mostrarWhatsapp } from "@/lib/ubicacion";
import { BotonBorrar } from "../../boton-borrar";
import { CodigoActivacion } from "./codigo-activacion";
import { actualizarTienda, borrarTienda } from "../acciones";
import { FormularioTienda } from "../formulario-tienda";
import { marcasDelCatalogo } from "../marcas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarTienda({ params }: PageProps<"/admin/tiendas/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await exigirAdmin();
  const [{ data: tienda }, { data: contacto }, { data: categorias }, { data: marcas }, catalogo] =
    await Promise.all([
      supabase
        .from("tiendas")
        .select("nombre, direccion, lat, lng, estado")
        .eq("id", id)
        .single(),
      supabase.from("tienda_contacto").select("whatsapp").eq("tienda_id", id).maybeSingle(),
      supabase.from("tienda_categorias").select("categoria").eq("tienda_id", id),
      supabase.from("tienda_marcas").select("marca").eq("tienda_id", id),
      marcasDelCatalogo(supabase),
    ]);
  if (!tienda) notFound();

  const marcasTienda = (marcas ?? []).map((m) => m.marca as string);
  // Si la tienda tiene una marca que ya no está en el catálogo, se sigue mostrando.
  const marcasDisponibles = [
    ...new Set([...catalogo, ...marcasTienda.filter((m) => m !== MARCA_TODAS)]),
  ].sort();
  const ubicacion = `${tienda.lat}, ${tienda.lng}`;

  return (
    <>
      <Link href="/admin/tiendas" className="text-sm font-medium underline">
        ← Volver a tiendas
      </Link>
      <h1 className="mt-3 font-titulo text-2xl font-semibold">{tienda.nombre}</h1>
      <p className="mb-2 text-sm opacity-70">
        {tienda.estado === "activa" ? "Activa" : "Sin confirmar"}
      </p>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${tienda.lat},${tienda.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 flex min-h-11 items-center justify-center rounded-xl border border-tinta/20 bg-white px-4 text-sm font-medium"
      >
        Ver en Google Maps
      </a>

      <FormularioTienda
        accion={actualizarTienda.bind(null, id)}
        marcasDisponibles={marcasDisponibles}
        tienda={{
          nombre: tienda.nombre,
          direccion: tienda.direccion,
          ubicacion,
          whatsapp: contacto?.whatsapp ? mostrarWhatsapp(contacto.whatsapp) : "",
          categorias: (categorias ?? []).map((c) => c.categoria as string),
          marcas: marcasTienda,
        }}
        textoBoton="Guardar cambios"
      />

      <CodigoActivacion
        tiendaId={id}
        nombre={tienda.nombre}
        whatsapp={contacto?.whatsapp ?? null}
        activa={tienda.estado === "activa"}
      />

      <section className="mt-10 border-t border-tinta/10 pt-6">
        <h2 className="font-semibold">Borrar esta tienda</h2>
        <p className="mt-1 text-sm opacity-80">
          Úsalo cuando la tienda pida salir de PiezaCerca. Se borran también sus usuarios y
          sus respuestas. Esto no se puede deshacer.
        </p>
        <BotonBorrar accion={borrarTienda.bind(null, id)} texto="Borrar tienda" />
      </section>
    </>
  );
}
