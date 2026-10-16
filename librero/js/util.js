// Utilidades compartidas: DOM, texto, azar estable y curvas de animación.

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

// Curvas de Emil Kowalski (emilkowalski/skills · emil-design-eng).
export const CURVA = {
  salida: 'cubic-bezier(0.23, 1, 0.32, 1)', // entradas y respuestas de UI
  movimiento: 'cubic-bezier(0.77, 0, 0.175, 1)', // cosas que se mueven en pantalla
  cajon: 'cubic-bezier(0.32, 0.72, 0, 1)', // paneles y hojas tipo iOS
};

export const menosMovimiento = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export const puedeHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

const MAPA_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => MAPA_ESC[c]);

export function norm(t) {
  return String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Número 0..1 estable para un texto (FNV-1a). Mismo libro, mismo resultado.
export function azar(texto, sal = '') {
  let h = 2166136261;
  const s = `${texto}${sal}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function debounce(fn, ms = 150) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

const PALABRAS_ES = /\b(de|del|el|la|los|las|y|en|que|un|una|por|con|para|sin)\b/;
export function esEspanol(titulo) {
  const t = norm(titulo);
  return /[ñáéíóú¿¡]/i.test(titulo) || PALABRAS_ES.test(t);
}

export function apellido(autor) {
  const primero = String(autor || '').split(',')[0].replace(/\(.*?\)/g, '').trim();
  const partes = primero.split(/\s+/).filter((p) => !/^(Jr\.?|MD)$/.test(p));
  return partes.at(-1) || '';
}

export function autorCorto(autor) {
  const primero = String(autor || '').split(',')[0].replace(/\(.*?\)/g, '').trim();
  const n = String(autor || '').split(',').filter((a) => !/\((trad|pr[oó]logo)/i.test(a)).length;
  return n > 1 ? `${primero} y otros` : primero;
}

export function plural(n, uno, varios) {
  return `${n.toLocaleString('es-MX')} ${n === 1 ? uno : varios}`;
}

// Anima de forma segura con la Web Animations API (respeta "menos movimiento").
export function animar(el, cuadros, opciones) {
  if (!el?.animate) return { finished: Promise.resolve() };
  if (menosMovimiento()) {
    const ultimo = cuadros.at(-1);
    const soloOpacidad = 'opacity' in ultimo ? [{ opacity: cuadros[0].opacity ?? 0 }, { opacity: ultimo.opacity }] : null;
    if (!soloOpacidad) return { finished: Promise.resolve() };
    return el.animate(soloOpacidad, { ...opciones, duration: 150 });
  }
  return el.animate(cuadros, opciones);
}

export function descargar(nombre, texto, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
