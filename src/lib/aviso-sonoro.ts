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

// Sonido para el CLIENTE cuando una tienda responde (escogido por el dueño, tono "I"):
// un carro pasa a toda por la autopista (sube de tono al acercarse y baja al alejarse, con el "fuuum"
// del viento) y remata con un "pi-pi" de pito. Pasa por un compresor para que suene duro sin distorsionar.
const PASO = 1.6; // segundos que dura el paso del carro
const CENTRO = 0.75; // momento en que pasa enfrente

export function sonarRespuesta() {
  navigator.vibrate?.([250, 80, 250, 300, 150, 80, 300]);
  if (!contexto) return;
  try {
    void contexto.resume();
    const ctx = contexto;
    const t0 = ctx.currentTime + 0.02;

    const compresor = ctx.createDynamicsCompressor();
    compresor.threshold.value = -16;
    compresor.ratio.value = 5;
    const salida = ctx.createGain();
    salida.gain.value = 1.7;
    compresor.connect(salida).connect(ctx.destination);

    // Curvas del paso: tono (efecto Doppler), volumen y paneo de izquierda a derecha.
    const n = 200;
    const doppler = new Float32Array(n);
    const volumen = new Float32Array(n);
    const paneo = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = ((i / (n - 1)) * PASO - CENTRO) * 9;
      doppler[i] = 1 - 0.14 * Math.tanh(x * 1.3);
      volumen[i] = 0.0001 + 0.95 / (1 + x * x * 0.55);
      paneo[i] = Math.tanh(x * 0.6);
    }
    const vol = ctx.createGain();
    vol.gain.setValueCurveAtTime(volumen, t0, PASO);
    let destino: AudioNode = compresor;
    if (typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueCurveAtTime(paneo, t0, PASO);
      panner.connect(compresor);
      destino = panner;
    }
    vol.connect(destino);

    // Motor: tres osciladores con un temblor rápido (aspereza), filtrados para que no chille.
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 2200;
    filtro.Q.value = 1.5;
    filtro.connect(vol);
    for (const [tipo, base, v] of [
      ["sawtooth", 165, 0.35],
      ["square", 330, 0.12],
      ["sawtooth", 82.5, 0.25],
    ] as const) {
      const osc = ctx.createOscillator();
      const nivel = ctx.createGain();
      osc.type = tipo;
      osc.frequency.setValueCurveAtTime(doppler.map((d) => base * d), t0, PASO);
      const temblor = ctx.createOscillator();
      const fuerza = ctx.createGain();
      temblor.frequency.value = 38;
      fuerza.gain.value = base * 0.04;
      temblor.connect(fuerza).connect(osc.frequency);
      nivel.gain.value = v;
      osc.connect(nivel).connect(filtro);
      for (const o of [osc, temblor]) {
        o.start(t0);
        o.stop(t0 + PASO);
      }
    }

    // Viento: ruido que barre de agudo a grave al pasar.
    const ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * PASO), ctx.sampleRate);
    const datos = ruido.getChannelData(0);
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruido;
    const banda = ctx.createBiquadFilter();
    banda.type = "bandpass";
    banda.Q.value = 0.9;
    banda.frequency.setValueCurveAtTime(doppler.map((d) => 1400 * d * d * d), t0, PASO);
    const nivelRuido = ctx.createGain();
    nivelRuido.gain.value = 0.55;
    fuente.connect(banda).connect(nivelRuido).connect(vol);
    fuente.start(t0);

    // "Pi-pi" de pito al final (dos notas a la vez, como una bocina).
    for (const [inicio, dura] of [
      [1.4, 0.12],
      [1.57, 0.22],
    ]) {
      const t = t0 + inicio;
      for (const frecuencia of [523.3, 659.3]) {
        for (const [tipo, v] of [
          ["square", 0.16],
          ["sawtooth", 0.1],
        ] as const) {
          const osc = ctx.createOscillator();
          const nivel = ctx.createGain();
          osc.type = tipo;
          osc.frequency.value = frecuencia;
          nivel.gain.setValueAtTime(0.0001, t);
          nivel.gain.exponentialRampToValueAtTime(v, t + 0.01);
          nivel.gain.setValueAtTime(v, t + dura - 0.03);
          nivel.gain.exponentialRampToValueAtTime(0.0001, t + dura);
          osc.connect(nivel).connect(compresor);
          osc.start(t);
          osc.stop(t + dura + 0.02);
        }
      }
    }
  } catch {
    // sin sonido disponible
  }
}
