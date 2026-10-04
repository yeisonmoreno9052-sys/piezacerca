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

export function sonarAviso() {
  navigator.vibrate?.([200, 100, 200, 100, 200]);
  if (!contexto) return;
  try {
    void contexto.resume();
    const ctx = contexto;
    [0, 0.3, 0.6].forEach((inicio) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      vol.gain.value = 0.25;
      osc.connect(vol).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.18);
    });
  } catch {
    // sin sonido disponible
  }
}
