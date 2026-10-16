// Sonidos de interfaz y de los gatos.
//
// Interfaz: clics sintéticos muy cortos, al estilo del teclado del iPhone
// (un "tic" de tecla, un "toc" más grave para teclas especiales y otro
// para borrar). Nada de wooshes. Se generan en vivo con Web Audio, con una
// pequeña variación en cada pulsación para que no suenen a metralleta.
// La sinopsis que se "escribe" sola suena como alguien tecleando.
//
// Gatos: grabaciones reales con licencia libre de Wikimedia Commons
// (sonidos/gatos/, créditos en creditos.json). Si no se pudieron cargar,
// se usa una voz sintetizada de respaldo.
//
// Los clics del deslizador de calificación (tic / microclic) no cambian.
// Todo se apaga desde el menú (se recuerda en este navegador).

const CLAVE = 'librero.sonido';
let activo = true;
try {
  activo = localStorage.getItem(CLAVE) !== 'no';
} catch {
  /* sin almacenamiento */
}
const ultimo = {};
const ESPERA = { tecla: 30, especial: 40, borrar: 40, escribir: 900, ronroneo: 2400, maullido: 500, trino: 350, estornudo: 600 };

export const sonidoActivo = () => activo;
export function alternarSonido() {
  activo = !activo;
  try {
    localStorage.setItem(CLAVE, activo ? 'si' : 'no');
  } catch {
    /* sin almacenamiento */
  }
  if (activo) sonar('especial');
  return activo;
}
const puede = () => activo && navigator.userActivation?.hasBeenActive;

// ------------------------------------------------------------------ motor
let ctx = null, salida = null, envio = null;
function motor() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  comp.attack.value = 0.002;
  comp.release.value = 0.12;
  comp.connect(ctx.destination);
  salida = comp;
  // Reverberación corta (solo la usan los gatos, muy poco).
  const largo = Math.floor(ctx.sampleRate * 0.6);
  const ir = ctx.createBuffer(2, largo, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3.5);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const humedo = ctx.createGain();
  humedo.gain.value = 0.18;
  conv.connect(humedo).connect(comp);
  envio = conv;
  cargarMuestras();
  return ctx;
}

let ruidoBlanco = null;
function ruido() {
  if (ruidoBlanco) return ruidoBlanco;
  const n = ctx.sampleRate * 2;
  ruidoBlanco = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = ruidoBlanco.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return ruidoBlanco;
}

function bus(t, { pan = 0, rev = 0, vol = 1 } = {}) {
  const g = ctx.createGain();
  g.gain.value = vol;
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) {
    p.pan.value = pan;
    g.connect(p).connect(salida);
  } else g.connect(salida);
  if (rev) {
    const r = ctx.createGain();
    r.gain.value = rev;
    g.connect(r).connect(envio);
  }
  return { entrada: g, pan: p };
}

const env = (param, t, ataque, pico, caida, piso = 0.0001) => {
  param.setValueAtTime(piso, t);
  param.linearRampToValueAtTime(pico, t + ataque);
  param.exponentialRampToValueAtTime(piso, t + ataque + caida);
};

function tono(t, destino, { tipo = 'sine', f0, f1, dur, ataque = 0.003, pico = 0.1, curva = dur }) {
  const o = ctx.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + curva);
  const g = ctx.createGain();
  env(g.gain, t, ataque, pico, dur);
  o.connect(g).connect(destino);
  o.start(t);
  o.stop(t + ataque + dur + 0.05);
  return o;
}

function soplo(t, destino, { dur, filtros = [], ataque = 0.005, pico = 0.1, caida }) {
  const s = ctx.createBufferSource();
  s.buffer = ruido();
  s.loop = true;
  let nodo = s;
  for (const f of filtros) {
    const b = ctx.createBiquadFilter();
    b.type = f.tipo;
    b.Q.value = f.q ?? 0.7;
    b.frequency.setValueAtTime(f.f0, t);
    if (f.f1) b.frequency.exponentialRampToValueAtTime(f.f1, t + (f.en ?? dur));
    nodo.connect(b);
    nodo = b;
  }
  const g = ctx.createGain();
  env(g.gain, t, ataque, pico, caida ?? dur);
  nodo.connect(g).connect(destino);
  s.start(t, Math.random());
  s.stop(t + ataque + (caida ?? dur) + 0.05);
}

