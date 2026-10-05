"use client";

import { useState } from "react";
import { enlaceWhatsapp } from "@/lib/formato";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Administrador: genera el código que se le entrega a la tienda en la visita.
// La tienda lo usa en /activar y queda activa, con su dueño conectado.
export function CodigoActivacion({
  tiendaId,
  nombre,
  whatsapp,
  activa,
}: {
  tiendaId: string;
  nombre: string;
  whatsapp: string | null;
  activa: boolean;
}) {
  const [codigo, setCodigo] = useState<{ codigo: string; expira: string } | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function generar() {
    setGenerando(true);
    setError(null);
    setCopiado(false);
    const { data, error } = await crearClienteNavegador().rpc("generar_codigo_activacion", { tienda: tiendaId });
    setGenerando(false);
    const fila = (data as { codigo: string; expira_en: string }[] | null)?.[0];
    if (error || !fila) {
      setError("No se pudo generar el código. Inténtalo de nuevo.");
      return;
    }
    setCodigo({
      codigo: fila.codigo,
      expira: new Date(fila.expira_en).toLocaleDateString("es-CO", { day: "numeric", month: "long" }),
    });
  }

  const mensaje = codigo
    ? `Hola, ${nombre}. Este es tu código para activar tu tienda en PiezaCerca: ${codigo.codigo}\n\nEntra a https://piezacerca.vercel.app/activar , crea tu cuenta y escribe el código. Vence el ${codigo.expira}.`
    : "";

  return (
    <section className="mt-8 rounded-2xl border border-tinta/10 bg-white p-4">
      <h2 className="font-semibold">Código de activación</h2>
      <p className="mt-1 text-sm opacity-80">
        {activa
          ? "Esta tienda ya está activa. Si el dueño perdió el acceso, genera un código nuevo y que lo use con su cuenta."
          : "Entrégale este código al dueño en la visita. Con él activa la tienda y empieza a recibir solicitudes."}
      </p>

      {codigo && (
        <div className="mt-3 rounded-xl bg-fondo p-4 text-center">
          <p className="font-titulo text-3xl font-bold tracking-widest">{codigo.codigo}</p>
          <p className="mt-1 text-xs opacity-70">Vence el {codigo.expira}. Sirve una sola vez.</p>
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
            {whatsapp ? (
              <a
                href={enlaceWhatsapp(whatsapp, mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center rounded-xl bg-verde text-sm font-semibold text-white"
              >
                Enviar por WhatsApp
              </a>
            ) : (
              <span className="flex min-h-11 items-center justify-center rounded-xl bg-tinta/5 px-2 text-xs opacity-70">
                Sin WhatsApp cargado
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={generar}
        disabled={generando}
        className="mt-3 min-h-11 w-full rounded-xl bg-tienda px-4 font-semibold text-white disabled:opacity-60"
      >
        {generando ? "Generando…" : codigo ? "Generar otro código" : "Generar código de activación"}
      </button>
      {codigo && (
        <p className="mt-2 text-xs opacity-60">Si generas otro, el anterior deja de servir.</p>
      )}
    </section>
  );
}
