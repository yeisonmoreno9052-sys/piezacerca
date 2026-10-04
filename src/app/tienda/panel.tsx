"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatoDistancia, formatoPesos } from "@/lib/formato";
import { activarAudio, sonarAviso } from "@/lib/aviso-sonoro";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { ActivarNotificaciones } from "./activar-notificaciones";

type Item = {
  id: number;
  pieza: string;
  cantidad: number;
  respuesta: { tiene: boolean; precio: number | null } | null;
};

type Solicitud = {
  id: string;
  items: Item[];
  moto: string | null;
  metros: number;
  enviadaEn: number;
  venceEn: number;
  vaParaAllaEn: number | null;
  respondida: boolean;
};

function metrosEntre(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (g: number) => (g * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

function uno<T>(valor: T | T[] | null | undefined): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
}

// "Farola × 2" o "Lista de 5 piezas"
function descripcion(s: Solicitud) {
  if (s.items.length > 1) return `Lista de ${s.items.length} piezas`;
  const i = s.items[0];
  return `${i.pieza}${i.cantidad > 1 ? ` × ${i.cantidad}` : ""}`;
}

// Lo que la tienda dijo que tiene: cuántas piezas y cuánto suman (precio por unidad × cantidad).
function loQueTiene(s: Solicitud) {
  const tiene = s.items.filter((i) => i.respuesta?.tiene);
  return { cuantas: tiene.length, total: tiene.reduce((t, i) => t + (i.respuesta!.precio ?? 0) * i.cantidad, 0) };
}

// Solicitudes de las últimas 24 horas que le llegaron a esta tienda, con sus respuestas.
async function cargar(tiendaId: string, tiendaLat: number, tiendaLng: number): Promise<Solicitud[]> {
  const supabase = crearClienteNavegador();
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: envios }, { data: respuestas }] = await Promise.all([
    supabase
      .from("solicitud_tiendas")
      .select(
        "solicitud_id, enviada_en, respondida_en, va_para_alla_en, solicitudes(lat, lng, vence_en, motos(marca, modelo, cilindraje), solicitud_items(id, cantidad, piezas(nombre)))",
      )
      .eq("tienda_id", tiendaId)
      .gte("enviada_en", desde)
      .order("enviada_en", { ascending: false }),
    supabase.from("respuestas").select("item_id, tiene, precio").eq("tienda_id", tiendaId).gte("respondida_en", desde),
  ]);

  return (envios ?? []).flatMap((e) => {
    const s = uno(
      e.solicitudes as unknown as {
        lat: number;
        lng: number;
        vence_en: string;
        motos: { marca: string; modelo: string; cilindraje: number } | null;
        solicitud_items: { id: number; cantidad: number; piezas: { nombre: string } | { nombre: string }[] }[];
      },
    );
    if (!s || !s.solicitud_items?.length) return [];
    const moto = uno(s.motos);
    const items = [...s.solicitud_items]
      .sort((a, b) => a.id - b.id)
      .map((i) => {
        const r = (respuestas ?? []).find((x) => x.item_id === i.id);
        return {
          id: i.id,
          pieza: uno(i.piezas)?.nombre ?? "Pieza",
          cantidad: i.cantidad,
          respuesta: r ? { tiene: r.tiene, precio: r.precio } : null,
        };
      });
    return [
      {
        id: e.solicitud_id,
        items,
        moto: moto ? `${moto.marca} ${moto.modelo} ${moto.cilindraje}` : null,
        metros: metrosEntre(tiendaLat, tiendaLng, s.lat, s.lng),
        enviadaEn: new Date(e.enviada_en).getTime(),
        venceEn: new Date(s.vence_en).getTime(),
        vaParaAllaEn: e.va_para_alla_en ? new Date(e.va_para_alla_en).getTime() : null,
        respondida: Boolean(e.respondida_en) || items.some((i) => i.respuesta),
      },
    ];
  });
}

