"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CATEGORIAS, textoCategoria } from "@/lib/catalogo";
import {
  agregarReciente,
  guardarMiMotoLocal,
  useMiMotoLocal,
  useRecientes,
} from "@/lib/guardado-local";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { guardarMiMoto } from "./acciones";

export type Moto = { id: number; marca: string; modelo: string; cilindraje: number };
export type Pieza = { id: number; nombre: string; categoria: string };
type Sugerencia = Pieza & { coincidencia: string };

export function nombreMoto(m: Moto) {
  return `${m.marca} ${m.modelo} ${m.cilindraje}`;
}

const etiqueta = "text-xs font-semibold uppercase tracking-wider text-tinta/70";

export function Buscador({
  cabecera,
  motos,
  piezas,
  conSesion,
  motoDelPerfil,
}: {
  cabecera: React.ReactNode;
  motos: Moto[];
  piezas: Pieza[];
  conSesion: boolean;
  motoDelPerfil: number | null;
}) {
  const router = useRouter();
  const motoLocal = useMiMotoLocal();
  const recientes = useRecientes();

  // "Mi moto": la del perfil si entró con su cuenta; si no, la guardada en el celular.
  const [motoElegida, setMotoElegida] = useState<number | null | undefined>(undefined);
  const idMoto = motoElegida !== undefined ? motoElegida : conSesion ? motoDelPerfil : motoLocal;
  const miMoto = motos.find((m) => m.id === idMoto) ?? null;

  const [consulta, setConsulta] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [eligiendoMoto, setEligiendoMoto] = useState(false);
  const [filtroMoto, setFiltroMoto] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultima = useRef(0);

  async function pedirSugerencias(texto: string) {
    const numero = ++ultima.current;
    const { data } = await crearClienteNavegador().rpc("sugerir_piezas", {
      consulta: texto,
      limite: 6,
    });
    if (numero !== ultima.current) return null; // llegó una búsqueda más nueva
    const lista = (data ?? []) as Sugerencia[];
    setSugerencias(lista);
    setBuscando(false);
    return lista;
  }

  function alEscribir(texto: string) {
    setConsulta(texto);
    setAviso(null);
    if (temporizador.current) clearTimeout(temporizador.current);
    if (texto.trim().length < 2) {
      ultima.current++;
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    temporizador.current = setTimeout(() => pedirSugerencias(texto), 250);
  }

  function elegirPieza(pieza: { id: number; nombre: string }) {
    agregarReciente({ id: pieza.id, nombre: pieza.nombre });
    const parametros = new URLSearchParams({ pieza: String(pieza.id) });
    if (miMoto) parametros.set("moto", String(miMoto.id));
    router.push(`/buscar?${parametros}`);
  }

  async function alBuscar(evento: React.FormEvent) {
    evento.preventDefault();
    if (consulta.trim().length < 2) {
      setAviso("Escribe el nombre de la pieza, por ejemplo: farola, pastillas, kit de arrastre.");
      return;
    }
    if (temporizador.current) clearTimeout(temporizador.current);
    const lista = buscando ? await pedirSugerencias(consulta) : sugerencias;
    if (lista && lista.length > 0) elegirPieza(lista[0]);
    else if (lista) setAviso("No encontramos esa pieza. Prueba con otro nombre o escoge una categoría.");
  }

  function elegirMoto(id: number | null) {
    setMotoElegida(id);
    setEligiendoMoto(false);
    setFiltroMoto("");
    guardarMiMotoLocal(id);
    if (conSesion) guardarMiMoto(id);
  }

  const filtro = filtroMoto.trim().toLowerCase();
  const motosFiltradas = motos.filter((m) => nombreMoto(m).toLowerCase().includes(filtro));
  const marcas = [...new Set(motosFiltradas.map((m) => m.marca))];

  return (
    <>
      <div className="rounded-b-[28px] bg-tinta px-4 pb-7 pt-6 text-fondo">
        {cabecera}

        <h1 className="mt-5 font-titulo text-3xl font-bold leading-tight tracking-tight">
          ¿Qué pieza necesitas hoy?
        </h1>

        <form onSubmit={alBuscar} className="mt-4" role="search">
          <label htmlFor="consulta" className="sr-only">
            Buscar pieza
          </label>
          <div className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-tinta">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 opacity-60">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input
              id="consulta"
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Farola, pastillas, kit de arrastre…"
              value={consulta}
              onChange={(e) => alEscribir(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base outline-none"
            />
          </div>

          {sugerencias.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-2xl bg-white text-tinta" aria-label="Sugerencias">
              {sugerencias.map((s) => (
                <li key={s.id} className="border-b border-tinta/10 last:border-0">
                  <button
                    type="button"
                    onClick={() => elegirPieza(s)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left"
                  >
                    <span>
                      <span className="block font-medium">{s.nombre}</span>
                      {s.coincidencia !== s.nombre && (
                        <span className="block text-xs opacity-60">También le dicen &quot;{s.coincidencia}&quot;</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs opacity-60">{textoCategoria(s.categoria)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {aviso && (
            <p role="alert" className="mt-2 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
              {aviso}
            </p>
          )}

          <button
            type="submit"
            className="mt-3 flex min-h-13 w-full items-center justify-center rounded-2xl bg-naranja px-4 font-bold text-white"
          >
            Buscar en tiendas cercanas
          </button>
        </form>
      </div>

      <div className="space-y-6 px-4 pb-8 pt-6">
        <section>
          <h2 className={etiqueta}>Mi moto</h2>
          {!eligiendoMoto ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-tinta/10 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{miMoto ? nombreMoto(miMoto) : "Sin escoger"}</p>
                <p className="text-sm opacity-70">
                  {miMoto
                    ? "Las tiendas que ves atienden esta marca"
                    : "Escógela para ver solo tiendas que la atienden"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEligiendoMoto(true)}
                className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-naranja"
              >
                {miMoto ? "Cambiar" : "Escoger"}
              </button>
            </div>
          ) : (
            <div className="mt-2 rounded-2xl border border-tinta/10 bg-white p-3">
              <label htmlFor="filtro-moto" className="sr-only">
                Buscar moto
              </label>
              <input
                id="filtro-moto"
                type="search"
                autoComplete="off"
                autoFocus
                placeholder="Escribe la marca o la referencia"
                value={filtroMoto}
                onChange={(e) => setFiltroMoto(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-tinta/20 px-3 text-base outline-none focus:border-naranja"
              />
              <div className="mt-2 max-h-72 overflow-y-auto">
                {marcas.map((marca) => (
                  <div key={marca} className="mt-2">
                    <p className="px-1 text-xs font-semibold opacity-60">{marca}</p>
                    {motosFiltradas
                      .filter((m) => m.marca === marca)
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => elegirMoto(m.id)}
                          className={`flex min-h-11 w-full items-center rounded-xl px-3 text-left ${
                            m.id === idMoto ? "bg-ambar-suave font-semibold" : ""
                          }`}
                        >
                          {m.modelo} {m.cilindraje}
                        </button>
                      ))}
                  </div>
                ))}
                {motosFiltradas.length === 0 && (
                  <p className="p-3 text-sm opacity-70">
                    No encontramos esa moto. Por ahora busca sin moto y te mostramos todas las tiendas.
                  </p>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                {miMoto && (
                  <button
                    type="button"
                    onClick={() => elegirMoto(null)}
                    className="min-h-11 flex-1 rounded-xl border border-tinta/20 px-3 text-sm font-medium"
                  >
                    Quitar mi moto
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEligiendoMoto(false)}
                  className="min-h-11 flex-1 rounded-xl border border-tinta/20 px-3 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className={etiqueta}>Categorías</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CATEGORIAS.map((c) => (
              <button
                key={c.valor}
                type="button"
                aria-pressed={categoria === c.valor}
                onClick={() => setCategoria(categoria === c.valor ? null : c.valor)}
                className={`min-h-12 rounded-2xl border px-2 text-sm font-semibold ${
                  categoria === c.valor
                    ? "border-tinta bg-tinta text-white"
                    : "border-tinta/10 bg-white"
                }`}
              >
                {c.texto}
              </button>
            ))}
          </div>
          {categoria && (
            <div className="mt-3 flex flex-wrap gap-2">
              {piezas
                .filter((p) => p.categoria === categoria)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => elegirPieza(p)}
                    className="min-h-11 rounded-full bg-white px-4 text-sm font-medium"
                  >
                    {p.nombre}
                  </button>
                ))}
            </div>
          )}
        </section>

        {recientes.length > 0 && (
          <section>
            <h2 className={etiqueta}>Búsquedas recientes</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {recientes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => elegirPieza(p)}
                  className="min-h-11 rounded-full bg-tinta/10 px-4 text-sm font-medium"
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
