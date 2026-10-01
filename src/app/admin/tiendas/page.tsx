import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";

export default async function TiendasAdmin() {
  const supabase = await exigirAdmin();
  const { data: tiendas } = await supabase
    .from("tiendas")
    .select("id, nombre, direccion, estado")
    .order("nombre");

  const total = tiendas?.length ?? 0;
  const grupos = [
    { titulo: "Activas", tiendas: (tiendas ?? []).filter((t) => t.estado === "activa") },
    {
      titulo: "Sin confirmar",
      tiendas: (tiendas ?? []).filter((t) => t.estado === "sin_confirmar"),
    },
  ].filter((g) => g.tiendas.length > 0);

  return (
    <>
      <Link
        href="/admin/tiendas/nueva"
        className="flex min-h-11 items-center justify-center rounded-xl bg-naranja px-4 font-semibold text-white"
      >
        + Agregar tienda
      </Link>

      {total === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">
          Todavía no hay tiendas. Agrega la primera con el botón de arriba.
        </p>
      ) : (
        <p className="mt-4 text-xs opacity-70">
          {total} {total === 1 ? "tienda" : "tiendas"}. Toca una para editarla.
        </p>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.titulo} className="mt-5">
          <h2 className="font-titulo text-lg font-semibold">
            {grupo.titulo}{" "}
            <span className="text-sm font-normal opacity-60">({grupo.tiendas.length})</span>
          </h2>
          <ul className="mt-2 space-y-2">
            {grupo.tiendas.map((tienda) => (
              <li key={tienda.id}>
                <Link
                  href={`/admin/tiendas/${tienda.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{tienda.nombre}</span>
                    <span className="block truncate text-sm opacity-60">{tienda.direccion}</span>
                  </span>
                  {tienda.estado === "activa" ? (
                    <span className="shrink-0 rounded-full bg-verde-suave px-3 py-1 text-xs font-medium text-verde">
                      Activa
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-tinta/10 px-3 py-1 text-xs font-medium">
                      Sin confirmar
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
