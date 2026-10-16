// Vista "Sala de lectura" (inspirada en The Readwoods, de Paula · @paularambles):
// una pequeña sala de lectura isométrica entre los árboles. Todos los libros
// viven en sus estantes; los "Por leer" esperan en el escritorio y los
// descartados en una caja para donar. Paleta libre en esta vista.

import { datos, emitirAviso } from './datos.js';
import { colores, fuente, geometria } from './lomos.js';
import { iconosCalificacion } from './calificacion.js';
import { $, $$, esc, esEspanol, apellido, debounce, azar } from './util.js';

const NOMBRE = 'F. Guadarrama';
const C = Math.cos(Math.PI / 6), S = 0.5;

// ---------------------------------------------------------------- iluminación
const LUCES = {
  nublado: { cielo: '#E3E5E4', velo: ['#6E7C88', 0.16], lamparas: false, vidrio: '#C9D6D8', arbol: ['#6E8B5E', '#55714A'] },
  dia: { cielo: '#EFE8DA', velo: null, lamparas: false, vidrio: '#CFE6E3', arbol: ['#7FA35B', '#5E8445'] },
  tarde: { cielo: '#F3D9BE', velo: ['#FF8A3D', 0.14], lamparas: true, vidrio: '#F6C58E', arbol: ['#7B9A52', '#58773F'] },
  noche: { cielo: '#1C2333', velo: ['#0E1430', 0.52], lamparas: true, vidrio: '#1F2B4A', arbol: ['#2F4A3A', '#22382C'] },
};

