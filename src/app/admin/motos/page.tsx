import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";

function anios(desde: number, hasta: number | null) {
  return hasta ? `${desde}–${hasta}` : `${desde} en adelante`;
}

export default async function MotosAdmin() {
  const supabase = await exigirAdmin();
  const { data: motos } = await supabase
    .from("motos")
    .select("id, marca, modelo, cilindraje, anio_desde, anio_hasta")
    .order("marca")
    .order("modelo")
    .order("cilindraje")
    .order("anio_desde");

  const porMarca = new Map<string, NonNullable<typeof motos>>();
  for (const moto of motos ?? []) {
    porMarca.set(moto.marca, [...(porMarca.get(moto.marca) ?? []), moto]);
  }

  return (
    <>
      <Link
        href="/admin/motos/nueva"
        className="flex min-h-11 items-center justify-center rounded-xl bg-naranja px-4 font-semibold text-white"
      >
        + Agregar moto
      </Link>

      {porMarca.size === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">
          Todavía no hay motos. Agrega la primera con el botón de arriba.
        </p>
      ) : (
        <p className="mt-4 text-xs opacity-70">
          {motos!.length} {motos!.length === 1 ? "moto" : "motos"} en {porMarca.size}{" "}
          {porMarca.size === 1 ? "marca" : "marcas"}. Toca una para editarla.
        </p>
      )}

      {[...porMarca].map(([marca, lista]) => (
        <section key={marca} className="mt-5">
          <h2 className="font-titulo text-lg font-semibold">{marca}</h2>
          <ul className="mt-2 space-y-2">
            {lista.map((moto) => (
              <li key={moto.id}>
                <Link
                  href={`/admin/motos/${moto.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3"
                >
                  <span>
                    {moto.modelo} {moto.cilindraje}
                  </span>
                  <span className="text-sm opacity-70">
                    {anios(moto.anio_desde, moto.anio_hasta)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
