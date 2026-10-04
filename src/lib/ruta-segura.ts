// Después de entrar, la app vuelve a donde estaba la persona (ej. la búsqueda).
// Solo se aceptan rutas internas ("/buscar?..."), nunca otra página de internet.
export function rutaSegura(ruta: string | null | undefined, porDefecto = "/") {
  if (!ruta || !ruta.startsWith("/") || ruta.startsWith("//") || ruta.startsWith("/\\")) {
    return porDefecto;
  }
  return ruta;
}
