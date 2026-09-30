import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Conexión a Supabase para usar en el servidor (páginas y acciones de Next.js).
export async function crearClienteServidor() {
  const almacenCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(cookiesParaGuardar) {
          try {
            cookiesParaGuardar.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options),
            );
          } catch {
            // Desde un componente de servidor no se pueden escribir cookies;
            // la sesión se refresca en otro punto cuando agreguemos el inicio de sesión.
          }
        },
      },
    },
  );
}
