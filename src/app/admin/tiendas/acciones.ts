"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { esCategoria, MARCA_TODAS } from "@/lib/catalogo";
import { leerUbicacion, leerWhatsapp } from "@/lib/ubicacion";

export type EstadoFormulario = { error: string | null };

function limpiar(texto: string) {
  return texto.trim().replace(/\s+/g, " ");
}

async function leerTienda(formData: FormData) {
  const nombre = limpiar(String(formData.get("nombre") ?? ""));
  const direccion = limpiar(String(formData.get("direccion") ?? ""));
  const categorias = formData.getAll("categorias").map(String).filter(esCategoria);
  let marcas = formData.getAll("marcas").map((m) => limpiar(String(m))).filter(Boolean);
  if (marcas.includes(MARCA_TODAS)) marcas = [MARCA_TODAS];

  if (!nombre) return { error: "Escribe el nombre de la tienda." };
  if (!direccion) return { error: "Escribe la dirección." };

  const whatsapp = leerWhatsapp(String(formData.get("whatsapp") ?? ""));
  if ("error" in whatsapp) return { error: whatsapp.error };

  if (categorias.length === 0) return { error: "Marca al menos una línea de piezas que maneja." };
  if (marcas.length === 0) return { error: 'Marca al menos una marca de moto, o "Todas las marcas".' };

  const ubicacion = await leerUbicacion(String(formData.get("ubicacion") ?? ""));
  if ("error" in ubicacion) return { error: ubicacion.error };

  return {
    tienda: { nombre, direccion, lat: ubicacion.lat, lng: ubicacion.lng },
    whatsapp: whatsapp.numero,
    categorias,
    marcas,
  };
}

type Supabase = Awaited<ReturnType<typeof exigirAdmin>>;
type Datos = Exclude<Awaited<ReturnType<typeof leerTienda>>, { error: string }>;

// Guarda WhatsApp, líneas y marcas de la tienda (reemplaza lo que tenía).
async function guardarDetalles(supabase: Supabase, idTienda: string, datos: Datos) {
  const pasos = await Promise.all([
    datos.whatsapp
      ? supabase
          .from("tienda_contacto")
          .upsert({ tienda_id: idTienda, whatsapp: datos.whatsapp })
      : supabase.from("tienda_contacto").delete().eq("tienda_id", idTienda),
    supabase.from("tienda_categorias").delete().eq("tienda_id", idTienda),
    supabase.from("tienda_marcas").delete().eq("tienda_id", idTienda),
  ]);
  if (pasos.some((p) => p.error)) return false;

  const [cat, mar] = await Promise.all([
    supabase
      .from("tienda_categorias")
      .insert(datos.categorias.map((categoria) => ({ tienda_id: idTienda, categoria }))),
    supabase
      .from("tienda_marcas")
      .insert(datos.marcas.map((marca) => ({ tienda_id: idTienda, marca }))),
  ]);
  return !cat.error && !mar.error;
}

export async function crearTienda(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await exigirAdmin();
  const datos = await leerTienda(formData);
  if ("error" in datos) return { error: datos.error! };

  // Toda tienda nueva queda "sin confirmar" (valor por defecto en la base de datos).
  const { data: tienda, error } = await supabase
    .from("tiendas")
    .insert(datos.tienda)
    .select("id")
    .single();
  if (error || !tienda) return { error: "No se pudo guardar. Inténtalo de nuevo." };

  if (!(await guardarDetalles(supabase, tienda.id, datos))) {
    await supabase.from("tiendas").delete().eq("id", tienda.id);
    return { error: "No se pudo guardar. Inténtalo de nuevo." };
  }

  revalidatePath("/admin/tiendas");
  redirect("/admin/tiendas");
}

export async function actualizarTienda(
  id: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await exigirAdmin();
  const datos = await leerTienda(formData);
  if ("error" in datos) return { error: datos.error! };

  const { error } = await supabase.from("tiendas").update(datos.tienda).eq("id", id);
  if (error || !(await guardarDetalles(supabase, id, datos))) {
    return { error: "No se pudo guardar todo. Revisa los datos y vuelve a guardar." };
  }

  revalidatePath("/admin/tiendas");
  redirect("/admin/tiendas");
}

// Se usa cuando una tienda pide salir de la app: se borra con todo lo suyo.
export async function borrarTienda(id: string) {
  const supabase = await exigirAdmin();
  await supabase.from("tiendas").delete().eq("id", id);
  revalidatePath("/admin/tiendas");
  redirect("/admin/tiendas");
}
