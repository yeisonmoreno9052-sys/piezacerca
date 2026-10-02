"use server";

import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

// Guarda "mi moto" en el perfil de quien entró con su cuenta.
// (Si no entró, la moto queda guardada solo en su celular.)
export async function guardarMiMoto(motoId: number | null) {
  const { supabase, usuarioId } = await obtenerSesion();
  if (!usuarioId) return;
  await supabase.from("perfiles").update({ moto_id: motoId }).eq("id", usuarioId);
}

export async function salir() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/");
}
