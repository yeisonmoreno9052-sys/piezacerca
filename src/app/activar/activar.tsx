"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

const campo =
  "mt-1 min-h-12 w-full rounded-xl border border-tinta/20 bg-white px-4 text-base outline-none focus:border-tienda";
const boton =
  "mt-4 min-h-12 w-full rounded-xl bg-tienda px-4 font-bold text-white disabled:opacity-60";

export function Activar({ conSesion, nombre }: { conSesion: boolean; nombre: string | null }) {
  return (
    <div className="px-4 pb-10 pt-6">
      <p className="text-xs font-bold uppercase tracking-wider opacity-60">
        {conSesion ? "Paso 2 de 2" : "Paso 1 de 2"}
      </p>
      {conSesion ? <UsarCodigo nombre={nombre} /> : <CrearCuenta />}
    </div>
  );
}

function CrearCuenta() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisarCorreo, setRevisarCorreo] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setEnviando(true);
    const { data, error } = await crearClienteNavegador().auth.signUp({
      email: correo.trim(),
      password: contrasena,
      options: {
        data: { full_name: nombre.trim() },
        emailRedirectTo: `${window.location.origin}/auth/confirmar?siguiente=${encodeURIComponent("/activar")}`,
      },
    });
    setEnviando(false);
    if (error) {
      const m = error.message.toLowerCase();
      setError(
        m.includes("registered") || m.includes("already")
          ? "Ese correo ya tiene cuenta. Toca \"Ya tengo cuenta\" y entra con tu contraseña."
          : m.includes("rate limit") || m.includes("security purposes")
            ? "Se hicieron muchos intentos seguidos. Espera unos minutos e inténtalo de nuevo."
            : m.includes("password")
              ? "Esa contraseña es muy débil. Usa al menos 8 caracteres, con letras y números."
              : "No se pudo crear la cuenta. Revisa el correo e inténtalo de nuevo.",
      );
      return;
    }
    if (data.session) router.refresh(); // cuenta lista: pasa al paso 2
    else setRevisarCorreo(true); // Supabase pide confirmar el correo primero
  }

  if (revisarCorreo) {
    return (
      <div className="mt-2 rounded-2xl bg-verde-suave p-4 text-verde">
        <p className="font-bold">Revisa tu correo</p>
        <p className="mt-1 text-sm">
          Te enviamos un mensaje a <strong>{correo}</strong>. Ábrelo en este mismo celular y toca el enlace:
          vuelves aquí para escribir el código. Si no llega, revisa la carpeta de spam.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="mt-1 font-titulo text-xl font-bold">Crea tu cuenta</h2>
      <p className="mt-1 text-sm opacity-80">Con este correo y contraseña entrarás siempre al Modo tienda.</p>
      <form onSubmit={crear} className="mt-4 space-y-3">
        <label className="block text-sm font-medium">
          Tu nombre
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" placeholder="Carlos Pérez" className={campo} />
        </label>
        <label className="block text-sm font-medium">
          Correo
          <input required type="email" inputMode="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tienda@correo.com" className={campo} />
        </label>
        <label className="block text-sm font-medium">
          Contraseña (mínimo 8 caracteres)
          <input required type="password" autoComplete="new-password" minLength={8} value={contrasena} onChange={(e) => setContrasena(e.target.value)} className={campo} />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando} className={boton}>
          {enviando ? "Creando la cuenta…" : "Crear cuenta y seguir"}
        </button>
      </form>
      <Link
        href={`/entrar?volver=${encodeURIComponent("/activar")}`}
        className="mt-3 flex min-h-11 items-center justify-center text-sm font-semibold underline"
      >
        Ya tengo cuenta
      </Link>
    </>
  );
}

function UsarCodigo({ nombre }: { nombre: string | null }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ tienda: string; rol: "dueno" | "empleado" } | null>(null);

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const { data, error } = await crearClienteNavegador().rpc("usar_codigo", { codigo });
    setEnviando(false);
    const fila = (data as { tienda: string; rol: "dueno" | "empleado" }[] | null)?.[0];
    if (error) {
      setError(
        error.hint === "limite"
          ? "Hiciste muchos intentos. Espera una hora e inténtalo de nuevo."
          : "No se pudo activar. Inténtalo de nuevo en un momento.",
      );
      return;
    }
    if (!fila) {
      setError("Ese código no sirve: revisa que esté bien escrito o pide uno nuevo.");
      return;
    }
    setListo(fila);
    router.refresh(); // la sesión ahora trae la tienda
  }

  if (listo) {
    return (
      <div className="mt-2">
        <div className="rounded-2xl bg-verde-suave p-4 text-verde">
          <p className="font-titulo text-xl font-bold">¡Listo!</p>
          <p className="mt-1">
            {listo.rol === "dueno"
              ? `${listo.tienda} quedó activa y tú eres el dueño.`
              : `Ya eres parte del equipo de ${listo.tienda}.`}
          </p>
        </div>
        <p className="mt-4 text-sm">
          Último paso: en el Modo tienda toca <strong>&quot;Activar notificaciones&quot;</strong> para que te lleguen las
          solicitudes aunque tengas la app cerrada.
        </p>
        <Link href="/tienda" className={`${boton} flex items-center justify-center`}>
          Ir al Modo tienda
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="mt-1 font-titulo text-xl font-bold">Escribe tu código</h2>
      <p className="mt-1 text-sm opacity-80">
        {nombre ? `Hola, ${nombre}. ` : ""}Es el código que te entregamos: empieza por <strong>PC-</strong> (dueño) o{" "}
        <strong>EM-</strong> (empleado).
      </p>
      <form onSubmit={activar} className="mt-4">
        <label htmlFor="codigo" className="sr-only">
          Código
        </label>
        <input
          id="codigo"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="PC-XXXXXX"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.toUpperCase());
            setError(null);
          }}
          className={`${campo} text-center font-titulo text-2xl font-bold tracking-widest`}
        />
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-ambar-suave p-3 text-sm text-ambar">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando || codigo.trim().length < 6} className={boton}>
          {enviando ? "Activando…" : "Activar"}
        </button>
      </form>
    </>
  );
}
