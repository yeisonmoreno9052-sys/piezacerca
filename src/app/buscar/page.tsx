import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/sesion";
import { textoCategoria } from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Tiendas cercanas · PiezaCerca",
};

// Por ahora confirma la búsqueda; la lista y el mapa de tiendas son la tarea 4 de la semana 2.
export default async function Buscar({ searchParams }: PageProps<"/buscar">) {
  const { pieza, moto } = await searchParams;
  const idPieza = Number(pieza);
  const idMoto = moto ? Number(moto) : null;

  const { supabase } = await obtenerSesion();
  const [{ data: datosPieza }, { data: datosMoto }] = await Promise.all([
    Number.isInteger(idPieza)
      ? supabase.from("piezas").select("nombre, categoria").eq("id", idPieza).maybeSingle()
      : Promise.resolve({ data: null }),
    idMoto && Number.isInteger(idMoto)
      ? supabase.from("motos").select("marca, modelo, cilindraje").eq("id", idMoto).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <Link href="/" className="text-sm font-medium underline">
        ← Volver
      </Link>

      {datosPieza ? (
        <>
          <h1 className="mt-4 font-titulo text-2xl font-bold">{datosPieza.nombre}</h1>
          <p className="mt-1 text-sm opacity-70">
            {textoCategoria(datosPieza.categoria)}
            {datosMoto
              ? ` · ${datosMoto.marca} ${datosMoto.modelo} ${datosMoto.cilindraje}`
              : " · sin moto escogida"}
          </p>
          <p className="mt-6 rounded-2xl bg-white p-4 text-sm">
            Muy pronto aquí verás las tiendas cercanas que manejan esta pieza, en lista y en mapa.
          </p>
        </>
      ) : (
        <p className="mt-6 rounded-2xl bg-white p-4 text-sm">
          No encontramos esa pieza. Vuelve y búscala otra vez.
        </p>
      )}
    </main>
  );
}
