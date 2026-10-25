// Arranque del Librero: cabecera, rutas, filtros, búsqueda, tema y avisos.

import { cargar, datos, filtrar, filtros, cambiarFiltros, escuchar, contarCambios, ESTADOS } from './datos.js';
import { instalarIconos } from './iconos.js';
import { cargarFuentesLomo, limpiarMedidas } from './lomos.js';
import { crearVistaLibrero } from './vista-librero.js';
import { crearVistaBosque } from './vista-bosque.js';
import { crearVistaPortadas } from './vista-portadas.js';
import { crearVistaTablero } from './vista-tablero.js';
import { crearVistaSala } from './vista-sala.js';
import { abrirFicha, cerrarFicha, configurarFicha, fichaAbierta } from './ficha.js';
import { $, $$, esc, debounce, animar, CURVA, menosMovimiento, autorCorto, plural } from './util.js';
import { abrirMorph, cerrarMorph, estaAbierto } from './morph.js';
import { sonar, sonidoActivo, alternarSonido } from './sonidos.js';
import { limpiarConDisolucion, sincronizarClear } from './limpiar.js';
import { gatosActivos, alternarGatos } from './gatos.js';
import { abrirExportar } from './exportar.js';

const VISTAS = ['librero', 'sala', 'portadas', 'arbol', 'tablero'];
let vistaActual = null;
let pendiente = false;
const vistas = {};

async function iniciar() {
  instalarIconos();
  aplicarTemaGuardado();
  try {
    // Los lomos se miden con sus tipografías reales: hay que esperarlas (máx. 3 s).
    await Promise.all([cargar(), Promise.race([cargarFuentesLomo(), new Promise((r) => setTimeout(r, 3000))])]);
  } catch (e) {
    $('#v-librero').innerHTML = `<p class="vacio">No se pudo cargar <code>data/libros.json</code>.<br><span>${esc(e.message)}</span></p>`;
    document.body.classList.add('listo');
    return;
  }

  const abrir = (id, el) => abrirFicha(id, el);
  vistas.librero = crearVistaLibrero($('#v-librero'), { abrirFicha: abrir });
  vistas.arbol = crearVistaBosque($('#v-arbol'), { abrirFicha: abrir });
  vistas.portadas = crearVistaPortadas($('#v-portadas'), { abrirFicha: abrir });
  vistas.tablero = crearVistaTablero($('#v-tablero'), { abrirFicha: abrir });
  vistas.sala = crearVistaSala($('#v-sala'), { abrirFicha: abrir });

  configurarFicha({
    lista: () => filtrar(),
    cerrado: () => `#/${vistaActual || 'librero'}`,
  });

  prepararMenu();
  prepararBuscador();
  prepararGatos();
  prepararFiltros();
  prepararTema();
  actualizarInsignia();

  escuchar('filtros', debounce(() => renderVista(true), 90));
  // Si alguna tipografía llega tarde, se vuelven a medir los lomos.
  document.fonts?.addEventListener?.('loadingdone', debounce(() => {
    limpiarMedidas();
    if (vistaActual === 'librero') renderVista(true);
  }, 200));
  escuchar('cambio', () => {
    actualizarInsignia();
    if (fichaAbierta()) pendiente = true; // se redibuja al cerrar, para no mover el libro
    else renderVista(true);
  });
  escuchar('aviso', avisar);
  escuchar('error', avisar);

  addEventListener('hashchange', rutear);
  rutear();
  requestAnimationFrame(() => document.body.classList.add('listo'));
}

