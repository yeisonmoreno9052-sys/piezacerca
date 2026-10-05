"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activarAudio, sonarAviso } from "@/lib/aviso-sonoro";
import { crearClienteNavegador } from "@/lib/supabase/client";

// Lo que comparten el Modo tienda (celular) y el modo mostrador (PC):
// cargar las solicitudes, recibirlas en vivo y sonar con lo nuevo.

export type Item = {
  id: number;
  piezaId: number;
  pieza: string;
  cantidad: number;
  respuesta: { tiene: boolean; precio: number | null } | null;
  // Precio sugerido: el último que esta tienda dio por esta pieza (de preferencia para la misma moto).
  sugerido: { precio: number; mismaMoto: boolean; dias: number } | null;
};

export type Solicitud = {
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
export function descripcion(s: Solicitud) {
  if (s.items.length > 1) return `Lista de ${s.items.length} piezas`;
  const i = s.items[0];
  return `${i.pieza}${i.cantidad > 1 ? ` × ${i.cantidad}` : ""}`;
}

// Lo que la tienda dijo que tiene: cuántas piezas y cuánto suman (precio por unidad × cantidad).
export function loQueTiene(s: Solicitud) {
  const tiene = s.items.filter((i) => i.respuesta?.tiene);
  return { cuantas: tiene.length, total: tiene.reduce((t, i) => t + (i.respuesta!.precio ?? 0) * i.cantidad, 0) };
}

// Solicitudes de las últimas 24 horas que le llegaron a esta tienda, con sus respuestas.
export async function cargar(tiendaId: string, tiendaLat: number, tiendaLng: number): Promise<Solicitud[]> {
  const supabase = crearClienteNavegador();
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: envios }, { data: respuestas }, { data: historial }] = await Promise.all([
    supabase
      .from("solicitud_tiendas")
      .select(
        "solicitud_id, enviada_en, respondida_en, va_para_alla_en, solicitudes(lat, lng, vence_en, moto_id, motos(marca, modelo, cilindraje), solicitud_items(id, cantidad, pieza_id, piezas(nombre)))",
      )
      .eq("tienda_id", tiendaId)
      .gte("enviada_en", desde)
      .order("enviada_en", { ascending: false }),
    supabase.from("respuestas").select("item_id, tiene, precio").eq("tienda_id", tiendaId).gte("respondida_en", desde),
    // Precios que esta tienda ya dio (solo los suyos: la base de datos no deja ver los de otras tiendas).
    supabase
      .from("respuestas")
      .select("precio, respondida_en, solicitud_items(pieza_id, solicitudes(moto_id))")
      .eq("tienda_id", tiendaId)
      .eq("tiene", true)
      .order("respondida_en", { ascending: false })
      .limit(300),
  ]);

  const anteriores = (historial ?? []).flatMap((h) => {
    const item = uno(h.solicitud_items as unknown as { pieza_id: number; solicitudes: { moto_id: number | null } | null });
    if (!item || h.precio == null) return [];
    return [{ piezaId: item.pieza_id, motoId: uno(item.solicitudes)?.moto_id ?? null, precio: h.precio as number, en: new Date(h.respondida_en).getTime() }];
  });
  function sugerir(piezaId: number, motoId: number | null) {
    const misma = motoId != null ? anteriores.find((a) => a.piezaId === piezaId && a.motoId === motoId) : undefined;
    const cualquiera = misma ?? anteriores.find((a) => a.piezaId === piezaId);
    if (!cualquiera) return null;
    return { precio: cualquiera.precio, mismaMoto: Boolean(misma), dias: Math.floor((Date.now() - cualquiera.en) / 86400000) };
  }

  return (envios ?? []).flatMap((e) => {
    const s = uno(
      e.solicitudes as unknown as {
        lat: number;
        lng: number;
        vence_en: string;
        moto_id: number | null;
        motos: { marca: string; modelo: string; cilindraje: number } | null;
        solicitud_items: { id: number; cantidad: number; pieza_id: number; piezas: { nombre: string } | { nombre: string }[] }[];
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
          piezaId: i.pieza_id,
          pieza: uno(i.piezas)?.nombre ?? "Pieza",
          cantidad: i.cantidad,
          respuesta: r ? { tiene: r.tiene, precio: r.precio } : null,
          sugerido: sugerir(i.pieza_id, s.moto_id),
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


export function useSolicitudesTienda(tiendaId: string, tiendaLat: number, tiendaLng: number, titulo: string) {
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
      if (document.visibilityState === "visible") document.title = titulo;
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
  }, [tiendaId, tiendaLat, tiendaLng, avisarSiHayAlgoNuevo, titulo]);

  function activarSonido() {
    // Se activa con el toque de la persona: así el navegador deja sonar los avisos después.
    sonidoRef.current = activarAudio();
    setSonido(true);
    sonarAviso(); // de prueba
  }


  return { solicitudes, ahora, sonido, sonidoRef, activarSonido, recargar };
}
