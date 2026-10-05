"use client";

import { useEffect, useState } from "react";
import { formatoDistancia, formatoPesos } from "@/lib/formato";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { ActivarNotificaciones } from "./activar-notificaciones";
import { descripcion, loQueTiene, type Solicitud, useSolicitudesTienda } from "./datos";

export function PanelTienda({
  tiendaId,
  tiendaLat,
  tiendaLng,
}: {
  tiendaId: string;
  tiendaLat: number;
  tiendaLng: number;
}) {
  const { solicitudes, ahora, sonido, activarSonido, recargar } = useSolicitudesTienda(
    tiendaId,
    tiendaLat,
    tiendaLng,
    "Modo tienda · PiezaCerca",
  );

  if (solicitudes === null) {
    return <p className="m-4 rounded-2xl bg-white p-4 text-sm opacity-70">Cargando solicitudes…</p>;
  }

  const nuevas = solicitudes.filter((s) => !s.respondida && s.venceEn > ahora);
  const vanParaAlla = solicitudes.filter((s) => s.vaParaAllaEn);
  const respondidas = solicitudes.filter((s) => s.respondida && !s.vaParaAllaEn);

  return (
    <div className="space-y-5 px-4 pb-10 pt-4">
      <ActivarNotificaciones />

      <a
        href="/tienda/mostrador"
        className="hidden min-h-12 items-center justify-center rounded-2xl bg-tienda px-4 font-bold text-white md:flex"
      >
        Abrir modo mostrador (pantalla grande)
      </a>

      {!sonido && (
        <button
          type="button"
          onClick={activarSonido}
          className="min-h-12 w-full rounded-2xl border-2 border-tienda bg-white px-4 font-bold text-tienda"
        >
          Activar sonido de avisos
        </button>
      )}

      {vanParaAlla.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider opacity-70">Clientes que van para allá</h2>
          <ul className="mt-2 space-y-2">
            {vanParaAlla.map((s) => {
              const { cuantas, total } = loQueTiene(s);
              return (
                <li key={s.id} className="rounded-2xl border-2 border-verde bg-verde-suave p-4 text-verde">
                  <p className="text-sm font-bold">Apártala: el cliente va para allá</p>
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
                    {` · avisó hace ${Math.max(1, Math.round((ahora - s.vaParaAllaEn!) / 60000))} min`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider opacity-70">
          Nuevas solicitudes {nuevas.length > 0 && `(${nuevas.length})`}
        </h2>
        {nuevas.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-white p-4 text-sm opacity-80">
            No hay solicitudes esperando. Cuando un cliente cerca pregunte por una pieza que manejas,
            aparece aquí sola{sonido ? " y suena" : ""}.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {nuevas.map((s) => (
              <li key={s.id}>
                <TarjetaSolicitud solicitud={s} tiendaId={tiendaId} ahora={ahora} alResponder={recargar} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {respondidas.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider opacity-70">Respondidas hoy</h2>
          <ul className="mt-2 space-y-2">
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
      )}
    </div>
  );
}

type Marca = { tiene: boolean | null; precio: string };

export function TarjetaSolicitud({
  solicitud: s,
  tiendaId,
  ahora,
  alResponder,
  teclado = false,
  resaltada = false,
}: {
  solicitud: Solicitud;
  tiendaId: string;
  ahora: number;
  alResponder: () => void;
  // Modo mostrador: la primera solicitud se responde con las teclas T (la tengo) y N (no la tengo).
  teclado?: boolean;
  resaltada?: boolean;
}) {
  const esLista = s.items.length > 1;
  // Una pieza: primero "La tengo / No la tengo" y luego el precio. Lista: cada pieza tiene su marca.
  const [paso, setPaso] = useState<"preguntar" | "precio">("preguntar");
  const [marcas, setMarcas] = useState<Record<number, Marca>>(() =>
    Object.fromEntries(s.items.map((i) => [i.id, { tiene: null, precio: "" }])),
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restante = Math.max(0, s.venceEn - ahora);
  const minutos = Math.floor(restante / 60000);
  const segundos = Math.floor((restante % 60000) / 1000);

  function marcar(id: number, cambio: Partial<Marca>) {
    setError(null);
    setMarcas((m) => ({ ...m, [id]: { ...m[id], ...cambio } }));
  }

  const precioDe = (id: number) => Number(marcas[id]?.precio || "0");
  const total = s.items.reduce((t, i) => t + (marcas[i.id]?.tiene ? precioDe(i.id) * i.cantidad : 0), 0);

  async function enviar(todasNo = false) {
    const filas = s.items.map((i) => {
      const tiene = todasNo ? false : marcas[i.id]?.tiene;
      return { i, tiene, precio: tiene ? precioDe(i.id) : null };
    });
    if (filas.some((f) => f.tiene === null || f.tiene === undefined)) {
      setError("Marca cada pieza: La tengo o No.");
      return;
    }
    if (filas.some((f) => f.tiene && (f.precio! < 100 || f.precio! > 50_000_000))) {
      setError("Escribe el precio de cada pieza que tienes, por ejemplo 85000.");
      return;
    }
    setEnviando(true);
    setError(null);
    const { error } = await crearClienteNavegador()
      .from("respuestas")
      .insert(
        filas.map((f) => ({
          solicitud_id: s.id,
          tienda_id: tiendaId,
          item_id: f.i.id,
          tiene: Boolean(f.tiene),
          precio: f.tiene ? f.precio : null,
        })),
      );
    setEnviando(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "Esta solicitud ya fue respondida por tu tienda."
          : "No se pudo enviar. Puede que ya se haya vencido el tiempo.",
      );
    }
    alResponder();
  }

  // Teclas del mostrador (solo para una pieza; las listas se responden pieza por pieza con el mouse).
  useEffect(() => {
    if (!teclado || esLista) return;
    function alTeclear(e: KeyboardEvent) {
      const enCampo = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (paso === "precio" && e.key === "Escape") {
        setPaso("preguntar");
        marcar(s.items[0].id, { tiene: null, precio: "" });
        return;
      }
      if (enCampo || paso !== "preguntar" || e.ctrlKey || e.metaKey || e.altKey) return;
      const tecla = e.key.toLowerCase();
      if (tecla === "t") {
        e.preventDefault();
        marcar(s.items[0].id, { tiene: true });
        setPaso("precio");
      } else if (tecla === "n" && !enviando) {
        e.preventDefault();
        enviar(true);
      }
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  });

  const campoPrecio =
    "min-h-12 min-w-0 flex-1 rounded-xl border-2 border-tinta/20 px-3 font-titulo text-xl font-bold outline-none focus:border-verde";

  return (
    <div
      className={`rounded-3xl bg-white p-4 shadow-sm ${
        resaltada ? "border-[3px] border-naranja" : "border border-tinta/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#FCE9DD] px-3 py-1 text-xs font-bold text-[#8A3508]">
          {esLista ? "Nueva lista" : "Nueva solicitud"}
        </span>
        <span className="text-sm font-bold" aria-live="off">
          {minutos}:{String(segundos).padStart(2, "0")}
        </span>
      </div>
      <p className="mt-3 font-titulo text-2xl font-bold leading-tight">{descripcion(s)}</p>
      <p className="mt-1 text-base opacity-80">
        {s.moto ?? "Cualquier moto"} · cliente a {formatoDistancia(s.metros)}
      </p>

      {!esLista && paso === "preguntar" && (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              marcar(s.items[0].id, { tiene: true });
              setPaso("precio");
            }}
            className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-verde text-lg font-bold text-white"
          >
            La tengo{teclado && <kbd className="rounded bg-white/20 px-2 text-sm">T</kbd>}
          </button>
          <button
            type="button"
            onClick={() => enviar(true)}
            disabled={enviando}
            className="min-h-14 w-full rounded-2xl border-2 border-tinta bg-white text-base font-bold disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "No la tengo"}
            {teclado && !enviando && <kbd className="ml-2 rounded bg-tinta/10 px-2 text-sm">N</kbd>}
          </button>
        </div>
      )}

      {!esLista && paso === "precio" && (
        <div className="mt-4">
          <label htmlFor={`precio-${s.items[0].id}`} className="text-sm font-semibold">
            Precio para el cliente{s.items[0].cantidad > 1 ? " (por unidad)" : ""}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`precio-${s.items[0].id}`}
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="$ 0"
              value={marcas[s.items[0].id]?.precio ? formatoPesos(precioDe(s.items[0].id)) : ""}
              onChange={(e) => marcar(s.items[0].id, { precio: e.target.value.replace(/\D/g, "").slice(0, 8) })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && marcas[s.items[0].id]?.precio && !enviando) enviar();
              }}
              className={`${campoPrecio} min-h-14 text-2xl`}
            />
            <button
              type="button"
              onClick={() => enviar()}
              disabled={enviando || !marcas[s.items[0].id]?.precio}
              className="min-h-14 rounded-2xl bg-verde px-5 text-base font-bold text-white disabled:opacity-50"
            >
              {enviando ? "…" : "Enviar"}
            </button>
          </div>
          {s.items[0].cantidad > 1 && total > 0 && (
            <p className="mt-1 text-sm opacity-70">
              Total para {s.items[0].cantidad}: {formatoPesos(total)}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setPaso("preguntar");
              marcar(s.items[0].id, { tiene: null, precio: "" });
            }}
            className="mt-2 min-h-11 text-sm font-medium underline"
          >
            Volver
          </button>
        </div>
      )}

      {esLista && (
        <>
          <ul className="mt-4 space-y-2">
            {s.items.map((i) => {
              const m = marcas[i.id];
              return (
                <li key={i.id} className="rounded-2xl border border-tinta/10 p-3">
                  <p className="font-semibold">
                    {i.pieza}
                    {i.cantidad > 1 && ` × ${i.cantidad}`}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={m?.tiene === true}
                      onClick={() => marcar(i.id, { tiene: true })}
                      className={`min-h-11 rounded-xl text-sm font-bold ${
                        m?.tiene === true ? "bg-verde text-white" : "border-2 border-verde text-verde"
                      }`}
                    >
                      La tengo
                    </button>
                    <button
                      type="button"
                      aria-pressed={m?.tiene === false}
                      onClick={() => marcar(i.id, { tiene: false, precio: "" })}
                      className={`min-h-11 rounded-xl text-sm font-bold ${
                        m?.tiene === false ? "bg-tinta text-white" : "border-2 border-tinta/40"
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {m?.tiene && (
                    <div className="mt-2">
                      <label htmlFor={`precio-${i.id}`} className="sr-only">
                        Precio de {i.pieza}
                      </label>
                      <input
                        id={`precio-${i.id}`}
                        type="text"
                        inputMode="numeric"
                        placeholder={i.cantidad > 1 ? "$ precio por unidad" : "$ precio"}
                        value={m.precio ? formatoPesos(precioDe(i.id)) : ""}
                        onChange={(e) => marcar(i.id, { precio: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                        className={`${campoPrecio} w-full`}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between font-bold">
            <span>Total de lo que tienes</span>
            <span>{formatoPesos(total)}</span>
          </div>
          <button
            type="button"
            onClick={() => enviar()}
            disabled={enviando}
            className="mt-3 min-h-14 w-full rounded-2xl bg-verde text-base font-bold text-white disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar respuesta"}
          </button>
          <button
            type="button"
            onClick={() => enviar(true)}
            disabled={enviando}
            className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold underline disabled:opacity-60"
          >
            No tengo ninguna
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}
    </div>
  );
}
