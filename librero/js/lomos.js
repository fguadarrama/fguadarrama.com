// Lomos: medidas físicas aproximadas y dibujo de cada libro en el estante.

import { azar, esc, esEspanol, apellido } from './util.js';

const ALTO_MM = {
  'Pasta dura': 238, 'Pasta blanda': 214, Bolsillo: 178, Kindle: 206, Folleto: 205,
  'Audiolibro (CD)': 142, Estuche: 150, 'Juego de mesa': 268, Desconocido: 214,
};
const FORMATO_GRANDE = new Set(['cocina', 'artes', 'medicina', 'infantil']);

// Telas de encuadernación para lomos sin portada (paleta libre, amplia).
const TELAS = [
  ['#1B3A5C', '#F2E6C9', '#C9A227'], ['#7A1F2B', '#F5E9D6', '#D4AF37'], ['#2F4F3E', '#EDE4CF', '#C77D3A'],
  ['#E9DFC9', '#2B2B2B', '#B23A2E'], ['#0F4C5C', '#F6F1E7', '#E36414'], ['#5F0F40', '#FBEFEF', '#FB8B24'],
  ['#F4D35E', '#0D3B66', '#EE964B'], ['#264653', '#E9F5F2', '#E9C46A'], ['#E76F51', '#FFF4E6', '#264653'],
  ['#3D405B', '#F4F1DE', '#E07A5F'], ['#81B29A', '#1F2A2E', '#F2CC8F'], ['#22223B', '#F2E9E4', '#C9ADA7'],
  ['#9A031E', '#FBF3E4', '#FB8B24'], ['#006D77', '#EDF6F9', '#E29578'], ['#B5838D', '#2D1E2F', '#FFCDB2'],
  ['#FFB703', '#023047', '#FB8500'], ['#8ECAE6', '#023047', '#219EBC'], ['#606C38', '#FEFAE0', '#DDA15E'],
  ['#283618', '#FEFAE0', '#BC6C25'], ['#6D597A', '#F7EDE2', '#E56B6F'], ['#355070', '#F7EDE2', '#EAAC8B'],
  ['#F1FAEE', '#1D3557', '#E63946'], ['#1D3557', '#F1FAEE', '#E63946'], ['#2B2D42', '#EDF2F4', '#EF233C'],
  ['#CB997E', '#3B2C24', '#FFE8D6'], ['#4A4E69', '#F2E9E4', '#9A8C98'], ['#14213D', '#E5E5E5', '#FCA311'],
  ['#D62828', '#FDF0D5', '#003049'], ['#F7C59F', '#2A324B', '#E15A97'], ['#5E548E', '#F0E6EF', '#E0B1CB'],
  ['#0B132B', '#E8F1F2', '#5BC0BE'], ['#BC4749', '#F2E8CF', '#386641'], ['#A7C957', '#283618', '#6A994E'],
  ['#3A0CA3', '#F8F7FF', '#F72585'], ['#FFD6A5', '#3D2C2E', '#E76F51'], ['#EAE2B7', '#003049', '#D62828'],
].map(([fondo, texto, acento]) => ({ fondo, texto, acento }));

