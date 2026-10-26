// Síntesis local: no se descargan muestras ni se envía audio.
// Timbres y eventos de referencia: bencho.dev (ver THIRD_PARTY.md).
let context;
let enabled = true;
let last = 0;
let primed = false;
const tones = {
  tock: [[250, 28, .045, 'triangle', 1700, 10]],
  notch: [[230, 49, .048, 'sine', 820, 6]],
  expand: [[196, 360, .042, 'sine', 880, 36, 174], [294, 300, .014, 'sine', 1100, 48, 262, 24]],
  deny: [[208, 120, .03, 'sine', 520, 10, 165]],
};
export function setSound(on) { enabled = on; }
function audioContext() {
  if (!context || context.state === 'closed') {
    const Context = window.AudioContext || window.webkitAudioContext || globalThis.AudioContext;
    context = new Context();
    primed = false;
  }
  return context;
}
export async function unlockAudio() {
  if (!enabled) return false;
  try {
    const audio = audioContext();
    // Safari puede volver del selector con "interrupted", no solo "suspended".
    if (audio.state !== 'running') { await audio.resume(); primed = false; }
    if (audio.state !== 'running' || !enabled) return false;
    if (!primed) {
      // Activar la salida durante el gesto real, antes del procesamiento asíncrono.
      const silent = audio.createBufferSource();
      silent.buffer = audio.createBuffer(1,1,audio.sampleRate);
      silent.connect(audio.destination);
      silent.onended = () => silent.disconnect();
      silent.start(); primed = true;
    }
    return true;
  } catch (error) {
    console.warn('[lecturi] No se pudo activar el audio:',error);
    return false;
  }
}
export async function sound(name, gap = 0) {
  if (!tones[name] || !enabled || performance.now() - last < gap) return;
  try {
    if (!await unlockAudio()) return;
    last = performance.now();
    for (const [hz, ms, level, wave, cut, attack, to, delay = 0] of tones[name]) {
      const osc = context.createOscillator(), gain = context.createGain(), filter = context.createBiquadFilter();
      const start = context.currentTime + delay / 1000, end = start + ms / 1000;
      osc.type = wave; osc.frequency.setValueAtTime(hz, start);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, end);
      filter.type = 'lowpass'; filter.frequency.value = cut;
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.linearRampToValueAtTime(level, start + attack / 1000);
      gain.gain.exponentialRampToValueAtTime(.0001, end);
      osc.connect(filter).connect(gain).connect(context.destination);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
      osc.start(start); osc.stop(end + .01);
    }
  } catch { /* Audio no disponible: el control sigue funcionando. */ }
}
// Captura el gesto antes de que se abra el selector nativo; sin emitir un timbre.
for (const event of ['pointerdown','keydown','touchend','click']) window.addEventListener(event, e => {
  if (e.isTrusted) void unlockAudio();
}, {passive:true, capture:true});

// Notificación de apertura exitosa proporcionada por el usuario.
// Frecuencias, ganancias y tiempos en segundos sin filtros ni variaciones.
export const notificationkndwr = {
  layers: [
    {source:{type:'sine', frequency:390.208}, envelope:{attack:0.002, decay:0.042, sustain:0, release:0, curve:'ramp'}, gain:0.168},
    {source:{type:'sine', frequency:780.416}, envelope:{attack:0.002, decay:0.046, sustain:0, release:0, curve:'ramp'}, gain:0.154, delay:0.076},
    {source:{type:'sine', frequency:390.208}, envelope:{attack:0.002, decay:0.048, sustain:0, release:0, curve:'ramp'}, gain:0.134, delay:0.193},
    {source:{type:'sine', frequency:780.416}, envelope:{attack:0.002, decay:0.191, sustain:0, release:0, curve:'ramp'}, gain:0.134, delay:0.176},
  ],
};
export async function playSound(definition) {
  if (!enabled) return false;
  try {
    if (!await unlockAudio()) {
      if (enabled) console.warn('[lecturi] Notificación de apertura omitida: audio no disponible.');
      return false;
    }
    // Un pequeño margen de planificación evita perder el ataque inicial de 2 ms.
    const origin = context.currentTime + 0.02;
    for (const layer of definition.layers) {
      const {attack, decay, release} = layer.envelope;
      const start = origin + (layer.delay || 0);
      const peak = start + attack, decayEnd = peak + decay, end = decayEnd + release;
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = layer.source.type;
      oscillator.frequency.setValueAtTime(layer.source.frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(layer.gain, peak);
      gain.gain.linearRampToValueAtTime(layer.gain * layer.envelope.sustain, decayEnd);
      if (release) gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain).connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(end);
    }
    console.debug('[lecturi] Notificación EPUB programada: 4 capas (390.208 / 780.416 Hz).');
    return true;
  } catch (error) {
    console.warn('[lecturi] No se pudo reproducir la notificación de apertura:',error);
    return false;
  }
}
