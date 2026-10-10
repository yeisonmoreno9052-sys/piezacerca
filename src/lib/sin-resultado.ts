import { crearClienteNavegador } from "@/lib/supabase/client";

// Anota una búsqueda que no encontró nada (pieza o moto que no está cargada), para que el
// administrador sepa qué agregar. No guarda quién buscó. Si falla, no pasa nada.
export function anotarSinResultado(tipo: "pieza" | "moto", texto: string) {
  void crearClienteNavegador()
    .rpc("anotar_busqueda_sin_resultado", { p_tipo: tipo, p_texto: texto })
    .then(() => undefined, () => undefined);
}
