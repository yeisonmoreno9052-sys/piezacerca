import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/sesion";
import { textoCategoria } from "@/lib/catalogo";
import { Resultados } from "./resultados";

export const metadata: Metadata = {
  title: "Tiendas cercanas · PiezaCerca",
};

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
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        {datosPieza && (
          <div className="min-w-0">
            <h1 className="truncate font-titulo text-xl font-bold">{datosPieza.nombre}</h1>
            <p className="truncate text-sm opacity-70">
              {textoCategoria(datosPieza.categoria)}
              {datosMoto
                ? ` · ${datosMoto.marca} ${datosMoto.modelo} ${datosMoto.cilindraje}`
                : " · cualquier moto"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {datosPieza ? (
          <Resultados categoria={datosPieza.categoria} marcaMoto={datosMoto?.marca ?? null} />
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm">
            No encontramos esa pieza. Vuelve y búscala otra vez.
          </p>
        )}
      </div>
    </main>
  );
}
