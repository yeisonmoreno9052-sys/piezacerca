import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";
import { SolicitudEnVivo } from "./en-vivo";

export const metadata: Metadata = {
  title: "Tu pregunta · PiezaCerca",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Solicitud({ params }: PageProps<"/solicitud/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { usuarioId } = await obtenerSesion();
  if (!usuarioId) redirect(`/entrar?volver=${encodeURIComponent(`/solicitud/${id}`)}`);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-4">
      <SolicitudEnVivo id={id} />
    </main>
  );
}
