import Link from "next/link";
import { obtenerSesion } from "@/lib/sesion";
import { salir } from "./acciones";
import { Buscador, type Moto, type Pieza } from "./buscador";

export default async function Inicio() {
  const { supabase, usuarioId, perfil } = await obtenerSesion();
  const [{ data: motos }, { data: piezas }] = await Promise.all([
    supabase
      .from("motos")
      .select("id, marca, modelo, cilindraje")
      .order("marca")
      .order("modelo")
      .order("cilindraje"),
    supabase.from("piezas").select("id, nombre, categoria").order("nombre"),
  ]);

  const enlaceCuenta =
    "flex min-h-11 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-fondo";

  const cabecera = (
    <div className="flex items-center justify-between gap-3">
      <Link href="/" className="font-titulo text-2xl font-extrabold tracking-tight">
        Pieza<span className="text-[#F07A3A]">Cerca</span>
      </Link>
      <div className="flex items-center gap-2">
        {perfil?.es_admin && (
          <Link href="/admin" className={enlaceCuenta}>
            Panel
          </Link>
        )}
        {usuarioId ? (
          <form action={salir}>
            <button type="submit" className={enlaceCuenta}>
              Salir
            </button>
          </form>
        ) : (
          <Link href="/entrar" className={enlaceCuenta}>
            Entrar
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1">
      <Buscador
        cabecera={cabecera}
        motos={(motos ?? []) as Moto[]}
        piezas={(piezas ?? []) as Pieza[]}
        conSesion={Boolean(usuarioId)}
        motoDelPerfil={(perfil?.moto_id as number | null | undefined) ?? null}
      />
    </main>
  );
}
