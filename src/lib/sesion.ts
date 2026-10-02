import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";

// Quién está usando la app y si es administrador.
// `cache` hace que, aunque varias partes de una misma página lo pidan, se consulte una sola vez.
// `getClaims` comprueba la firma de la sesión aquí mismo (llaves ES256), sin viajar a Supabase.
export const obtenerSesion = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    return { supabase, usuarioId: null, correo: null, perfil: null };
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, es_admin, moto_id")
    .eq("id", claims.sub)
    .single();

  return {
    supabase,
    usuarioId: claims.sub,
    correo: (claims.email as string | undefined) ?? null,
    perfil,
  };
});
