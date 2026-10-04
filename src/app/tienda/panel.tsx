"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatoDistancia, formatoPesos } from "@/lib/formato";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Solicitud = {
  id: string;
  itemId: number;
  pieza: string;
  cantidad: number;
  moto: string | null;
  metros: number;
  enviadaEn: number;
  venceEn: number;
  vaParaAllaEn: number | null;
  respuesta: { tiene: boolean; precio: number | null } | null;
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

// Solicitudes de las últimas 24 horas que le llegaron a esta tienda, con su respuesta si ya respondió.
async function cargar(tiendaId: string, tiendaLat: number, tiendaLng: number): Promise<Solicitud[]> {
  const supabase = crearClienteNavegador();
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: envios }, { data: respuestas }] = await Promise.all([
    supabase
      .from("solicitud_tiendas")
      .select(
        "solicitud_id, enviada_en, va_para_alla_en, solicitudes(lat, lng, vence_en, motos(marca, modelo, cilindraje), solicitud_items(id, cantidad, piezas(nombre)))",
      )
      .eq("tienda_id", tiendaId)
      .gte("enviada_en", desde)
      .order("enviada_en", { ascending: false }),
    supabase.from("respuestas").select("item_id, tiene, precio").eq("tienda_id", tiendaId),
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
    const item = s?.solicitud_items?.[0];
    if (!s || !item) return [];
    const moto = uno(s.motos);
    const r = (respuestas ?? []).find((x) => x.item_id === item.id);
    return [
      {
        id: e.solicitud_id,
        itemId: item.id,
        pieza: uno(item.piezas)?.nombre ?? "Pieza",
        cantidad: item.cantidad,
        moto: moto ? `${moto.marca} ${moto.modelo} ${moto.cilindraje}` : null,
        metros: metrosEntre(tiendaLat, tiendaLng, s.lat, s.lng),
        enviadaEn: new Date(e.enviada_en).getTime(),
        venceEn: new Date(s.vence_en).getTime(),
        vaParaAllaEn: e.va_para_alla_en ? new Date(e.va_para_alla_en).getTime() : null,
        respuesta: r ? { tiene: r.tiene, precio: r.precio } : null,
      },
    ];
  });
}