// ------------------------------------------------------------------ teclas
// Una tecla: transitorio de ruido muy breve + un "toc" tonal de plástico.
// frec = color de la tecla; k = volumen.
function tecla(t, { frec = 1350, banda = 3200, cuerpo = 0.012, k = 1, pan = 0 } = {}) {
  const v = 0.94 + Math.random() * 0.12;
  const b = bus(t, { pan: pan + (Math.random() - 0.5) * 0.16, vol: k * (0.88 + Math.random() * 0.2) });
  soplo(t, b.entrada, { dur: 0.004, filtros: [{ tipo: 'bandpass', f0: banda * v, q: 1.3 }], ataque: 0.0004, pico: 0.42 });
  tono(t, b.entrada, { f0: frec * v, f1: frec * v * 0.93, dur: cuerpo, curva: cuerpo, ataque: 0.0006, pico: 0.15 });
  tono(t, b.entrada, { f0: frec * v * 2.02, dur: cuerpo * 0.55, ataque: 0.0004, pico: 0.045 });
}

const R = {
  tecla: (t, k) => tecla(t, { k }),
  // tecla especial (espacio, retorno, cambiar): más grave y con más cuerpo
  especial: (t, k) => tecla(t, { frec: 720, banda: 2100, cuerpo: 0.022, k: k * 1.05 }),
  // borrar: más seco
  borrar: (t, k) => tecla(t, { frec: 980, banda: 2600, cuerpo: 0.009, k: k * 0.95 }),
  // confirmar: dos tics que suben
  confirmar(t, k) {
    tecla(t, { frec: 1250, k: k * 0.9 });
    tecla(t + 0.065, { frec: 1650, banda: 3800, k });
  },
  error(t, k) {
    tecla(t, { frec: 640, banda: 1800, cuerpo: 0.02, k });
    tecla(t + 0.09, { frec: 560, banda: 1600, cuerpo: 0.02, k: k * 0.9 });
  },
  // tecleo: alguien escribe una frase corta (para la sinopsis)
  escribir(t, k) {
    let x = 0;
    const n = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const espacio = i > 0 && Math.random() < 0.18;
      if (espacio) tecla(t + x, { frec: 760, banda: 2200, cuerpo: 0.018, k: k * 0.55 });
      else tecla(t + x, { frec: 1250 + Math.random() * 260, k: k * (0.38 + Math.random() * 0.22), pan: (Math.random() - 0.5) * 0.3 });
      x += 0.055 + Math.random() * 0.075 + (espacio ? 0.05 : 0);
    }
  },
  // carga: tres tics rápidos ascendentes
  carga(t, k) {
    [1150, 1350, 1600].forEach((f, i) => tecla(t + i * 0.055, { frec: f, k: k * (0.7 + i * 0.12) }));
  },
};

// Nombres que usa la interfaz → sonido.
const ALIAS = {
  tap: ['tecla'], click: ['tecla'], select: ['tecla'], 'tab-switch': ['tecla'],
  hover: ['tecla', 0.22],
  'toggle-on': ['especial'], 'toggle-off': ['especial', 0.85],
  expand: ['especial', 0.8], collapse: ['borrar', 0.6], swoosh: ['especial', 0.7],
  'page-enter': ['especial', 0.8], 'page-exit': ['borrar', 0.6], slide: ['especial', 0.8],
  success: ['confirmar'], copy: ['confirmar', 0.8], pop: ['confirmar', 0.85], notification: ['confirmar', 0.7],
  delete: ['borrar'], revelar: ['escribir', 0.8],
};

export function sonar(nombre, factor = 1) {
  if (!puede()) return;
  const [receta, k] = ALIAS[nombre] || [nombre, 1];
  if (!R[receta]) return;
  const ahora = performance.now();
  if (ahora - (ultimo[receta] || 0) < (ESPERA[receta] || 25)) return;
  ultimo[receta] = ahora;
  try {
    motor();
    R[receta](ctx.currentTime + 0.004, (k ?? 1) * factor);
  } catch {
    /* sin audio */
  }
}

// ---------------------------------------------------------------- deslizador
// Clics del deslizador de calificación (sin cambios).
export function tic(valor = 0.5, fuerza = 1) {
  if (!puede()) return;
  const ahora = performance.now();
  if (ahora - (ultimo.tic || 0) < 18) return;
  ultimo.tic = ahora;
  motor();
  const t = ctx.currentTime;
  const b = bus(t);
  soplo(t, b.entrada, { dur: 0.012, filtros: [{ tipo: 'bandpass', f0: 2600 + valor * 2200, q: 2.2 }], ataque: 0.0008, pico: 0.2 * fuerza });
  tono(t, b.entrada, { f0: 520 + valor * 680, f1: 380 + valor * 420, dur: 0.045, curva: 0.03, ataque: 0.002, pico: 0.05 * fuerza });
}

