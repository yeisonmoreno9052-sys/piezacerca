"use client";

// Sonido de aviso para las tiendas (tres pitidos + vibración), sin archivos de audio.
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
