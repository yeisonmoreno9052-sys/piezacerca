import type { exigirAdmin } from "@/lib/admin";

// Marcas de moto cargadas en el catálogo, para las casillas del formulario de tienda.
export async function marcasDelCatalogo(supabase: Awaited<ReturnType<typeof exigirAdmin>>) {
  const { data } = await supabase.from("motos").select("marca");
  return [...new Set((data ?? []).map((m) => m.marca as string))].sort();
}
