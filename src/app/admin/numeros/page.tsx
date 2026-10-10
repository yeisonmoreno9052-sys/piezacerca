import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";

// Números del piloto (semana 6): preguntas, respuestas, "Voy para allá" y búsquedas sin resultado.
// Todo sale de `numeros_admin(dias)` en la base de datos, que solo responde al administrador.

type Numeros = {
  dias: number;
  totales: {
    preguntas: number;
    clientes: number;
    con_respuesta: number;
    alguien_la_tiene: number;
    voy_para_alla: number;
    primera_respuesta_mediana_seg: number | null;
  };
  por_dia: { dia: string; preguntas: number }[];
  por_tienda: {
    nombre: string;
    estado: "activa" | "sin_confirmar";
    cerrada_desde: string | null;
    recibidas: number;
    respondidas: number;
    no_respondio: number;
    promedio_seg: number | null;
    voy_para_alla: number;
  }[];
  sin_resultado: { tipo: "pieza" | "moto"; texto: string; veces: number }[];
};

const PERIODOS = [
  { dias: 7, texto: "7 días" },
  { dias: 30, texto: "30 días" },
  { dias: 365, texto: "Un año" },
];

function tiempo(segundos: number | null) {
  if (segundos == null) return "—";
  if (segundos < 60) return `${segundos} s`;
  return `${Math.round(segundos / 60)} min`;
}

function porcentaje(parte: number, total: number) {
  return total > 0 ? `${Math.round((parte / total) * 100)} %` : "—";
}

function nombreDia(dia: string) {
  return new Date(`${dia}T12:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

export default async function NumerosAdmin({ searchParams }: PageProps<"/admin/numeros">) {
  const supabase = await exigirAdmin();
  const { dias: parametro } = await searchParams;
  const dias = PERIODOS.find((p) => String(p.dias) === parametro)?.dias ?? 7;
  const { data, error } = await supabase.rpc("numeros_admin", { dias });
  const n = data as Numeros | null;

  if (error || !n) {
    return (
      <p className="rounded-xl bg-ambar-suave p-4 text-sm text-ambar">
        No se pudieron cargar los números. Si acabas de actualizar la app, revisa que el archivo SQL
        <code> 20261010000000_mejoras_piloto.sql </code> ya esté ejecutado en Supabase.
      </p>
    );
  }

  const t = n.totales;
  const mayorDia = Math.max(1, ...n.por_dia.map((d) => d.preguntas));
  const cuadros = [
    { valor: t.preguntas, texto: "Preguntas" },
    { valor: t.clientes, texto: "Clientes distintos" },
    { valor: porcentaje(t.con_respuesta, t.preguntas), texto: "Recibieron respuesta" },
    { valor: porcentaje(t.alguien_la_tiene, t.preguntas), texto: "Alguna tienda la tenía" },
    { valor: t.voy_para_alla, texto: "Voy para allá" },
    { valor: tiempo(t.primera_respuesta_mediana_seg), texto: "Primera respuesta (normal)" },
  ];

  return (
    <div className="space-y-6">
      <nav className="flex gap-2" aria-label="Periodo">
        {PERIODOS.map((p) => (
          <Link
            key={p.dias}
            href={`/admin/numeros?dias=${p.dias}`}
            aria-current={p.dias === dias ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-medium ${
              p.dias === dias ? "bg-naranja text-white" : "bg-white"
            }`}
          >
            {p.texto}
          </Link>
        ))}
      </nav>

      <section className="grid grid-cols-2 gap-2">
        {cuadros.map((c) => (
          <div key={c.texto} className="rounded-2xl bg-white p-3">
            <p className="font-titulo text-2xl font-bold">{c.valor}</p>
            <p className="text-sm opacity-70">{c.texto}</p>
          </div>
        ))}
      </section>
      <p className="-mt-4 text-xs opacity-60">
        &quot;Primera respuesta (normal)&quot;: la mitad de las preguntas tuvo su primera respuesta en ese tiempo o menos.
      </p>

      <section>
        <h2 className="font-titulo text-lg font-semibold">Preguntas por día</h2>
        {n.por_dia.length === 0 ? (
          <p className="mt-2 rounded-xl bg-white p-4 text-sm">Todavía no hay preguntas en este periodo.</p>
        ) : (
          <ul className="mt-2 space-y-1 rounded-2xl bg-white p-3 text-sm">
            {n.por_dia.map((d) => (
              <li key={d.dia} className="flex items-center gap-3">
                <span className="w-24 shrink-0 opacity-70">{nombreDia(d.dia)}</span>
                <span className="h-3 rounded-full bg-naranja" style={{ width: `${(d.preguntas / mayorDia) * 60}%` }} />
                <span className="font-semibold">{d.preguntas}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-titulo text-lg font-semibold">Por tienda</h2>
        {n.por_tienda.length === 0 ? (
          <p className="mt-2 rounded-xl bg-white p-4 text-sm">Todavía no hay tiendas activas.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {n.por_tienda.map((tienda) => (
              <li key={tienda.nombre} className="rounded-2xl bg-white p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-bold">{tienda.nombre}</p>
                  {tienda.estado !== "activa" ? (
                    <span className="shrink-0 rounded-full bg-tinta/10 px-3 py-1 text-xs font-bold">Sin confirmar</span>
                  ) : tienda.cerrada_desde ? (
                    <span className="shrink-0 rounded-full bg-ambar-suave px-3 py-1 text-xs font-bold text-ambar">
                      Cerrada desde el{" "}
                      {new Date(tienda.cerrada_desde).toLocaleDateString("es-CO", { weekday: "short", day: "numeric" })}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-verde-suave px-3 py-1 text-xs font-bold text-verde">Abierta</span>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <dt className="text-xs opacity-60">Le llegaron</dt>
                    <dd className="font-semibold">{tienda.recibidas}</dd>
                  </div>
                  <div>
                    <dt className="text-xs opacity-60">Respondió</dt>
                    <dd className="font-semibold">
                      {tienda.respondidas} ({porcentaje(tienda.respondidas, tienda.recibidas)})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs opacity-60">No respondió</dt>
                    <dd className={`font-semibold ${tienda.no_respondio > 0 ? "text-ambar" : ""}`}>{tienda.no_respondio}</dd>
                  </div>
                  <div>
                    <dt className="text-xs opacity-60">Tarda</dt>
                    <dd className="font-semibold">{tiempo(tienda.promedio_seg)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs opacity-60">Voy para allá</dt>
                    <dd className="font-semibold">{tienda.voy_para_alla}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-titulo text-lg font-semibold">Buscaron y no encontraron</h2>
        <p className="mt-1 text-xs opacity-70">
          Piezas y motos que la gente buscó y no están cargadas. Sirven para agregar piezas, otros nombres o motos.
        </p>
        {n.sin_resultado.length === 0 ? (
          <p className="mt-2 rounded-xl bg-white p-4 text-sm">Nada por ahora en este periodo.</p>
        ) : (
          <ul className="mt-2 divide-y divide-tinta/10 rounded-2xl bg-white text-sm">
            {n.sin_resultado.map((b) => (
              <li key={`${b.tipo}:${b.texto}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">&quot;{b.texto}&quot;</span>
                <span className="shrink-0 opacity-70">
                  {b.tipo === "pieza" ? "Pieza" : "Moto"} · {b.veces} {b.veces === 1 ? "vez" : "veces"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