// ------------------------------------------------------------------ rutas
function rutear() {
  const h = location.hash.replace(/^#\/?/, '');
  const [seccion, id] = h.split('/');
  if (seccion === 'libro' && id) {
    if (!vistaActual) mostrarVista('librero');
    abrirFicha(id, vistas[vistaActual]?.elementoDe?.(id) || null);
    return;
  }
  if (fichaAbierta()) cerrarFicha();
  if (pendiente) {
    pendiente = false;
    renderVista(true);
  }
  mostrarVista(VISTAS.includes(seccion) ? seccion : 'librero');
}

function mostrarVista(nombre) {
  if (nombre === vistaActual) return;
  const anterior = vistaActual;
  vistaActual = nombre;
  document.body.dataset.vista = nombre;
  $$('.vista').forEach((v) => (v.hidden = v.id !== `v-${nombre}`));
  $$('.menu-vistas a').forEach((a) => a.setAttribute('aria-current', a.dataset.pestana === nombre ? 'page' : 'false'));
  document.body.classList.toggle('en-librero', nombre === 'librero');
  renderVista(false);
  const el = $(`#v-${nombre}`);
  if (anterior) {
    animar(el, [{ opacity: 0, transform: 'translateY(6px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 240, easing: CURVA.salida });
    scrollTo({ top: 0 });
  }
  vistas[anterior]?.salir?.();
}

function renderVista() {
  if (!vistaActual) return;
  const lista = filtrar();
  vistas[vistaActual].render(lista);
  const total = datos.libros.length;
  $('[data-resultados]').textContent = lista.length === total ? plural(total, 'libro', 'libros') : `${lista.length} de ${total}`;
}

// ------------------------------------------------------------------ menú
function prepararMenu() {
  const boton = $('.menu-boton');
  const menu = $('#menu');
  const abrir = (si) => {
    boton.setAttribute('aria-expanded', String(si));
    if (si) {
      sonar('expand');
      abrirMorph(menu, boton);
    } else if (estaAbierto(menu)) {
      sonar('collapse');
      cerrarMorph(menu, boton);
    }
  };
  boton.addEventListener('click', () => abrir(!estaAbierto(menu)));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('.menu-vistas a')) {
      sonar('tab-switch');
      abrir(false);
    }
  });
  addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.menu-envoltura')) abrir(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') abrir(false);
  });
  $('[data-exportar]').addEventListener('click', () => {
    abrir(false);
    abrirExportar();
  });
  const son = $('[data-sonido]');
  son.setAttribute('aria-pressed', String(sonidoActivo()));
  son.addEventListener('click', () => son.setAttribute('aria-pressed', String(alternarSonido())));
}

// ------------------------------------------------------------------ búsqueda
// Botón «sin gatos»: muestra u oculta a Petri y Folfiri.
function prepararGatos() {
  const b = $('.gatos-boton');
  const pintar = (on) => {
    b.setAttribute('aria-pressed', String(on));
    const txt = on ? 'Ocultar a los gatos' : 'Mostrar a los gatos';
    b.setAttribute('aria-label', txt);
    b.title = txt;
  };
  pintar(gatosActivos());
  b.addEventListener('click', () => {
    const on = alternarGatos();
    pintar(on);
    sonar(on ? 'toggle-on' : 'toggle-off');
  });
}