// Tipografías de lomo (Google Fonts). Cada repisa tiene sus afinidades.
const F = {
  playfair: ["'Playfair Display', serif", 800, 'normal', 'none', '0'],
  playfairI: ["'Playfair Display', serif", 600, 'italic', 'none', '0'],
  bebas: ["'Bebas Neue', sans-serif", 400, 'normal', 'uppercase', '.06em'],
  oswald: ["'Oswald', sans-serif", 600, 'normal', 'uppercase', '.04em'],
  baskerville: ["'Libre Baskerville', serif", 400, 'italic', 'none', '0'],
  cormorant: ["'Cormorant Garamond', serif", 700, 'normal', 'uppercase', '.12em'],
  cormorantI: ["'Cormorant Garamond', serif", 600, 'italic', 'none', '0'],
  abril: ["'Abril Fatface', serif", 400, 'normal', 'none', '.01em'],
  archivo: ["'Archivo Black', sans-serif", 400, 'normal', 'uppercase', '.02em'],
  dmserif: ["'DM Serif Display', serif", 400, 'normal', 'none', '0'],
  josefin: ["'Josefin Sans', sans-serif", 600, 'normal', 'uppercase', '.14em'],
  mono: ["'Space Mono', monospace", 700, 'normal', 'uppercase', '.02em'],
  syne: ["'Syne', sans-serif", 800, 'normal', 'uppercase', '.03em'],
  fraunces: ["'Fraunces', serif", 700, 'italic', 'none', '0'],
  anton: ["'Anton', sans-serif", 400, 'normal', 'uppercase', '.03em'],
  cinzel: ["'Cinzel', serif", 700, 'normal', 'uppercase', '.1em'],
  alfa: ["'Alfa Slab One', serif", 400, 'normal', 'none', '.01em'],
  courier: ["'Courier Prime', monospace", 700, 'normal', 'uppercase', '.04em'],
  albert: ["'Albert Sans', sans-serif", 700, 'normal', 'none', '0'],
  instrument: ["'Instrument Serif', serif", 400, 'normal', 'none', '0'],
  // La tipografía condensada que usa nuffertaylor/bookshelf para sus lomos.
  league: ["'League Gothic', sans-serif", 400, 'normal', 'uppercase', '.02em'],
};
// Condensadas: entran cuando un título largo quedaría demasiado chico.
const CONDENSADAS = ['league', 'oswald', 'bebas', 'anton'];
const AFINIDAD = {
  'ciencia-ficcion': ['mono', 'syne', 'archivo', 'anton', 'bebas', 'josefin', 'albert', 'oswald', 'league'],
  fantasia: ['cinzel', 'cormorantI', 'fraunces', 'playfairI', 'dmserif', 'instrument', 'cormorant'],
  narrativa: ['playfair', 'playfairI', 'baskerville', 'cormorantI', 'dmserif', 'instrument', 'josefin', 'fraunces', 'albert'],
  negra: ['bebas', 'oswald', 'anton', 'alfa', 'courier', 'playfair', 'league'],
  thriller: ['bebas', 'oswald', 'anton', 'archivo', 'courier', 'syne', 'league'],
  terror: ['abril', 'alfa', 'cinzel', 'playfairI', 'anton'],
  cuento: ['fraunces', 'cormorantI', 'josefin', 'instrument', 'playfairI', 'baskerville'],
  poesia: ['cormorantI', 'instrument', 'baskerville', 'cinzel', 'fraunces'],
};
const FUENTES_GENERALES = ['oswald', 'josefin', 'baskerville', 'dmserif', 'albert', 'syne', 'archivo', 'playfair', 'instrument', 'fraunces', 'league'];

export function fuente(b) {
  const lista = AFINIDAD[b.repisa] || FUENTES_GENERALES;
  return F[lista[Math.floor(azar(b.id, 'fuente') * lista.length)]];
}

export function escalaActual() {
  return innerWidth < 700 ? 0.78 : innerWidth < 1100 ? 1 : 1.16; // píxeles por milímetro
}

const GROSOR_MIN_PX = 16;

export function geometria(b, escala = escalaActual()) {
  const r = azar(b.id, 'alto');
  let alto = (ALTO_MM[b.formato] || 214) * (FORMATO_GRANDE.has(b.repisa) ? 1.13 : 1) * (0.965 + r * 0.07);
  const paginas = b.paginas || 260 + Math.round(azar(b.id, 'pag') * 140);
  let grosor = paginas * 0.066 + (b.formato === 'Pasta dura' ? 4.5 : 1.4);
  if (b.formato === 'Juego de mesa') grosor = 62 + azar(b.id) * 20;
  if (b.formato === 'Audiolibro (CD)') grosor = 28;
  if (b.formato === 'Estuche') grosor = 52;
  grosor = Math.min(Math.max(grosor, 6.5), 82);
  // Mínimo de 16 px en pantalla: un lomo más delgado no deja leer su título.
  return { alto: alto * escala, grosor: Math.max(grosor * escala, escala === 1 ? 0 : GROSOR_MIN_PX), ancho: alto * 0.67 * escala };
}

