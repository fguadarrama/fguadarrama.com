// Vista "Árbol" (inspirada en Readwoods): el tronco se divide en grandes
// ramas, cada rama en repisas, cada repisa en autores y cada libro es una hoja.
// Las líneas rojas unen libros del mismo autor que viven en repisas distintas.

import { datos, nombreRepisa, ESTADOS } from './datos.js';
import { $, $$, esc, apellido, norm, menosMovimiento } from './util.js';
import { globo, ocultarGlobo } from './globo.js';

const RAMAS = [
  { id: 'especulativa', nombre: 'Especulativa', repisas: ['ciencia-ficcion', 'fantasia', 'terror'] },
  { id: 'ficcion', nombre: 'Ficción', repisas: ['narrativa', 'negra', 'thriller', 'cuento', 'poesia', 'infantil', 'comic'] },
  { id: 'no-ficcion', nombre: 'No ficción', repisas: ['ensayo', 'divulgacion', 'historia', 'politica', 'memorias', 'escritura', 'medicina', 'artes', 'cocina'] },
  { id: 'otros', nombre: 'Otros', repisas: ['juegos', 'por-clasificar'] },
];

const C = { x: 1200, y: 1250 };
const R0 = 190, R1 = 330, R2 = 500, R3 = 610, ANILLOS = 5, PASO_ANILLO = 40;
const ANG0 = (-172 * Math.PI) / 180, ANG1 = (-8 * Math.PI) / 180;
const f = (n) => Math.round(n * 10) / 10;
const polar = (r, a) => [C.x + r * Math.cos(a), C.y + r * Math.sin(a)];

function enlace(r0, a0, r1, a1) {
  const [x0, y0] = polar(r0, a0), [x1, y1] = polar(r1, a1);
  const rm = (r0 + r1) / 2;
  const [c0x, c0y] = polar(rm, a0), [c1x, c1y] = polar(rm, a1);
  return `M${f(x0)},${f(y0)}C${f(c0x)},${f(c0y)} ${f(c1x)},${f(c1y)} ${f(x1)},${f(y1)}`;
}

function hoja(x, y, ang, tam) {
  const l = tam * 2.6, a = tam;
  const deg = (ang * 180) / Math.PI;
  return `M0,0C${f(l * 0.3)},${f(-a)} ${f(l * 0.75)},${f(-a)} ${f(l)},0C${f(l * 0.75)},${f(a)} ${f(l * 0.3)},${f(a)} 0,0Z" transform="translate(${f(x)},${f(y)}) rotate(${f(deg)})`;
}

