"use client";

import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Miembro = { usuario_id: string; nombre: string; rol: "dueno" | "empleado"; soy_yo: boolean };

// "Tu equipo": quién responde por la tienda. El dueño agrega empleados con un código (EM-…)
// y puede quitarlos. Los empleados solo ven la lista.
export function Equipo() {
  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [codigo, setCodigo] = useState<{ codigo: string; expira: string } | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function cargar() {
    const { data } = await crearClienteNavegador().rpc("mi_equipo");
    setMiembros((data ?? []) as Miembro[]);
  }

  useEffect(() => {
    let vigente = true;
    crearClienteNavegador()
      .rpc("mi_equipo")
      .then(({ data }) => vigente && setMiembros((data ?? []) as Miembro[]));
    return () => {
      vigente = false;
    };
  }, []);

  const soyDueno = miembros?.some((m) => m.soy_yo && m.rol === "dueno") ?? false;

  async function agregar() {
    setError(null);
    setCopiado(false);
    const { data, error } = await crearClienteNavegador().rpc("generar_codigo_empleado");
    const fila = (data as { codigo: string; expira_en: string }[] | null)?.[0];
    if (error || !fila) {
      setError(error?.hint === "limite" ? "Ya generaste muchos códigos hoy. Inténtalo mañana." : "No se pudo generar el código.");
      return;
    }
    setCodigo({
      codigo: fila.codigo,
      expira: new Date(fila.expira_en).toLocaleString("es-CO", { weekday: "long", hour: "numeric", minute: "2-digit" }),
    });
  }

  async function quitar(id: string) {
    setError(null);
    const { error } = await crearClienteNavegador().rpc("quitar_empleado", { usuario: id });
    if (error) setError("No se pudo quitar. Inténtalo de nuevo.");
    setQuitando(null);
    cargar();
  }

  if (!miembros || miembros.length === 0) return null;

  const mensaje = codigo
    ? `Te agregué al equipo de la tienda en PiezaCerca. Entra a https://piezacerca.vercel.app/activar , crea tu cuenta y escribe este código: ${codigo.codigo} (vence el ${codigo.expira}).`
    : "";

  return (
    <details className="rounded-2xl bg-white p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-bold">Tu equipo ({miembros.length})</summary>
      <ul className="mt-2 space-y-2">
        {miembros.map((m) => (
          <li key={m.usuario_id} className="flex items-center justify-between gap-2 rounded-xl bg-fondo p-3 text-sm">
            <span>
              <span className="font-semibold">{m.nombre}</span>
              {m.soy_yo && " (tú)"}
              <span className="block opacity-70">{m.rol === "dueno" ? "Dueño" : "Empleado"}</span>
            </span>
            {soyDueno && m.rol === "empleado" && (
              quitando === m.usuario_id ? (
                <span className="flex gap-2">
                  <button type="button" onClick={() => setQuitando(null)} className="min-h-11 rounded-xl border border-tinta/20 px-3 font-medium">
                    Cancelar
                  </button>
                  <button type="button" onClick={() => quitar(m.usuario_id)} className="min-h-11 rounded-xl bg-red-700 px-3 font-semibold text-white">
                    Sí, quitar
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setQuitando(m.usuario_id)} className="min-h-11 rounded-xl border border-red-700/40 px-3 font-medium text-red-700">
                  Quitar
                </button>
              )
            )}
          </li>
        ))}
      </ul>

      {soyDueno && (
        <div className="mt-3">
          {codigo && (
            <div className="rounded-xl bg-fondo p-4 text-center">
              <p className="text-sm">Código para tu empleado:</p>
              <p className="font-titulo text-3xl font-bold tracking-widest">{codigo.codigo}</p>
              <p className="text-xs opacity-70">Sirve una vez. Vence el {codigo.expira}.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(mensaje);
                      setCopiado(true);
                    } catch {
                      setCopiado(false);
                    }
                  }}
                  className="min-h-11 rounded-xl border border-tinta/20 bg-white text-sm font-semibold"
                >
                  {copiado ? "Copiado" : "Copiar mensaje"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center rounded-xl bg-verde text-sm font-semibold text-white"
                >
                  Enviar por WhatsApp
                </a>
              </div>
            </div>
          )}
          <button type="button" onClick={agregar} className="mt-3 min-h-11 w-full rounded-xl border-2 border-tienda font-bold text-tienda">
            {codigo ? "Generar otro código" : "+ Agregar empleado"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}
    </details>
  );
}
