"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useMiMotoLocal, useUbicacion } from "@/lib/guardado-local";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { SelectorUbicacion } from "../selector-ubicacion";
import type { ItemLista, ListaLista } from "./lista-solo-navegador";

const MAXIMO = 15;
const CLAVE_BORRADOR = "piezacerca:lista-borrador";

type Borrador = { nombre: string; guardadaId: string | null; items: ItemLista[] };
type Moto = { id: number; marca: string; modelo: string; cilindraje: number };

const MENSAJES: Record<string, string> = {
  limite: "Hiciste muchas preguntas seguidas. Espera un rato e inténtalo de nuevo.",
  sin_tiendas: "Ninguna tienda confirmada cerca maneja estas piezas en este momento.",
  lista_tamano: `La lista debe tener entre 1 y ${MAXIMO} piezas.`,
  cantidad: "Cada cantidad debe estar entre 1 y 20.",
  pieza: "Hay piezas repetidas en la lista.",
};

function leerBorrador(): Borrador | null {
  try {
    const texto = localStorage.getItem(CLAVE_BORRADOR);
    return texto ? (JSON.parse(texto) as Borrador) : null;
  } catch {
    return null;
  }
}

function guardarBorrador(borrador: Borrador | null) {
  try {
    if (borrador) localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));
    else localStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    // sin almacenamiento
  }
}

export function ArmarLista({
  paquetes,
  misListas,
  conSesion,
  motos,
  motoDelPerfil,
}: {
  paquetes: ListaLista[];
  misListas: ListaLista[];
  conSesion: boolean;
  motos: Moto[];
  motoDelPerfil: number | null;
}) {
  const router = useRouter();
  const motoLocal = useMiMotoLocal();
  const ubicacion = useUbicacion();
  const idMoto = motoLocal ?? motoDelPerfil;
  const moto = motos.find((m) => m.id === idMoto) ?? null;

  // Si la persona venía armando una lista (por ejemplo, tuvo que entrar con su cuenta), se recupera.
  const [borrador, setBorrador] = useState<Borrador | null>(() => leerBorrador());

  function cambiar(nuevo: Borrador | null) {
    setBorrador(nuevo);
    guardarBorrador(nuevo);
  }

  if (!borrador) {
    return (
      <EscogerLista
        paquetes={paquetes}
        misListas={misListas}
        conSesion={conSesion}
        moto={moto}
        alEscoger={(l) =>
          cambiar({
            nombre: l ? l.nombre : "Mi lista",
            guardadaId: l?.tipo === "guardada" ? l.id : null,
            items: l ? l.items.slice(0, MAXIMO) : [],
          })
        }
      />
    );
  }

  return (
    <EditarLista
      borrador={borrador}
      moto={moto}
      conSesion={conSesion}
      ubicacion={ubicacion}
      alCambiar={cambiar}
      alVolver={() => cambiar(null)}
      alEnviada={(id) => {
        guardarBorrador(null);
        router.push(`/solicitud/${id}`);
      }}
      alGuardada={() => router.refresh()}
    />
  );
}

