// Ficha de un libro: portada en 3D, datos, estado de lectura, calificación
// celeste, sinopsis editable, comentarios personales y edición de datos.

import { datos, actualizar, eliminar, nombreRepisa, ESTADOS, emitirAviso } from './datos.js';
import { colores, geometria, portadaGenerada } from './lomos.js';
import { abrirSelectorCalificacion, cerrarSelector, iconosCalificacion, fraseCalificacion, textoCalificacion, normalizar } from './calificacion.js';
import { usar } from './iconos.js';
import { buscarSinopsis, buscarCandidatos, comprimirImagen, leerArchivo } from './buscar-en-linea.js';
import { $, $$, esc, animar, CURVA, debounce, menosMovimiento, puedeHover, apellido, esEspanol } from './util.js';
import { ocultarGlobo } from './globo.js';
import { abrirMorph, cerrarMorph } from './morph.js';
import { sonar } from './sonidos.js';
import { revelarTexto } from './revelar.js';

const FORMATOS = ['Pasta blanda', 'Pasta dura', 'Bolsillo', 'Kindle', 'Folleto', 'Audiolibro (CD)', 'Estuche', 'Juego de mesa', 'Desconocido'];
// El libro 3D ocupa casi todo el panel izquierdo de la ficha, con un margen
// de seguridad para el giro 3D, el lomo, el botón de portada y las flechas.
function anchoLibro(prop) {
  if (innerWidth < 760) return Math.round(Math.min(innerWidth * 0.56, (innerHeight * 0.42) / prop));
  const fichaW = Math.min(1180, innerWidth * 0.94), fichaH = Math.min(innerHeight * 0.88, 900);
  const escenaW = Math.max(300, fichaW * 0.4);
  const libreW = escenaW * 0.72; // el giro de 22° y el lomo ensanchan la silueta
  const libreH = fichaH - 220; // aire arriba, botón «Cambiar portada» y flechas abajo
  return Math.round(Math.max(200, Math.min(libreW, libreH / prop)));
}

let capa, actualId, origen, listaNavegacion = [], alCerrar = () => {};

export function configurarFicha({ lista, cerrado }) {
  listaNavegacion = lista;
  alCerrar = cerrado;
}

const parrafos = (t) =>
  esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

function libro3d(b) {
  const prop = Math.min(Math.max(b.portada_proporcion || 1.5, 1.2), 1.62);
  const W = anchoLibro(prop);
  const H = Math.round(W * prop);
  const g = geometria(b, 1);
  const T = Math.round(Math.max(14, Math.min(g.grosor * (H / g.alto), 62)));
  const c = colores(b);
  const frente = b.portada
    ? `<img src="${esc(b.portada)}" alt="Portada de ${esc(b.titulo)}" draggable="false">`
    : portadaGenerada(b);
  const lomoTexto = b.lomo_img ? '' : `<span class="l-titulo">${esc(b.titulo)}</span><span class="l-autor">${esc(apellido(b.autor))}</span>`;
  return `<div class="libro3d-vuelo"><div class="libro3d t-tilt-card" style="--W:${W}px;--H:${H}px;--T:${T}px;--l-fondo:${c.fondo};--l-texto:${c.texto};--l-acento:${c.acento}">
      <div class="cara frente">${frente}<div class="t-tilt-glare" aria-hidden="true"></div></div>
      <div class="cara lomo3d ${esEspanol(b.titulo) ? 'es' : 'en'}" style="${b.lomo_img ? `background-image:url('${esc(b.lomo_img)}')` : ''}">${lomoTexto}</div>
      <div class="cara cantos"></div>
      <div class="cara cabeza"></div>
      <div class="cara trasera"></div>
    </div></div>`;
}

const ICONO_ESTADO = { 'por-leer': 'est-por-leer', leido: 'est-leido', descartado: 'est-descartado' };

function htmlEstado(b) {
  const e = b.estado ? ESTADOS[b.estado] : null;
  return `<button type="button" class="estado-boton" data-accion="estado" aria-haspopup="true" aria-label="Estado de lectura: ${e ? e.nombre : 'sin marcar'}" title="${e ? e.nombre : 'Marcar estado de lectura'}">
    ${usar(b.estado ? ICONO_ESTADO[b.estado] : 'est-sin-estado')}<span>${e ? e.nombre : 'Marcar'}</span></button>`;
}

