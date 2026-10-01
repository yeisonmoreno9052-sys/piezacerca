"use client";

import { useFormularioAdmin } from "../usar-formulario";
import type { EstadoFormulario } from "./acciones";

type Moto = {
  marca: string;
  modelo: string;
  cilindraje: number;
  anio_desde: number;
  anio_hasta: number | null;
};

const campo =
  "mt-1 min-h-11 w-full rounded-xl border border-tinta/20 bg-white px-4 text-base outline-none focus:border-naranja";

export function FormularioMoto({
  accion,
  marcas,
  moto,
  textoBoton,
}: {
  accion: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  marcas: string[];
  moto?: Moto;
  textoBoton: string;
}) {
  const { estado, alEnviar, guardando } = useFormularioAdmin(accion);

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      <label className="block text-sm font-medium">
        Marca
        <input
          name="marca"
          required
          list="marcas"
          placeholder="AKT"
          defaultValue={moto?.marca}
          className={campo}
        />
        <datalist id="marcas">
          {marcas.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>

      <label className="block text-sm font-medium">
        Referencia o modelo
        <input
          name="modelo"
          required
          placeholder="NKD"
          defaultValue={moto?.modelo}
          className={campo}
        />
      </label>

      <label className="block text-sm font-medium">
        Cilindraje (cc)
        <input
          name="cilindraje"
          required
          type="number"
          inputMode="numeric"
          min={50}
          max={1500}
          placeholder="125"
          defaultValue={moto?.cilindraje}
          className={campo}
        />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1 text-sm font-medium">
          Año desde
          <input
            name="anio_desde"
            required
            type="number"
            inputMode="numeric"
            placeholder="2015"
            defaultValue={moto?.anio_desde}
            className={campo}
          />
        </label>
        <label className="block flex-1 text-sm font-medium">
          Año hasta
          <input
            name="anio_hasta"
            type="number"
            inputMode="numeric"
            placeholder="Actual"
            defaultValue={moto?.anio_hasta ?? undefined}
            className={campo}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs opacity-70">
        Deja &quot;Año hasta&quot; vacío si la moto se sigue vendiendo.
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
