"use client";

import { useState } from "react";

// Pide confirmación con un segundo toque antes de borrar.
export function BotonBorrar({ accion, texto }: { accion: () => Promise<void>; texto: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="mt-3 min-h-11 w-full rounded-xl border border-red-700/40 bg-white px-4 font-medium text-red-700"
      >
        {texto}
      </button>
    );
  }

  return (
    <form action={accion} className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="min-h-11 flex-1 rounded-xl border border-tinta/20 bg-white px-4 font-medium"
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="min-h-11 flex-1 rounded-xl bg-red-700 px-4 font-semibold text-white"
      >
        Sí, borrar
      </button>
    </form>
  );
}