export function colores(b) {
  if (b.lomo_colores?.fondo) return b.lomo_colores;
  return TELAS[Math.floor(azar(b.id, 'color') * TELAS.length)];
}

const n2 = (v) => Math.round(v * 10) / 10;

function estilo(b) {
  return Math.floor(azar(b.id, 'estilo') * 9); // 9 diseños de lomo
}

function variablesLomo(b, g, fuenteElegida = fuente(b)) {
  const c = colores(b);
  const fs = Math.max(11, Math.min(g.grosor * 0.6, 19));
  const [ff, fw, fst, tt, ls] = fuenteElegida;
  return `--w:${n2(g.grosor)}px;--h:${n2(g.alto)}px;--l-fondo:${c.fondo};--l-texto:${c.texto};--l-acento:${c.acento};--fs:${n2(fs)}px;--ff:${ff};--fw:${fw};--fst:${fst};--tt:${tt};--ls:${ls};`;
}

// ---------------------------------------------------------------- texto del lomo
// Como en nuffertaylor/bookshelf: el título completo se ajusta para llenar
// el lomo. Se mide con la tipografía real (canvas), se reparte en 1–3
// renglones si el lomo es grueso, y si aun así quedaría muy chico se usa
// una tipografía condensada (como hacen los diseñadores de lomos reales).
const lienzo = document.createElement('canvas').getContext('2d');
const AUTOR = ["'Albert Sans', sans-serif", 600, 'normal', 'uppercase', '.08em'];
const cacheMedidas = new Map();

function medir(texto, [ff, fw, fst, tt, ls]) {
  const t = tt === 'uppercase' ? texto.toUpperCase() : texto;
  const clave = `${ff}|${fw}|${fst}|${t}`;
  if (cacheMedidas.has(clave)) return cacheMedidas.get(clave) + parseFloat(ls) * 100 * t.length;
  lienzo.font = `${fst} ${fw} 100px ${ff}`;
  const w = lienzo.measureText(t).width;
  cacheMedidas.set(clave, w);
  return w + parseFloat(ls) * 100 * t.length;
}

// Mejor reparto de palabras en n renglones (minimiza el renglón más largo).
function repartir(palabras, n, f) {
  if (n <= 1 || palabras.length < 2) return [palabras.join(' ')];
  n = Math.min(n, palabras.length);
  let mejor = null;
  const probar = (inicio, resto, actual) => {
    if (resto === 1) {
      const lineas = [...actual, palabras.slice(inicio).join(' ')];
      const max = Math.max(...lineas.map((l) => medir(l, f)));
      if (!mejor || max < mejor.max) mejor = { lineas, max };
      return;
    }
    for (let i = inicio + 1; i <= palabras.length - resto + 1; i++) probar(i, resto - 1, [...actual, palabras.slice(inicio, i).join(' ')]);
  };
  if (palabras.length <= 14) probar(0, n, []);
  return mejor ? mejor.lineas : [palabras.join(' ')];
}

function ajustar(texto, f, largo, ancho, maxLineas = 3) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  let mejor = null;
  for (let n = 1; n <= maxLineas; n++) {
    if (n > 1 && palabras.length < n) break;
    const lineas = repartir(palabras, n, f);
    const w100 = Math.max(...lineas.map((l) => medir(l, f)));
    const fs = Math.min((largo * 100) / w100, ancho / (lineas.length * 1.08));
    const puntaje = fs * (1 - 0.1 * (lineas.length - 1));
    if (!mejor || puntaje > mejor.puntaje) mejor = { lineas, fs, puntaje, f };
  }
  return mejor;
}

