// Categorías de piezas (igual que el tipo `categoria_pieza` de la base de datos) y cómo se muestran.
export const CATEGORIAS = [
  { valor: "frenos", texto: "Frenos" },
  { valor: "luces", texto: "Luces" },
  { valor: "arrastre", texto: "Arrastre" },
  { valor: "electrico", texto: "Eléctrico" },
  { valor: "motor", texto: "Motor" },
  { valor: "otros", texto: "Otros" },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["valor"];

export function esCategoria(valor: string): valor is Categoria {
  return CATEGORIAS.some((c) => c.valor === valor);
}

export function textoCategoria(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor)?.texto ?? valor;
}