export function microclic() {
  if (!puede()) return;
  const ahora = performance.now();
  if (ahora - (ultimo.micro || 0) < 45) return;
  ultimo.micro = ahora;
  motor();
  tono(ctx.currentTime, salida, { tipo: 'triangle', f0: 3400, dur: 0.012, ataque: 0.001, pico: 0.018 });
}

// ---------------------------------------------------------------- gatos (grabaciones)
const MUESTRAS = { maullido: [], ronroneo: [] };
let carga = null;
export const RUTA_SONIDOS = 'sonidos/gatos/';
function cargarMuestras() {
  if (carga) return carga;
  carga = (async () => {
    const r = await fetch(`${RUTA_SONIDOS}creditos.json`, { cache: 'no-cache' });
    if (!r.ok) return;
    const lista = await r.json();
    await Promise.all(lista.map(async (c) => {
      try {
        const a = await fetch(RUTA_SONIDOS + c.archivo);
        const buf = await ctx.decodeAudioData(await a.arrayBuffer());
        MUESTRAS[c.tipo]?.push(buf);
      } catch {
        /* un clip que no se pudo leer no detiene a los demás */
      }
    }));
  })().catch(() => {});
  return carga;
}

const ultimaMuestra = {};
function muestra(tipo) {
  const l = MUESTRAS[tipo];
  if (!l.length) return null;
  let i = Math.floor(Math.random() * l.length);
  if (l.length > 1 && i === ultimaMuestra[tipo]) i = (i + 1) % l.length;
  ultimaMuestra[tipo] = i;
  return l[i];
}

function reproducir(buf, { velocidad = 1, vol = 1, bucle = 0, fundido = 0.01, corte = 0 } = {}) {
  const t = ctx.currentTime + 0.01;
  const b = bus(t, { rev: 0.12, vol });
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.playbackRate.value = velocidad;
  const g = ctx.createGain();
  const dur = bucle || Math.min(corte || Infinity, buf.duration / velocidad);
  if (corte) fundido = Math.max(fundido, 0.06);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(1, t + fundido);
  g.gain.setValueAtTime(1, t + Math.max(fundido, dur - fundido * 1.5));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  if (bucle) s.loop = true;
  s.connect(g).connect(b.entrada);
  s.start(t);
  s.stop(t + dur + 0.05);
}

const espera = (tipo) => {
  const ahora = performance.now();
  if (ahora - (ultimo[tipo] || 0) < ESPERA[tipo]) return false;
  ultimo[tipo] = ahora;
  return true;
};

// "voz" > 1: más agudo (Petri); < 1: más grave (Folfiri).
// Maullido sintetizado (las grabaciones libres disponibles no convencieron;
// cuando haya grabaciones propias se cargan desde sonidos/gatos/).
export function maullar(voz = 1) {
  if (!puede() || !espera('maullido')) return;
  motor();
  const buf = muestra('maullido');
  if (buf) reproducir(buf, { velocidad: voz * (0.96 + Math.random() * 0.08), vol: 0.9 });
  else sintMaullido(voz, 0.5 + Math.random() * 0.25);
}

// Estornudo de gato: una inspiración cortita y un "pff" seco.
export function estornudar(voz = 1) {
  if (!puede() || !espera('estornudo')) return;
  motor();
  const t = ctx.currentTime + 0.01;
  const b = bus(t, { vol: 0.7 });
  soplo(t, b.entrada, { dur: 0.16, filtros: [{ tipo: 'bandpass', f0: 2400 * voz, f1: 3400 * voz, q: 1.4 }], ataque: 0.12, pico: 0.05 });
  soplo(t + 0.2, b.entrada, { dur: 0.07, filtros: [{ tipo: 'highpass', f0: 1800 }, { tipo: 'bandpass', f0: 4200 * voz, q: 0.8 }], ataque: 0.004, pico: 0.32 });
  tono(t + 0.2, b.entrada, { tipo: 'triangle', f0: 900 * voz, f1: 520 * voz, dur: 0.06, ataque: 0.003, pico: 0.06 });
}

// Trino ("mrrp") sintetizado.
export function trino(voz = 1) {
  if (!puede() || !espera('trino')) return;
  motor();
  sintTrino(voz);
}

export function ronronear(grave = 1) {
  if (!puede() || !espera('ronroneo')) return;
  motor();
  const buf = muestra('ronroneo');
  if (buf) reproducir(buf, { velocidad: 1 / grave, vol: 1, bucle: Math.min(3.2, buf.duration), fundido: 0.35 });
  else sintRonroneo(grave, 2);
}