const cacheDiseno = new Map();
export function limpiarMedidas() {
  cacheMedidas.clear();
  cacheDiseno.clear();
}

// Medidas de cada zona del lomo según su diseño (e0–e8).
function disenoLomo(b, g, horizontal) {
  const clave = `${b.id}|${b.titulo}|${Math.round(g.alto)}|${Math.round(g.grosor)}|${horizontal}`;
  if (cacheDiseno.has(clave)) return cacheDiseno.get(clave);
  const e = estilo(b);
  const h = g.alto; // a lo largo del lomo (de pie o acostado)
  const w = g.grosor; // a lo ancho del lomo
  const autor = apellido(b.autor);
  const decor = { 0: Math.max(12, h * 0.11), 1: 8, 2: h * 0.14, 3: 2 * Math.max(12, h * 0.11), 4: w * 0.5, 5: w * 0.5, 6: h * 0.32, 7: Math.min(w * 0.9, 24), 8: 26 }[e];
  const hijos = { 0: 3, 1: 4, 2: 3, 3: 4, 4: 3, 5: 3, 6: 2, 7: 3, 8: 4 }[e];
  // autor: completo, en letra pequeña (cabe en ~30 % del lomo)
  let fsA = Math.min(12, Math.max(8, w * 0.38));
  const wA = (medir(autor, AUTOR) * fsA) / 100;
  if (wA > h * 0.3) fsA = Math.max(6.5, (fsA * h * 0.3) / wA);
  const largoAutor = e === 6 ? 0 : (medir(autor, AUTOR) * fsA) / 100;
  const largo = Math.max(24, h - (horizontal ? 22 : 16) - decor - largoAutor - (hijos - 1) * (horizontal ? 10 : 6));
  const ancho = (e === 5 ? w * 0.76 : w) - 2 * Math.max(1.5, w * 0.09);
  const f0 = fuente(b);
  let d = ajustar(b.titulo, f0, largo, ancho, ancho > 30 ? 3 : ancho > 18 ? 2 : 1);
  if (d.fs < 11) {
    for (const nombre of CONDENSADAS) {
      const otra = ajustar(b.titulo, F[nombre], largo, ancho, ancho > 30 ? 3 : ancho > 18 ? 2 : 1);
      if (otra.fs > d.fs * 1.12) d = otra;
    }
  }
  const res = { fs: Math.min(d.fs, 34), lineas: d.lineas, fuente: d.f, fsA, e };
  cacheDiseno.set(clave, res);
  return res;
}

function contenido(b, horizontal = false, g = null, d = null) {
  if (b.lomo_img) return '';
  d ||= disenoLomo(b, g, horizontal);
  const t = `<span class="l-titulo" style="font-size:${n2(d.fs)}px">${d.lineas.map(esc).join('<br>')}</span>`;
  const a = `<span class="l-autor" style="font-size:${n2(d.fsA)}px">${esc(apellido(b.autor))}</span>`;
  const partes = {
    0: `<span class="l-banda"></span>${t}${a}`,
    1: `<span class="l-regla"></span>${t}${a}<span class="l-regla"></span>`,
    2: `${a}${t}<span class="l-bloque"><i></i></span>`,
    3: `<span class="l-banda"></span>${t}${a}<span class="l-banda"></span>`,
    4: `${t}${a}<span class="l-sello"></span>`,
    5: `${a}<span class="l-etiqueta">${t}</span><span class="l-sello"></span>`,
    6: `<span class="l-mitad">${a}</span>${t}`,
    7: `<span class="l-inicial">${esc(b.titulo.replace(/^(the|el|la|los|las|a|an|le|un|una)\s+/i, '').slice(0, 1))}</span>${t}${a}`,
    8: `<span class="l-rayas"></span>${t}${a}<span class="l-rayas"></span>`,
  };
  return horizontal ? partes[d.e].replace('l-bloque', 'l-bloque h') : partes[d.e];
}