function menuEstado(b) {
  return `<div class="menu-estado" role="menu">${Object.entries(ESTADOS)
    .map(([id, e]) => `<button type="button" role="menuitemradio" aria-checked="${b.estado === id}" data-estado="${id}" class="${b.estado === id ? 'activo' : ''}">${usar(ICONO_ESTADO[id])}<span>${e.nombre}</span></button>`)
    .join('')}${b.estado ? '<button type="button" class="quitar" data-estado="">Quitar estado</button>' : ''}</div>`;
}

function htmlCalificacion(b) {
  const cal = normalizar(b.calificacion);
  return `<button type="button" class="cal-insignia ${cal ? '' : 'vacia'}" data-accion="calificar" aria-label="Calificación: ${textoCalificacion(cal)}. Cambiar">
      ${cal ? iconosCalificacion(cal) : `${usar('estrella')}<span>Calificar</span>`}</button>
    <p class="cal-frase">${cal ? fraseCalificacion(cal) : ''}</p>`;
}

function htmlSinopsis(b) {
  const propia = b.sinopsis_propia;
  const texto = propia ?? b.sinopsis;
  const fuente = propia
    ? 'Escrita o editada por ti'
    : b.sinopsis_fuente?.nombre
      ? `Fuente: ${b.sinopsis_fuente.url ? `<a href="${esc(b.sinopsis_fuente.url)}" target="_blank" rel="noopener">${esc(b.sinopsis_fuente.nombre)}</a>` : esc(b.sinopsis_fuente.nombre)}`
      : '';
  return `
    <div class="sinopsis-texto">${texto ? parrafos(texto) : '<p class="tenue">Sinopsis no disponible</p>'}</div>
    <p class="sinopsis-pie">${fuente ? `<span>${fuente}</span>` : ''}
      <button type="button" class="enlace" data-accion="editar-sinopsis">${texto ? 'Editar' : 'Escribir la mía'}</button>
      ${propia && b.sinopsis ? '<button type="button" class="enlace" data-accion="restaurar-sinopsis">Restaurar original</button>' : ''}
      <button type="button" class="enlace" data-accion="buscar-sinopsis">Buscar en línea</button></p>`;
}

function htmlComentarios(b) {
  const hay = !!(b.comentarios || '').trim();
  return `<details class="comentarios-bloque" ${hay ? '' : 'hidden'}>
      <summary><span>Mis comentarios</span><em>${hay ? esc(b.comentarios.trim().split('\n')[0].slice(0, 80)) : ''}</em></summary>
      <textarea class="comentarios" rows="4" placeholder="Lo que pensaste, dónde lo compraste, a quién se lo prestaste…">${esc(b.comentarios || '')}</textarea>
      <span class="guardado" aria-live="polite"></span>
    </details>`;
}

function htmlDetalles(b) {
  const fila = (k, v) => (v ? `<dt>${k}</dt><dd>${v}</dd>` : '');
  const otros = (b.otros_ejemplares || []).map((id) => datos.porId.get(id)).filter(Boolean);
  return `<dl>
    ${fila('Repisa', esc(nombreRepisa(b.repisa)))}
    ${fila('Formato', esc(b.formato))}
    ${fila('Serie', esc(b.serie))}
    ${fila('Primera edición', esc(b.anio))}
    ${fila('Páginas', esc(b.paginas))}
    ${fila('Editorial', esc(b.editorial))}
    ${fila('ISBN', esc(b.isbn))}
    ${fila('Nota', esc(b.nota_edicion))}
    ${fila('Otros ejemplares', otros.map((o) => `<button type="button" class="enlace" data-ir-libro="${o.id}">${esc(o.formato)} · ${o.id}</button>`).join(', '))}
    ${fila('Registro', esc(b.id))}
  </dl>
  ${b.temas?.length ? `<div class="temas">${b.temas.slice(0, 10).map((t) => `<span class="chip tenue">${esc(t)}</span>`).join('')}</div>` : ''}`;
}