export function crearVistaSala(raiz, { abrirFicha }) {
  raiz.innerHTML = `
    <div class="sala">
      <header class="sala-cab">
        <div>
          <p class="sala-eyebrow">Una pequeña sala de lectura entre los árboles</p>
          <h1>Sala de lectura</h1>
          <p class="sala-visita"><em>Estás visitando el librero de</em> <strong>${esc(NOMBRE)}</strong><em>.</em></p>
          <p class="sala-cifras"></p>
        </div>
        <div class="sala-acciones">
          <div class="sala-luces" role="radiogroup" aria-label="Luz">
            <button type="button" role="radio" data-luz="nublado" aria-label="Nublado"><svg viewBox="0 0 20 20"><path d="M6 15h8.5a3.2 3.2 0 0 0 .3-6.4A4.6 4.6 0 0 0 6 8.4 3.3 3.3 0 0 0 6 15z"/></svg></button>
            <button type="button" role="radio" data-luz="dia" aria-label="Día"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="3.4"/><path d="M10 2v2.2M10 15.8V18M2 10h2.2M15.8 10H18M4.3 4.3l1.6 1.6M14.1 14.1l1.6 1.6M4.3 15.7l1.6-1.6M14.1 5.9l1.6-1.6"/></svg></button>
            <button type="button" role="radio" data-luz="tarde" aria-label="Atardecer"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="6.5"/><path d="M10 3.5v13A6.5 6.5 0 0 1 10 3.5z" class="lleno"/></svg></button>
            <button type="button" role="radio" data-luz="noche" aria-label="Noche"><svg viewBox="0 0 20 20"><path d="M15.5 12.6A6.6 6.6 0 0 1 7.4 4.5a6.6 6.6 0 1 0 8.1 8.1z"/></svg></button>
          </div>
          <button type="button" class="sala-boton primario" data-compartir>Compartir</button>
        </div>
      </header>
      <div class="sala-lienzo">
        <canvas aria-label="Sala de lectura con tus libros. Pasa el cursor sobre un lomo para ver el libro."></canvas>
        <div class="sala-tarjeta" hidden></div>
        <div class="sala-zoom">
          <button type="button" data-z="1.35" aria-label="Acercar">+</button>
          <button type="button" data-z="0.74" aria-label="Alejar">−</button>
          <button type="button" data-z="0" aria-label="Ver toda la sala"><svg viewBox="0 0 20 20"><path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4"/></svg></button>
          <button type="button" data-foto aria-label="Guardar imagen"><svg viewBox="0 0 20 20"><path d="M3 6.5h3l1.5-2h5l1.5 2h3v9H3z"/><circle cx="10" cy="11" r="3"/></svg></button>
        </div>
      </div>
    </div>`;

  const lienzo = $('canvas', raiz);
  const ctx = lienzo.getContext('2d');
  const tarjeta = $('.sala-tarjeta', raiz);
  let luz = leerLuz();
  let vista = { k: 10, x: 0, y: 0 };
  let escena = null; // geometría calculada
  let golpes = []; // polígonos de lomos para saber qué libro está bajo el cursor
  let encima = null;
  let pendiente = 0;
  const imagenes = new Map();

  function leerLuz() {
    try {
      return localStorage.getItem('librero.luz') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'noche' : 'dia');
    } catch {
      return 'dia';
    }
  }

  // ---------------------------------------------------------- escena
  function construir(lista) {
    const orden = new Map(datos.repisas.map((r, i) => [r.id, i]));
    const visibles = lista.filter((b) => b.estado !== 'descartado');
    const porLeer = visibles.filter((b) => b.estado === 'por-leer');
    const escritorio = porLeer.slice(0, 4);
    const enEscritorio = new Set(escritorio.map((b) => b.id));
    const estantes = visibles
      .filter((b) => !enEscritorio.has(b.id))
      .sort((a, b) => (orden.get(a.repisa) ?? 99) - (orden.get(b.repisa) ?? 99) || (a.ubicacion?.posicion ?? 0) - (b.ubicacion?.posicion ?? 0));
    const donar = lista.filter((b) => b.estado === 'descartado');

    // Medidas en decímetros. La sala mide 6 × 4.6 m.
    const W = 60, D = 46, H = 34;
    const muros = [
      { eje: 'x', desde: 3, hasta: W - 3 }, // muro del fondo derecho (y = 0)
      { eje: 'y', desde: 3, hasta: 25 }, // muro del fondo izquierdo (x = 0), antes de la ventana
    ];
    const libros = estantes.map((b) => {
      const g = geometria(b, 1);
      return { b, t: Math.max(0.3, (g.grosor / 10) * 1.7), h: Math.min(3.3, (g.alto / 100) * 1.25) };
    });
    const largoTotal = libros.reduce((s, l) => s + l.t + 0.02, 0) + 1.2 * datos.repisas.length;
    const capacidad = muros.reduce((s, m) => s + (m.hasta - m.desde), 0);
    const niveles = Math.min(10, Math.max(4, Math.ceil(largoTotal / capacidad / 0.92)));
    const altoNivel = 3.9;
    const colocados = [];
    let muro = 0, nivel = 0, pos = muros[0].desde + 0.4, repAnterior = null;
    for (const l of libros) {
      if (repAnterior && l.b.repisa !== repAnterior) pos += 1.2; // hueco entre repisas
      repAnterior = l.b.repisa;
      if (pos + l.t > muros[muro].hasta - 0.4) {
        nivel++;
        pos = muros[muro].desde + 0.4;
        if (nivel >= niveles) {
          muro = Math.min(1, muro + 1);
          nivel = 0;
          pos = muros[muro].desde + 0.4;
        }
      }
      colocados.push({ ...l, muro, nivel, pos, z: 0.8 + nivel * altoNivel });
      pos += l.t + 0.02;
    }
    return { W, D, H, muros, niveles, altoNivel, colocados, escritorio, porLeer, donar, total: lista.length };
  }

  // ---------------------------------------------------------- proyección
  const P = (x, y, z) => [(x - y) * C * vista.k + vista.x, (x + y) * S * vista.k - z * vista.k + vista.y];
  function poli(puntos, relleno, trazo) {
    ctx.beginPath();
    puntos.forEach(([x, y, z], i) => {
      const [sx, sy] = P(x, y, z);
      i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
    });
    ctx.closePath();
    if (relleno) {
      ctx.fillStyle = relleno;
      ctx.fill();
    }
    if (trazo) {
      ctx.strokeStyle = trazo;
      ctx.lineWidth = Math.max(0.5, vista.k * 0.04);
      ctx.stroke();
    }
  }
  // Caja con sus tres caras visibles: arriba, frente izquierdo (+y) y frente derecho (+x).
  function caja(x, y, z, dx, dy, dz, [arriba, izq, der], trazo) {
    poli([[x, y + dy, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]], izq, trazo);
    poli([[x + dx, y, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x + dx, y, z + dz]], der, trazo);
    poli([[x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]], arriba, trazo);
  }
  const mezclar = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
    return `rgb(${c.join(',')})`;
  };

  // ---------------------------------------------------------- dibujo
  function dibujar() {
    pendiente = 0;
    if (!escena || raiz.hidden) return;
    const dpr = devicePixelRatio || 1;
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (lienzo.width !== Math.round(w * dpr)) {
      lienzo.width = Math.round(w * dpr);
      lienzo.height = Math.round(h * dpr);
    }
    const L = LUCES[luz];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = L.cielo;
    ctx.fillRect(0, 0, w, h);
    golpes = [];
    const { W, D, H } = escena;

    // Terreno y árboles del fondo.
    const m = 9;
    caja(-m, -m, -2.6, W + m * 2, D + m * 2, 2.6, ['#9DB57A', '#7A5A3C', '#5E4430']);
    for (const [tx, ty, alto] of [[-5, 10, 52], [-6, 30, 46], [6, -6, 50], [20, -7, 58], [36, -6, 48], [52, -5, 55], [-4, -4, 62]]) arbol(tx, ty, alto, L.arbol);

    // Piso y muros.
    caja(0, 0, -1.2, W, D, 1.2, ['#8A8780', '#6B5137', '#58412C']);
    poli([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]], '#EFE7DA');
    poli([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]], '#E2D8C7');
    caja(-1, -1, 0, W + 1, 1, H + 0.6, ['#5B4330', '#EDE4D4', '#5B4330']);
    caja(-1, 0, 0, 1, D, H + 0.6, ['#5B4330', '#D9CDB9', '#E2D8C7']);
    // Piso de madera bajo la zona de lectura.
    poli([[10, 16, 0.01], [W - 4, 16, 0.01], [W - 4, D - 2, 0.01], [10, D - 2, 0.01]], '#D7A86E');
    ctx.strokeStyle = '#C08F57';
    ctx.lineWidth = Math.max(0.5, vista.k * 0.05);
    for (let x = 12; x < W - 4; x += 2.4) {
      const [a, b] = [P(x, 16, 0.02), P(x, D - 2, 0.02)];
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
    }

    ventana(L);
    estantes();
    muebles(L);
    lamparas(L);

    if (L.velo) {
      ctx.globalCompositeOperation = luz === 'noche' ? 'multiply' : 'source-over';
      ctx.globalAlpha = luz === 'noche' ? 1 : L.velo[1];
      ctx.fillStyle = luz === 'noche' ? '#5A6A9E' : L.velo[0];
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (L.lamparas) brillos();
  }

  function arbol(x, y, alto, [claro, oscuro]) {
    const [bx, by] = P(x, y, 0);
    const k = vista.k;
    ctx.fillStyle = '#5B3B26';
    ctx.fillRect(bx - 0.9 * k, by - alto * 0.3 * k, 1.8 * k, alto * 0.3 * k);
    for (let i = 0; i < 4; i++) {
      const base = by - alto * (0.22 + i * 0.18) * k;
      const ancho = (9 - i * 1.8) * k;
      const punta = base - alto * 0.3 * k;
      ctx.fillStyle = claro;
      ctx.beginPath();
      ctx.moveTo(bx, punta);
      ctx.lineTo(bx - ancho, base);
      ctx.lineTo(bx, base - 1.2 * k);
      ctx.fill();
      ctx.fillStyle = oscuro;
      ctx.beginPath();
      ctx.moveTo(bx, punta);
      ctx.lineTo(bx + ancho, base);
      ctx.lineTo(bx, base - 1.2 * k);
      ctx.fill();
    }
  }

  function ventana(L) {
    const y0 = 27, y1 = 44, z0 = 3, z1 = 31;
    poli([[0.05, y0, z0], [0.05, y1, z0], [0.05, y1, z1], [0.05, y0, z1]], L.vidrio);
    // Árboles detrás del vidrio.
    ctx.save();
    ctx.beginPath();
    [[0.06, y0, z0], [0.06, y1, z0], [0.06, y1, z1], [0.06, y0, z1]].forEach(([x, y, z], i) => (i ? ctx.lineTo(...P(x, y, z)) : ctx.moveTo(...P(x, y, z))));
    ctx.clip();
    for (const yy of [30, 37, 42]) {
      ctx.fillStyle = L.arbol[1];
      const [ax, ay] = P(0.06, yy, z0);
      ctx.beginPath();
      ctx.moveTo(ax, ay - 30 * vista.k);
      ctx.lineTo(ax - 4 * vista.k, ay);
      ctx.lineTo(ax + 4 * vista.k, ay);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#3E2C1E';
    ctx.lineWidth = Math.max(1, vista.k * 0.35);
    for (let y = y0; y <= y1 + 0.01; y += (y1 - y0) / 4) linea([0.1, y, z0], [0.1, y, z1]);
    for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 6) linea([0.1, y0, z], [0.1, y1, z]);
    // Enredadera.
    for (let i = 0; i < 46; i++) {
      const y = y0 + azar(i, 'hy') * (y1 - y0), z = z0 + azar(i, 'hz') * (z1 - z0);
      const [sx, sy] = P(0.2, y, z);
      ctx.fillStyle = i % 3 ? '#5E8F3E' : '#7FB65A';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 0.7 * vista.k, 0.4 * vista.k, azar(i, 'r') * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function linea(a, b) {
    ctx.beginPath();
    ctx.moveTo(...P(...a));
    ctx.lineTo(...P(...b));
    ctx.stroke();
  }

  function estantes() {
    const { muros, niveles, altoNivel, colocados } = escena;
    const prof = 2.8;
    const madera = ['#E9E1D3', '#CDBFA8', '#B9A88E'];
    // Muro izquierdo (x = 0): libros a lo largo de y, lomo hacia +x.
    const m1 = muros[1];
    caja(0, m1.desde - 0.6, 0, prof, 0.6, niveles * altoNivel + 1, madera);
    for (let n = 0; n <= niveles; n++) caja(0, m1.desde, n * altoNivel, prof, m1.hasta - m1.desde, 0.6, madera);
    for (const l of colocados.filter((c) => c.muro === 1).sort((a, b) => a.nivel - b.nivel || a.pos - b.pos)) libro(l, 1, prof);
    caja(0, m1.hasta, 0, prof, 0.6, niveles * altoNivel + 1, madera);
    // Muro del fondo (y = 0): libros a lo largo de x, lomo hacia +y.
    const m0 = muros[0];
    caja(m0.desde - 0.6, 0, 0, 0.6, prof, niveles * altoNivel + 1, madera);
    for (let n = 0; n < niveles; n++) {
      caja(m0.desde, 0, n * altoNivel, m0.hasta - m0.desde, prof, 0.6, madera);
      for (const l of colocados.filter((c) => c.muro === 0 && c.nivel === n).sort((a, b) => a.pos - b.pos)) libro(l, 0, prof);
    }
    caja(m0.desde, 0, niveles * altoNivel, m0.hasta - m0.desde, prof, 0.6, madera);
    caja(m0.hasta, 0, 0, 0.6, prof, niveles * altoNivel + 1, madera);
    // El gato duerme sobre el estante izquierdo.
    gato(1.4, m1.hasta - 3, niveles * altoNivel + 0.6);
    // Planta en la esquina.
    maceta(m0.hasta + 1.6, 3.5);
  }

  function libro(l, muro, prof) {
    const { b, t, h } = l;
    const sacado = encima === b.id ? 0.9 : 0;
    const c = colores(b);
    const d = prof - 0.4;
    const z = l.z;
    const frente = c.fondo, arriba = mezclar(c.fondo, 0.35), lado = mezclar(c.fondo, -0.32);
    let caraLomo;
    if (muro === 0) {
      const x = l.pos, y = 0.3 + sacado;
      caja(x, y, z, t, d, h, [arriba, frente, lado]);
      caraLomo = [[x, y + d, z + h], [x + t, y + d, z + h], [x + t, y + d, z], [x, y + d, z]];
      texto(b, c, P(x, y + d, z + h), [C, S], t, h);
    } else {
      const y = l.pos, x = 0.3 + sacado;
      caja(x, y, z, d, t, h, [arriba, lado, frente]);
      caraLomo = [[x + d, y + t, z + h], [x + d, y, z + h], [x + d, y, z], [x + d, y + t, z]];
      texto(b, c, P(x + d, y + t, z + h), [C, -S], t, h);
    }
    golpes.push({ id: b.id, pts: caraLomo.map((p) => P(...p)) });
  }

  // Título sobre la cara del lomo (transformación afín de la cara).
  function texto(b, c, [ox, oy], [ux, uy], t, h) {
    const k = vista.k;
    if (t * k < 7) {
      // Muy lejos: solo una franja de etiqueta, como en las fotos de un librero.
      ctx.save();
      ctx.setTransform(ux * k * devicePixelRatio, uy * k * devicePixelRatio, 0, k * devicePixelRatio, ox * devicePixelRatio, oy * devicePixelRatio);
      ctx.fillStyle = c.texto;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(t * 0.2, h * 0.62, t * 0.6, h * 0.12);
      ctx.restore();
      return;
    }
    const [ff, fw, fst, tt] = fuente(b);
    const s = 20; // trabajamos en una escala 20× para que el texto sea nítido
    ctx.save();
    ctx.setTransform((ux * k * devicePixelRatio) / s, (uy * k * devicePixelRatio) / s, 0, (k * devicePixelRatio) / s, ox * devicePixelRatio, oy * devicePixelRatio);
    ctx.beginPath();
    ctx.rect(0, 0, t * s, h * s);
    ctx.clip();
    ctx.fillStyle = c.acento;
    ctx.fillRect(0, h * s * 0.82, t * s, h * s * 0.06);
    const es = esEspanol(b.titulo);
    ctx.translate((t * s) / 2, h * s * (es ? 0.78 : 0.06));
    ctx.rotate(es ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillStyle = c.texto;
    ctx.textBaseline = 'middle';
    const fs = Math.min(t * s * 0.5, 14);
    ctx.font = `${fst === 'italic' ? 'italic ' : ''}${fw} ${fs}px ${ff}`;
    let txt = tt === 'uppercase' ? b.titulo.toUpperCase() : b.titulo;
    const max = h * s * 0.7;
    while (ctx.measureText(txt).width > max && txt.length > 3) txt = txt.slice(0, -2).trimEnd() + '…';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  function gato(x, y, z) {
    const [cx, cy] = P(x, y, z);
    const k = vista.k;
    ctx.fillStyle = '#E8913A';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.9 * k, 2.4 * k, 1.2 * k, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 2.1 * k, cy - 1.6 * k, 0.95 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 2.9 * k, cy - 2.2 * k);
    ctx.lineTo(cx - 2.6 * k, cy - 3.2 * k);
    ctx.lineTo(cx - 2.1 * k, cy - 2.5 * k);
    ctx.lineTo(cx - 1.7 * k, cy - 3.2 * k);
    ctx.lineTo(cx - 1.4 * k, cy - 2.2 * k);
    ctx.fill();
    ctx.strokeStyle = '#C8702A';
    ctx.lineWidth = 0.45 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 2.1 * k, cy - 0.6 * k);
    ctx.quadraticCurveTo(cx + 3.6 * k, cy - 0.2 * k, cx + 3 * k, cy - 2 * k);
    ctx.stroke();
    ctx.lineWidth = 0.18 * k;
    for (const dx of [-0.4, 0.4, 1.2]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * k, cy - 1.9 * k);
      ctx.lineTo(cx + (dx - 0.3) * k, cy - 0.5 * k);
      ctx.stroke();
    }
  }

  function maceta(x, y) {
    caja(x - 1.4, y - 1.4, 0, 2.8, 2.8, 3.2, ['#D9774A', '#C2603A', '#A04C2C']);
    const [bx, by] = P(x, y, 3.2);
    const k = vista.k;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.28;
      ctx.fillStyle = i % 2 ? '#3F7A3A' : '#5B9A4A';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + Math.cos(a) * 5 * k + 1.5 * k, by + Math.sin(a) * 5 * k, bx + Math.cos(a) * 9 * k, by + Math.sin(a) * 10 * k);
      ctx.quadraticCurveTo(bx + Math.cos(a) * 5 * k - 1.5 * k, by + Math.sin(a) * 5 * k, bx, by);
      ctx.fill();
    }
  }

  function muebles(L) {
    const { D, escritorio, porLeer, donar } = escena;
    const madera = ['#C98F55', '#A9713F', '#8A5A31'];
    const oscura = ['#8C5A36', '#6F4428', '#57341E'];
    // Silla del fondo y estantería baja junto a la ventana.
    caja(30, 24, 0, 4, 4, 4.2, oscura);
    caja(30, 23.4, 4.2, 4, 0.8, 5, oscura);
    // Escritorio.
    const ex = 16, ey = 26, ew = 18, ed = 9, ez = 7.2;
    for (const [px, py] of [[ex + 0.6, ey + 0.6], [ex + ew - 1.4, ey + 0.6], [ex + 0.6, ey + ed - 1.4], [ex + ew - 1.4, ey + ed - 1.4]]) caja(px, py, 0, 0.8, 0.8, ez, oscura);
    caja(ex, ey, ez, ew, ed, 0.8, madera);
    // Taza.
    caja(ex + 3, ey + 2, ez + 0.8, 1.6, 1.6, 2, ['#5A3A22', '#F4EFE6', '#DCD3C4']);
    // Libros por leer sobre el escritorio, con portada.
    escritorio.forEach((b, i) => {
      const bx = ex + 6 + i * 3.1, by = ey + 1.6 + (i % 2) * 1.2;
      const c = colores(b);
      caja(bx, by, ez + 0.8, 2.6, 3.8, 0.6, [c.fondo, '#F3EEE2', '#E1D8C6']);
      portadaPlana(b, bx, by, ez + 1.41, 2.6, 3.8);
      golpes.push({ id: b.id, pts: [[bx, by, ez + 1.4], [bx + 2.6, by, ez + 1.4], [bx + 2.6, by + 3.8, ez + 1.4], [bx, by + 3.8, ez + 1.4]].map((p) => P(...p)) });
    });
    // Nota adhesiva.
    const resto = porLeer.length - escritorio.length;
    poli([[ex + 12.6, ey + 5.2, ez + 0.82], [ex + 16.6, ey + 5.2, ez + 0.82], [ex + 16.6, ey + 8.4, ez + 0.82], [ex + 12.6, ey + 8.4, ez + 0.82]], '#F7E27A');
    notaTexto(resto > 0 ? `+${resto} en espera` : escritorio.length ? '¡a leer!' : 'marca libros «por leer»', ex + 12.9, ey + 5.6, ez + 0.83);
    // Lectora en su silla.
    caja(ex + 6, ey + ed + 0.6, 0, 4.4, 4, 4.4, oscura);
    caja(ex + 6, ey + ed + 4, 4.4, 4.4, 0.8, 6, oscura);
    caja(ex + 6.6, ey + ed + 0.8, 4.4, 3.2, 3.2, 6.2, ['#A9C2A0', '#94AE8C', '#7D9876']);
    caja(ex + 6.2, ey + ed - 1.8, 8.6, 1.1, 3.4, 1, ['#A9C2A0', '#94AE8C', '#7D9876']);
    caja(ex + 8.9, ey + ed - 1.8, 8.6, 1.1, 3.4, 1, ['#A9C2A0', '#94AE8C', '#7D9876']);
    const [hx, hy] = P(ex + 8.2, ey + ed + 2.4, 12.4);
    ctx.fillStyle = '#E2B494';
    ctx.beginPath();
    ctx.arc(hx, hy, 1.7 * vista.k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3B2A20';
    ctx.beginPath();
    ctx.arc(hx + 0.3 * vista.k, hy - 0.5 * vista.k, 1.75 * vista.k, Math.PI * 0.9, Math.PI * 2.15);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + 0.5 * vista.k, hy - 2.1 * vista.k, 1 * vista.k, 0, Math.PI * 2);
    ctx.fill();
    // Carrito con libros cerca de la entrada.
    caja(40, D - 9, 0, 7, 3.6, 0.6, madera);
    caja(40, D - 9, 3.2, 7, 3.6, 0.6, madera);
    caja(40, D - 9, 0, 0.5, 0.5, 4, oscura);
    caja(46.5, D - 5.9, 0, 0.5, 0.5, 4, oscura);
    for (let i = 0; i < 9; i++) {
      const b = datos.libros[Math.floor(azar(i, 'carro') * datos.libros.length)];
      const c = b ? colores(b) : { fondo: '#C93756' };
      caja(40.4 + i * 0.7, D - 8.4, 3.8, 0.6, 2.4, 2.4 + azar(i, 'h') * 0.8, [mezclar(c.fondo, 0.35), c.fondo, mezclar(c.fondo, -0.3)]);
    }
    // Caja de libros para donar (descartados).
    if (donar.length) {
      caja(50, D - 15, 0, 5, 4, 3.4, ['#5A3A1C', '#D9A963', '#C08B4A']);
      donar.slice(0, 6).forEach((b, i) => {
        const c = colores(b);
        caja(50.5 + i * 0.7, D - 14.4, 1.4, 0.6, 2.8, 2.8, [mezclar(c.fondo, 0.35), c.fondo, mezclar(c.fondo, -0.3)]);
        golpes.push({ id: b.id, pts: [[50.5 + i * 0.7, D - 11.6, 4.2], [51.1 + i * 0.7, D - 11.6, 4.2], [51.1 + i * 0.7, D - 11.6, 1.4], [50.5 + i * 0.7, D - 11.6, 1.4]].map((p) => P(...p)) });
      });
      notaTexto(`para donar · ${donar.length}`, 50.4, D - 11, 1.2, '#5A3A1C', 0.9);
    }
    // Letrero.
    caja(-5, D - 3, 0, 0.6, 0.6, 5, oscura);
    caja(-5.4, D - 7, 3.2, 0.6, 9, 3.4, ['#A0683A', '#7C4D2A', '#B8804A']);
    letrero(-4.8, D + 2, 6.6);
  }

  function notaTexto(txt, x, y, z, color = '#5A4A1A', escala = 1) {
    const [ox, oy] = P(x, y, z);
    const k = vista.k * devicePixelRatio;
    ctx.save();
    ctx.setTransform((C * k) / 20, (S * k) / 20, (-C * k) / 20, (S * k) / 20, ox * devicePixelRatio, oy * devicePixelRatio);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = color;
    ctx.font = `500 ${13 * escala}px Caveat, cursive`;
    ctx.textBaseline = 'top';
    const palabras = txt.split(' ');
    let linea = '', yy = -70;
    for (const p of palabras) {
      if (ctx.measureText(`${linea} ${p}`).width > 64 && linea) {
        ctx.fillText(linea, 4, yy);
        linea = p;
        yy += 14;
      } else linea = linea ? `${linea} ${p}` : p;
    }
    ctx.fillText(linea, 4, yy);
    ctx.restore();
  }

  function letrero(x, y, z) {
    const [ox, oy] = P(x, y, z);
    const k = vista.k * devicePixelRatio;
    ctx.save();
    ctx.setTransform((C * k) / 20, (-S * k) / 20, 0, k / 20, ox * devicePixelRatio, oy * devicePixelRatio);
    ctx.fillStyle = '#FBEFD8';
    ctx.font = 'italic 600 20px "Playfair Display", serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Librero de ${NOMBRE}`, 6, 34);
    ctx.restore();
  }

  function portadaPlana(b, x, y, z, w, d) {
    if (!b.portada) return;
    let img = imagenes.get(b.portada);
    if (!img) {
      img = new Image();
      img.src = b.portada;
      img.onload = () => pedir();
      imagenes.set(b.portada, img);
      return;
    }
    if (!img.complete || !img.naturalWidth) return;
    const [ox, oy] = P(x, y + d, z);
    const k = vista.k * devicePixelRatio;
    ctx.save();
    // u: a lo largo de x (ancho de la portada) · v: hacia -y (alto de la portada).
    ctx.setTransform((C * k * w) / img.naturalWidth, (S * k * w) / img.naturalWidth, (C * k * d) / img.naturalHeight, (-S * k * d) / img.naturalHeight, ox * devicePixelRatio, oy * devicePixelRatio);
    ctx.drawImage(img, 0, -img.naturalHeight);
    ctx.restore();
  }

  function lamparas(L) {
    for (const [x, y] of [[21, 30], [30, 34]]) {
      const [a, b] = [P(x, y, escena.H), P(x, y, 17)];
      ctx.strokeStyle = '#3E2C1E';
      ctx.lineWidth = Math.max(0.6, vista.k * 0.08);
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      ctx.fillStyle = L.lamparas ? '#FFF4D6' : '#F4EEE2';
      ctx.beginPath();
      ctx.ellipse(b[0], b[1] + 1.2 * vista.k, 2.4 * vista.k, 1.6 * vista.k, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = L.lamparas ? '#FFE7A3' : '#DED6C6';
      ctx.beginPath();
      ctx.ellipse(b[0], b[1] + 1.2 * vista.k, 2.4 * vista.k, 0.7 * vista.k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function brillos() {
    ctx.globalCompositeOperation = 'screen';
    for (const [x, y] of [[21, 30], [30, 34]]) {
      const [cx, cy] = P(x, y, 15);
      const r = 16 * vista.k;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, luz === 'noche' ? 'rgba(255,200,120,.55)' : 'rgba(255,200,120,.28)');
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------- vista y zoom
  function encuadrar() {
    if (!escena) return;
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    const { W, D } = escena;
    const xs = [P0(-9, D + 9, 0), P0(W + 9, -9, 0), P0(-2, -2, 48), P0(W + 9, D + 9, -3)];
    const minX = Math.min(...xs.map((p) => p[0])), maxX = Math.max(...xs.map((p) => p[0]));
    const minY = Math.min(...xs.map((p) => p[1])), maxY = Math.max(...xs.map((p) => p[1]));
    const k = Math.min(w / (maxX - minX), h / (maxY - minY)) * 1.02;
    vista = { k, x: w / 2 - ((minX + maxX) / 2) * k, y: h / 2 - ((minY + maxY) / 2) * k };
    vista.min = k * 0.9;
  }
  const P0 = (x, y, z) => [(x - y) * C, (x + y) * S - z];

  function zoom(f, cx, cy, suave) {
    const objetivo = Math.min(vista.min * 14, Math.max(vista.min, vista.k * f));
    const aplicar = (k) => {
      const r = k / vista.k;
      vista.x = cx - (cx - vista.x) * r;
      vista.y = cy - (cy - vista.y) * r;
      vista.k = k;
      pedir();
    };
    if (!suave || matchMedia('(prefers-reduced-motion: reduce)').matches) return aplicar(objetivo);
    const k0 = vista.k, t0 = performance.now();
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / 320);
      const e = 1 - Math.pow(1 - p, 3);
      aplicar(k0 + (objetivo - k0) * e);
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  function pedir() {
    if (!pendiente) pendiente = requestAnimationFrame(dibujar);
  }

  const dentro = (pts, x, y) => {
    let s = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s;
    }
    return s;
  };
  function libroEn(ev) {
    const r = lienzo.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    for (let i = golpes.length - 1; i >= 0; i--) if (dentro(golpes[i].pts, x, y)) return golpes[i].id;
    return null;
  }

  function mostrarTarjeta(id, ev) {
    const b = datos.porId.get(id);
    if (!b) return (tarjeta.hidden = true);
    tarjeta.innerHTML = `<strong>${esc(b.titulo)}</strong><span>${esc(apellido(b.autor) ? b.autor.split(',')[0] : '')}${b.anio ? ` · ${b.anio}` : ''} ${iconosCalificacion(b.calificacion, 'mini')}</span>`;
    tarjeta.hidden = false;
    const r = lienzo.getBoundingClientRect();
    const x = Math.min(ev.clientX - r.left + 14, r.width - tarjeta.offsetWidth - 8);
    const y = Math.max(8, ev.clientY - r.top - tarjeta.offsetHeight - 14);
    tarjeta.style.transform = `translate(${x}px, ${y}px)`;
  }

  let arrastre = null;
  lienzo.addEventListener('pointerdown', (e) => {
    arrastre = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y, movido: false };
    lienzo.setPointerCapture(e.pointerId);
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (arrastre) {
      const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) arrastre.movido = true;
      if (arrastre.movido) {
        vista.x = arrastre.vx + dx;
        vista.y = arrastre.vy + dy;
        tarjeta.hidden = true;
        lienzo.classList.add('arrastrando');
        return pedir();
      }
    }
    const id = libroEn(e);
    lienzo.style.cursor = id ? 'pointer' : 'grab';
    if (id !== encima) {
      encima = id;
      pedir();
    }
    if (id) mostrarTarjeta(id, e);
    else tarjeta.hidden = true;
  });
  lienzo.addEventListener('pointerup', (e) => {
    const fue = arrastre?.movido;
    arrastre = null;
    lienzo.classList.remove('arrastrando');
    if (!fue) {
      const id = libroEn(e);
      if (id) {
        tarjeta.hidden = true;
        abrirFicha(id, null);
      }
    }
  });
  lienzo.addEventListener('pointerleave', () => {
    tarjeta.hidden = true;
    if (encima) {
      encima = null;
      pedir();
    }
  });
  lienzo.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = lienzo.getBoundingClientRect();
    zoom(Math.exp(-e.deltaY * 0.0018), e.clientX - r.left, e.clientY - r.top, false);
  }, { passive: false });

  raiz.addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]');
    if (z) {
      const f = Number(z.dataset.z);
      if (!f) {
        encuadrar();
        return pedir();
      }
      return zoom(f, lienzo.clientWidth / 2, lienzo.clientHeight / 2, true);
    }
    const l = e.target.closest('[data-luz]');
    if (l) {
      luz = l.dataset.luz;
      try {
        localStorage.setItem('librero.luz', luz);
      } catch {
        /* sin almacenamiento */
      }
      marcarLuz();
      return pedir();
    }
    if (e.target.closest('[data-foto]')) {
      lienzo.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: 'sala-de-lectura.png' });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      });
      return;
    }
    if (e.target.closest('[data-compartir]')) {
      const url = `${location.origin}${location.pathname}#/sala`;
      navigator.clipboard?.writeText(url).then(() => emitirAviso('Enlace copiado'), () => emitirAviso(url));
    }
  });

  function marcarLuz() {
    $$('[data-luz]', raiz).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.luz === luz)));
    raiz.querySelector('.sala').dataset.luz = luz;
  }

  addEventListener('resize', debounce(() => {
    if (raiz.hidden) return;
    encuadrar();
    pedir();
  }, 150));
  document.fonts?.ready.then(() => pedir());

  marcarLuz();
  return {
    render(lista) {
      escena = construir(lista);
      const porLeer = escena.porLeer.length;
      $('.sala-cifras', raiz).innerHTML = [
        `${escena.escritorio.length} en el escritorio`,
        `${escena.colocados.length.toLocaleString('es-MX')} en los estantes`,
        `${Math.max(0, porLeer - escena.escritorio.length)} en espera`,
        escena.donar.length ? `${escena.donar.length} para donar` : null,
      ].filter(Boolean).join(' · ');
      requestAnimationFrame(() => {
        encuadrar();
        pedir();
      });
    },
    salir() {
      tarjeta.hidden = true;
    },
  };
}