function Cabecera({ titulo, subtitulo, alVolver }: { titulo: string; subtitulo: string; alVolver?: () => void }) {
  const flecha = (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
  const clase = "flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10";
  return (
    <div className="flex items-center gap-2">
      {alVolver ? (
        <button type="button" onClick={alVolver} aria-label="Volver" className={clase}>
          {flecha}
        </button>
      ) : (
        <Link href="/" aria-label="Volver al inicio" className={clase}>
          {flecha}
        </Link>
      )}
      <div className="min-w-0">
        <h1 className="truncate font-titulo text-xl font-bold">{titulo}</h1>
        <p className="truncate text-sm opacity-80">{subtitulo}</p>
      </div>
    </div>
  );
}

function EscogerLista({
  paquetes,
  misListas,
  conSesion,
  moto,
  alEscoger,
}: {
  paquetes: ListaLista[];
  misListas: ListaLista[];
  conSesion: boolean;
  moto: Moto | null;
  alEscoger: (lista: ListaLista | null) => void;
}) {
  const etiqueta = "text-xs font-semibold uppercase tracking-wider text-tinta/70";
  const tarjeta = "flex w-full flex-col items-start rounded-2xl border border-tinta/10 bg-white p-4 text-left";

  return (
    <>
      <div className="rounded-b-[28px] bg-tinta px-4 pb-5 pt-4 text-fondo">
        <Cabecera
          titulo="Arma tu lista"
          subtitulo={moto ? `Para ${moto.marca} ${moto.modelo} ${moto.cilindraje}` : "Para cualquier moto"}
        />
        {!moto && (
          <p className="mt-3 text-sm opacity-80">
            Consejo: escoge <Link href="/?modo=cliente" className="font-semibold underline">tu moto</Link> en el
            inicio para que las tiendas sepan qué referencia buscar.
          </p>
        )}
      </div>

      <div className="space-y-6 px-4 pb-10 pt-5">
        <section>
          <h2 className={etiqueta}>Empieza con una lista lista</h2>
          <ul className="mt-2 space-y-2">
            {paquetes.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => alEscoger(p)} className={tarjeta}>
                  <span className="font-bold">
                    {p.nombre} · {p.items.length}
                  </span>
                  <span className="text-sm opacity-70">{p.items.map((i) => i.nombre).join(", ")}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={etiqueta}>Mis listas</h2>
          {misListas.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {misListas.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => alEscoger(l)} className={tarjeta}>
                    <span className="font-bold">
                      {l.nombre} · {l.items.length}
                    </span>
                    <span className="text-sm opacity-70">{l.items.map((i) => i.nombre).join(", ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm opacity-70">
              {conSesion
                ? "Todavía no tienes listas guardadas. Arma una y guárdala para usarla otra vez."
                : "Entra con tu cuenta para guardar tus listas y usarlas otra vez."}
            </p>
          )}
        </section>

        <button
          type="button"
          onClick={() => alEscoger(null)}
          className="min-h-12 w-full rounded-2xl border-2 border-dashed border-tinta/25 bg-white font-bold"
        >
          + Lista en blanco
        </button>
      </div>
    </>
  );
}

type Sugerencia = { id: number; nombre: string; coincidencia: string };

function EditarLista({
  borrador,
  moto,
  conSesion,
  ubicacion,
  alCambiar,
  alVolver,
  alEnviada,
  alGuardada,
}: {
  borrador: Borrador;
  moto: Moto | null;
  conSesion: boolean;
  ubicacion: { lat: number; lng: number; nombre: string } | null;
  alCambiar: (b: Borrador) => void;
  alVolver: () => void;
  alEnviada: (id: string) => void;
  alGuardada: () => void;
}) {
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pidiendoUbicacion, setPidiendoUbicacion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultima = useRef(0);
  const { items } = borrador;
  const llena = items.length >= MAXIMO;

  function buscar(texto: string) {
    setConsulta(texto);
    setAviso(null);
    if (temporizador.current) clearTimeout(temporizador.current);
    if (texto.trim().length < 2) {
      ultima.current++;
      setSugerencias([]);
      return;
    }
    temporizador.current = setTimeout(async () => {
      const numero = ++ultima.current;
      const { data } = await crearClienteNavegador().rpc("sugerir_piezas", { consulta: texto, limite: 5 });
      if (numero === ultima.current) setSugerencias((data ?? []) as Sugerencia[]);
    }, 250);
  }

  function agregar(p: { id: number; nombre: string }) {
    setConsulta("");
    setSugerencias([]);
    setGuardadoOk(false);
    if (items.some((i) => i.id === p.id)) {
      setAviso(`"${p.nombre}" ya está en la lista: súbele la cantidad.`);
      return;
    }
    if (llena) {
      setAviso(`La lista puede tener máximo ${MAXIMO} piezas.`);
      return;
    }
    alCambiar({ ...borrador, items: [...items, { id: p.id, nombre: p.nombre, cantidad: 1 }] });
  }

  function cambiarCantidad(id: number, cantidad: number) {
    setGuardadoOk(false);
    alCambiar({ ...borrador, items: items.map((i) => (i.id === id ? { ...i, cantidad } : i)) });
  }

  function quitar(id: number) {
    setGuardadoOk(false);
    alCambiar({ ...borrador, items: items.filter((i) => i.id !== id) });
  }

  async function asegurarSesion() {
    const { data } = await crearClienteNavegador().auth.getClaims();
    if (data?.claims) return true;
    router.push(`/entrar?volver=${encodeURIComponent("/lista")}`);
    return false;
  }

  async function guardar() {
    setAviso(null);
    if (!(await asegurarSesion())) return;
    setGuardando(true);
    const supabase = crearClienteNavegador();
    let id = borrador.guardadaId;
    if (id) {
      await supabase.from("listas_guardadas").update({ nombre: borrador.nombre, moto_id: moto?.id ?? null }).eq("id", id);
      await supabase.from("lista_items").delete().eq("lista_id", id);
    } else {
      const { data, error } = await supabase
        .from("listas_guardadas")
        .insert({ nombre: borrador.nombre, moto_id: moto?.id ?? null })
        .select("id")
        .single();
      if (error || !data) {
        setGuardando(false);
        setAviso("No se pudo guardar la lista. Inténtalo de nuevo.");
        return;
      }
      id = data.id as string;
      alCambiar({ ...borrador, guardadaId: id });
    }
    const { error } = await supabase
      .from("lista_items")
      .insert(items.map((i) => ({ lista_id: id, pieza_id: i.id, cantidad: i.cantidad })));
    setGuardando(false);
    if (error) {
      setAviso("No se pudo guardar la lista. Inténtalo de nuevo.");
      return;
    }
    setGuardadoOk(true);
    alGuardada();
  }

  async function preguntar() {
    setAviso(null);
    if (items.length === 0) {
      setAviso("Agrega al menos una pieza a la lista.");
      return;
    }
    if (!ubicacion) {
      setPidiendoUbicacion(true);
      return;
    }
    if (!(await asegurarSesion())) return;
    setEnviando(true);
    const { data, error } = await crearClienteNavegador().rpc("enviar_solicitud_lista", {
      items: items.map((i) => ({ pieza: i.id, cantidad: i.cantidad })),
      moto: moto?.id ?? null,
      cliente_lat: ubicacion.lat,
      cliente_lng: ubicacion.lng,
    });
    if (error || !data) {
      setEnviando(false);
      setAviso(MENSAJES[error?.hint ?? ""] ?? "No pudimos enviar la lista. Inténtalo de nuevo.");
      return;
    }
    alEnviada(data as string);
  }

  const paso = "flex size-10 items-center justify-center rounded-xl border border-tinta/20 bg-white text-lg font-bold disabled:opacity-40";

  return (
    <>
      <div className="rounded-b-[28px] bg-tinta px-4 pb-5 pt-4 text-fondo">
        <Cabecera
          titulo={borrador.nombre}
          subtitulo={`${items.length} de ${MAXIMO} piezas · ${moto ? `${moto.marca} ${moto.modelo} ${moto.cilindraje}` : "cualquier moto"}`}
          alVolver={alVolver}
        />
        <label htmlFor="agregar-pieza" className="sr-only">
          Agregar pieza
        </label>
        <input
          id="agregar-pieza"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder={llena ? `Máximo ${MAXIMO} piezas` : "+ Agregar pieza: escribe aquí…"}
          disabled={llena}
          value={consulta}
          onChange={(e) => buscar(e.target.value)}
          className="mt-4 min-h-12 w-full rounded-2xl bg-white px-4 text-base text-tinta outline-none disabled:opacity-60"
        />
        {sugerencias.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-2xl bg-white text-tinta">
            {sugerencias.map((s) => (
              <li key={s.id} className="border-b border-tinta/10 last:border-0">
                <button type="button" onClick={() => agregar(s)} className="flex min-h-12 w-full items-center justify-between px-4 text-left">
                  <span className="font-medium">{s.nombre}</span>
                  <span className="text-sm font-bold text-naranja">Agregar</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 pb-10 pt-4">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm opacity-80">
            Tu lista está vacía. Escribe arriba el nombre de cada pieza para agregarla.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-2xl border border-tinta/10 bg-white p-2 pl-4">
                <span className="min-w-0 flex-1 font-medium">{i.nombre}</span>
                <button type="button" aria-label={`Una ${i.nombre} menos`} disabled={i.cantidad <= 1} onClick={() => cambiarCantidad(i.id, i.cantidad - 1)} className={paso}>
                  −
                </button>
                <span className="w-6 text-center font-bold">{i.cantidad}</span>
                <button type="button" aria-label={`Una ${i.nombre} más`} disabled={i.cantidad >= 20} onClick={() => cambiarCantidad(i.id, i.cantidad + 1)} className={paso}>
                  +
                </button>
                <button type="button" aria-label={`Quitar ${i.nombre}`} onClick={() => quitar(i.id)} className="flex size-10 items-center justify-center rounded-xl text-lg opacity-60">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-3">
            <label htmlFor="nombre-lista" className="text-sm font-semibold">
              Nombre de la lista
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="nombre-lista"
                maxLength={40}
                value={borrador.nombre}
                onChange={(e) => {
                  setGuardadoOk(false);
                  alCambiar({ ...borrador, nombre: e.target.value });
                }}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-tinta/20 px-3 text-base outline-none focus:border-naranja"
              />
              <button
                type="button"
                onClick={guardar}
                disabled={guardando || !borrador.nombre.trim()}
                className="min-h-11 shrink-0 rounded-xl border border-tinta/30 px-3 text-sm font-semibold disabled:opacity-50"
              >
                {guardando ? "Guardando…" : guardadoOk ? "Guardada" : conSesion ? "Guardar" : "Entrar y guardar"}
              </button>
            </div>
          </div>
        )}

        {aviso && (
          <p role="alert" className="mt-3 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
            {aviso}
          </p>
        )}

        {pidiendoUbicacion && (
          <div className="mt-3 rounded-2xl bg-tinta p-3">
            <SelectorUbicacion
              mensaje="Para preguntar tu lista necesitamos saber dónde estás."
              alElegir={() => setPidiendoUbicacion(false)}
              alCancelar={() => setPidiendoUbicacion(false)}
            />
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-tinta/10 bg-fondo px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={preguntar}
            disabled={enviando || items.length === 0}
            className="min-h-13 w-full rounded-2xl bg-naranja px-4 font-bold text-white disabled:opacity-50"
          >
            {enviando ? "Enviando…" : `Preguntar la lista (${items.length} ${items.length === 1 ? "pieza" : "piezas"})`}
          </button>
          <p className="mt-1 text-center text-xs opacity-70">
            {ubicacion ? `Cerca de ${ubicacion.nombre} · ` : ""}Les llega a las tiendas cercanas y tienen 10 minutos.
          </p>
        </div>
      </div>
    </>
  );
}