// Tres pitidos cortos con el parlante del celular o del PC (sin archivos de sonido).
function sonarAviso() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((inicio) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.frequency.value = 880;
      vol.gain.value = 0.3;
      osc.connect(vol).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.15);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // sin sonido disponible
  }
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

  const recargar = useCallback(
    () => cargar(tiendaId, tiendaLat, tiendaLng).then(setSolicitudes),
    [tiendaId, tiendaLat, tiendaLng],
  );

  // En vivo: llega una solicitud nueva → suena y se muestra. Respaldo: revisar cada 20 s.
  useEffect(() => {
    let vigente = true;
    const traer = () => cargar(tiendaId, tiendaLat, tiendaLng).then((d) => vigente && setSolicitudes(d));
    traer();
    const supabase = crearClienteNavegador();
    const canal = supabase
      .channel(`tienda-${tiendaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "solicitud_tiendas", filter: `tienda_id=eq.${tiendaId}` },
        () => {
          if (sonidoRef.current) sonarAviso();
          traer();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "solicitud_tiendas", filter: `tienda_id=eq.${tiendaId}` },
        () => {
          if (sonidoRef.current) sonarAviso();
          traer();
        },
      )
      .subscribe();
    const respaldo = setInterval(traer, 20000);
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => {
      vigente = false;
      clearInterval(respaldo);
      clearInterval(reloj);
      supabase.removeChannel(canal);
    };
  }, [tiendaId, tiendaLat, tiendaLng]);

  function activarSonido() {
    sonidoRef.current = true;
    setSonido(true);
    sonarAviso(); // de prueba, y para que el navegador permita sonar después
  }

  if (solicitudes === null) {
    return <p className="m-4 rounded-2xl bg-white p-4 text-sm opacity-70">Cargando solicitudes…</p>;
  }

  const nuevas = solicitudes.filter((s) => !s.respuesta && s.venceEn > ahora);
  const vanParaAlla = solicitudes.filter((s) => s.vaParaAllaEn);
  const respondidas = solicitudes.filter((s) => s.respuesta && !s.vaParaAllaEn);

  return (
    <div className="space-y-5 px-4 pb-10 pt-4">
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
            {vanParaAlla.map((s) => (
              <li key={s.id} className="rounded-2xl border-2 border-verde bg-verde-suave p-4 text-verde">
                <p className="text-sm font-bold">Apártala: el cliente va para allá</p>
                <p className="mt-1 font-titulo text-xl font-bold text-tinta">
                  {s.pieza}
                  {s.cantidad > 1 && ` × ${s.cantidad}`}
                </p>
                <p className="text-sm text-tinta/80">
                  {s.moto ?? "Cualquier moto"}
                  {s.respuesta?.precio != null && ` · ${formatoPesos(s.respuesta.precio)}`}
                  {` · avisó hace ${Math.max(1, Math.round((ahora - s.vaParaAllaEn!) / 60000))} min`}
                </p>
              </li>
            ))}
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
            {respondidas.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {s.pieza}
                    {s.cantidad > 1 && ` × ${s.cantidad}`}
                  </span>
                  <span className="block truncate opacity-70">{s.moto ?? "Cualquier moto"}</span>
                </span>
                <span className="shrink-0 font-semibold">
                  {s.respuesta!.tiene ? formatoPesos(s.respuesta!.precio ?? 0) : "No la tenías"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

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
  const [paso, setPaso] = useState<"preguntar" | "precio">("preguntar");
  const [precio, setPrecio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restante = Math.max(0, s.venceEn - ahora);
  const minutos = Math.floor(restante / 60000);
  const segundos = Math.floor((restante % 60000) / 1000);
  const valor = Number(precio || "0");

  async function responder(tiene: boolean) {
    if (tiene && (valor < 100 || valor > 50_000_000)) {
      setError("Escribe el precio en pesos, por ejemplo 85000.");
      return;
    }
    setEnviando(true);
    setError(null);
    const { error } = await crearClienteNavegador().from("respuestas").insert({
      solicitud_id: s.id,
      tienda_id: tiendaId,
      item_id: s.itemId,
      tiene,
      precio: tiene ? valor : null,
    });
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

  return (
    <div className="rounded-3xl border border-tinta/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#FCE9DD] px-3 py-1 text-xs font-bold text-[#8A3508]">Nueva solicitud</span>
        <span className="text-sm font-bold" aria-live="off">
          {minutos}:{String(segundos).padStart(2, "0")}
        </span>
      </div>
      <p className="mt-3 font-titulo text-2xl font-bold leading-tight">
        {s.pieza}
        {s.cantidad > 1 && ` × ${s.cantidad}`}
      </p>
      <p className="mt-1 text-base opacity-80">
        {s.moto ?? "Cualquier moto"} · cliente a {formatoDistancia(s.metros)}
      </p>

      {paso === "preguntar" ? (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => setPaso("precio")}
            className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-verde text-lg font-bold text-white"
          >
            La tengo
          </button>
          <button
            type="button"
            onClick={() => responder(false)}
            disabled={enviando}
            className="min-h-14 w-full rounded-2xl border-2 border-tinta bg-white text-base font-bold disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "No la tengo"}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <label htmlFor={`precio-${s.id}`} className="text-sm font-semibold">
            Precio para el cliente{s.cantidad > 1 ? " (por unidad)" : ""}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`precio-${s.id}`}
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="$ 0"
              value={precio ? formatoPesos(valor) : ""}
              onChange={(e) => {
                setPrecio(e.target.value.replace(/\D/g, "").slice(0, 8));
                setError(null);
              }}
              className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-tinta/20 px-4 font-titulo text-2xl font-bold outline-none focus:border-verde"
            />
            <button
              type="button"
              onClick={() => responder(true)}
              disabled={enviando || !precio}
              className="min-h-14 rounded-2xl bg-verde px-5 text-base font-bold text-white disabled:opacity-50"
            >
              {enviando ? "…" : "Enviar"}
            </button>
          </div>
          {s.cantidad > 1 && valor > 0 && (
            <p className="mt-1 text-sm opacity-70">Total para {s.cantidad}: {formatoPesos(valor * s.cantidad)}</p>
          )}
          <button
            type="button"
            onClick={() => {
              setPaso("preguntar");
              setPrecio("");
              setError(null);
            }}
            className="mt-2 min-h-11 text-sm font-medium underline"
          >
            Volver
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}
    </div>
  );
}
