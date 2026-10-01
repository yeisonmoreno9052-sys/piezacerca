"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

function mensajeDeError(mensaje: string) {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "El correo o la contraseña no son correctos.";
  }
  if (m.includes("rate limit") || m.includes("security purposes")) {
    return "Pediste varios códigos seguidos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (m.includes("expired") || m.includes("invalid")) {
    return "El código no es correcto o ya venció. Revísalo o pide uno nuevo.";
  }
  if (m.includes("email")) {
    return "Revisa que el correo esté bien escrito.";
  }
  return "Algo salió mal. Inténtalo de nuevo en un momento.";
}

export function FormularioEntrar() {
  const router = useRouter();
  const [paso, setPaso] = useState<"correo" | "codigo" | "contrasena">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmar` },
    });
    setCargando(false);
    if (error) setError(mensajeDeError(error.message));
    else setPaso("codigo");
  }

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.verifyOtp({
      email: correo.trim(),
      token: codigo.trim(),
      type: "email",
    });
    if (error) {
      setCargando(false);
      setError(mensajeDeError(error.message));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  // Entrar con contraseña: no envía correo (para el administrador y, más adelante, las tiendas).
  async function entrarConContrasena(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    });
    if (error) {
      setCargando(false);
      setError(mensajeDeError(error.message));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  function cambiarA(nuevo: "correo" | "contrasena") {
    setPaso(nuevo);
    setCodigo("");
    setContrasena("");
    setError(null);
  }

  const campo =
    "mt-1 min-h-11 w-full rounded-xl border border-tinta/20 bg-white px-4 text-base outline-none focus:border-naranja";
  const botonPrincipal =
    "mt-4 min-h-11 w-full rounded-xl bg-naranja px-4 font-semibold text-white disabled:opacity-60";

  return (
    <div className="mt-8">
      {paso === "correo" ? (
        <form onSubmit={enviarCodigo}>
          <label className="block text-sm font-medium">
            Tu correo
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={campo}
            />
          </label>
          <button type="submit" disabled={cargando} className={botonPrincipal}>
            {cargando ? "Enviando…" : "Enviarme el código"}
          </button>
        </form>
      ) : paso === "contrasena" ? (
        <form onSubmit={entrarConContrasena}>
          <label className="block text-sm font-medium">
            Tu correo
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={campo}
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Contraseña
            <input
              type="password"
              required
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className={campo}
            />
          </label>
          <button type="submit" disabled={cargando} className={botonPrincipal}>
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      ) : (
        <form onSubmit={verificarCodigo}>
          <p className="rounded-xl bg-verde-suave p-3 text-sm text-verde">
            Te enviamos un correo a <strong>{correo}</strong>. Ábrelo en este mismo
            navegador y toca el enlace para entrar. Si el correo trae un código, escríbelo
            aquí.
          </p>
          <label className="mt-4 block text-sm font-medium">
            Código
            <input
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              maxLength={8}
              placeholder="123456"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              className={`${campo} tracking-[0.3em]`}
            />
          </label>
          <button type="submit" disabled={cargando} className={botonPrincipal}>
            {cargando ? "Verificando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => cambiarA("correo")}
            className="mt-2 min-h-11 w-full rounded-xl px-4 text-sm font-medium underline"
          >
            Cambiar correo o pedir otro código
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-3 border-t border-tinta/10 pt-6">
        <button
          type="button"
          onClick={() => cambiarA(paso === "contrasena" ? "correo" : "contrasena")}
          className="min-h-11 w-full rounded-xl border border-tinta/20 bg-white px-4 font-medium"
        >
          {paso === "contrasena" ? "Entrar con enlace al correo" : "Entrar con contraseña"}
        </button>
        <button
          type="button"
          disabled
          className="min-h-11 w-full rounded-xl border border-tinta/20 bg-white px-4 font-medium opacity-60"
        >
          Entrar con Google (muy pronto)
        </button>
      </div>
    </div>
  );
}