// Carga las tipografías de los lomos antes de medir (si no, la medida usa
// la letra de respaldo y el título no ajusta bien).
export function cargarFuentesLomo() {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.all(Object.values(F).concat([AUTOR]).map(([ff, fw, fst]) => document.fonts.load(`${fst} ${fw} 40px ${ff}`).catch(() => null)));
}

function etiqueta(b) {
  return `${b.titulo}, de ${b.autor}`;
}

export function lomoVertical(b, g) {
  const d = b.lomo_img ? null : disenoLomo(b, g, false);
  const incl = b.ubicacion?.inclinacion || 0;
  const lado = incl < 0 ? 'izq' : 'der';
  const hueco = incl ? n2(g.alto * Math.sin((Math.abs(incl) * Math.PI) / 180)) : 0;
  const idioma = esEspanol(b.titulo) ? 'es' : 'en';
  const img = b.lomo_img ? `background-image:url('${esc(b.lomo_img)}');` : '';
  const marcaEstado = b.estado ? ` data-estado="${b.estado}"` : '';
  return `<button class="lomo e${estilo(b)} ${idioma}${b.lomo_img ? ' con-imagen' : ''}${b.fisico === false ? ' digital' : ''}"
    data-id="${b.id}"${marcaEstado} style="${variablesLomo(b, g, d?.fuente)}${img}--incl:${incl}deg;--hueco:${hueco}px;--origen:${lado === 'izq' ? 'left' : 'right'} bottom;"
    data-incl="${incl ? lado : ''}" aria-label="${esc(etiqueta(b))}">${contenido(b, false, g, d)}</button>`;
}

export function pila(libros, escala) {
  const g = libros.map((b) => geometria(b, escala));
  // Lo más grande abajo, como en un librero real (salvo que venga de una foto).
  const orden = libros.map((b, i) => ({ b, g: g[i] }));
  if (libros[0]?.ubicacion?.fuente !== 'foto') orden.sort((x, y) => y.g.alto - x.g.alto);
  const ancho = Math.max(...g.map((x) => x.alto)) + 16 * escala;
  const alto = g.reduce((s, x) => s + x.grosor, 0);
  const html = orden
    .map(({ b, g: gb }) => {
      const dx = n2((b.ubicacion?.desfase_mm || 0) * escala);
      const rot = b.ubicacion?.inclinacion || 0;
      const img = b.lomo_img ? `background-image:url('${esc(b.lomo_img)}');` : '';
      const dz = b.lomo_img ? null : disenoLomo(b, gb, true);
      return `<button class="lomo acostado e${estilo(b)}${b.lomo_img ? ' con-imagen' : ''}" data-id="${b.id}"
        style="${variablesLomo(b, { ...gb, grosor: gb.grosor }, dz?.fuente)}${img}--dx:${dx}px;--rot:${rot}deg;width:${n2(gb.alto)}px;height:${n2(gb.grosor)}px;"
        aria-label="${esc(etiqueta(b))}">${contenido(b, true, gb, dz)}</button>`;
    })
    .reverse() // el DOM va de arriba hacia abajo
    .join('');
  return { html: `<div class="pila" style="width:${n2(ancho)}px;height:${n2(alto)}px">${html}</div>`, ancho, alto };
}

// Portada generada (para libros sin imagen): mismos colores que su lomo.
export function portadaGenerada(b) {
  const c = colores(b);
  const [ff, fw, fst, tt, ls] = fuente(b);
  return `<div class="portada-generada e${estilo(b)}" style="--l-fondo:${c.fondo};--l-texto:${c.texto};--l-acento:${c.acento};--ff:${ff};--fw:${fw};--fst:${fst};--tt:${tt};--ls:${ls}">
    <span class="pg-titulo">${esc(b.titulo)}</span>
    <span class="pg-regla"></span>
    <span class="pg-autor">${esc(String(b.autor || '').split(',')[0])}</span>
  </div>`;
}