function prepararBuscador() {
  const input = $('.buscador input');
  const envoltura = $('.buscador .t-clear');
  const caja = $('.sugerencias');
  const buscador = $('.buscador');
  const boton = $('.buscar-boton');
  let seleccion = 0;
  // La barra está escondida detrás del ícono de lupa y se despliega hacia la
  // izquierda al pulsarlo (o con la tecla /). Se repliega si queda vacía.
  const abierta = () => buscador.dataset.abierto === 'true';
  const abrirBusqueda = () => {
    if (!abierta()) {
      buscador.dataset.abierto = 'true';
      boton.setAttribute('aria-expanded', 'true');
      input.tabIndex = 0;
      $('.t-clear-btn', envoltura).tabIndex = 0;
      sonar('expand');
    }
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  };
  const cerrarBusqueda = () => {
    if (!abierta() || input.value) return;
    buscador.dataset.abierto = 'false';
    boton.setAttribute('aria-expanded', 'false');
    input.tabIndex = -1;
    $('.t-clear-btn', envoltura).tabIndex = -1;
    caja.hidden = true;
    sonar('collapse');
  };
  boton.addEventListener('click', () => (abierta() && !input.value ? cerrarBusqueda() : abrirBusqueda()));
  const vaciar = () => {
    caja.hidden = true;
    sonar('delete', 0.7);
    limpiarConDisolucion(envoltura, () => cambiarFiltros({ q: '' }));
  };
  $('.t-clear-btn', envoltura).addEventListener('pointerdown', (e) => {
    if (document.activeElement === input) e.preventDefault();
  });
  $('.t-clear-btn', envoltura).addEventListener('click', vaciar);

  const pintar = () => {
    const q = input.value.trim();
    if (!q) {
      caja.hidden = true;
      return;
    }
    const res = filtrar().slice(0, 7);
    seleccion = 0;
    caja.hidden = !res.length;
    caja.innerHTML = res
      .map((b, i) => `<a href="#/libro/${b.id}" class="sugerencia ${i === 0 ? 'activa' : ''}" data-id="${b.id}">
          <span class="s-mini">${b.portada ? `<img src="${esc(b.portada)}" alt="">` : `<i style="background:${b.lomo_colores?.fondo || 'var(--ruri)'}"></i>`}</span>
          <span class="s-txt"><strong>${esc(b.titulo)}</strong><small>${esc(autorCorto(b.autor))}</small></span>
          ${b.estado ? `<span class="s-estado" style="--c:${ESTADOS[b.estado].color}"></span>` : ''}</a>`)
      .join('');
  };

  input.addEventListener('input', () => {
    sincronizarClear(envoltura);
    cambiarFiltros({ q: input.value });
    pintar();
  });
  input.addEventListener('keydown', (e) => {
    const items = $$('.sugerencia', caja);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      seleccion = (seleccion + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((x, i) => x.classList.toggle('activa', i === seleccion));
    } else if (e.key === 'Enter' && items[seleccion]) {
      e.preventDefault();
      caja.hidden = true;
      location.hash = `#/libro/${items[seleccion].dataset.id}`;
    } else if (e.key === 'Escape') {
      if (input.value) vaciar();
      else {
        input.blur();
        cerrarBusqueda();
        boton.focus({ preventScroll: true });
      }
    }
  });
  input.addEventListener('focus', pintar);
  input.addEventListener('blur', () => setTimeout(() => {
    caja.hidden = true;
    if (document.activeElement !== input && !buscador.contains(document.activeElement)) cerrarBusqueda();
  }, 180));
  addEventListener('keydown', (e) => {
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !fichaAbierta()) {
      e.preventDefault();
      abrirBusqueda();
      input.select();
    }
  });
}

// ------------------------------------------------------------------ filtros
function prepararFiltros() {
  $('#menu').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filtro]');
    if (!b) return;
    const [clave, valor] = b.dataset.filtro.split(':');
    $$(`[data-filtro^="${clave}:"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    sonar('select');
    cambiarFiltros({ [clave]: valor });
    if (clave === 'orden' && vistaActual !== 'librero') location.hash = '#/librero';
  });
}

// ------------------------------------------------------------------ tema
const CLAVE_TEMA = 'librero.tema';
function aplicarTemaGuardado() {
  try {
    const t = localStorage.getItem(CLAVE_TEMA);
    if (t) document.documentElement.dataset.theme = t;
  } catch {
    /* sin almacenamiento */
  }
}
function temaActual() {
  return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function prepararTema() {
  const boton = $('[data-tema]');
  boton.addEventListener('click', () => {
    const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
    sonar(nuevo === 'dark' ? 'toggle-off' : 'toggle-on');
    const cambiar = () => {
      document.documentElement.dataset.theme = nuevo;
      try {
        localStorage.setItem(CLAVE_TEMA, nuevo);
      } catch {
        /* sin almacenamiento */
      }
    };
    if (!document.startViewTransition || menosMovimiento()) return cambiar();
    const r = boton.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(cambiar).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        { duration: 520, easing: CURVA.cajon, pseudoElement: '::view-transition-new(root)' }
      );
    });
  });
}

// ------------------------------------------------------------------ avisos
function avisar(texto) {
  const zona = $('.avisos');
  sonar('notification', 0.8);
  const el = document.createElement('div');
  el.className = 'aviso';
  el.textContent = texto;
  zona.append(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    el.classList.add('saliendo');
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

function actualizarInsignia() {
  const n = contarCambios();
  const ins = $('.insignia-cambios');
  ins.hidden = !n;
  ins.textContent = n;
  $('.punto-cambios').hidden = !n;
}

iniciar();
