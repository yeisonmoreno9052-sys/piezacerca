"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  enlaceComoLlegar,
  enlaceWhatsapp,
  formatoDistancia,
  formatoPesos,
} from "@/lib/formato";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Item = { id: number; pieza: string; cantidad: number };
type Respuesta = { tiene: boolean; precio: number | null };

type Tienda = {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  whatsapp: string | null;
  respondidaEn: string | null;
  enviadaEn: string;
  vaParaAlla: boolean;
  respuestas: Map<number, Respuesta>;
  metros: number;
};

type Datos = {
  items: Item[];
  moto: string | null;
  venceEn: number;
  tiendas: Tienda[];
};

function metrosEntre(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (g: number) => (g * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

function uno<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

async function cargar(id: string): Promise<Datos | null> {
  const supabase = crearClienteNavegador();
  const [{ data: s }, { data: envios }, { data: respuestas }] = await Promise.all([
    supabase
      .from("solicitudes")
      .select("lat, lng, vence_en, motos(marca, modelo, cilindraje), solicitud_items(id, cantidad, piezas(nombre))")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("solicitud_tiendas")
      .select(
        "tienda_id, enviada_en, respondida_en, va_para_alla_en, tiendas(nombre, direccion, lat, lng, tienda_contacto(whatsapp))",
      )
      .eq("solicitud_id", id),
    supabase.from("respuestas").select("tienda_id, item_id, tiene, precio").eq("solicitud_id", id),
  ]);
  if (!s) return null;

  const moto = uno(s.motos as unknown as { marca: string; modelo: string; cilindraje: number });
  const items: Item[] = (
    (s.solicitud_items ?? []) as unknown as { id: number; cantidad: number; piezas: { nombre: string } | { nombre: string }[] }[]
  )
    .map((i) => ({ id: i.id, cantidad: i.cantidad, pieza: uno(i.piezas)?.nombre ?? "Pieza" }))
    .sort((a, b) => a.id - b.id);

  const tiendas: Tienda[] = (envios ?? []).map((e) => {
    const t = uno(
      e.tiendas as unknown as {
        nombre: string;
        direccion: string;
        lat: number;
        lng: number;
        tienda_contacto: { whatsapp: string } | { whatsapp: string }[] | null;
      },
    )!;
    const suyas = new Map<number, Respuesta>();
    for (const r of respuestas ?? []) {
      if (r.tienda_id === e.tienda_id) suyas.set(r.item_id, { tiene: r.tiene, precio: r.precio });
    }
    return {
      id: e.tienda_id,
      nombre: t.nombre,
      direccion: t.direccion,
      lat: t.lat,
      lng: t.lng,
      whatsapp: uno(t.tienda_contacto)?.whatsapp ?? null,
      respondidaEn: e.respondida_en,
      enviadaEn: e.enviada_en,
      vaParaAlla: Boolean(e.va_para_alla_en),
      respuestas: suyas,
      metros: metrosEntre(s.lat, s.lng, t.lat, t.lng),
    };
  });

  return {
    items,
    moto: moto ? `${moto.marca} ${moto.modelo} ${moto.cilindraje}` : null,
    venceEn: new Date(s.vence_en).getTime(),
    tiendas,
  };
}

// Cuántas piezas tiene la tienda y cuánto suman (precio por unidad × cantidad).
function resumen(t: Tienda, items: Item[]) {
  let tiene = 0;
  let total = 0;
  for (const i of items) {
    const r = t.respuestas.get(i.id);
    if (r?.tiene) {
      tiene++;
      total += (r.precio ?? 0) * i.cantidad;
    }
  }
  return { tiene, total, respondio: t.respuestas.size > 0 };
}

export function SolicitudEnVivo({ id }: { id: string }) {
  const [datos, setDatos] = useState<Datos | null | undefined>(undefined);
  const [ahora, setAhora] = useState(() => Date.now());
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setDatos(await cargar(id));
  }, [id]);

  // Carga inicial, respuestas en vivo (Supabase Realtime) y, por si acaso, revisión cada 20 s.
  useEffect(() => {
    let vigente = true;
    const traer = () => cargar(id).then((d) => vigente && setDatos(d));
    traer();
    const supabase = crearClienteNavegador();
    const canal = supabase
      .channel(`solicitud-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "respuestas", filter: `solicitud_id=eq.${id}` }, traer)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "solicitud_tiendas", filter: `solicitud_id=eq.${id}` },
        traer,
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
  }, [id]);

  async function voyParaAlla(tiendaId: string) {
    setEligiendo(tiendaId);
    setError(null);
    const { error } = await crearClienteNavegador().rpc("voy_para_alla", {
      solicitud: id,
      tienda: tiendaId,
    });
    if (error) setError("No pudimos avisarle a la tienda. Inténtalo de nuevo.");
    await recargar();
    setEligiendo(null);
  }

  if (datos === undefined) {
    return <p className="rounded-2xl bg-white p-4 text-sm opacity-70">Cargando tu pregunta…</p>;
  }
  if (datos === null) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm">
        No encontramos esta pregunta. <Link href="/" className="font-semibold underline">Volver al inicio</Link>
      </p>
    );
  }

  const esLista = datos.items.length > 1;
  const restante = Math.max(0, datos.venceEn - ahora);
  const vencida = restante === 0;
  const minutos = Math.floor(restante / 60000);
  const segundos = Math.floor((restante % 60000) / 1000);
  const conResumen = datos.tiendas.map((t) => ({ t, r: resumen(t, datos.items) }));
  const respondieron = conResumen.filter((x) => x.r.respondio).length;
  const hayElegida = datos.tiendas.some((t) => t.vaParaAlla);

  // Primero las que tienen más piezas; a igual cantidad, la más barata; luego la más cerca.
  // Después las que no han respondido, las que no tienen nada y las que no respondieron a tiempo.
  const grupo = (x: (typeof conResumen)[number]) =>
    x.r.tiene > 0 ? 0 : !x.r.respondio && !vencida ? 1 : x.r.respondio ? 2 : 3;
  const ordenadas = [...conResumen].sort(
    (a, b) =>
      grupo(a) - grupo(b) || b.r.tiene - a.r.tiene || a.r.total - b.r.total || a.t.metros - b.t.metros,
  );

  const titulo = esLista
    ? `Lista de ${datos.items.length} piezas`
    : `${datos.items[0]?.pieza ?? "Pieza"}${datos.items[0]?.cantidad > 1 ? ` × ${datos.items[0].cantidad}` : ""}`;

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="Volver al inicio" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-titulo text-xl font-bold">{titulo}</h1>
          <p className="truncate text-sm opacity-70">{datos.moto ?? "Cualquier moto"}</p>
        </div>
      </div>

      {esLista && (
        <p className="mt-2 text-sm opacity-80">
          {datos.items.map((i) => `${i.pieza}${i.cantidad > 1 ? ` × ${i.cantidad}` : ""}`).join(" · ")}
        </p>
      )}

      <div className="mt-4 rounded-2xl bg-tinta p-4 text-fondo" aria-live="polite">
        <p className="text-sm opacity-80">
          {respondieron} de {datos.tiendas.length} {datos.tiendas.length === 1 ? "tienda respondió" : "tiendas respondieron"}
        </p>
        <p className="mt-1 font-titulo text-2xl font-bold">
          {vencida ? "Terminó el tiempo" : `Quedan ${minutos}:${String(segundos).padStart(2, "0")}`}
        </p>
        {!vencida && respondieron < datos.tiendas.length && (
          <p className="mt-1 text-xs opacity-70">Las respuestas aparecen aquí solas, no tienes que recargar.</p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}

      {esLista && conResumen.some((x) => x.r.tiene > 0) && (
        <h2 className="mt-5 font-titulo text-lg font-bold">¿Quién tiene todo?</h2>
      )}

      <ul className="mt-3 space-y-2">
        {ordenadas.map(({ t, r }) => (
          <li key={t.id}>
            <TarjetaRespuesta
              tienda={t}
              items={datos.items}
              resumen={r}
              vencida={vencida}
              hayElegida={hayElegida}
              eligiendo={eligiendo === t.id}
              alElegir={() => voyParaAlla(t.id)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function TarjetaRespuesta({
  tienda: t,
  items,
  resumen: r,
  vencida,
  hayElegida,
  eligiendo,
  alElegir,
}: {
  tienda: Tienda;
  items: Item[];
  resumen: { tiene: number; total: number; respondio: boolean };
  vencida: boolean;
  hayElegida: boolean;
  eligiendo: boolean;
  alElegir: () => void;
}) {
  const esLista = items.length > 1;
  const minutosRespuesta =
    t.respondidaEn &&
    Math.max(1, Math.round((new Date(t.respondidaEn).getTime() - new Date(t.enviadaEn).getTime()) / 60000));
  const faltantes = items.filter((i) => !t.respuestas.get(i.id)?.tiene);

  const etiqueta =
    r.tiene > 0 ? (
      <span className="shrink-0 rounded-full bg-verde-suave px-3 py-1 text-xs font-bold text-verde">
        {esLista ? `${r.tiene} de ${items.length}` : "La tiene"}
      </span>
    ) : r.respondio ? (
      <span className="shrink-0 rounded-full bg-tinta/10 px-3 py-1 text-xs font-bold">
        {esLista ? "No tiene ninguna" : "No la tiene"}
      </span>
    ) : vencida ? (
      <span className="shrink-0 rounded-full bg-tinta/10 px-3 py-1 text-xs font-bold opacity-70">No respondió</span>
    ) : (
      <span className="shrink-0 rounded-full bg-ambar-suave px-3 py-1 text-xs font-bold text-ambar">Esperando…</span>
    );

  const unidad = items.length === 1 ? items[0] : null;
  const precioUnico = unidad ? t.respuestas.get(unidad.id)?.precio : null;

  return (
    <div className={`rounded-2xl border bg-white p-3 ${t.vaParaAlla ? "border-2 border-verde" : "border-tinta/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{t.nombre}</p>
          <p className="text-sm opacity-70">
            {formatoDistancia(t.metros)}
            {minutosRespuesta && ` · respondió en ${minutosRespuesta} min`}
          </p>
        </div>
        {etiqueta}
      </div>

      {/* Una sola pieza: precio (y total si son varias unidades) */}
      {!esLista && r.tiene > 0 && precioUnico != null && (
        <p className="mt-2 text-lg font-bold">
          {formatoPesos(precioUnico)}
          {unidad!.cantidad > 1 && (
            <span className="text-sm font-normal opacity-70">
              {" "}c/u · total {formatoPesos(precioUnico * unidad!.cantidad)}
            </span>
          )}
        </p>
      )}

      {/* Lista: total de lo que tiene, qué le falta y el detalle pieza por pieza */}
      {esLista && r.tiene > 0 && (
        <>
          <p className="mt-2 text-lg font-bold">
            {formatoPesos(r.total)} <span className="text-sm font-normal opacity-70">por lo que tiene</span>
          </p>
          {faltantes.length > 0 && (
            <p className="text-sm text-ambar">Le falta: {faltantes.map((i) => i.pieza).join(", ")}</p>
          )}
          <details className="mt-1 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">Ver pieza por pieza</summary>
            <ul className="space-y-1">
              {items.map((i) => {
                const ri = t.respuestas.get(i.id);
                return (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span>
                      {i.pieza}
                      {i.cantidad > 1 && ` × ${i.cantidad}`}
                    </span>
                    <span className={ri?.tiene ? "font-semibold text-verde" : "opacity-60"}>
                      {ri?.tiene ? `${formatoPesos(ri.precio ?? 0)}${i.cantidad > 1 ? " c/u" : ""}` : "No la tiene"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        </>
      )}

      {r.tiene > 0 && !t.vaParaAlla && (
        <button
          type="button"
          onClick={alElegir}
          disabled={eligiendo}
          className={`mt-2 min-h-11 w-full rounded-xl px-4 font-bold disabled:opacity-60 ${
            hayElegida ? "border border-tinta/30 bg-white" : "bg-naranja text-white"
          }`}
        >
          {eligiendo ? "Avisando a la tienda…" : hayElegida ? "Mejor voy a esta" : "Voy para allá"}
        </button>
      )}

      {t.vaParaAlla && (
        <div className="mt-2 space-y-2">
          <p className="rounded-xl bg-verde-suave p-3 text-sm text-verde">
            <strong>Vas para allá.</strong> La tienda ya sabe que vas por {esLista ? "las piezas que tiene" : "la pieza"}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {t.whatsapp && (
              <a
                href={enlaceWhatsapp(
                  t.whatsapp,
                  `Hola, voy para allá por: ${items
                    .filter((i) => t.respuestas.get(i.id)?.tiene)
                    .map((i) => `${i.pieza}${i.cantidad > 1 ? ` × ${i.cantidad}` : ""}`)
                    .join(", ")} (te escribo desde PiezaCerca).`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center rounded-xl bg-verde text-sm font-semibold text-white"
              >
                WhatsApp
              </a>
            )}
            <a
              href={enlaceComoLlegar(t.lat, t.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-11 items-center justify-center rounded-xl border border-tinta/20 text-sm font-semibold ${
                t.whatsapp ? "" : "col-span-2"
              }`}
            >
              Cómo llegar
            </a>
          </div>
          <p className="text-xs opacity-60">{t.direccion}</p>
        </div>
      )}
    </div>
  );
}
