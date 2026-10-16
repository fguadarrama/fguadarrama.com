// Vista "Portadas": los libros de frente, en rejilla.

import { datos, nombreRepisa, ESTADOS } from './datos.js';
import { portadaGenerada } from './lomos.js';
import { miniCalificacion, normalizar } from './calificacion.js';
import { usar } from './iconos.js';
import { $, $$, esc, autorCorto, plural } from './util.js';

const ORDENES = {
  repisa: { nombre: 'Por repisa' },
  titulo: { nombre: 'Título', fn: (a, b) => a.titulo.localeCompare(b.titulo, 'es') },
  autor: { nombre: 'Autor', fn: (a, b) => autorCorto(a.autor).split(' ').at(-1).localeCompare(autorCorto(b.autor).split(' ').at(-1), 'es') },
  calificacion: { nombre: 'Calificación', fn: (a, b) => (normalizar(b.calificacion)?.puntos || 0) - (normalizar(a.calificacion)?.puntos || 0) },
};

export function crearVistaPortadas(raiz, { abrirFicha }) {
  let orden = 'repisa';
  let ultima = [];
  raiz.innerHTML = `
    <div class="barra-vista">
      <div class="segmentado" role="radiogroup" aria-label="Ordenar">
        ${Object.entries(ORDENES).map(([id, o]) => `<button type="button" role="radio" data-orden="${id}" aria-checked="${id === orden}">${o.nombre}</button>`).join('')}
      </div>
    </div>
    <div class="portadas"></div>`;
  const cont = $('.portadas', raiz);
  let obs;

  function tarjeta(b, i) {
    const img = b.portada
      ? `<img src="${esc(b.portada)}" alt="" loading="lazy" decoding="async" style="aspect-ratio:1/${b.portada_proporcion || 1.5}">`
      : portadaGenerada(b);
    const estado = b.estado ? `<span class="punto-estado" style="--c:${ESTADOS[b.estado].color}">${ESTADOS[b.estado].nombre}</span>` : '';
    return `<button type="button" class="tarjeta" data-id="${b.id}" style="--col:${i % 6}">
      <span class="tarjeta-portada">${img}</span>
      <span class="tarjeta-titulo">${esc(b.titulo)}</span>
      <span class="tarjeta-autor">${esc(autorCorto(b.autor))}</span>
      <span class="tarjeta-pie">${estado}${miniCalificacion(b.calificacion)}</span>
    </button>`;
  }

  function render(lista = ultima) {
    ultima = lista;
    if (!lista.length) {
      cont.innerHTML = `<p class="vacio">Ningún libro coincide con la búsqueda.</p>`;
      return;
    }
    if (orden === 'repisa') {
      const grupos = new Map(datos.repisas.map((r) => [r.id, []]));
      lista.forEach((b) => (grupos.get(b.repisa) || grupos.set(b.repisa, []).get(b.repisa)).push(b));
      cont.innerHTML = [...grupos]
        .filter(([, g]) => g.length)
        .map(([rid, g]) => `<section class="grupo-portadas"><header class="repisa-cab visto">${usar(`rep-${rid}`)}<h2>${esc(nombreRepisa(rid))}</h2><span class="repisa-cuenta">${plural(g.length, 'libro', 'libros')}</span></header>
          <div class="rejilla">${g.map(tarjeta).join('')}</div></section>`)
        .join('');
    } else {
      const ordenada = [...lista].sort(ORDENES[orden].fn);
      cont.innerHTML = `<div class="rejilla">${ordenada.map(tarjeta).join('')}</div>`;
    }
    obs?.disconnect();
    obs = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visto');
          obs.unobserve(e.target);
        }
      }),
      { rootMargin: '0px 0px -6% 0px' }
    );
    $$('.tarjeta', cont).forEach((t) => obs.observe(t));
  }

  raiz.addEventListener('click', (e) => {
    const o = e.target.closest('[data-orden]');
    if (o) {
      orden = o.dataset.orden;
      $$('[data-orden]', raiz).forEach((x) => x.setAttribute('aria-checked', String(x === o)));
      render();
      return;
    }
    const t = e.target.closest('.tarjeta');
    if (t) abrirFicha(t.dataset.id, $('.tarjeta-portada', t));
  });

  return { render, elementoDe: (id) => $(`.tarjeta[data-id="${id}"] .tarjeta-portada`, raiz) };
}