function htmlEditar(b) {
  const opRepisas = datos.repisas.map((r) => `<option value="${r.id}" ${r.id === b.repisa ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('');
  const opFormatos = FORMATOS.map((f) => `<option ${f === b.formato ? 'selected' : ''}>${f}</option>`).join('');
  const campo = (n, et, v, tipo = 'text') => `<label><span>${et}</span><input name="${n}" type="${tipo}" value="${esc(v ?? '')}"></label>`;
  return `<form class="form-editar">
    ${campo('titulo', 'Título', b.titulo)}${campo('subtitulo', 'Subtítulo', b.subtitulo)}
    ${campo('autor', 'Autor(es)', b.autor)}${campo('serie', 'Serie', b.serie)}
    <label><span>Repisa</span><select name="repisa">${opRepisas}</select></label>
    <label><span>Formato</span><select name="formato">${opFormatos}</select></label>
    ${campo('paginas', 'Páginas', b.paginas, 'number')}${campo('anio', 'Año', b.anio, 'number')}
    ${campo('isbn', 'ISBN', b.isbn)}${campo('editorial', 'Editorial', b.editorial)}
    <div class="fila-botones"><button class="boton primario">Guardar datos</button></div>
  </form>
  <div class="zona-imagenes">
    <label class="boton chico archivo">Subir foto del lomo<input type="file" accept="image/*" data-subir="lomo_img" hidden></label>
    <label class="boton chico archivo">Subir portada propia<input type="file" accept="image/*" data-subir="portada" hidden></label>
    ${b.lomo_img ? '<button type="button" class="boton chico" data-accion="quitar-lomo">Quitar foto del lomo</button>' : ''}
  </div>
  <button type="button" class="boton peligro mantener" data-accion="eliminar"><span class="texto">Mantén presionado para eliminar</span><span class="relleno" aria-hidden="true">Mantén presionado para eliminar</span></button>`;
}

function contenido(b) {
  const hayComentarios = !!(b.comentarios || '').trim();
  return `
    <div class="ficha-escena t-tilt" data-escena>
      ${libro3d(b)}
      <button type="button" class="boton chico fantasma" data-accion="portadas">Cambiar portada</button>
    </div>
    <div class="ficha-info">
      <header class="ficha-cab">
        <div class="ficha-titulos">
          <p class="sobretitulo">${usar(`rep-${b.repisa}`, 'mini')}<span>${esc(nombreRepisa(b.repisa))}${b.serie ? ` · ${esc(b.serie)}` : ''}</span></p>
          <div class="titulo-fila"><h1 id="ficha-titulo">${esc(b.titulo)}</h1><div class="estado-zona">${htmlEstado(b)}</div></div>
          ${b.subtitulo ? `<p class="subtitulo">${esc(b.subtitulo)}</p>` : ''}
          <p class="autor">${esc(b.autor)}</p>
        </div>
        <div class="ficha-cal" data-cal>${htmlCalificacion(b)}</div>
      </header>
      <section class="bloque-sinopsis" data-sinopsis>${htmlSinopsis(b)}</section>
      ${htmlComentarios(b)}
      <footer class="ficha-pie">
        ${hayComentarios ? '' : '<button type="button" class="enlace" data-accion="comentar">Añadir comentario</button>'}
        <button type="button" class="enlace" data-accion="detalles">Detalles</button>
        <button type="button" class="enlace" data-accion="editar">Editar datos</button>
      </footer>
      <div class="ficha-panel" data-panel="detalles" hidden>${htmlDetalles(b)}</div>
      <div class="ficha-panel" data-panel="editar" hidden>${htmlEditar(b)}</div>
      <div class="panel-portadas" hidden></div>
    </div>`;
}

// ------------------------------------------------------------------ abrir
export function abrirFicha(id, desde) {
  const b = datos.porId.get(id);
  if (!b) return;
  ocultarGlobo();
  const yaAbierta = !!capa;
  if (!capa) {
    capa = document.createElement('div');
    capa.className = 'ficha-capa';
    capa.innerHTML = `<button type="button" class="ficha-cerrar" aria-label="Cerrar">${'<svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15"/></svg>'}</button>
    <div class="ficha" role="dialog" aria-modal="true" aria-labelledby="ficha-titulo">
      <div class="ficha-cuerpo"></div>
      <div class="ficha-nav"><button type="button" data-nav="-1" aria-label="Libro anterior">←</button><button type="button" data-nav="1" aria-label="Libro siguiente">→</button></div>
    </div>`;
    document.body.append(capa);
    document.documentElement.classList.add('sin-scroll');
    capa.addEventListener('click', alClic);
    capa.addEventListener('input', alEscribir);
    capa.addEventListener('change', alCambiarArchivo);
    capa.addEventListener('submit', alGuardarDatos);
    capa.addEventListener('pointerdown', alPresionar);
    addEventListener('keydown', alTeclado);
  }
  if (origen && origen !== desde) origen.classList.remove('fuera');
  actualId = id;
  origen = desde || null;
  const cuerpo = $('.ficha-cuerpo', capa);
  cerrarSelector();
  cuerpo.innerHTML = contenido(b);
  activarInclinacion();
  revelarTexto($('.sinopsis-texto', capa), { retraso: yaAbierta ? 0 : 260 });
  setTimeout(() => capa && sonar('revelar', 0.7), yaAbierta ? 0 : 260);
  if (location.hash !== `#/libro/${id}`) history.replaceState(null, '', `#/libro/${id}`);

  if (!yaAbierta) entrar();
  else $('.ficha-cerrar', capa).focus({ preventScroll: true });
}

function entrar() {
  sonar('page-enter');
  capa.classList.add('abriendo');
  requestAnimationFrame(() => capa.classList.replace('abriendo', 'abierta'));
  const info = $$('.ficha-info > *', capa).slice(0, 8);
  info.forEach((el, i) =>
    animar(el, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], {
      duration: 380, delay: 120 + i * 40, easing: CURVA.salida, fill: 'backwards',
    })
  );
  vuelo(true);
  $('.ficha-cerrar', capa).focus({ preventScroll: true });
}

