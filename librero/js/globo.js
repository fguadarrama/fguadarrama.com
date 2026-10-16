// Globo informativo al pasar sobre un lomo u hoja del árbol.
// Primer globo con retraso; los siguientes aparecen al instante (Emil Kowalski).

import { esc, puedeHover } from './util.js';
import { miniCalificacion } from './calificacion.js';
import { ESTADOS } from './datos.js';

let el;
let temporizador;
let ultimoCierre = 0;

function asegurar() {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'globo';
  el.setAttribute('role', 'tooltip');
  document.body.append(el);
  return el;
}

export function mostrarGlobo(objetivo, info) {
  const g = asegurar();
  const { b } = info;
  const estado = b?.estado ? `<span class="globo-estado" style="--c:${ESTADOS[b.estado].color}">${ESTADOS[b.estado].nombre}</span>` : '';
  g.innerHTML = `<strong>${esc(info.titulo)}</strong><span>${esc(info.autor || '')}</span>${
    b?.calificacion || estado ? `<span class="globo-pie">${estado}${b?.calificacion ? miniCalificacion(b.calificacion) : ''}</span>` : ''
  }`;
  const r = objetivo.getBoundingClientRect();
  const instantaneo = performance.now() - ultimoCierre < 400 || g.classList.contains('visible');
  g.classList.toggle('instantaneo', instantaneo);
  g.style.left = '0px';
  g.style.top = '0px';
  g.classList.add('medir');
  const w = g.offsetWidth, h = g.offsetHeight;
  g.classList.remove('medir');
  const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  let y = r.top - h - 12;
  if (y < 70) y = r.bottom + 12;
  g.style.left = `${Math.round(x)}px`;
  g.style.top = `${Math.round(y)}px`;
  g.style.setProperty('--origen-x', `${Math.round(r.left + r.width / 2 - x)}px`);
  g.classList.add('visible');
}

export function ocultarGlobo() {
  clearTimeout(temporizador);
  if (el?.classList.contains('visible')) ultimoCierre = performance.now();
  el?.classList.remove('visible');
}

export function globo(contenedor, selector, obtener) {
  if (!puedeHover()) return;
  contenedor.addEventListener('pointerover', (e) => {
    const objetivo = e.target.closest(selector);
    if (!objetivo) return;
    const info = obtener(objetivo);
    if (!info) return;
    clearTimeout(temporizador);
    const ya = el?.classList.contains('visible') || performance.now() - ultimoCierre < 400;
    temporizador = setTimeout(() => mostrarGlobo(objetivo, info), ya ? 0 : 380);
  });
  contenedor.addEventListener('pointerout', (e) => {
    const hacia = e.relatedTarget?.closest?.(selector);
    if (!hacia) ocultarGlobo();
  });
  addEventListener('scroll', ocultarGlobo, { passive: true });
}