export function crearVistaBosque(raiz, { abrirFicha }) {
  raiz.innerHTML = `
    <div class="bosque">
      <div class="bosque-leyenda">
        <p class="bosque-cifras"></p>
        <ul>
          ${Object.values(ESTADOS).map((e) => `<li><i style="--c:${e.color}"></i>${e.nombre}</li>`).join('')}
          <li><i class="sin"></i>Sin marcar</li>
          <li><i class="linea"></i>Mismo autor, otra repisa</li>
        </ul>
      </div>
      <div class="bosque-zoom">
        <button type="button" data-zoom="1.4" aria-label="Acercar">+</button>
        <button type="button" data-zoom="0.7" aria-label="Alejar">−</button>
        <button type="button" data-zoom="0" aria-label="Ver todo">◎</button>
      </div>
      <svg class="bosque-svg" role="img" aria-label="Árbol de lectura"><g class="mundo"><g class="copa"></g></g></svg>
    </div>`;
  const svg = $('.bosque-svg', raiz);
  const mundo = $('.mundo', raiz);
  const copa = $('.copa', raiz);
  let vista = { x: 0, y: 0, k: 1 };
  let caja = { x: 0, y: 0, w: 2400, h: 1300 };
  let primera = true;
  const hojas = new Map();

  function render(lista) {
    hojas.clear();
    const porRepisa = new Map();
    for (const b of lista) {
      if (!porRepisa.has(b.repisa)) porRepisa.set(b.repisa, []);
      porRepisa.get(b.repisa).push(b);
    }
    const ramas = RAMAS.map((r) => ({ ...r, repisas: r.repisas.filter((id) => porRepisa.get(id)?.length) })).filter((r) => r.repisas.length);
    const sueltas = [...porRepisa.keys()].filter((id) => !RAMAS.some((r) => r.repisas.includes(id)));
    if (sueltas.length) (ramas.at(-1)?.id === 'otros' ? ramas.at(-1) : (ramas.push({ id: 'otros', nombre: 'Otros', repisas: [] }), ramas.at(-1))).repisas.push(...sueltas);

    const pesos = ramas.flatMap((r) => r.repisas.map((id) => Math.max(porRepisa.get(id).length, 14) ** 0.8));
    const total = pesos.reduce((a, b) => a + b, 0) || 1;
    const hueco = (1.3 * Math.PI) / 180;
    const util = ANG1 - ANG0 - hueco * Math.max(0, pesos.length - 1);
    let a = ANG0, k = 0;
    const capas = { tronco: '', ramas: '', ramitas: '', tallos: '', hojas: '', lazos: '', etiquetas: '' };

    capas.tronco = `<path class="tronco crece" style="--d:0" d="M${C.x - 34},${C.y + 150}C${C.x - 22},${C.y + 70} ${C.x - 14},${C.y + 30} ${C.x - 9},${C.y}L${C.x + 9},${C.y}C${C.x + 14},${C.y + 30} ${C.x + 22},${C.y + 70} ${C.x + 34},${C.y + 150}Z"/>`;
    const porAutor = new Map();

    for (const rama of ramas) {
      const inicioRama = a;
      const nodos = [];
      for (const rid of rama.repisas) {
        const libros = porRepisa.get(rid).slice().sort((x, y) => apellido(x.autor).localeCompare(apellido(y.autor), 'es') || x.titulo.localeCompare(y.titulo, 'es'));
        const span = (pesos[k++] / total) * util;
        const ac = a + span / 2;
        nodos.push({ rid, ac, a0: a, span, libros });
        a += span + hueco;
      }
      const aRama = (inicioRama + a - hueco) / 2;
      const nTot = nodos.reduce((s, n) => s + n.libros.length, 0);
      capas.ramas += `<path class="rama crece" data-rama="${rama.id}" style="--d:1;stroke-width:${f(5 + Math.sqrt(nTot) * 0.9)}" d="M${C.x},${C.y}${enlace(0, aRama, R0, aRama).replace(/^M[^C]+/, 'L' + polar(R0 * 0.2, aRama).map(f).join(','))}"/>`;
      const [lx, ly] = polar(R0 - 30, aRama);
      capas.etiquetas += `<text class="etq-rama crece-texto" style="--d:2" x="${f(lx)}" y="${f(ly)}">${esc(rama.nombre)}</text>`;

      for (const n of nodos) {
        const grosor = 1.5 + Math.sqrt(n.libros.length) * 0.75;
        capas.ramas += `<path class="rama crece" data-repisa="${n.rid}" style="--d:2;stroke-width:${f(grosor)}" d="${enlace(R0, aRama, R1, n.ac)}"/>`;
        // Autores: ramitas con sus libros como hojas.
        const autores = new Map();
        n.libros.forEach((b) => {
          const key = norm(apellido(b.autor));
          if (!autores.has(key)) autores.set(key, []);
          autores.get(key).push(b);
        });
        let ai = n.a0 + n.span * 0.04;
        const usable = n.span * 0.92;
        let idx = 0;
        for (const [clave, libs] of autores) {
          const sub = (libs.length / n.libros.length) * usable;
          const am = ai + sub / 2;
          const conRamita = libs.length > 1;
          if (conRamita) capas.ramitas += `<path class="ramita crece" style="--d:3" d="${enlace(R1, n.ac, R2, am)}"/>`;
          libs.forEach((b, j) => {
            const ah = libs.length > 1 ? ai + (sub * (j + 0.5)) / libs.length : am;
            const anillo = idx++ % ANILLOS;
            const rh = R3 + anillo * PASO_ANILLO;
            const [x, y] = polar(rh, ah);
            const tam = 4.2 + Math.min(b.paginas || 300, 1100) / 230;
            capas.tallos += `<path class="tallo crece" style="--d:4" d="${conRamita ? enlace(R2, am, rh, ah) : enlace(R1, n.ac, rh, ah)}"/>`;
            const color = b.estado ? ESTADOS[b.estado].color : 'var(--fondo)';
            const t = Math.round(((ah - ANG0) / (ANG1 - ANG0)) * 100);
            capas.hojas += `<path class="hoja ${b.estado ? '' : 'sin-estado'}" data-id="${b.id}" style="--c:${color};--t:${t}" d="${hoja(x, y, ah, tam)}"/>`;
            hojas.set(b.id, { x, y, ah, rid: n.rid });
            if (!porAutor.has(clave)) porAutor.set(clave, []);
            porAutor.get(clave).push(b.id);
          });
          ai += sub;
        }
        // Etiqueta radial, fuera de la copa, para que nunca se encimen.
        const [ex, ey] = polar(R3 + ANILLOS * PASO_ANILLO + 26, n.ac);
        const grados = (n.ac * 180) / Math.PI;
        const izquierda = grados < -90;
        capas.etiquetas += `<text class="etq crece-texto" style="--d:3" text-anchor="${izquierda ? 'end' : 'start'}" dominant-baseline="middle" transform="translate(${f(ex)},${f(ey)}) rotate(${f(izquierda ? grados + 180 : grados)})">${esc(nombreRepisa(n.rid))} <tspan>${n.libros.length}</tspan></text>`;
      }
    }

    // Lazos entre repisas: mismo autor en dos o más repisas.
    for (const ids of porAutor.values()) {
      const repisas = new Set(ids.map((id) => hojas.get(id).rid));
      if (repisas.size < 2) continue;
      for (let i = 1; i < ids.length; i++) {
        const p = hojas.get(ids[i - 1]), q = hojas.get(ids[i]);
        if (p.rid === q.rid) continue;
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        const cx = mx + (C.x - mx) * 0.5, cy = my + (C.y - my) * 0.5;
        capas.lazos += `<path class="lazo crece" style="--d:5" data-a="${ids[i - 1]}" data-b="${ids[i]}" d="M${f(p.x)},${f(p.y)}Q${f(cx)},${f(cy)} ${f(q.x)},${f(q.y)}"/>`;
      }
    }

    copa.innerHTML = `<g class="c-tronco">${capas.tronco}</g><g class="c-ramas">${capas.ramas}${capas.ramitas}${capas.tallos}</g><g class="c-lazos">${capas.lazos}</g><g class="c-hojas">${capas.hojas}</g><g class="c-etiquetas">${capas.etiquetas}</g>`;
    $$('.crece:not(.lazo)', copa).forEach((p) => p.setAttribute('pathLength', '1'));

    const totalRepisas = new Set(lista.map((b) => b.repisa)).size;
    $('.bosque-cifras', raiz).innerHTML = `<strong>${lista.length.toLocaleString('es-MX')}</strong> hojas · <strong>${totalRepisas}</strong> repisas`;

    const bb = copa.getBBox();
    caja = { x: bb.x - 40, y: bb.y - 40, w: bb.width + 80, h: bb.height + 60 };
    svg.setAttribute('viewBox', `${f(caja.x)} ${f(caja.y)} ${f(caja.w)} ${f(caja.h)}`);
    raiz.querySelector('.bosque').classList.toggle('entrada', primera && !menosMovimiento());
    if (primera) setTimeout(() => raiz.querySelector('.bosque').classList.remove('entrada'), 2600);
    primera = false;
    vista = { x: 0, y: 0, k: 1 };
    aplicar();
  }

  // ---------------------------------------------------------------- zoom y arrastre
  function aplicar() {
    mundo.style.transform = `translate(${vista.x}px, ${vista.y}px) scale(${vista.k})`;
  }
  function zoom(factor, cx, cy) {
    const k = Math.min(7, Math.max(1, vista.k * factor));
    const r = svg.getBoundingClientRect();
    const escala = caja.w / r.width;
    const px = (cx - r.left) * escala + caja.x, py = (cy - r.top) * escala + caja.y;
    vista.x = px - ((px - vista.x) * k) / vista.k;
    vista.y = py - ((py - vista.y) * k) / vista.k;
    vista.k = k;
    if (k === 1) vista = { x: 0, y: 0, k: 1 };
    aplicar();
  }
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
  }, { passive: false });

  let arrastre = null;
  svg.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hoja')) return;
    arrastre = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y, movido: false };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const r = svg.getBoundingClientRect();
    const escala = caja.w / r.width;
    vista.x = arrastre.vx + (e.clientX - arrastre.x) * escala;
    vista.y = arrastre.vy + (e.clientY - arrastre.y) * escala;
    arrastre.movido = true;
    svg.classList.add('arrastrando');
    aplicar();
  });
  const soltar = () => {
    arrastre = null;
    svg.classList.remove('arrastrando');
  };
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);

  raiz.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z) {
      const factor = Number(z.dataset.zoom);
      mundo.classList.add('suave');
      if (!factor) vista = { x: 0, y: 0, k: 1 };
      else {
        const r = svg.getBoundingClientRect();
        zoom(factor, r.left + r.width / 2, r.top + r.height / 2);
      }
      aplicar();
      setTimeout(() => mundo.classList.remove('suave'), 420);
      return;
    }
    const h = e.target.closest('.hoja');
    if (h) abrirFicha(h.dataset.id, h);
  });

  // Resalta la hoja y sus lazos con otros libros del mismo autor.
  copa.addEventListener('pointerover', (e) => {
    const h = e.target.closest('.hoja');
    if (!h) return;
    const id = h.dataset.id;
    $$('.lazo', copa).forEach((l) => l.classList.toggle('activo', l.dataset.a === id || l.dataset.b === id));
    const b = datos.porId.get(id);
    const ap = norm(apellido(b.autor));
    $$('.hoja', copa).forEach((x) => x.classList.toggle('pariente', x !== h && norm(apellido(datos.porId.get(x.dataset.id)?.autor)) === ap));
  });
  copa.addEventListener('pointerout', (e) => {
    if (e.relatedTarget?.closest?.('.hoja')) return;
    $$('.lazo.activo, .hoja.pariente', copa).forEach((x) => x.classList.remove('activo', 'pariente'));
  });
  globo(copa, '.hoja', (el) => {
    const b = datos.porId.get(el.dataset.id);
    return b ? { titulo: b.titulo, autor: b.autor, b } : null;
  });

  return { render, salir: ocultarGlobo };
}