// El libro sale del estante: gira del lomo a la portada mientras viaja.
function vuelo(entrando, cont = capa) {
  const v = $('.libro3d-vuelo', cont);
  if (!v || !origen || menosMovimiento()) {
    if (entrando) animar($('.ficha', cont), [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: CURVA.salida });
    return Promise.resolve();
  }
  const o = origen.getBoundingClientRect();
  if (o.bottom < 0 || o.top > innerHeight) return Promise.resolve();
  const f = v.getBoundingClientRect();
  const libro = $('.libro3d', v);
  const H = libro.offsetHeight, W = libro.offsetWidth;
  const esLomo = origen.classList.contains('lomo') && !origen.classList.contains('acostado');
  const s = esLomo ? o.height / H : o.width / W;
  const dx = o.left + o.width / 2 - (f.left + f.width / 2);
  const dy = o.top + o.height / 2 - (f.top + f.height / 2);
  const giro = esLomo ? 68 : -22; // el reposo es rotateY(22deg): se ve el lomo
  const inicio = { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotateY(${giro}deg)` };
  const fin = { transform: 'none' };
  origen.classList.add('fuera');
  const anim = v.animate(entrando ? [inicio, fin] : [fin, inicio], {
    duration: entrando ? 620 : 380,
    easing: entrando ? CURVA.cajon : CURVA.movimiento,
    fill: 'both',
  });
  return anim.finished.then(() => {
    if (entrando) anim.cancel();
  });
}

export function cerrarFicha() {
  if (!capa) return;
  sonar('collapse');
  cerrarSelector();
  const c = capa;
  capa = null;
  removeEventListener('keydown', alTeclado);
  const libroOrigen = origen;
  const volver = vuelo(false, c);
  c.classList.remove('abierta');
  c.classList.add('cerrando');
  animar($('.ficha-info', c), [{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
  Promise.all([volver, new Promise((r) => setTimeout(r, 260))]).then(() => {
    libroOrigen?.classList.remove('fuera');
    c.remove();
    document.documentElement.classList.remove('sin-scroll');
    libroOrigen?.focus?.({ preventScroll: true });
  });
  origen = null;
  if (location.hash.startsWith('#/libro/')) history.replaceState(null, '', alCerrar() || '#/librero');
}

// ------------------------------------------------------------------ eventos
function alTeclado(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    if ($('.menu-estado', capa)) return $('.menu-estado', capa).remove();
    cerrarFicha();
  }
  const enCampo = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (!enCampo && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) navegar(e.key === 'ArrowRight' ? 1 : -1);
}

function navegar(paso) {
  const lista = listaNavegacion();
  const i = lista.findIndex((b) => b.id === actualId);
  if (i < 0 || !lista.length) return;
  const sig = lista[(i + paso + lista.length) % lista.length];
  origen?.classList.remove('fuera');
  origen = document.querySelector(`.lomo[data-id="${sig.id}"]`) || null;
  abrirFicha(sig.id, origen);
}

function alClic(e) {
  if (e.target === capa) return cerrarFicha();
  const t = e.target;
  if (t.closest('.ficha-cerrar')) return cerrarFicha();
  const nav = t.closest('[data-nav]');
  if (nav) return navegar(Number(nav.dataset.nav));
  const ir = t.closest('[data-ir-libro]');
  if (ir) return abrirFicha(ir.dataset.irLibro, null);
  const est = t.closest('.menu-estado [data-estado]');
  if (est) {
    const nuevo = est.dataset.estado || null;
    sonar(nuevo ? 'toggle-on' : 'toggle-off');
    actualizar(actualId, { estado: nuevo });
    const zona = $('.estado-zona', capa);
    zona.innerHTML = htmlEstado(datos.porId.get(actualId));
    animar($('.estado-boton .icono', zona), [{ transform: 'scale(.6) rotate(-12deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: CURVA.salida });
    return;
  }
  if (!t.closest('.estado-zona') && $('.menu-estado', capa)) {
    const m = $('.menu-estado', capa);
    cerrarMorph(m, $('.estado-boton', capa), () => m.remove());
  }
  const acc = t.closest('[data-accion]')?.dataset.accion;
  if (acc) acciones[acc]?.(t.closest('[data-accion]'));
}

const guardarComentario = debounce((texto) => {
  actualizar(actualId, { comentarios: texto });
  const g = $('.guardado', capa);
  if (g) {
    g.textContent = 'Guardado en este navegador';
    g.classList.remove('visible');
    void g.offsetWidth;
    g.classList.add('visible');
  }
}, 600);

function alEscribir(e) {
  if (e.target.matches('.comentarios')) guardarComentario(e.target.value);
}

function alGuardarDatos(e) {
  if (!e.target.matches('.form-editar')) return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const num = (v) => (v === '' ? null : Number(v));
  const cambios = {
    titulo: f.titulo.trim() || datos.porId.get(actualId).titulo,
    subtitulo: f.subtitulo.trim() || null,
    autor: f.autor.trim(),
    serie: f.serie.trim() || null,
    repisa: f.repisa,
    formato: f.formato,
    fisico: f.formato !== 'Kindle',
    paginas: num(f.paginas),
    anio: num(f.anio),
    isbn: f.isbn.trim() || null,
    editorial: f.editorial.trim() || null,
  };
  actualizar(actualId, cambios);
  emitirAviso('Datos guardados');
  abrirFicha(actualId, origen);
}

async function alCambiarArchivo(e) {
  const campo = e.target.dataset?.subir;
  if (!campo || !e.target.files?.[0]) return;
  const url = await leerArchivo(e.target.files[0]);
  const opciones = campo === 'lomo_img' ? { alto: 520, calidad: 0.72 } : { ancho: 300 };
  const comprimida = await comprimirImagen(url, opciones);
  if (!comprimida) return emitirAviso('No se pudo leer la imagen');
  actualizar(actualId, { [campo]: comprimida });
  emitirAviso(campo === 'lomo_img' ? 'Foto del lomo guardada' : 'Portada guardada');
  abrirFicha(actualId, origen);
}

// Mantener para eliminar (patrón de Emil Kowalski): 1.6 s de presión.
function alPresionar(e) {
  const btn = e.target.closest('.mantener');
  if (!btn) return;
  btn.classList.add('presionando');
  const t = setTimeout(() => {
    const b = datos.porId.get(actualId);
    cerrarFicha();
    sonar('delete');
    eliminar(b.id);
    emitirAviso(`“${b.titulo}” se quitó del librero`);
  }, 1600);
  const soltar = () => {
    clearTimeout(t);
    btn.classList.remove('presionando');
    removeEventListener('pointerup', soltar);
    btn.removeEventListener('pointerleave', soltar);
  };
  addEventListener('pointerup', soltar);
  btn.addEventListener('pointerleave', soltar);
}

function abrirPanel(nombre) {
  const panel = $(`[data-panel="${nombre}"]`, capa);
  const abrir = panel.hidden;
  $$('.ficha-panel', capa).forEach((p) => (p.hidden = true));
  panel.hidden = !abrir;
  if (abrir) {
    animar(panel, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: CURVA.salida });
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

const acciones = {
  estado(btn) {
    const zona = btn.closest('.estado-zona');
    const abierto = $('.menu-estado', zona);
    if (abierto) {
      sonar('collapse');
      return cerrarMorph(abierto, btn, () => abierto.remove());
    }
    zona.insertAdjacentHTML('beforeend', menuEstado(datos.porId.get(actualId)));
    sonar('expand');
    abrirMorph($('.menu-estado', zona), btn);
  },
  calificar(btn) {
    abrirSelectorCalificacion(btn, datos.porId.get(actualId).calificacion, (cal) => {
      actualizar(actualId, { calificacion: cal });
      const zona = $('[data-cal]', capa);
      if (zona) zona.innerHTML = htmlCalificacion(datos.porId.get(actualId));
    });
  },
  comentar(btn) {
    const d = $('.comentarios-bloque', capa);
    d.hidden = false;
    d.open = true;
    btn.remove();
    $('textarea', d).focus();
  },
  detalles() {
    abrirPanel('detalles');
  },
  editar() {
    abrirPanel('editar');
  },
  'editar-sinopsis'() {
    const b = datos.porId.get(actualId);
    const zona = $('[data-sinopsis]', capa);
    zona.innerHTML = `<textarea class="editor-sinopsis" rows="12">${esc(b.sinopsis_propia ?? b.sinopsis ?? '')}</textarea>
      <div class="fila-botones"><button type="button" class="boton primario chico" data-accion="guardar-sinopsis">Guardar sinopsis</button>
      <button type="button" class="boton chico" data-accion="cancelar-sinopsis">Cancelar</button></div>`;
    const ta = $('textarea', zona);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  },
  'guardar-sinopsis'() {
    const texto = $('.editor-sinopsis', capa).value.trim();
    const b = datos.porId.get(actualId);
    actualizar(actualId, { sinopsis_propia: texto && texto !== b.sinopsis ? texto : null });
    $('[data-sinopsis]', capa).innerHTML = htmlSinopsis(datos.porId.get(actualId));
    revelarTexto($('.sinopsis-texto', capa));
    sonar('revelar', 0.7);
    sonar('success');
    emitirAviso('Sinopsis guardada');
  },
  'cancelar-sinopsis'() {
    $('[data-sinopsis]', capa).innerHTML = htmlSinopsis(datos.porId.get(actualId));
  },
  'restaurar-sinopsis'() {
    actualizar(actualId, { sinopsis_propia: null });
    $('[data-sinopsis]', capa).innerHTML = htmlSinopsis(datos.porId.get(actualId));
  },
  async 'buscar-sinopsis'(btn) {
    btn.disabled = true;
    btn.classList.add('cargando');
    btn.textContent = 'Buscando…';
    sonar('carga');
    const b = datos.porId.get(actualId);
    const s = await buscarSinopsis(b).catch(() => null);
    const zona = $('[data-sinopsis]', capa);
    if (!zona) return;
    if (!s) {
      btn.textContent = 'Sin resultados verificables';
      return;
    }
    zona.insertAdjacentHTML('beforeend', `<div class="propuesta">
      <p class="sobretitulo">Propuesta de ${esc(s.fuente)} · <a href="${esc(s.url)}" target="_blank" rel="noopener">ver fuente</a></p>
      ${parrafos(s.texto)}
      <div class="fila-botones"><button type="button" class="boton primario chico" data-accion="aprobar-sinopsis">Aprobar</button>
      <button type="button" class="boton chico" data-accion="rechazar-propuesta">Descartar</button></div></div>`);
    zona.lastElementChild._propuesta = s;
    btn.remove();
  },
  'aprobar-sinopsis'(btn) {
    const s = btn.closest('.propuesta')._propuesta;
    actualizar(actualId, { sinopsis: s.texto, sinopsis_fuente: { nombre: s.fuente, url: s.url, idioma: s.idioma }, sinopsis_propia: null });
    $('[data-sinopsis]', capa).innerHTML = htmlSinopsis(datos.porId.get(actualId));
    revelarTexto($('.sinopsis-texto', capa));
    sonar('revelar', 0.7);
    sonar('success');
    emitirAviso('Sinopsis aprobada');
  },
  'rechazar-propuesta'(btn) {
    btn.closest('.propuesta')?.remove();
  },
  'quitar-lomo'() {
    actualizar(actualId, { lomo_img: null });
    abrirFicha(actualId, origen);
  },
  async portadas() {
    const panel = $('.panel-portadas', capa);
    const b = datos.porId.get(actualId);
    panel.hidden = false;
    panel.innerHTML = '<p class="sobretitulo">Buscando portadas…</p>';
    sonar('carga');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const cands = await buscarCandidatos({ titulo: b.titulo, autor: apellido(b.autor) }).catch(() => []);
    const urls = [...new Set(cands.flatMap((c) => (c.miniatura ? [{ mini: c.miniatura, grande: c.portadas[0], c }] : [])).map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x)).slice(0, 12);
    if (!urls.length) {
      panel.innerHTML = '<p class="sobretitulo">No se encontraron portadas. Puedes subir una propia en “Editar datos”.</p>';
      return;
    }
    panel.innerHTML = `<h3>Elige una portada</h3><p class="tenue">Se guardará solo si la apruebas.</p>
      <div class="rejilla-candidatas">${urls.map((u, i) => `<button type="button" class="candidata" data-i="${i}" style="--i:${i}"><img src="${esc(u.mini)}" alt="" loading="lazy"><span>${esc(u.c.fuente)}${u.c.anio ? ` · ${u.c.anio}` : ''}</span></button>`).join('')}</div>
      <div class="fila-botones"><button type="button" class="boton primario chico" data-accion="aprobar-portada" disabled>Aprobar portada</button>
      <button type="button" class="boton chico" data-accion="cerrar-portadas">Cancelar</button></div>`;
    panel._urls = urls;
    panel.onclick = (ev) => {
      const c = ev.target.closest('.candidata');
      if (!c) return;
      $$('.candidata', panel).forEach((x) => x.classList.toggle('activa', x === c));
      panel._elegida = urls[Number(c.dataset.i)];
      $('[data-accion="aprobar-portada"]', panel).disabled = false;
    };
  },
  async 'aprobar-portada'(btn) {
    const panel = $('.panel-portadas', capa);
    const elegida = panel._elegida;
    if (!elegida) return;
    btn.textContent = 'Guardando…';
    const datosImg = (await comprimirImagen(elegida.grande)) || (await comprimirImagen(elegida.mini)) || elegida.grande;
    actualizar(actualId, { portada: datosImg, lomo_colores: null, revisar: false });
    sonar('success');
    emitirAviso('Portada aprobada');
    abrirFicha(actualId, origen);
  },
  'cerrar-portadas'() {
    const panel = $('.panel-portadas', capa);
    panel.hidden = true;
    panel.innerHTML = '';
  },
};

// "3D tilt" de transitions.dev: el puntero se sigue en el contenedor plano
// (.t-tilt, que nunca se transforma) y el libro (.t-tilt-card) gira hacia él,
// con un brillo que recorre la portada. Al salir, vuelve suave a su reposo.
function activarInclinacion() {
  const tilt = $('[data-escena]', capa);
  const card = $('.t-tilt-card', capa);
  if (!tilt || !card || menosMovimiento()) return;
  const MAX = 16;
  const reset = () => {
    tilt.classList.remove('is-hover');
    card.classList.remove('is-tilting');
    card.style.setProperty('--tilt-rx', '0deg');
    card.style.setProperty('--tilt-ry', '0deg');
  };
  const seguir = (e) => {
    if (e.target.closest('button')) return;
    const r = tilt.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    tilt.classList.add('is-hover');
    card.classList.add('is-tilting');
    card.style.setProperty('--tilt-ry', `${((px - 0.5) * MAX).toFixed(2)}deg`);
    card.style.setProperty('--tilt-rx', `${((0.5 - py) * MAX).toFixed(2)}deg`);
    card.style.setProperty('--tilt-gx', `${(px * 100).toFixed(1)}%`);
    card.style.setProperty('--tilt-gy', `${(py * 100).toFixed(1)}%`);
  };
  tilt.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') {
      try {
        tilt.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura */
      }
    }
  });
  tilt.addEventListener('pointermove', seguir);
  tilt.addEventListener('pointerup', reset);
  tilt.addEventListener('pointercancel', reset);
  tilt.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') reset();
  });
}

export const fichaAbierta = () => !!capa;
