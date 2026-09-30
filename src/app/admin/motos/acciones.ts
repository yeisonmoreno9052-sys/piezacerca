"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/admin";

export type EstadoFormulario = { error: string | null };

const ANIO_ACTUAL = new Date().getFullYear();

function leerMoto(formData: FormData) {
  const marca = String(formData.get("marca") ?? "").trim().replace(/\s+/g, " ");
  const modelo = String(formData.get("modelo") ?? "").trim().replace(/\s+/g, " ");
  const cilindraje = Number(formData.get("cilindraje"));
  const anioDesde = Number(formData.get("anio_desde"));
  const hastaTexto = String(formData.get("anio_hasta") ?? "").trim();
  const anioHasta = hastaTexto === "" ? null : Number(hastaTexto);

  if (!marca) return { error: "Escribe la marca." };
  if (!modelo) return { error: "Escribe la referencia o modelo." };
  if (!Number.isInteger(cilindraje) || cilindraje < 50 || cilindraje > 1500) {
    return { error: "El cilindraje debe ser un número entre 50 y 1500." };
  }
  if (!Number.isInteger(anioDesde) || anioDesde < 1980 || anioDesde > ANIO_ACTUAL + 1) {
    return { error: `El año "desde" debe estar entre 1980 y ${ANIO_ACTUAL + 1}.` };
  }
  if (anioHasta !== null && (!Number.isInteger(anioHasta) || anioHasta < anioDesde)) {
    return { error: 'El año "hasta" no puede ser menor que el año "desde".' };
  }

  return {
    datos: {
      marca,
      modelo,
      cilindraje,
      anio_desde: anioDesde,
      anio_hasta: anioHasta,
    },
  };
}

function mensajeBaseDeDatos(codigo: string | undefined) {
  if (codigo === "23505") return "Esa moto ya está cargada (misma marca, referencia, cilindraje y año).";
  return "No se pudo guardar. Inténtalo de nuevo.";
}

export async function crearMoto(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await exigirAdmin();
  const moto = leerMoto(formData);
  if ("error" in moto) return { error: moto.error! };

  const { error } = await supabase.from("motos").insert(moto.datos);
  if (error) return { error: mensajeBaseDeDatos(error.code) };

  revalidatePath("/admin/motos");
  redirect("/admin/motos");
}

export async function actualizarMoto(
  id: number,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await exigirAdmin();
  const moto = leerMoto(formData);
  if ("error" in moto) return { error: moto.error! };

  const { error } = await supabase.from("motos").update(moto.datos).eq("id", id);
  if (error) return { error: mensajeBaseDeDatos(error.code) };

  revalidatePath("/admin/motos");
  redirect("/admin/motos");
}

export async function borrarMoto(id: number) {
  const supabase = await exigirAdmin();
  await supabase.from("motos").delete().eq("id", id);
  revalidatePath("/admin/motos");
  redirect("/admin/motos");
}
