import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";

// Deja pasar solo al administrador; a cualquier otro lo devuelve al inicio.
// (La base de datos también bloquea los cambios de quien no sea administrador.)
export async function exigirAdmin() {
  const { supabase, usuarioId, perfil } = await obtenerSesion();
  if (!usuarioId) redirect("/entrar");
  if (!perfil?.es_admin) redirect("/");
  return supabase;
}
