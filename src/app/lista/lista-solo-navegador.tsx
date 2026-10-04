"use client";

import dynamic from "next/dynamic";

export type ItemLista = { id: number; nombre: string; cantidad: number };
export type ListaLista = {
  tipo: "paquete" | "guardada";
  id: string;
  nombre: string;
  items: ItemLista[];
};

// La lista en preparación se guarda en el celular (si la persona tiene que entrar con su cuenta,
// no la pierde). Por eso esta pantalla se arma solo en el navegador.
export const ListaSoloNavegador = dynamic(() => import("./armar-lista").then((m) => m.ArmarLista), {
  ssr: false,
  loading: () => <p className="m-4 rounded-2xl bg-white p-4 text-sm opacity-70">Cargando…</p>,
});
