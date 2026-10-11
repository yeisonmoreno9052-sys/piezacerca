"use client";

// Sonidos de aviso (tiendas y clientes) con vibración, sin archivos de audio.
// Los navegadores solo dejan sonar si la persona tocó algo antes: por eso el "contexto de audio"
// se crea UNA vez al tocar "Activar sonido" y se reutiliza para cada aviso.

let contexto: AudioContext | null = null;

export function activarAudio() {
  try {
    contexto ??= new AudioContext();
    void contexto.resume();
    return true;
  } catch {
    return false;
  }
}

export function audioActivo() {
  return contexto !== null;
}

// Un timbre "din-don" (dos veces): tono agradable pero fácil de oír en el mostrador.
// Cada nota sube rápido y se apaga suave, para que no suene áspero ni haga "clic".
const NOTAS = [
  { inicio: 0, frecuencia: 1046.5 }, // do (agudo): "din"
  { inicio: 0.22, frecuencia: 784 }, // sol: "don"
  { inicio: 0.7, frecuencia: 1046.5 },
  { inicio: 0.92, frecuencia: 784 },
];

export function sonarAviso() {
  navigator.vibrate?.([200, 100, 200, 100, 200]);
  if (!contexto) return;
  try {
    void contexto.resume();
    const ctx = contexto;
    const ahora = ctx.currentTime;
    for (const { inicio, frecuencia } of NOTAS) {
      // Dos osciladores (nota + su octava, bajita) suenan más a timbre que a pitido.
      for (const [multiplo, volumen] of [
        [1, 0.5],
        [2, 0.12],
      ] as const) {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = frecuencia * multiplo;
        vol.gain.setValueAtTime(0.0001, ahora + inicio);
        vol.gain.exponentialRampToValueAtTime(volumen, ahora + inicio + 0.02);
        vol.gain.exponentialRampToValueAtTime(0.0001, ahora + inicio + 0.6);
        osc.connect(vol).connect(ctx.destination);
        osc.start(ahora + inicio);
        osc.stop(ahora + inicio + 0.65);
      }
    }
  } catch {
    // sin sonido disponible
  }
}

// Sonido para el CLIENTE cuando una tienda responde: una escalera rápida que sube (sol-do-mi-sol)
// y remata con un "ding" brillante, dos veces. Fuerte y alegre, para que se note que llegó algo bueno.
// Pasa por un compresor para que suene más duro sin distorsionar.
const ESCALERA = [
  { inicio: 0, frecuencia: 784, dura: 0.14 }, // sol
  { inicio: 0.08, frecuencia: 1046.5, dura: 0.14 }, // do
  { inicio: 0.16, frecuencia: 1318.5, dura: 0.14 }, // mi
  { inicio: 0.24, frecuencia: 1568, dura: 0.55 }, // sol agudo (se sostiene)
];

export function sonarRespuesta() {
  navigator.vibrate?.([350, 120, 350, 120, 600]);
  if (!contexto) return;
  try {
    void contexto.resume();
    const ctx = contexto;
    const compresor = ctx.createDynamicsCompressor();
    compresor.threshold.value = -18;
    compresor.ratio.value = 6;
    const salida = ctx.createGain();
    salida.gain.value = 1.6;
    compresor.connect(salida).connect(ctx.destination);

    const ahora = ctx.currentTime;
    for (const repeticion of [0, 0.85]) {
      for (const { inicio, frecuencia, dura } of ESCALERA) {
        const t = ahora + repeticion + inicio;
        // Triángulo (cuerpo) + seno una octava arriba (brillo).
        for (const [tipo, multiplo, volumen] of [
          ["triangle", 1, 0.55],
          ["sine", 2, 0.18],
        ] as const) {
          const osc = ctx.createOscillator();
          const vol = ctx.createGain();
          osc.type = tipo;
          osc.frequency.value = frecuencia * multiplo;
          vol.gain.setValueAtTime(0.0001, t);
          vol.gain.exponentialRampToValueAtTime(volumen, t + 0.012);
          vol.gain.exponentialRampToValueAtTime(0.0001, t + dura);
          osc.connect(vol).connect(compresor);
          osc.start(t);
          osc.stop(t + dura + 0.05);
        }
      }
    }
  } catch {
    // sin sonido disponible
  }
}
