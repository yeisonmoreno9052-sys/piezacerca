"use client";

import { useActionState } from "react";
import { CATEGORIAS } from "@/lib/catalogo";
import type { EstadoFormulario } from "./acciones";

type Pieza = {
  nombre: string;
  categoria: string;
  sinonimos: string[];
};

const campo =
  "mt-1 min-h-11 w-full rounded-xl border border-tinta/20 bg-white px-4 text-base outline-none focus:border-naranja";

export function FormularioPieza({
  accion,
  pieza,
  textoBoton,
}: {
  accion: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  pieza?: Pieza;
  textoBoton: string;
}) {
  const [estado, enviar, guardando] = useActionState(accion, { error: null });

  return (
    <form action={enviar} className="space-y-4">
      <label className="block text-sm font-medium">
        Nombre de la pieza
        <input
          name="nombre"
          required
          maxLength={80}
          placeholder="Farola"
          defaultValue={pieza?.nombre}
          className={campo}
        />
      </label>

      <label className="block text-sm font-medium">
        Categoría
        <select
          name="categoria"
          required
          defaultValue={pieza?.categoria ?? ""}
          className={campo}
        >
          <option value="" disabled>
            Escoge una
          </option>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.texto}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium">
        Otros nombres
        <textarea
          name="sinonimos"
          rows={3}
          placeholder="faro, luz delantera, farol"
          defaultValue={pieza?.sinonimos.join(", ")}
          className={`${campo} py-3`}
        />
      </label>
      <p className="-mt-2 text-xs opacity-70">
        Sepáralos con comas. Son las otras formas en que los mecánicos y clientes le dicen a
        esta pieza; el buscador los usará para encontrarla.
      </p>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="min-h-11 w-full rounded-xl bg-naranja px-4 font-semibold text-white disabled:opacity-60"
      >
        {guardando ? "Guardando…" : textoBoton}
      </button>
    </form>
  );
}
