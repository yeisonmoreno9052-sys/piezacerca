import { createBrowserClient } from "@supabase/ssr";

// Conexión a Supabase para usar dentro del navegador (pantallas interactivas).
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