export function PanelTienda({
  tiendaId,
  tiendaLat,
  tiendaLng,
}: {
  tiendaId: string;
  tiendaLat: number;
  tiendaLng: number;
}) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [sonido, setSonido] = useState(false);
  const sonidoRef = useRef(false);
  // Lo que la tienda ya vio (solicitudes nuevas y "voy para allá"), para sonar solo con lo nuevo.
  const vistos = useRef<Set<string> | null>(null);

  // Suena cuando aparece algo nuevo, llegue en vivo o por la revisión de respaldo.
  const avisarSiHayAlgoNuevo = useCallback((lista: Solicitud[]) => {
    const claves = [
      ...lista.filter((s) => !s.respondida && s.venceEn > Date.now()).map((s) => `nueva:${s.id}`),
      ...lista.filter((s) => s.vaParaAllaEn).map((s) => `va:${s.id}`),
    ];
    const antes = vistos.current;
    vistos.current = new Set([...(antes ?? []), ...claves]);
    if (antes && claves.some((c) => !antes.has(c))) {
      if (sonidoRef.current) sonarAviso();
      document.title = "Nueva solicitud · PiezaCerca";
    }
  }, []);

  const recargar = useCallback(
    () => cargar(tiendaId, tiendaLat, tiendaLng).then(setSolicitudes),
    [tiendaId, tiendaLat, tiendaLng],
  );

  // En vivo con Supabase Realtime; por si acaso, también se revisa cada 10 s.
  useEffect(() => {
    let vigente = true;
    const traer = () =>
      cargar(tiendaId, tiendaLat, tiendaLng).then((d) => {
        if (!vigente) return;
        avisarSiHayAlgoNuevo(d);
        setSolicitudes(d);
      });
    traer();
    const supabase = crearClienteNavegador();
    const canal = supabase
      .channel(`tienda-${tiendaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitud_tiendas", filter: `tienda_id=eq.${tiendaId}` },
        traer,
      )
      .subscribe();
    const respaldo = setInterval(traer, 10000);
    const volverTitulo = () => {
      if (document.visibilityState === "visible") document.title = "Modo tienda · PiezaCerca";
    };
    document.addEventListener("visibilitychange", volverTitulo);
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => {
      vigente = false;
      clearInterval(respaldo);
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", volverTitulo);
      supabase.removeChannel(canal);
    };
  }, [tiendaId, tiendaLat, tiendaLng, avisarSiHayAlgoNuevo]);

  function activarSonido() {
    // Se activa con el toque de la persona: así el navegador deja sonar los avisos después.
    sonidoRef.current = activarAudio();
    setSonido(true);
    sonarAviso(); // de prueba
  }

  if (solicitudes === null) {
    return <p className="m-4 rounded-2xl bg-white p-4 text-sm opacity-70">Cargando solicitudes…</p>;
  }

  const nuevas = solicitudes.filter((s) => !s.respondida && s.venceEn > ahora);
  const vanParaAlla = solicitudes.filter((s) => s.vaParaAllaEn);
  const respondidas = solicitudes.filter((s) => s.respondida && !s.vaParaAllaEn);

  return (
    <div className="space-y-5 px-4 pb-10 pt-4">
      <ActivarNotificaciones />

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

function TarjetaSolicitud({
  solicitud: s,
  tiendaId,
  ahora,
  alResponder,
}: {
  solicitud: Solicitud;
  tiendaId: string;
  ahora: number;
  alResponder: () => void;
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

  const campoPrecio =
    "min-h-12 min-w-0 flex-1 rounded-xl border-2 border-tinta/20 px-3 font-titulo text-xl font-bold outline-none focus:border-verde";

  return (
    <div className="rounded-3xl border border-tinta/10 bg-white p-4 shadow-sm">
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
            La tengo
          </button>
          <button
            type="button"
            onClick={() => enviar(true)}
            disabled={enviando}
            className="min-h-14 w-full rounded-2xl border-2 border-tinta bg-white text-base font-bold disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "No la tengo"}
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
