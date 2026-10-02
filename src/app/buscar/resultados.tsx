"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { enlaceComoLlegar, formatoDistancia, formatoTiempoRespuesta } from "@/lib/formato";
import { useUbicacion } from "@/lib/guardado-local";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { SelectorUbicacion } from "../selector-ubicacion";
import { MAPA_DISPONIBLE, MapaTiendas } from "./mapa-tiendas";

export type TiendaCercana = {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  estado: "activa" | "sin_confirmar";
  distancia_m: number;
  puede_preguntar: boolean;
  tiempo_promedio_respuesta_seg: number | null;
  radio_km: number;
};

type Vista = "lista" | "mapa";
const CLAVE_VISTA = "piezacerca:vista";

// La pestaña preferida (Lista o Mapa) se recuerda en el celular.
function useVista(): [Vista, (v: Vista) => void] {
  const guardada = useSyncExternalStore(
    (avisar) => {
      window.addEventListener("storage", avisar);
      return () => window.removeEventListener("storage", avisar);
    },
    () => {
      try {
        return localStorage.getItem(CLAVE_VISTA);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const [elegida, setElegida] = useState<Vista | null>(null);
  const vista: Vista = elegida ?? (guardada === "mapa" ? "mapa" : "lista");
  function cambiar(v: Vista) {
    setElegida(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      // sin almacenamiento
    }
  }
  return [vista, cambiar];
}

export function Resultados({
  categoria,
  marcaMoto,
}: {
  categoria: string;
  marcaMoto: string | null;
}) {
  const ubicacion = useUbicacion();
  const [vista, setVista] = useVista();
  const [tiendas, setTiendas] = useState<TiendaCercana[] | null>(null);
  const [falla, setFalla] = useState(false);
  const [cambiandoUbicacion, setCambiandoUbicacion] = useState(false);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const lat = ubicacion?.lat;
  const lng = ubicacion?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    let vigente = true;
    crearClienteNavegador()
      .rpc("tiendas_cercanas", {
        cliente_lat: lat,
        cliente_lng: lng,
        linea: categoria,
        marca_moto: marcaMoto,
      })
      .then(({ data, error }) => {
        if (!vigente) return;
        setFalla(Boolean(error));
        setTiendas((data ?? []) as TiendaCercana[]);
      });
    return () => {
      vigente = false;
    };
  }, [lat, lng, categoria, marcaMoto]);

  const alSeleccionar = useCallback((id: string) => setSeleccionada(id), []);

  if (!ubicacion || cambiandoUbicacion) {
    return (
      <div className="rounded-2xl bg-tinta p-3">
        <SelectorUbicacion
          mensaje="Dinos dónde estás para mostrarte las tiendas más cercanas."
          alElegir={() => {
            setCambiandoUbicacion(false);
            setTiendas(null);
          }}
          alCancelar={() => setCambiandoUbicacion(false)}
        />
      </div>
    );
  }

  const preguntables = (tiendas ?? []).filter((t) => t.puede_preguntar);
  const otras = (tiendas ?? []).filter((t) => !t.puede_preguntar);
  const ordenadas = [...preguntables, ...otras];
  const radio = tiendas?.[0]?.radio_km ?? 5;
  const tiendaSeleccionada = ordenadas.find((t) => t.id === seleccionada) ?? null;

  return (
    <>
      <p className="text-sm opacity-70">
        Cerca de: <strong>{ubicacion.nombre}</strong>
        {tiendas && ` · ${tiendas.length} ${tiendas.length === 1 ? "tienda" : "tiendas"}`}{" "}
        <button
          type="button"
          onClick={() => setCambiandoUbicacion(true)}
          className="min-h-11 px-1 font-semibold text-naranja"
        >
          Cambiar
        </button>
      </p>

      <div className="mt-2 flex gap-2" role="tablist" aria-label="Ver tiendas como">
        {(["lista", "mapa"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={vista === v}
            onClick={() => setVista(v)}
            className={`min-h-11 flex-1 rounded-xl text-sm font-semibold ${
              vista === v ? "bg-tinta text-white" : "bg-white"
            }`}
          >
            {v === "lista" ? "Lista" : "Mapa"}
          </button>
        ))}
      </div>

      {tiendas === null && !falla && (
        <p className="mt-4 rounded-2xl bg-white p-4 text-sm opacity-70">Buscando tiendas cercanas…</p>
      )}

      {falla && (
        <p role="alert" className="mt-4 rounded-2xl bg-ambar-suave p-4 text-sm text-ambar">
          No pudimos buscar las tiendas. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}

      {tiendas && tiendas.length === 0 && (
        <p className="mt-4 rounded-2xl bg-white p-4 text-sm">
          Todavía no hay tiendas cargadas que manejen esta pieza a menos de 10 km de{" "}
          {ubicacion.nombre}. Estamos sumando tiendas de la zona.
        </p>
      )}

      {tiendas && radio > 5 && tiendas.some((t) => t.distancia_m > 5000) && (
        <p className="mt-3 text-xs opacity-70">
          Cerca no había tiendas confirmadas con esta pieza; te mostramos también las que están hasta
          a {radio} km.
        </p>
      )}

      {tiendas && tiendas.length > 0 && vista === "mapa" && (
        <div className="mt-3">
          <MapaTiendas
            centro={ubicacion}
            tiendas={ordenadas}
            seleccionada={seleccionada}
            alSeleccionar={alSeleccionar}
          />
          {tiendaSeleccionada ? (
            <div className="mt-3">
              <TarjetaTienda tienda={tiendaSeleccionada} numero={ordenadas.indexOf(tiendaSeleccionada) + 1} />
            </div>
          ) : (
            MAPA_DISPONIBLE && (
              <p className="mt-2 text-center text-xs opacity-70">Toca un número para ver la tienda.</p>
            )
          )}
        </div>
      )}

      {tiendas && tiendas.length > 0 && vista === "lista" && (
        <div className="mt-3 space-y-5">
          {preguntables.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold opacity-70">
                Manejan esta pieza ({preguntables.length})
              </h2>
              <ul className="mt-2 space-y-2">
                {preguntables.map((t, i) => (
                  <li key={t.id}>
                    <TarjetaTienda tienda={t} numero={i + 1} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {otras.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold opacity-70">
                Otras tiendas de la zona ({otras.length})
              </h2>
              <p className="mt-1 text-xs opacity-70">
                Todavía no están confirmadas en PiezaCerca: no reciben preguntas por la app.
              </p>
              <ul className="mt-2 space-y-2">
                {otras.map((t, i) => (
                  <li key={t.id}>
                    <TarjetaTienda tienda={t} numero={preguntables.length + i + 1} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tiendas && tiendas.length > 0 && (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-tinta/10 bg-fondo px-4 pb-4 pt-3">
          {preguntables.length > 0 ? (
            <>
              <button
                type="button"
                disabled
                className="min-h-13 w-full rounded-2xl bg-naranja px-4 font-bold text-white opacity-60"
              >
                Preguntar a {preguntables.length === 1 ? "la tienda" : `las ${preguntables.length} tiendas`} · muy pronto
              </button>
              <p className="mt-1 text-center text-xs opacity-70">
                Pronto podrás preguntar a todas a la vez y te responderán en máximo 10 minutos.
              </p>
            </>
          ) : (
            <p className="text-center text-sm opacity-80">
              Ninguna tienda confirmada maneja esta pieza cerca de ti todavía.
            </p>
          )}
        </div>
      )}
    </>
  );
}

function TarjetaTienda({ tienda, numero }: { tienda: TiendaCercana; numero: number }) {
  const respuesta = formatoTiempoRespuesta(tienda.tiempo_promedio_respuesta_seg);
  return (
    <div className="rounded-2xl border border-tinta/10 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">
            {numero} · {tienda.nombre}
          </p>
          <p className="text-sm opacity-70">
            {formatoDistancia(tienda.distancia_m)}
            {respuesta && ` · ${respuesta}`}
          </p>
          <p className="truncate text-xs opacity-60">{tienda.direccion}</p>
        </div>
        {tienda.puede_preguntar ? (
          <span className="shrink-0 rounded-full bg-ambar-suave px-3 py-1 text-xs font-bold text-ambar">
            Maneja la pieza
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-tinta/10 px-3 py-1 text-xs font-bold">
            Sin confirmar
          </span>
        )}
      </div>
      <a
        href={enlaceComoLlegar(tienda.lat, tienda.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-tinta/20 text-sm font-semibold"
      >
        Cómo llegar
      </a>
    </div>
  );
}
