"use client";

import { useSyncExternalStore } from "react";
import type { Ubicacion } from "./zonas";

// Lo que se guarda en el celular de cada persona (sin cuenta): "mi moto" y las búsquedas recientes.
// localStorage puede fallar (modo incógnito, almacenamiento bloqueado): en ese caso no se guarda y ya.

export type PiezaReciente = { id: number; nombre: string };

export const CLAVE_MOTO = "piezacerca:mi-moto";
export const CLAVE_RECIENTES = "piezacerca:recientes";
// La ubicación del cliente se guarda solo en su celular; no va en la dirección de la página.
export const CLAVE_UBICACION = "piezacerca:ubicacion";
const EVENTO = "piezacerca:guardado";

function leerTexto(clave: string) {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin almacenamiento disponible
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

function convertir<T>(texto: string | null): T | null {
  if (!texto) return null;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

// Lee un valor guardado y se actualiza solo cuando cambia. En el servidor siempre es null.
function useGuardado<T>(clave: string) {
  const texto = useSyncExternalStore(suscribir, () => leerTexto(clave), () => null);
  return convertir<T>(texto);
}

export function useMiMotoLocal() {
  return useGuardado<number>(CLAVE_MOTO);
}

export function useRecientes() {
  return useGuardado<PiezaReciente[]>(CLAVE_RECIENTES) ?? [];
}

export function useUbicacion() {
  return useGuardado<Ubicacion>(CLAVE_UBICACION);
}

export function guardarUbicacion(ubicacion: Ubicacion) {
  escribir(CLAVE_UBICACION, ubicacion);
}

export function guardarMiMotoLocal(motoId: number | null) {
  escribir(CLAVE_MOTO, motoId);
}

export function agregarReciente(pieza: PiezaReciente) {
  const actuales = convertir<PiezaReciente[]>(leerTexto(CLAVE_RECIENTES)) ?? [];
  escribir(CLAVE_RECIENTES, [pieza, ...actuales.filter((p) => p.id !== pieza.id)].slice(0, 5));
}
