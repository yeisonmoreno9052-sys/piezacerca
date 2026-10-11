"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sonarAviso } from "@/lib/aviso-sonoro";
import { formatoPesos } from "@/lib/formato";
import { AbiertaCerrada } from "../abierta-cerrada";
import { descripcion, loQueTiene, useSolicitudesTienda } from "../datos";
import { TarjetaSolicitud } from "../panel";
import { MotoFondo } from "./moto-fondo";

// Mientras haya solicitudes sin responder, el sonido se repite cada tantos segundos.
const REPETIR_CADA_MS = 8000;

function iniciales(nombre: string) {
  const palabras = nombre.split(/\s+/).filter((p) => /^[\p{L}\p{N}]/u.test(p));
  return palabras.slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "P";
}

function tiempoRespuesta(segundos: number | null) {
  if (!segundos) return "—";
  if (segundos < 60) return `${segundos} s`;
  return `${Math.round(segundos / 60)} min`;
}

export function Mostrador({
  tiendaId,
  nombre,
  cerradaDesde,
  tiempoRespuestaSeg,
}: {
  tiendaId: string;
  nombre: string;
  cerradaDesde: string | null;
  tiempoRespuestaSeg: number | null;
}) {
  const { solicitudes, ahora, sonido, sonidoRef, activarSonido, recargar } = useSolicitudesTienda(
    tiendaId,
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

  const fecha = new Date(ahora);
  const hora = fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  const dia = fecha.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  const boton = "flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold";
  const titulo = "font-titulo text-xl font-bold";
  const cuadro = "rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4";
  const numero = "font-titulo text-4xl font-extrabold leading-none lg:text-5xl";

  return (
    <main className="relative isolate flex min-h-screen w-full flex-1 flex-col overflow-hidden bg-noche text-fondo">
      <MotoFondo className="pointer-events-none absolute -bottom-10 -right-16 -z-10 w-[min(860px,90vw)] text-fondo opacity-[0.09]" />

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-5 lg:px-12">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-naranja font-titulo text-2xl font-extrabold text-white">
            {iniciales(nombre)}
          </div>
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.14em] text-fondo/65">Modo mostrador</p>
            <h1 className="truncate font-titulo text-2xl font-extrabold lg:text-3xl">{nombre}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          {cerradaDesde ? (
            <span className="flex min-h-11 items-center gap-2 rounded-full border border-ambar-suave/40 bg-ambar-suave/15 px-4 font-bold text-ambar-suave">
              <span className="size-2.5 rounded-full bg-ambar-suave" />
              Cerrado: no recibes preguntas
            </span>
          ) : (
            <span className="flex min-h-11 items-center gap-2 rounded-full border border-verde-suave/35 bg-verde/35 px-4 font-bold">
              <span className="size-2.5 rounded-full bg-[#5FD69A]" />
              Abierto: recibiendo preguntas
            </span>
          )}
          <div className="text-right">
            <p className="font-titulo text-4xl font-bold leading-none" suppressHydrationWarning>
              {hora}
            </p>
            <p className="mt-1 text-sm text-fondo/65" suppressHydrationWarning>
              {dia}
            </p>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-2 px-6 pt-4 lg:px-12" aria-label="Opciones del mostrador">
        {!sonido ? (
          <button type="button" onClick={activarSonido} className={`${boton} bg-naranja text-white`}>
            Activar sonido
          </button>
        ) : (
          <span className={`${boton} bg-white/10`}>Sonido encendido</span>
        )}
        {!cerradaDesde && <AbiertaCerrada tiendaId={tiendaId} cerradaDesde={null} oscuro />}
        <button type="button" onClick={pantallaCompleta} className={`${boton} bg-white/10`}>
          {completa ? "Salir de pantalla completa" : "Pantalla completa"}
        </button>
        <Link href="/tienda" className={`${boton} bg-white/10`}>
          Volver al Modo tienda
        </Link>
        {!sonido && (
          <p className="text-sm text-fondo/70">Actívalo para que suene con cada solicitud y se repita hasta que alguien responda.</p>
        )}
      </nav>

      {cerradaDesde && (
        <div className="px-6 pt-4 lg:px-12">
          <AbiertaCerrada tiendaId={tiendaId} cerradaDesde={cerradaDesde} />
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 px-6 pt-5 lg:grid-cols-4 lg:px-12" aria-label="Resumen de hoy">
        <div
          className={`rounded-2xl px-5 py-4 ${
            nuevas.length > 0 ? "bg-naranja text-white motion-safe:animate-pulse" : "border border-white/15 bg-white/[0.08]"
          }`}
        >
          <p className={numero}>{nuevas.length}</p>
          <p className="mt-1.5 font-semibold">Nuevas sin responder</p>
        </div>
        <div className={cuadro}>
          <p className={`${numero} text-[#8BE3B4]`}>{vanParaAlla.length}</p>
          <p className="mt-1.5 font-semibold">Clientes vienen para acá</p>
        </div>
        <div className={cuadro}>
          <p className={numero}>{respondidas.length + vanParaAlla.length}</p>
          <p className="mt-1.5 font-semibold">Respondidas hoy</p>
        </div>
        <div className={cuadro}>
          <p className={numero}>{tiempoRespuesta(tiempoRespuestaSeg)}</p>
          <p className="mt-1.5 font-semibold">Tu tiempo de respuesta</p>
        </div>
      </section>

      {solicitudes === null ? (
        <p className={`${cuadro} mx-6 mt-6 lg:mx-12`}>Cargando solicitudes…</p>
      ) : (
        <div className="grid flex-1 gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr_1fr] lg:px-12">
          <section>
            <h2 className={titulo}>Nuevas</h2>
            {nuevas.length === 0 ? (
              <p className={`${cuadro} mt-3 text-lg text-fondo/80`}>
                No hay solicitudes esperando. Cuando llegue una, suena y aparece aquí.
              </p>
            ) : (
              <ul className="mt-3 space-y-4 text-tinta">
                {nuevas.map((s, i) => (
                  <li
                    key={s.id}
                    className={i === 0 ? "rounded-3xl shadow-[0_18px_50px_rgba(224,98,27,0.35)]" : undefined}
                  >
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
          </section>

          <section>
            <h2 className={titulo}>Vienen para acá</h2>
            {vanParaAlla.length === 0 ? (
              <p className={`${cuadro} mt-3 text-sm text-fondo/75`}>
                Cuando un cliente escoja tu tienda, aparece aquí para que apartes la pieza.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {vanParaAlla.map((s) => {
                  const { cuantas, total } = loQueTiene(s);
                  return (
                    <li key={s.id} className="rounded-2xl bg-verde p-5">
                      <p className="text-sm font-bold uppercase tracking-wider text-verde-suave">Apártala</p>
                      <p className="mt-1.5 font-titulo text-2xl font-extrabold leading-tight">{descripcion(s)}</p>
                      {s.items.length > 1 && (
                        <p className="mt-1 text-sm">
                          {s.items
                            .filter((i) => i.respuesta?.tiene)
                            .map((i) => `${i.pieza}${i.cantidad > 1 ? ` × ${i.cantidad}` : ""}`)
                            .join(" · ")}
                        </p>
                      )}
                      <p className="mt-1">{s.moto ?? "Cualquier moto"}</p>
                      {cuantas > 0 && <p className="mt-3 font-titulo text-2xl font-bold">{formatoPesos(total)}</p>}
                      <p className="mt-1 text-sm text-verde-suave">
                        Avisó hace {Math.max(1, Math.round((ahora - s.vaParaAllaEn!) / 60000))} min
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className={titulo}>Respondidas hoy</h2>
            {respondidas.length === 0 ? (
              <p className={`${cuadro} mt-3 text-sm text-fondo/75`}>Aquí van quedando las que ya respondiste.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {respondidas.map((s) => {
                  const { cuantas, total } = loQueTiene(s);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.06] px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{descripcion(s)}</span>
                        <span className="block truncate text-sm text-fondo/65">{s.moto ?? "Cualquier moto"}</span>
                      </span>
                      <span
                        className={`shrink-0 text-right font-bold ${cuantas === 0 ? "font-semibold text-fondo/60" : "text-[#8BE3B4]"}`}
                      >
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
            )}
          </section>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 text-sm text-fondo/70 lg:px-12">
        <p>
          Atajos para la primera solicitud: <kbd className="rounded bg-white/15 px-1.5 text-fondo">T</kbd> La tengo ·{" "}
          <kbd className="rounded bg-white/15 px-1.5 text-fondo">N</kbd> No la tengo ·{" "}
          <kbd className="rounded bg-white/15 px-1.5 text-fondo">Enter</kbd> enviar el precio ·{" "}
          <kbd className="rounded bg-white/15 px-1.5 text-fondo">Esc</kbd> volver
        </p>
        <p className="font-titulo font-bold text-fondo">PiezaCerca</p>
      </footer>
    </main>
  );
}
