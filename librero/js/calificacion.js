// Calificación celeste: basura espacial → asteroides → lunas → planetas →
// estrellas → galaxia. Asteroides, lunas, planetas y estrellas admiten
// medios (½ a 5); la basura espacial y la galaxia solo enteros.
// En total 42 escalones.

import { usar } from './iconos.js';
import { $, animar, CURVA } from './util.js';
import { abrirMorph, cerrarMorph } from './morph.js';
import { tic, microclic, sonar } from './sonidos.js';

export const NIVELES = [
  { id: 'basura', nombre: 'Basura espacial', uno: 'basura espacial', varios: 'basura espacial', max: 1, medios: false },
  { id: 'asteroide', nombre: 'Asteroides', uno: 'asteroide', varios: 'asteroides', max: 5, medios: true },
  { id: 'luna', nombre: 'Lunas', uno: 'luna', varios: 'lunas', max: 5, medios: true },
  { id: 'planeta', nombre: 'Planetas', uno: 'planeta', varios: 'planetas', max: 5, medios: true },
  { id: 'estrella', nombre: 'Estrellas', uno: 'estrella', varios: 'estrellas', max: 5, medios: true },
  { id: 'galaxia', nombre: 'Galaxia', uno: 'galaxia', varios: 'galaxias', max: 1, medios: false },
];
const POR_ID = Object.fromEntries(NIVELES.map((n) => [n.id, n]));

// Todos los escalones en orden, del peor al mejor.
export const ESCALONES = NIVELES.flatMap((n) =>
  n.medios
    ? Array.from({ length: n.max * 2 }, (_, i) => ({ nivel: n.id, cantidad: (i + 1) / 2 }))
    : [{ nivel: n.id, cantidad: 1 }]
).map((e, i) => ({ ...e, puntos: i + 1 }));

const FRASES = {
  basura: ['Chatarra orbital. Que la recoja la NASA.'],
  asteroide: [
    'Una piedrita que pasó sin pena ni gloria.',
    'Polvo cósmico con pretensiones.',
    'Un pedrusco simpático, pero pedrusco.',
    'Casi tiene órbita propia.',
    'El asteroide más digno del cinturón.',
  ],
  luna: [
    'Ilumina poquito, pero ilumina.',
    'Cuarto creciente: va agarrando ritmo.',
    'Buena compañía para una noche larga.',
    'Casi llena. Ya aúllan los lobos.',
    'Luna llena: mareas garantizadas.',
  ],
  planeta: [
    'Planeta enano, como Plutón. Lo queremos igual.',
    'Habitable, si llevas abrigo.',
    'Atmósfera respirable y paisajes notables.',
    'Un mundo al que volvería de vacaciones.',
    'Un planeta entero para mudarse a vivir.',
  ],
  estrella: [
    'Una estrella tímida en la periferia.',
    'Brilla aunque haya contaminación lumínica.',
    'Se ve a simple vista desde la ciudad.',
    'Constelación de favoritos.',
    'Supernova: deslumbra y deja huella.',
  ],
  galaxia: ['Una galaxia entera. No hay escala que alcance.'],
};

export function normalizar(cal) {
  if (!cal?.nivel || !POR_ID[cal.nivel]) return null;
  const n = POR_ID[cal.nivel];
  let c = Math.round(Number(cal.cantidad || 1) * 2) / 2;
  if (!n.medios) c = 1;
  c = Math.min(Math.max(c, n.medios ? 0.5 : 1), n.max);
  return ESCALONES.find((e) => e.nivel === cal.nivel && e.cantidad === c) || null;
}

export function crearCalificacion(nivel, cantidad = 1) {
  return normalizar({ nivel, cantidad });
}

const numero = (c) => (c % 1 ? `${Math.floor(c) || ''}½` : String(c));

export function textoCalificacion(cal) {
  cal = normalizar(cal);
  if (!cal) return 'Sin calificar';
  const n = POR_ID[cal.nivel];
  if (!n.medios) return n.id === 'galaxia' ? 'Una galaxia' : 'Basura espacial';
  return `${numero(cal.cantidad)} ${cal.cantidad > 1 ? n.varios : n.uno}`;
}

export function fraseCalificacion(cal) {
  cal = normalizar(cal);
  if (!cal) return 'Toca para calificar este libro.';
  const lista = FRASES[cal.nivel];
  return lista[Math.min(lista.length - 1, Math.ceil(cal.cantidad) - 1)];
}

// Iconos de una calificación (con medio icono cuando corresponde).
export function iconosCalificacion(cal, clase = '') {
  cal = normalizar(cal);
  if (!cal) return '';
  const enteros = Math.floor(cal.cantidad);
  let html = '';
  for (let i = 0; i < enteros; i++) html += usar(cal.nivel, clase);
  if (cal.cantidad % 1) html += usar(`${cal.nivel}-medio`, clase);
  return html;
}

export function miniCalificacion(cal) {
  if (!normalizar(cal)) return '';
  return `<span class="mini-cal" title="${textoCalificacion(cal)}">${iconosCalificacion(cal, 'mini')}</span>`;
}