// ---------------------------------------------------------------- gatos (respaldo sintetizado)
// Maullido: fuente de sierra con contorno de altura y tres formantes que
// se deslizan (m-i-a-u). "agudo" cambia la voz de cada gato.
function sintMaullido(agudo = 1, largo = 0.62) {
  const t = ctx.currentTime + 0.01;
  const b = bus(t, { rev: 0.18, vol: 0.9 });
  const f0 = 520 * agudo;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0 * 0.82, t);
  o.frequency.linearRampToValueAtTime(f0 * 1.16, t + largo * 0.35);
  o.frequency.linearRampToValueAtTime(f0 * 0.72, t + largo);
  const vib = ctx.createOscillator();
  vib.frequency.value = 6;
  const vg = ctx.createGain();
  vg.gain.value = f0 * 0.012;
  vib.connect(vg).connect(o.frequency);
  const voz = ctx.createGain();
  voz.gain.setValueAtTime(0.0001, t);
  voz.gain.linearRampToValueAtTime(0.5, t + 0.05);
  voz.gain.setValueAtTime(0.5, t + largo * 0.7);
  voz.gain.exponentialRampToValueAtTime(0.0001, t + largo + 0.08);
  o.connect(voz);
  const formantes = [
    [[320, 0], [880, 0.4], [480, 1]],
    [[2100, 0], [1450, 0.4], [820, 1]],
    [[2900, 0], [2600, 0.5], [2350, 1]],
  ];
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5200;
  lp.connect(b.entrada);
  formantes.forEach((curva, i) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = [7, 9, 10][i];
    curva.forEach(([fr, en], j) => (j ? bp.frequency.linearRampToValueAtTime(fr * (0.92 + agudo * 0.08), t + en * largo) : bp.frequency.setValueAtTime(fr, t)));
    const g = ctx.createGain();
    g.gain.value = [0.5, 0.32, 0.12][i];
    voz.connect(bp).connect(g).connect(lp);
  });
  soplo(t, lp, { dur: largo, filtros: [{ tipo: 'bandpass', f0: 3200, q: 1.2 }], ataque: 0.04, pico: 0.012 });
  [o, vib].forEach((n) => {
    n.start(t);
    n.stop(t + largo + 0.12);
  });
}

// Trino ("mrrp"): un gorjeo corto y redondo con la erre vibrando.
function sintTrino(agudo = 1) {
  const t = ctx.currentTime + 0.01;
  const b = bus(t, { rev: 0.15, vol: 0.85 });
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1100 * agudo;
  bp.Q.value = 1.4;
  const am = ctx.createGain();
  am.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 32;
  const lg = ctx.createGain();
  lg.gain.value = 0.5;
  lfo.connect(lg).connect(am.gain);
  bp.connect(am).connect(b.entrada);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(480 * agudo, t);
  o.frequency.exponentialRampToValueAtTime(820 * agudo, t + 0.2);
  const g = ctx.createGain();
  env(g.gain, t, 0.02, 0.5, 0.24);
  o.connect(g).connect(bp);
  [o, lfo].forEach((n) => {
    n.start(t);
    n.stop(t + 0.3);
  });
}

// Ronroneo: ruido grave pulsado a ~25 Hz, con inhalación y exhalación.
function sintRonroneo(grave = 1, dur = 1.8) {
  const t = ctx.currentTime + 0.01;
  const b = bus(t, { rev: 0.04, vol: 1 });
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 280 / grave;
  lp.Q.value = 1.5;
  const pulso = ctx.createGain();
  pulso.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.type = 'triangle';
  lfo.frequency.value = 25 / grave;
  const lg = ctx.createGain();
  lg.gain.value = 0.5;
  lfo.connect(lg).connect(pulso.gain);
  const resp = ctx.createGain();
  resp.gain.setValueAtTime(0.0001, t);
  const ciclo = dur / 2;
  for (let i = 0; i < 2; i++) {
    resp.gain.linearRampToValueAtTime(0.9, t + i * ciclo + ciclo * 0.35);
    resp.gain.linearRampToValueAtTime(0.25, t + i * ciclo + ciclo * 0.95);
  }
  resp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
  const s = ctx.createBufferSource();
  s.buffer = ruido();
  s.loop = true;
  s.connect(lp).connect(pulso).connect(resp).connect(b.entrada);
  s.start(t, Math.random());
  s.stop(t + dur + 0.15);
  lfo.start(t);
  lfo.stop(t + dur + 0.15);
}
