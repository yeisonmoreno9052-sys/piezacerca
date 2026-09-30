export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
      <h1 className="font-titulo text-3xl font-bold tracking-tight">
        Pieza<span className="text-naranja">Cerca</span>
      </h1>
      <p className="mt-1 text-sm opacity-70">Repuestos de moto en Medellín</p>

      <section className="mt-10">
        <h2 className="font-titulo text-2xl font-semibold leading-tight">
          ¿Qué pieza necesitas hoy?
        </h2>
        <p className="mt-2 opacity-80">
          Te mostramos qué tiendas cercanas la manejan, sin llamar a cada una.
        </p>

        <button
          type="button"
          disabled
          className="mt-6 min-h-11 w-full rounded-xl bg-naranja px-4 font-semibold text-white opacity-60"
        >
          Buscar una pieza (próximamente)
        </button>
      </section>

      <section className="mt-10 space-y-3 text-sm">
        <p className="font-semibold">Así se verán las tiendas:</p>
        <div className="flex items-center justify-between rounded-xl bg-white p-4">
          <span>Motopartes La 80</span>
          <span className="rounded-full bg-ambar-suave px-3 py-1 font-medium text-ambar">
            Maneja la pieza
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white p-4">
          <span>Repuestos El Taller</span>
          <span className="rounded-full bg-verde-suave px-3 py-1 font-medium text-verde">
            La tengo · $ 45.000
          </span>
        </div>
      </section>

      <p className="mt-auto pt-10 text-center text-xs opacity-50">
        Versión en construcción
      </p>
    </main>
  );
}
