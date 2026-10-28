import Link from "next/link";
import { ActivarNotificaciones } from "@/app/activar-notificaciones";
import { exigirAdmin } from "@/lib/admin";
import { formatoDistancia } from "@/lib/formato";

// Últimas preguntas de los clientes: qué pieza, para qué moto, a qué tiendas llegó y qué respondió cada una.
// Sale de `ultimas_preguntas_admin()` en la base de datos, que solo responde al administrador.
// No muestra quién preguntó, ni dónde está, ni precios (el precio solo lo ve el cliente que preguntó).

type Pregunta = {
  id: string;
  creada_en: string;
  vencida: boolean;
  hace_min: number;
  moto: string | null;
  piezas: { nombre: string; cantidad: number }[];
  tiendas: {
    nombre: string;
    metros: number | null;
    respondida_en: string | null;
    segundos: number | null;
    tiene: number;
    va_para_alla: boolean;
  }[];
};

const insignia = "shrink-0 rounded-full px-3 py-1 text-xs font-bold";

function cuando(fecha: string, minutos: number) {
  if (minutos < 1) return "Ahora mismo";
  if (minutos < 60) return `Hace ${minutos} min`;
  return new Date(fecha).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function tardo(segundos: number | null) {
  if (segundos == null) return "";
  return segundos < 60 ? ` en ${segundos} s` : ` en ${Math.round(segundos / 60)} min`;
}

function Respuesta({ tienda, total, vencida }: { tienda: Pregunta["tiendas"][number]; total: number; vencida: boolean }) {
  if (!tienda.respondida_en) {
    return vencida ? (
      <span className={`${insignia} bg-ambar-suave text-ambar`}>No respondió</span>
    ) : (
      <span className={`${insignia} bg-tinta/10`}>Esperando</span>
    );
  }
  const texto =
    total <= 1
      ? tienda.tiene > 0
        ? "La tiene"
        : "No la tiene"
      : tienda.tiene > 0
        ? `Tiene ${tienda.tiene} de ${total}`
        : "No tiene ninguna";
  return (
    <span className={`${insignia} ${tienda.tiene > 0 ? "bg-verde-suave text-verde" : "bg-tinta/10"}`}>
      {texto}
      {tardo(tienda.segundos)}
    </span>
  );
}

export default async function PreguntasAdmin() {
  const supabase = await exigirAdmin();
  const { data, error } = await supabase.rpc("ultimas_preguntas_admin", { limite: 50 });
  const preguntas = data as Pregunta[] | null;

  return (
    <div className="space-y-6">
      <ActivarNotificaciones para="admin" />

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-titulo text-lg font-semibold">Últimas preguntas</h2>
        <Link href="/admin/preguntas" className="flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-medium">
          Actualizar
        </Link>
      </div>

      {error || !preguntas ? (
        <p className="rounded-xl bg-ambar-suave p-4 text-sm text-ambar">
          No se pudieron cargar las preguntas. Si acabas de actualizar la app, revisa que el archivo SQL
          <code> 20261028000000_preguntas_admin.sql </code> ya esté ejecutado en Supabase.
        </p>
      ) : preguntas.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm">Todavía nadie ha preguntado a las tiendas.</p>
      ) : (
        <ul className="space-y-3">
          {preguntas.map((p) => {
            const respondieron = p.tiendas.filter((t) => t.respondida_en).length;
            return (
              <li key={p.id} className="rounded-2xl bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {p.piezas.length === 1
                        ? `${p.piezas[0].nombre}${p.piezas[0].cantidad > 1 ? ` × ${p.piezas[0].cantidad}` : ""}`
                        : `Lista de ${p.piezas.length} piezas`}
                    </p>
                    <p className="opacity-70">{p.moto ?? "Cualquier moto"}</p>
                  </div>
                  <p className="shrink-0 text-xs opacity-60">{cuando(p.creada_en, p.hace_min)}</p>
                </div>

                {p.piezas.length > 1 && (
                  <p className="mt-2 opacity-80">
                    {p.piezas.map((x) => (x.cantidad > 1 ? `${x.nombre} × ${x.cantidad}` : x.nombre)).join(" · ")}
                  </p>
                )}

                <p className="mt-3 text-xs font-semibold uppercase tracking-wider opacity-60">
                  Llegó a {p.tiendas.length} {p.tiendas.length === 1 ? "tienda" : "tiendas"} · respondieron {respondieron}
                </p>
                <ul className="mt-1 divide-y divide-tinta/10">
                  {p.tiendas.map((t) => (
                    <li key={t.nombre} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        {t.nombre}
                        {t.metros != null && <span className="opacity-60"> · {formatoDistancia(t.metros)}</span>}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        <Respuesta tienda={t} total={p.piezas.length} vencida={p.vencida} />
                        {t.va_para_alla && <span className={`${insignia} bg-naranja text-white`}>Va para allá</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