// ------------------------------------------------------------------ selector
// Ventana flotante con un deslizador de 42 escalones y vista previa en vivo.
let abierto = null;

export function abrirSelectorCalificacion(ancla, valor, alCambiar) {
  cerrarSelector();
  let actual = normalizar(valor);
  const caja = document.createElement('div');
  caja.className = 'selector-cal';
  caja.setAttribute('role', 'dialog');
  caja.setAttribute('aria-label', 'Calificar libro');
  const marcas = NIVELES.map((n) => {
    const desde = ESCALONES.find((e) => e.nivel === n.id).puntos;
    const hasta = ESCALONES.filter((e) => e.nivel === n.id).at(-1).puntos;
    const centro = ((desde + hasta) / 2 - 1) / (ESCALONES.length - 1);
    return `<button type="button" class="sc-marca" data-nivel="${n.id}" style="--x:${centro}" aria-label="${n.nombre}">${usar(n.id)}</button>`;
  }).join('');
  caja.innerHTML = `
    <div class="sc-previa"><div class="sc-iconos" aria-hidden="true"></div>
      <p class="sc-texto"></p><p class="sc-frase"></p></div>
    <div class="sc-pista">
      <input type="range" min="0" max="${ESCALONES.length}" step="1" value="${actual?.puntos || 0}" aria-label="Calificación, de basura espacial a galaxia">
      <div class="sc-marcas">${marcas}</div>
    </div>
    <div class="sc-pie"><button type="button" class="enlace" data-quitar>Quitar calificación</button><button type="button" class="boton chico primario" data-listo>Listo</button></div>`;
  ancla.closest('.ficha, body').append(caja);
  const r = ancla.getBoundingClientRect();
  const base = caja.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 };
  caja.style.top = `${r.bottom - base.top + 10}px`;
  caja.style.right = `${Math.max(12, (caja.offsetParent?.clientWidth || innerWidth) - (r.right - base.left))}px`;

  const rango = $('input', caja);
  const pintar = () => {
    $('.sc-iconos', caja).innerHTML = actual ? iconosCalificacion(actual) : '<span class="sc-vacio"></span>';
    $('.sc-texto', caja).textContent = actual ? `${textoCalificacion(actual)} · ${actual.puntos} de ${ESCALONES.length}` : 'Sin calificar';
    $('.sc-frase', caja).textContent = actual ? fraseCalificacion(actual) : 'Desliza para elegir.';
    rango.style.setProperty('--p', `${(Number(rango.value) / ESCALONES.length) * 100}%`);
    caja.querySelectorAll('.sc-marca').forEach((m) => m.classList.toggle('activa', m.dataset.nivel === actual?.nivel));
  };
  const fijar = (puntos, avisar = true) => {
    const antes = actual?.nivel;
    actual = puntos ? ESCALONES[puntos - 1] : null;
    if (avisar) tic(puntos / ESCALONES.length, actual?.nivel !== antes ? 1.9 : 1);
    rango.value = puntos;
    pintar();
    if (avisar) alCambiar(actual);
  };
  rango.addEventListener('input', () => fijar(Number(rango.value)));
  caja.addEventListener('click', (e) => {
    const m = e.target.closest('.sc-marca');
    if (m) {
      const del = ESCALONES.filter((x) => x.nivel === m.dataset.nivel);
      fijar(del[Math.min(del.length - 1, 5)].puntos); // a la mitad del nivel
      animar($('.sc-iconos', caja), [{ transform: 'scale(.9)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: CURVA.salida });
    }
    if (e.target.closest('[data-quitar]')) fijar(0);
    if (e.target.closest('[data-listo]')) cerrarSelector();
  });
  // Microclics al pasar el cursor por la pista (uno por escalón recorrido).
  let escalonCursor = null;
  rango.addEventListener('pointermove', (e) => {
    const r = rango.getBoundingClientRect();
    const k = Math.round(((e.clientX - r.left) / r.width) * ESCALONES.length);
    if (k !== escalonCursor) {
      escalonCursor = k;
      if (e.buttons === 0) microclic();
    }
  });
  rango.addEventListener('pointerleave', () => (escalonCursor = null));
  caja.querySelectorAll('.sc-marca').forEach((m) => m.addEventListener('pointerenter', microclic));
  pintar();
  caja.classList.add('visible');
  abrirMorph(caja, ancla);
  rango.focus({ preventScroll: true });
  const fuera = (e) => {
    if (!caja.contains(e.target) && !ancla.contains(e.target)) cerrarSelector();
  };
  const tecla = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cerrarSelector();
    }
  };
  setTimeout(() => addEventListener('pointerdown', fuera), 0);
  caja.addEventListener('keydown', tecla);
  abierto = { caja, fuera, ancla };
}

export function cerrarSelector() {
  if (!abierto) return;
  const { caja, fuera, ancla } = abierto;
  abierto = null;
  removeEventListener('pointerdown', fuera);
  sonar('collapse');
  cerrarMorph(caja, ancla, () => caja.remove());
}

export const selectorAbierto = () => !!abierto;
