"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sonarAviso } from "@/lib/aviso-sonoro";
import { formatoPesos } from "@/lib/formato";
import { descripcion, loQueTiene, useSolicitudesTienda } from "../datos";
import { TarjetaSolicitud } from "../panel";

// Mientras haya solicitudes sin responder, el sonido se repite cada tantos segundos.
const REPETIR_CADA_MS = 8000;

export function Mostrador({
  tiendaId,
  nombre,
  tiendaLat,
  tiendaLng,
}: {
  tiendaId: string;
  nombre: string;
  tiendaLat: number;
  tiendaLng: number;
}) {
  const { solicitudes, ahora, sonido, sonidoRef, activarSonido, recargar } = useSolicitudesTienda(
    tiendaId,
    tiendaLat,
    tiendaLng,
    "Mostrador · PiezaCerca",
  );
  const [completa, setCompleta] = useState(false);
  const pendientes = useRef(0);

  const nuevas = (solicitudes ?? [])
    .filter((s) => !s.respondida && s.venceEn > ahora)
    .sort((a, b) => a.enviadaEn - b.enviadaEn); // la más antigua primero: es la que se vence antes
  const vanParaAlla = (solicitudes ?? []).filter((s) => s.vaParaAllaEn);
  const respondidas = (solicitudes ?? []).filter((s) => s.respondida && !s.vaParaAllaEn);

  useEffect(() => {
    pendientes.current = nuevas.length;
  });

  // Sonido que se repite hasta que alguien responda.
  useEffect(() => {
    const repetir = setInterval(() => {
      if (sonidoRef.current && pendientes.current > 0) sonarAviso();
    }, REPETIR_CADA_MS);
    return () => clearInterval(repetir);
  }, [sonidoRef]);

  useEffect(() => {
    const alCambiar = () => setCompleta(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);

  function pantallaCompleta() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }

  const boton = "flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold";
  const titulo = "text-sm font-bold uppercase tracking-wider opacity-70";

  return (
    <main className="flex min-h-screen w-full flex-1 flex-col">
      <header
        className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-white ${
          nuevas.length > 0 ? "animate-pulse bg-naranja" : "bg-tienda"
        }`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Modo mostrador</p>
          <h1 className="font-titulo text-2xl font-bold">{nombre}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!sonido ? (
            <button type="button" onClick={activarSonido} className={`${boton} bg-white text-tienda`}>
              Activar sonido
            </button>
          ) : (
            <span className={`${boton} bg-white/15`}>Sonido encendido</span>
          )}
          <button type="button" onClick={pantallaCompleta} className={`${boton} bg-white/15`}>
            {completa ? "Salir de pantalla completa" : "Pantalla completa"}
          </button>
          <Link href="/tienda" className={`${boton} bg-white/15`}>
            Volver al Modo tienda
          </Link>
        </div>
      </header>

      {!sonido && (
        <p className="bg-ambar-suave px-6 py-2 text-sm font-semibold text-ambar">
          Toca &quot;Activar sonido&quot; para que suene cada vez que llegue una solicitud (y se repita hasta que alguien responda).
        </p>
      )}

      {solicitudes === null ? (
        <p className="m-6 rounded-2xl bg-white p-4 opacity-70">Cargando solicitudes…</p>
      ) : (
        <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[2fr_1fr_1fr]">
          <section>
            <h2 className={titulo}>Nuevas {nuevas.length > 0 && `(${nuevas.length})`}</h2>
            {nuevas.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-white p-6 text-lg opacity-80">
                No hay solicitudes esperando. Cuando llegue una, suena y aparece aquí.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {nuevas.map((s, i) => (
                  <li key={s.id}>
                    <TarjetaSolicitud
                      solicitud={s}
                      tiendaId={tiendaId}
                      ahora={ahora}
                      alResponder={recargar}
                      teclado={i === 0}
                      resaltada={i === 0}
                    />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm opacity-60">
              Atajos para la primera solicitud: <kbd className="rounded bg-white px-1.5">T</kbd> La tengo ·{" "}
              <kbd className="rounded bg-white px-1.5">N</kbd> No la tengo · <kbd className="rounded bg-white px-1.5">Enter</kbd>{" "}
              enviar el precio · <kbd className="rounded bg-white px-1.5">Esc</kbd> volver
            </p>
          </section>

          <section>
            <h2 className={titulo}>Van para allá {vanParaAlla.length > 0 && `(${vanParaAlla.length})`}</h2>
            {vanParaAlla.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-white p-4 text-sm opacity-70">
                Cuando un cliente escoja tu tienda, aparece aquí para que apartes la pieza.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {vanParaAlla.map((s) => {
                  const { cuantas, total } = loQueTiene(s);
                  return (
                    <li key={s.id} className="rounded-2xl border-2 border-verde bg-verde-suave p-4 text-verde">
                      <p className="font-bold">Apártala: el cliente va para allá</p>
                      <p className="mt-1 font-titulo text-xl font-bold text-tinta">{descripcion(s)}</p>
                      {s.items.length > 1 && (
                        <p className="text-sm text-tinta">
                          {s.items
                            .filter((i) => i.respuesta?.tiene)
                            .map((i) => `${i.pieza}${i.cantidad > 1 ? ` × ${i.cantidad}` : ""}`)
                            .join(" · ")}
                        </p>
                      )}
                      <p className="text-sm text-tinta/80">
                        {s.moto ?? "Cualquier moto"}
                        {cuantas > 0 && ` · ${formatoPesos(total)}`}
                        {` · hace ${Math.max(1, Math.round((ahora - s.vaParaAllaEn!) / 60000))} min`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className={titulo}>Respondidas hoy {respondidas.length > 0 && `(${respondidas.length})`}</h2>
            <ul className="mt-3 space-y-2">
              {respondidas.map((s) => {
                const { cuantas, total } = loQueTiene(s);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{descripcion(s)}</span>
                      <span className="block truncate opacity-70">{s.moto ?? "Cualquier moto"}</span>
                    </span>
                    <span className="shrink-0 text-right font-semibold">
                      {cuantas === 0
                        ? "No la tenías"
                        : s.items.length > 1
                          ? `${cuantas} de ${s.items.length} · ${formatoPesos(total)}`
                          : formatoPesos(total)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
