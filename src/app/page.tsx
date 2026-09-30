import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { salir } from "./acciones";

export default async function Inicio() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = user
    ? await supabase.from("perfiles").select("nombre, es_admin").eq("id", user.id).single()
    : { data: null };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-titulo text-3xl font-bold tracking-tight">
            Pieza<span className="text-naranja">Cerca</span>
          </h1>
          <p className="mt-1 text-sm opacity-70">Repuestos de moto en Medellín</p>
        </div>

        {user ? (
          <form action={salir}>
            <button
              type="submit"
              className="min-h-11 rounded-xl border border-tinta/20 bg-white px-4 text-sm font-medium"
            >
              Salir
            </button>
          </form>
        ) : (
          <Link
            href="/entrar"
            className="flex min-h-11 items-center rounded-xl border border-tinta/20 bg-white px-4 text-sm font-medium"
          >
            Entrar
          </Link>
        )}
      </header>

      {user && (
        <p className="mt-6 text-sm">
          Hola, <strong>{perfil?.nombre ?? user.email}</strong>
          {perfil?.es_admin && (
            <span className="ml-2 rounded-full bg-tienda px-3 py-1 text-xs font-medium text-white">
              Administrador
            </span>
          )}
        </p>
      )}

      {perfil?.es_admin && (
        <Link
          href="/admin"
          className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-tienda px-4 font-semibold text-white"
        >
          Panel de administrador
        </Link>
      )}

      <section className="mt-10">
        <h2 className="font-titulo text-2xl font-semibold leading-tight">
          ¿Qué pieza necesitas hoy?
        </h2>
        <p className="mt-2 opacity-80">
          Te mostramos qué tiendas cercanas la manejan, sin llamar a cada una.
        </p>

        <button
          type="button"
          disabled
          className="mt-6 min-h-11 w-full rounded-xl bg-naranja px-4 font-semibold text-white opacity-60"
        >
          Buscar una pieza (próximamente)
        </button>
      </section>

      <section className="mt-10 space-y-3 text-sm">
        <p className="font-semibold">Así se verán las tiendas:</p>
        <div className="flex items-center justify-between rounded-xl bg-white p-4">
          <span>Motopartes La 80</span>
          <span className="rounded-full bg-ambar-suave px-3 py-1 font-medium text-ambar">
            Maneja la pieza
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white p-4">
          <span>Repuestos El Taller</span>
          <span className="rounded-full bg-verde-suave px-3 py-1 font-medium text-verde">
            La tengo · $ 45.000
          </span>
        </div>
      </section>

      <p className="mt-auto pt-10 text-center text-xs opacity-50">
        Versión en construcción
      </p>
    </main>
  );
}
