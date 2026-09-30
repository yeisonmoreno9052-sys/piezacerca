import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

// Deja pasar solo al administrador; a cualquier otro lo devuelve al inicio.
// (La base de datos también bloquea los cambios de quien no sea administrador.)
export async function exigirAdmin() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("es_admin")
    .eq("id", user.id)
    .single();
  if (!perfil?.es_admin) redirect("/");

  return supabase;
}
