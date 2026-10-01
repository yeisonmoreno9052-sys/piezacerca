"use client";

import { useState } from "react";
import { CATEGORIAS, MARCA_TODAS } from "@/lib/catalogo";
import { useFormularioAdmin } from "../usar-formulario";
import type { EstadoFormulario } from "./acciones";

type Tienda = {
  nombre: string;
  direccion: string;
  ubicacion: string;
  whatsapp: string;
  categorias: string[];
  marcas: string[];
};

const campo =
  "mt-1 min-h-11 w-full rounded-xl border border-tinta/20 bg-white px-4 text-base outline-none focus:border-naranja";
const casilla =
  "flex min-h-11 items-center gap-3 rounded-xl border border-tinta/15 bg-white px-3 text-sm has-checked:border-naranja has-disabled:opacity-50";

export function FormularioTienda({
  accion,
  marcasDisponibles,
  tienda,
  textoBoton,
}: {
  accion: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  marcasDisponibles: string[];
  tienda?: Tienda;
  textoBoton: string;
}) {
  const { estado, alEnviar, guardando } = useFormularioAdmin(accion);
  const [todasLasMarcas, setTodasLasMarcas] = useState(
    tienda?.marcas.includes(MARCA_TODAS) ?? false,
  );

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      <label className="block text-sm font-medium">
        Nombre de la tienda
        <input
          name="nombre"
          required
          placeholder="Motorepuestos Robledo"
          defaultValue={tienda?.nombre}
          className={campo}
        />
      </label>

      <label className="block text-sm font-medium">
        Dirección
        <input
          name="direccion"
          required
          placeholder="Cl. 65 #88-20, Robledo"
          defaultValue={tienda?.direccion}
          className={campo}
        />
      </label>

      <label className="block text-sm font-medium">
        Ubicación en el mapa
        <textarea
          name="ubicacion"
          required
          rows={2}
          placeholder="Pega el enlace de Google Maps o las coordenadas"
          defaultValue={tienda?.ubicacion}
          className={`${campo} py-3`}
        />
      </label>
      <p className="-mt-2 text-xs opacity-70">
        En Google Maps busca la tienda, toca &quot;Compartir&quot; y copia el enlace. También
        sirven las coordenadas, por ejemplo 6.2775, -75.5964.
      </p>

      <label className="block text-sm font-medium">
        WhatsApp
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          placeholder="300 123 4567"
          defaultValue={tienda?.whatsapp}
          className={campo}
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Líneas de piezas que maneja</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CATEGORIAS.map((c) => (
            <label key={c.valor} className={casilla}>
              <input
                type="checkbox"
                name="categorias"
                value={c.valor}
                defaultChecked={tienda?.categorias.includes(c.valor)}
                className="size-5 accent-naranja"
              />
              {c.texto}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Marcas de moto que atiende</legend>
        <label className={`${casilla} mt-2`}>
          <input
            type="checkbox"
            name="marcas"
            value={MARCA_TODAS}
            checked={todasLasMarcas}
            onChange={(e) => setTodasLasMarcas(e.target.checked)}
            className="size-5 accent-naranja"
          />
          Todas las marcas
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {marcasDisponibles.map((marca) => (
            <label key={marca} className={casilla}>
              <input
                type="checkbox"
                name="marcas"
                value={marca}
                disabled={todasLasMarcas}
                defaultChecked={tienda?.marcas.includes(marca)}
                className="size-5 accent-naranja"
              />
              {marca}
            </label>
          ))}
        </div>
      </fieldset>

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
