import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";

// Quién está usando la app, si es administrador y si es de una tienda.
// `cache` hace que, aunque varias partes de una misma página lo pidan, se consulte una sola vez.
// `getClaims` comprueba la firma de la sesión aquí mismo (llaves ES256), sin viajar a Supabase.
export const obtenerSesion = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    return { supabase, usuarioId: null, correo: null, perfil: null, tiendaId: null };
  }

  const [{ data: perfil }, { data: vinculo }] = await Promise.all([
    supabase.from("perfiles").select("nombre, es_admin, moto_id").eq("id", claims.sub).single(),
    supabase.from("usuarios_tienda").select("tienda_id").eq("usuario_id", claims.sub).limit(1).maybeSingle(),
  ]);

  return {
    supabase,
    usuarioId: claims.sub,
    correo: (claims.email as string | undefined) ?? null,
    perfil,
    tiendaId: (vinculo?.tienda_id as string | undefined) ?? null,
  };
});
