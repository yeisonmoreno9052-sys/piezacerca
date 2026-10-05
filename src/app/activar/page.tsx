import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/sesion";
import { Activar } from "./activar";

export const metadata: Metadata = {
  title: "Activa tu tienda · PiezaCerca",
};

// La tienda llega aquí con el código que le dio PiezaCerca (PC-…) o el dueño a un empleado (EM-…).
export default async function PaginaActivar() {
  const { usuarioId, perfil, correo } = await obtenerSesion();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <div className="rounded-b-[28px] bg-tienda px-4 pb-6 pt-5 text-fondo">
        <Link href="/?modo=cliente" className="font-titulo text-2xl font-extrabold tracking-tight">
          Pieza<span className="text-[#F07A3A]">Cerca</span>
        </Link>
        <h1 className="mt-5 font-titulo text-3xl font-bold leading-tight">Activa tu tienda</h1>
        <p className="mt-2 opacity-85">
          Con el código que te entregamos, tu tienda empieza a recibir las preguntas de los mecánicos y
          motociclistas de la zona.
        </p>
      </div>
      <Activar conSesion={Boolean(usuarioId)} nombre={perfil?.nombre ?? correo ?? null} />
    </main>
  );
}
