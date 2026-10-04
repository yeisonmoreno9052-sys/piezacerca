import type { Metadata } from "next";
import Link from "next/link";
import { FormularioEntrar } from "./formulario";

export const metadata: Metadata = {
  title: "Entrar · PiezaCerca",
};

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { error, volver } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
      <Link href="/" className="font-titulo text-3xl font-bold tracking-tight">
        Pieza<span className="text-naranja">Cerca</span>
      </Link>

      <h1 className="mt-10 font-titulo text-2xl font-semibold">Entrar</h1>
      <p className="mt-2 opacity-80">
        Para preguntar a las tiendas necesitas entrar. No hace falta contraseña: te
        enviamos un código a tu correo.
      </p>

      {error === "enlace" && (
        <p className="mt-4 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          Ese enlace ya no sirve o se abrió en otro navegador. Escribe tu correo otra vez y
          usa el código que te llega.
        </p>
      )}

      <FormularioEntrar volver={typeof volver === "string" ? volver : undefined} />
    </main>
  );
}
