import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { CATEGORIAS } from "@/lib/catalogo";

export default async function PiezasAdmin() {
  const supabase = await exigirAdmin();
  const { data: piezas } = await supabase
    .from("piezas")
    .select("id, nombre, categoria, sinonimos")
    .order("nombre");

  const total = piezas?.length ?? 0;
  const grupos = CATEGORIAS.map((c) => ({
    ...c,
    piezas: (piezas ?? []).filter((p) => p.categoria === c.valor),
  })).filter((g) => g.piezas.length > 0);

  return (
    <>
      <Link
        href="/admin/piezas/nueva"
        className="flex min-h-11 items-center justify-center rounded-xl bg-naranja px-4 font-semibold text-white"
      >
        + Agregar pieza
      </Link>

      {total === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">
          Todavía no hay piezas. Agrega la primera con el botón de arriba.
        </p>
      ) : (
        <p className="mt-4 text-xs opacity-70">
          {total} {total === 1 ? "pieza" : "piezas"} en {grupos.length}{" "}
          {grupos.length === 1 ? "categoría" : "categorías"}. Toca una para editarla.
        </p>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.valor} className="mt-5">
          <h2 className="font-titulo text-lg font-semibold">
            {grupo.texto}{" "}
            <span className="text-sm font-normal opacity-60">({grupo.piezas.length})</span>
          </h2>
          <ul className="mt-2 space-y-2">
            {grupo.piezas.map((pieza) => (
              <li key={pieza.id}>
                <Link
                  href={`/admin/piezas/${pieza.id}`}
                  className="block min-h-11 rounded-xl bg-white px-4 py-3"
                >
                  <span className="block">{pieza.nombre}</span>
                  {pieza.sinonimos.length > 0 && (
                    <span className="mt-0.5 block truncate text-sm opacity-60">
                      {pieza.sinonimos.join(", ")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
