import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Antes de cada página, renueva la sesión de Supabase si está por vencer,
// para que el usuario no tenga que volver a entrar a cada rato.
export async function proxy(request: NextRequest) {
  // Si el enlace del correo cae en otra página (p. ej. el inicio), se termina de entrar en /auth/confirmar.
  const { pathname, searchParams } = request.nextUrl;
  if (searchParams.has("code") && pathname !== "/auth/confirmar") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/auth/confirmar";
    return NextResponse.redirect(destino);
  }

  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGuardar, encabezados) {
          cookiesParaGuardar.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesParaGuardar.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          );
          Object.entries(encabezados ?? {}).forEach(([clave, valor]) =>
            respuesta.headers.set(clave, valor),
          );
        },
      },
    },
  );

  await supabase.auth.getClaims();

  return respuesta;
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos e imágenes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
