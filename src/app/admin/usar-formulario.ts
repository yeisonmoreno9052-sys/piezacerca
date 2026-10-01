"use client";

import { startTransition, useActionState } from "react";

type Estado = { error: string | null };

// Envía el formulario del panel sin que React lo vacíe al terminar:
// si hay un error, todo lo que se escribió se conserva para corregirlo.
export function useFormularioAdmin(
  accion: (estado: Estado, formData: FormData) => Promise<Estado>,
) {
  const [estado, enviar, guardando] = useActionState(accion, { error: null });

  function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => enviar(datos));
  }

  return { estado, alEnviar, guardando };
}
