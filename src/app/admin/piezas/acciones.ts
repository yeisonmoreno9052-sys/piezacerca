"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";
import { esCategoria } from "@/lib/catalogo";

export type EstadoFormulario = { error: string | null };

function limpiar(texto: string) {
  return texto.trim().replace(/\s+/g, " ");
}

function leerPieza(formData: FormData) {
  const nombre = limpiar(String(formData.get("nombre") ?? ""));
  const categoria = String(formData.get("categoria") ?? "");

  // "faro, luz delantera, farol" -> ["faro", "luz delantera", "farol"], sin repetidos ni el nombre mismo
  const vistos = new Set([nombre.toLowerCase()]);
  const sinonimos: string[] = [];
  for (const parte of String(formData.get("sinonimos") ?? "").split(",")) {
    const s = limpiar(parte);
    if (s && !vistos.has(s.toLowerCase())) {
      vistos.add(s.toLowerCase());
      sinonimos.push(s);
    }
  }

  if (!nombre) return { error: "Escribe el nombre de la pieza." };
  if (nombre.length > 80) return { error: "El nombre es muy largo (máximo 80 letras)." };
  if (!esCategoria(categoria)) return { error: "Escoge una categoría." };

  return { datos: { nombre, categoria, sinonimos } };
}

// Evita dos piezas con el mismo nombre (sin importar mayúsculas).
async function nombreRepetido(
  supabase: Awaited<ReturnType<typeof exigirAdmin>>,
  nombre: string,
  idActual?: number,
) {
  const patron = nombre.replace(/[\\%_]/g, (c) => `\\${c}`);
  let consulta = supabase.from("piezas").select("id").ilike("nombre", patron).limit(1);
  if (idActual) consulta = consulta.neq("id", idActual);
  const { data } = await consulta;
  return (data?.length ?? 0) > 0;
}

export async function crearPieza(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await exigirAdmin();
  const pieza = leerPieza(formData);
  if ("error" in pieza) return { error: pieza.error! };
  if (await nombreRepetido(supabase, pieza.datos.nombre)) {
    return { error: "Ya existe una pieza con ese nombre." };
  }

  const { error } = await supabase.from("piezas").insert(pieza.datos);
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };

  revalidatePath("/admin/piezas");
  redirect("/admin/piezas");
}

export async function actualizarPieza(
  id: number,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await exigirAdmin();
  const pieza = leerPieza(formData);
  if ("error" in pieza) return { error: pieza.error! };
  if (await nombreRepetido(supabase, pieza.datos.nombre, id)) {
    return { error: "Ya existe otra pieza con ese nombre." };
  }

  const { error } = await supabase.from("piezas").update(pieza.datos).eq("id", id);
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };

  revalidatePath("/admin/piezas");
  redirect("/admin/piezas");
}

export async function borrarPieza(id: number) {
  const supabase = await exigirAdmin();
  const { error } = await supabase.from("piezas").delete().eq("id", id);
  // 23503: la pieza ya aparece en solicitudes de clientes y no se puede borrar
  if (error?.code === "23503") redirect(`/admin/piezas/${id}?error=en-uso`);
  revalidatePath("/admin/piezas");
  redirect("/admin/piezas");
}
