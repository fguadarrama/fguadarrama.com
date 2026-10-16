// Tablero: una hoja de cálculo interactiva con todos los libros.
// - Filtros por columna (texto o lista) y búsqueda general.
// - Orden con clic en el encabezado (alfabético, calificación, fecha de
//   adición, año, páginas…), ascendente o descendente.
// - Edición en la celda con doble clic o Enter; navegación con flechas.
// - Cajón lateral con: añadir libro, publicar cambios, importar y revisar.

import { datos, actualizar, agregar, contarCambios, descartarCambios, exportar, importar, escuchar, emitirAviso, nombreRepisa, ESTADOS } from './datos.js';
import { buscarCandidatos, comprimirImagen, descripcionOpenLibrary, limpiarHTML } from './buscar-en-linea.js';
import { normalizar, miniCalificacion, textoCalificacion } from './calificacion.js';
import { etiquetaFecha, ordenarPorFecha } from './orden.js';
import { usar } from './iconos.js';
import { sonar } from './sonidos.js';
import { $, $$, esc, descargar, plural, animar, CURVA, norm } from './util.js';

const FORMATOS = ['Pasta blanda', 'Pasta dura', 'Bolsillo', 'Kindle', 'Folleto', 'Audiolibro (CD)', 'Estuche', 'Juego de mesa', 'Desconocido'];
const ESTADO_TXT = { '': 'Sin marcar', 'por-leer': 'Por leer', leido: 'Leído', descartado: 'Descartado' };

// Columnas de la hoja. tipo: texto | lista | numero | especial.
const COLUMNAS = [
  { id: 'titulo', nombre: 'Título', tipo: 'texto', ancho: 280, editable: true },
  { id: 'autor', nombre: 'Autor', tipo: 'texto', ancho: 200, editable: true },
  { id: 'repisa', nombre: 'Categoría', tipo: 'lista', ancho: 190, editable: true, opciones: () => datos.repisas.map((r) => [r.id, r.nombre]), ver: (b) => nombreRepisa(b.repisa) },
  { id: 'estado', nombre: 'Estado', tipo: 'lista', ancho: 120, editable: true, opciones: () => Object.entries(ESTADO_TXT), ver: (b) => ESTADO_TXT[b.estado || ''] },
  { id: 'calificacion', nombre: 'Calificación', tipo: 'especial', ancho: 150, ver: (b) => textoCalificacion(b.calificacion), valor: (b) => normalizar(b.calificacion)?.puntos || 0 },
  { id: 'formato', nombre: 'Formato', tipo: 'lista', ancho: 120, editable: true, opciones: () => FORMATOS.map((f) => [f, f]) },
  { id: 'anio', nombre: 'Año', tipo: 'numero', ancho: 70, editable: true },
  { id: 'paginas', nombre: 'Págs.', tipo: 'numero', ancho: 70, editable: true },
  { id: 'agregado', nombre: 'Añadido', tipo: 'especial', ancho: 160, ver: (b) => etiquetaFecha(b) },
  { id: 'serie', nombre: 'Serie', tipo: 'texto', ancho: 170, editable: true },
  { id: 'isbn', nombre: 'ISBN', tipo: 'texto', ancho: 140, editable: true },
];
const letra = (i) => String.fromCharCode(66 + i); // A = portada

export function crearVistaTablero(raiz, { abrirFicha }) {
  let lista = [];
  let filas = [];
  let orden = { col: 'agregado', dir: 'desc' };
  const filtrosCol = {};
  let sel = { f: 0, c: 0 };

  raiz.innerHTML = `
    <div class="hoja">
      <div class="hoja-barra">
        <h1>Tablero</h1>
        <div class="hoja-acciones">
          <button type="button" class="boton chico primario" data-cajon="agregar">${'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>'}Añadir libro</button>
          <button type="button" class="boton chico" data-cajon="publicar">Publicar cambios <b class="hoja-cambios"></b></button>
          <button type="button" class="boton chico" data-cajon="importar">Importar</button>
          <button type="button" class="boton chico" data-cajon="revisar">Por revisar</button>
          <button type="button" class="boton chico" data-csv>Exportar CSV</button>
          <button type="button" class="enlace" data-limpiar-filtros>Quitar filtros</button>
        </div>
      </div>
      <div class="hoja-marco" tabindex="0" aria-label="Hoja de libros">
        <table class="hoja-tabla" role="grid">
          <thead></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="hoja-estado" aria-live="polite"></div>
    </div>
    <div class="cajon" hidden>
      <div class="cajon-panel" role="dialog" aria-modal="false">
        <button type="button" class="cajon-cerrar" aria-label="Cerrar"><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15"/></svg></button>
        <div class="cajon-cuerpo"></div>
      </div>
    </div>`;

  const thead = $('thead', raiz);
  const tbody = $('tbody', raiz);
  const marco = $('.hoja-marco', raiz);

  // ---------------------------------------------------------- encabezado
  function pintarEncabezado() {
    const flecha = (id) => (orden.col === id ? (orden.dir === 'asc' ? '▲' : '▼') : '');
    thead.innerHTML = `
      <tr class="hoja-letras"><th class="esquina"></th><th>A</th>${COLUMNAS.map((c, i) => `<th>${letra(i)}</th>`).join('')}</tr>
      <tr class="hoja-nombres"><th class="esquina">#</th><th class="col-portada"></th>${COLUMNAS.map((c) => `
        <th style="min-width:${c.ancho}px" class="${c.id === 'titulo' ? 'fija' : ''}"><button type="button" data-ordenar="${c.id}" class="${orden.col === c.id ? 'activo' : ''}">${c.nombre}<i>${flecha(c.id)}</i></button></th>`).join('')}</tr>
      <tr class="hoja-filtros"><th class="esquina"></th><th></th>${COLUMNAS.map((c) => `<th class="${c.id === 'titulo' ? 'fija' : ''}">${controlFiltro(c)}</th>`).join('')}</tr>`;
  }

  function controlFiltro(c) {
    const v = filtrosCol[c.id] ?? '';
    if (c.tipo === 'lista') {
      const ops = c.opciones().filter(([k]) => k !== '');
      const vacio = c.id === 'estado' ? `<option value="__vacio" ${v === '__vacio' ? 'selected' : ''}>Sin marcar</option>` : '';
      return `<select data-filtrar="${c.id}" aria-label="Filtrar ${c.nombre}"><option value="">Todos</option>${vacio}${ops.map(([k, t]) => `<option value="${esc(k)}" ${v === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    }
    if (c.id === 'calificacion') {
      return `<select data-filtrar="calificacion" aria-label="Filtrar calificación"><option value="">Todas</option>
        <option value="sin" ${v === 'sin' ? 'selected' : ''}>Sin calificar</option>
        ${['basura', 'asteroide', 'luna', 'planeta', 'estrella', 'galaxia'].map((n) => `<option value="${n}" ${v === n ? 'selected' : ''}>${{ basura: 'Basura espacial', asteroide: 'Asteroides', luna: 'Lunas', planeta: 'Planetas', estrella: 'Estrellas', galaxia: 'Galaxia' }[n]}</option>`).join('')}</select>`;
    }
    if (c.id === 'agregado') return '';
    return `<input type="text" data-filtrar="${c.id}" value="${esc(v)}" placeholder="Filtrar…" aria-label="Filtrar ${c.nombre}">`;
  }

  // ---------------------------------------------------------- datos
  function calcular() {
    let r = lista.filter((b) =>
      COLUMNAS.every((c) => {
        const f = filtrosCol[c.id];
        if (!f) return true;
        if (c.id === 'calificacion') {
          const cal = normalizar(b.calificacion);
          return f === 'sin' ? !cal : cal?.nivel === f;
        }
        if (c.tipo === 'lista') return f === '__vacio' ? !b[c.id] : (b[c.id] || '') === f;
        return norm(b[c.id] ?? '').includes(norm(f));
      })
    );
    if (orden.col === 'agregado') r = ordenarPorFecha(r, orden.dir);
    else {
      const c = COLUMNAS.find((x) => x.id === orden.col);
      const val = c.valor || ((b) => (c.ver ? c.ver(b) : b[c.id]));
      r.sort((a, b) => {
        const va = val(a), vb = val(b);
        const vacioA = va == null || va === '' || va === 0, vacioB = vb == null || vb === '' || vb === 0;
        if (vacioA !== vacioB) return vacioA ? 1 : -1; // vacíos siempre al final
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es', { numeric: true });
        return orden.dir === 'asc' ? cmp : -cmp;
      });
    }
    filas = r;
  }

  function celda(b, c) {
    if (c.id === 'calificacion') return `${miniCalificacion(b.calificacion) || '<span class="tenue">—</span>'}`;
    if (c.id === 'estado') return b.estado ? `<span class="hoja-estado-chip" style="--c:${ESTADOS[b.estado].color}">${ESTADO_TXT[b.estado]}</span>` : '<span class="tenue">—</span>';
    const t = c.ver ? c.ver(b) : b[c.id];
    return t == null || t === '' ? '<span class="tenue">—</span>' : esc(t);
  }

  function pintarCuerpo() {
    calcular();
    tbody.innerHTML = filas
      .map((b, f) => `<tr data-id="${b.id}">
        <th class="esquina"><button type="button" data-abrir="${b.id}" aria-label="Abrir ficha de ${esc(b.titulo)}"><span>${f + 1}</span>${'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13l6-6M8 7h5v5"/></svg>'}</button></th>
        <td class="col-portada">${b.portada ? `<img src="${esc(b.portada)}" alt="" loading="lazy">` : `<i style="background:${b.lomo_colores?.fondo || 'var(--ruri)'}"></i>`}</td>
        ${COLUMNAS.map((c, ci) => `<td data-c="${ci}" class="${c.id === 'titulo' ? 'fija' : ''} t-${c.tipo}" ${c.editable ? 'data-editable' : ''}>${celda(b, c)}</td>`).join('')}
      </tr>`)
      .join('');
    estado();
    marcar();
  }

  function estado() {
    const c = COLUMNAS.find((x) => x.id === orden.col);
    const activos = Object.values(filtrosCol).filter(Boolean).length;
    $('.hoja-estado', raiz).innerHTML = `<span><b>${filas.length.toLocaleString('es-MX')}</b> de ${datos.libros.length.toLocaleString('es-MX')} libros</span>
      <span>Ordenado por <b>${c.nombre}</b> ${orden.dir === 'asc' ? 'ascendente' : 'descendente'}</span>
      ${activos ? `<span>${plural(activos, 'filtro activo', 'filtros activos')}</span>` : ''}
      <span class="tenue">Doble clic para editar · flechas para moverte · Enter para confirmar</span>`;
    const n = contarCambios();
    $('.hoja-cambios', raiz).textContent = n ? n : '';
  }

  function marcar() {
    $$('.sel', tbody).forEach((x) => x.classList.remove('sel'));
    const td = tbody.rows[sel.f]?.querySelector(`td[data-c="${sel.c}"]`);
    if (td) {
      td.classList.add('sel');
      td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  // ---------------------------------------------------------- edición
  function editar(td) {
    const tr = td.closest('tr');
    const b = datos.porId.get(tr.dataset.id);
    const c = COLUMNAS[Number(td.dataset.c)];
    if (!c.editable || td.querySelector('input, select')) return;
    const ancho = td.offsetWidth;
    let control;
    if (c.tipo === 'lista') {
      control = document.createElement('select');
      control.innerHTML = c.opciones().map(([k, t]) => `<option value="${esc(k)}" ${(b[c.id] || '') === k ? 'selected' : ''}>${esc(t)}</option>`).join('');
    } else {
      control = document.createElement('input');
      control.type = c.tipo === 'numero' ? 'number' : 'text';
      control.value = b[c.id] ?? '';
    }
    control.className = 'hoja-editor';
    control.style.width = `${ancho}px`;
    td.textContent = '';
    td.append(control);
    control.focus();
    control.select?.();
    let hecho = false;
    const terminar = (guardar) => {
      if (hecho) return;
      hecho = true;
      if (guardar) {
        let v = control.value.trim();
        if (c.tipo === 'numero') v = v === '' ? null : Number(v);
        if (c.id === 'estado') v = v || null;
        if (c.id === 'titulo' && !v) v = b.titulo;
        const cambios = { [c.id]: v === '' ? null : v };
        if (c.id === 'formato') cambios.fisico = v !== 'Kindle';
        if ((b[c.id] ?? null) !== cambios[c.id]) {
          actualizar(b.id, cambios);
          sonar('pop', 0.8);
          animar(td, [{ backgroundColor: 'var(--koi)' }, { backgroundColor: 'transparent' }], { duration: 700, easing: 'ease-out' });
        }
      }
      td.innerHTML = celda(datos.porId.get(b.id), c);
      marco.focus({ preventScroll: true });
    };
    control.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        terminar(true);
        mover(1, 0);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        terminar(false);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        terminar(true);
        mover(0, e.shiftKey ? -1 : 1);
      }
      e.stopPropagation();
    });
    control.addEventListener('blur', () => terminar(true));
    if (c.tipo === 'lista') control.addEventListener('change', () => terminar(true));
  }

  function mover(df, dc) {
    sel.f = Math.min(Math.max(0, sel.f + df), filas.length - 1);
    sel.c = Math.min(Math.max(0, sel.c + dc), COLUMNAS.length - 1);
    marcar();
  }

  // ---------------------------------------------------------- eventos
  raiz.addEventListener('click', (e) => {
    const o = e.target.closest('[data-ordenar]');
    if (o) {
      const id = o.dataset.ordenar;
      orden = { col: id, dir: orden.col === id && orden.dir === 'asc' ? 'desc' : orden.col === id ? 'asc' : id === 'calificacion' || id === 'agregado' ? 'desc' : 'asc' };
      sonar('tab-switch');
      pintarEncabezado();
      pintarCuerpo();
      animar(tbody, [{ opacity: 0.4, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 220, easing: CURVA.salida });
      return;
    }
    const ab = e.target.closest('[data-abrir]');
    if (ab) {
      sonar('tap');
      return abrirFicha(ab.dataset.abrir, null);
    }
    const td = e.target.closest('td[data-c]');
    if (td) {
      sel = { f: td.closest('tr').sectionRowIndex, c: Number(td.dataset.c) };
      marcar();
    }
    if (e.target.closest('[data-csv]')) return exportarCSV();
    if (e.target.closest('[data-limpiar-filtros]')) {
      Object.keys(filtrosCol).forEach((k) => delete filtrosCol[k]);
      pintarEncabezado();
      pintarCuerpo();
      return;
    }
    const caj = e.target.closest('[data-cajon]');
    if (caj) return abrirCajon(caj.dataset.cajon);
    if (e.target.closest('.cajon-cerrar') || e.target === $('.cajon', raiz)) cerrarCajon();
  });
  tbody.addEventListener('dblclick', (e) => {
    const td = e.target.closest('td[data-c]');
    if (td && COLUMNAS[Number(td.dataset.c)].editable) editar(td);
    else if (td) abrirFicha(td.closest('tr').dataset.id, null);
  });
  thead.addEventListener('input', (e) => {
    const f = e.target.closest('[data-filtrar]');
    if (!f) return;
    filtrosCol[f.dataset.filtrar] = f.value;
    sel = { f: 0, c: sel.c };
    pintarCuerpo();
  });
  marco.addEventListener('keydown', (e) => {
    if (/INPUT|SELECT/.test(e.target.tagName)) return;
    const mapa = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] };
    if (mapa[e.key]) {
      e.preventDefault();
      mover(...mapa[e.key]);
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      const td = tbody.rows[sel.f]?.querySelector(`td[data-c="${sel.c}"]`);
      if (td) editar(td);
    }
  });

  function exportarCSV() {
    const cab = ['id', ...COLUMNAS.map((c) => c.nombre)];
    const filasCSV = filas.map((b) => [b.id, ...COLUMNAS.map((c) => (c.ver ? c.ver(b) : b[c.id] ?? ''))]);
    const csv = [cab, ...filasCSV].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    descargar('libros.csv', '﻿' + csv, 'text/csv');
    emitirAviso('CSV descargado');
  }

  // ---------------------------------------------------------- cajón
  const cajon = $('.cajon', raiz);
  const cuerpo = $('.cajon-cuerpo', raiz);
  function abrirCajon(que) {
    sonar('expand');
    cuerpo.innerHTML = PANELES[que]();
    cajon.hidden = false;
    cajon.classList.remove('cerrando');
    animar($('.cajon-panel', raiz), [{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: 420, easing: CURVA.cajon });
    if (que === 'publicar') resumenCambios();
    if (que === 'revisar') pintarRevisar();
    if (que === 'agregar') prepararAgregar();
  }
  function cerrarCajon() {
    sonar('collapse');
    const a = animar($('.cajon-panel', raiz), [{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: 260, easing: CURVA.salida, fill: 'forwards' });
    a.finished.then(() => {
      cajon.hidden = true;
      $('.cajon-panel', raiz).getAnimations().forEach((x) => x.cancel());
    });
  }

  const PANELES = {
    agregar: () => `
      <h2>Añadir un libro</h2>
      <form class="buscar-libro">
        <label><span>Título</span><input name="titulo" required autocomplete="off" placeholder="p. ej. Solaris"></label>
        <label><span>Autor</span><input name="autor" autocomplete="off" placeholder="p. ej. Stanisław Lem"></label>
        <label><span>ISBN <small>(opcional)</small></span><input name="isbn" inputmode="numeric" autocomplete="off"></label>
        <div class="fila-botones"><button class="boton primario">Buscar en línea</button>
        <button type="button" class="boton" data-accion="manual">Llenar a mano</button></div>
      </form>
      <div class="resultados" hidden></div>
      <form class="nuevo-libro" hidden></form>`,
    publicar: () => `
      <h2>Publicar cambios</h2>
      <div class="cambios-resumen"></div>
      <div class="fila-botones">
        <button type="button" class="boton primario" data-accion="descargar">Descargar libros.json</button>
        <button type="button" class="boton" data-accion="copiar">Copiar</button>
      </div>
      <ol class="pasos-publicar">
        <li>Descarga <code>libros.json</code> con el botón de arriba.</li>
        <li>En GitHub abre <code>librero/data/</code> → <em>Add file</em> → <em>Upload files</em> y suelta el archivo (reemplaza al anterior).</li>
        <li>Pulsa <em>Commit changes</em>. El robot comprime las portadas nuevas y en unos minutos el sitio queda actualizado.</li>
      </ol>
      <div class="confirmar-descartar">
        <button type="button" class="enlace peligro-texto" data-accion="pedir-descartar">Descartar los cambios de este navegador</button>
      </div>`,
    importar: () => `
      <h2>Importar</h2>
      <p class="tenue">Carga un <code>libros.json</code> (por ejemplo, desde otra computadora).</p>
      <label class="boton archivo">Elegir archivo<input type="file" accept="application/json,.json" data-importar hidden></label>`,
    revisar: () => `<h2>Por revisar</h2><div class="revisar-cuerpo"></div>`,
  };

  function resumenCambios() {
    const n = contarCambios();
    const c = datos.cambios;
    const r = $('.cambios-resumen', cuerpo);
    if (!r) return;
    r.innerHTML = `<p class="cifra-grande">${n}</p><p>${n === 1 ? 'cambio sin publicar' : 'cambios sin publicar'}</p>
      ${n ? `<p class="tenue">${[Object.keys(c.editados).length && plural(Object.keys(c.editados).length, 'libro editado', 'libros editados'),
        Object.keys(c.nuevos).length && plural(Object.keys(c.nuevos).length, 'libro nuevo', 'libros nuevos'),
        c.eliminados.length && plural(c.eliminados.length, 'eliminado', 'eliminados')].filter(Boolean).join(' · ')}</p>` : '<p class="tenue">Todo lo que ves ya está publicado.</p>'}`;
  }

  function pintarRevisar() {
    const grupos = [
      ['Sin portada', datos.libros.filter((b) => !b.portada && b.repisa !== 'juegos')],
      ['Sin sinopsis', datos.libros.filter((b) => !b.sinopsis && !b.sinopsis_propia && b.repisa !== 'juegos')],
      ['Sin categoría', datos.libros.filter((b) => b.repisa === 'por-clasificar')],
    ];
    $('.revisar-cuerpo', cuerpo).innerHTML = grupos
      .map(([t, l]) => `<details class="plegable"><summary><span>${t}</span><b>${l.length}</b></summary><div class="plegable-cuerpo"><ul class="lista-revisar">${l
        .map((b) => `<li><button type="button" class="enlace" data-revisar="${b.id}">${esc(b.titulo)}</button> <small>${esc(String(b.autor).split(',')[0])}</small></li>`)
        .join('')}</ul></div></details>`)
      .join('');
  }

  // Flujo de "Añadir un libro" (búsqueda → edición → aprobación de portada).
  let candidatos = [];
  let portadaElegida = null;
  function prepararAgregar() {
    const formBuscar = $('.buscar-libro', cuerpo);
    const resultados = $('.resultados', cuerpo);
    const formNuevo = $('.nuevo-libro', cuerpo);
    formBuscar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = Object.fromEntries(new FormData(formBuscar));
      resultados.hidden = false;
      formNuevo.hidden = true;
      resultados.innerHTML = `<p class="cargando-linea"><span></span>Buscando en Open Library y Google Books…</p>`;
      sonar('carga');
      candidatos = await buscarCandidatos(q).catch(() => []);
      if (!candidatos.length) {
        resultados.innerHTML = `<p class="tenue">Sin resultados. Revisa la ortografía o usa “Llenar a mano”.</p>`;
        return;
      }
      resultados.innerHTML = `<p class="sobretitulo">${plural(candidatos.length, 'coincidencia', 'coincidencias')} · elige la edición que tienes</p>
        <div class="lista-candidatos">${candidatos.slice(0, 14).map((c, i) => `
          <button type="button" class="candidato" data-i="${i}" style="--i:${i}">
            <span class="mini">${c.miniatura ? `<img src="${esc(c.miniatura)}" alt="" loading="lazy">` : '<i></i>'}</span>
            <span class="txt"><strong>${esc(c.titulo)}</strong><span>${esc(c.autores.slice(0, 2).join(', '))}</span>
            <small>${esc([c.anio, c.editorial, c.fuente].filter(Boolean).join(' · '))}</small></span>
          </button>`).join('')}</div>`;
    });
    resultados.addEventListener('click', (e) => {
      const c = e.target.closest('.candidato');
      if (!c) return;
      $$('.candidato', resultados).forEach((x) => x.classList.toggle('activo', x === c));
      formulario(candidatos[Number(c.dataset.i)]);
    });
    cuerpo.addEventListener('click', (e) => {
      if (e.target.closest('[data-accion="manual"]')) {
        resultados.hidden = true;
        candidatos = [];
        const q = Object.fromEntries(new FormData(formBuscar));
        formulario({ titulo: q.titulo, autores: q.autor ? [q.autor] : [], isbn: q.isbn });
      }
    });
    formNuevo.addEventListener('click', async (e) => {
      const p = e.target.closest('[data-portada]');
      if (p) {
        $$('.tira button', formNuevo).forEach((x) => x.classList.toggle('activa', x === p));
        $('.portada-grande', formNuevo).innerHTML = `<img src="${esc(p.dataset.portada)}" alt="">`;
        portadaElegida = null;
        $('.aprobacion', formNuevo).dataset.estado = 'pendiente';
        $('.aprobar span', formNuevo).textContent = 'Aprobar esta portada';
        return;
      }
      const ap = e.target.closest('[data-accion="aprobar-portada"]');
      if (ap) {
        const img = $('.portada-grande img', formNuevo);
        if (!img) return;
        if ($('.aprobacion', formNuevo).dataset.estado === 'aprobada') {
          portadaElegida = null;
          $('.aprobacion', formNuevo).dataset.estado = 'pendiente';
          $('span', ap).textContent = 'Aprobar esta portada';
          return;
        }
        $('span', ap).textContent = 'Procesando…';
        portadaElegida = (await comprimirImagen(img.src)) || img.src;
        $('.aprobacion', formNuevo).dataset.estado = 'aprobada';
        $('span', ap).textContent = 'Portada aprobada';
        sonar('success');
      }
    });
    formNuevo.addEventListener('change', async (e) => {
      if (!e.target.matches('[data-portada-propia]') || !e.target.files?.[0]) return;
      const url = await new Promise((r) => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsDataURL(e.target.files[0]);
      });
      portadaElegida = await comprimirImagen(url);
      $('.portada-grande', formNuevo).innerHTML = `<img src="${portadaElegida}" alt="">`;
      $('.aprobacion', formNuevo).dataset.estado = 'aprobada';
    });
    formNuevo.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(formNuevo));
      const c = formNuevo._candidato || {};
      const num = (v) => (v ? Number(v) : null);
      const enRepisa = datos.libros.filter((b) => b.repisa === f.repisa).length;
      const b = agregar({
        titulo: f.titulo.trim(), subtitulo: f.subtitulo.trim() || null, serie: f.serie.trim() || null,
        autor: f.autor.trim() || 'Autor desconocido', repisa: f.repisa, formato: f.formato, fisico: f.formato !== 'Kindle',
        paginas: num(f.paginas), anio: num(f.anio), isbn: f.isbn.trim() || null, editorial: f.editorial.trim() || null,
        sinopsis: f.sinopsis.trim() || null,
        sinopsis_fuente: f.sinopsis.trim() && c.fuente ? { nombre: c.fuente, url: c.url, idioma: c.idioma || null } : null,
        portada: portadaElegida, metadatos_listos: true, otros_ejemplares: [],
        ubicacion: { fuente: 'virtual', mueble: null, repisa_fisica: null, posicion: enRepisa, orientacion: 'vertical', inclinacion: 0, pila: null, nivel_pila: null, desfase_mm: 0 },
      });
      sonar('success');
      emitirAviso(`“${b.titulo}” se añadió a ${nombreRepisa(b.repisa)}`);
      cerrarCajon();
      abrirFicha(b.id, null);
    });

    async function formulario(c = {}) {
      portadaElegida = null;
      const portadas = [...new Set(candidatos.filter((x) => x.titulo === c.titulo || x === c).flatMap((x) => x.portadas))].slice(0, 8);
      const repisas = datos.repisas.map((r) => `<option value="${r.id}">${esc(r.nombre)}</option>`).join('');
      const campo = (n, et, v = '', tipo = 'text') => `<label><span>${et}</span><input name="${n}" type="${tipo}" value="${esc(v ?? '')}"></label>`;
      formNuevo.hidden = false;
      formNuevo.innerHTML = `
        <p class="sobretitulo">Revisa y corrige antes de añadir</p>
        <div class="nuevo-rejilla">
          <div class="nuevo-portada"><div class="aprobacion" data-estado="pendiente">
            <div class="portada-grande">${portadas[0] ? `<img src="${esc(portadas[0])}" alt="">` : '<span class="tenue">Sin portada</span>'}</div>
            ${portadas.length > 1 ? `<div class="tira">${portadas.map((p, i) => `<button type="button" class="${i ? '' : 'activa'}" data-portada="${esc(p)}"><img src="${esc(p)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
            ${portadas.length ? `<button type="button" class="boton aprobar" data-accion="aprobar-portada"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 6.5" pathLength="1"/></svg><span>Aprobar esta portada</span></button>` : ''}
            <label class="boton chico archivo">o sube una foto<input type="file" accept="image/*" data-portada-propia hidden></label>
          </div></div>
          <div class="nuevo-campos">
            ${campo('titulo', 'Título', c.titulo)}${campo('subtitulo', 'Subtítulo', c.subtitulo)}
            ${campo('autor', 'Autor(es)', (c.autores || []).join(', '))}${campo('serie', 'Serie')}
            <label><span>Categoría</span><select name="repisa">${repisas}</select></label>
            <label><span>Formato</span><select name="formato">${FORMATOS.map((f) => `<option>${f}</option>`).join('')}</select></label>
            ${campo('paginas', 'Páginas', c.paginas, 'number')}${campo('anio', 'Año', c.anio, 'number')}
            ${campo('isbn', 'ISBN', c.isbn)}${campo('editorial', 'Editorial', c.editorial)}
            <label class="ancho"><span>Sinopsis ${c.fuente ? `<small>(${esc(c.fuente)})</small>` : ''}</span><textarea name="sinopsis" rows="6">${esc(c.descripcion ? limpiarHTML(c.descripcion) : '')}</textarea></label>
          </div>
        </div>
        <div class="fila-botones"><button class="boton primario grande">Añadir al librero</button></div>`;
      formNuevo._candidato = c;
      animar(formNuevo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: CURVA.salida });
      if (!c.descripcion && c.fuente === 'Open Library' && c.clave) {
        const d = await descripcionOpenLibrary(c.clave);
        const ta = formNuevo.querySelector('[name="sinopsis"]');
        if (d && ta && !ta.value) ta.value = d;
      }
    }
  }

  cuerpo.addEventListener('click', async (e) => {
    const acc = e.target.closest('[data-accion]')?.dataset.accion;
    if (acc === 'descargar') {
      descargar('libros.json', exportar());
      sonar('success');
      emitirAviso('libros.json descargado');
    } else if (acc === 'copiar') {
      try {
        await navigator.clipboard.writeText(exportar());
        sonar('copy');
        emitirAviso('JSON copiado al portapapeles');
      } catch {
        emitirAviso('El navegador no permitió copiar; usa “Descargar”.');
      }
    } else if (acc === 'pedir-descartar') {
      $('.confirmar-descartar', cuerpo).innerHTML = `<p>¿Seguro? Se perderán ${contarCambios()} cambios de este navegador.</p>
        <div class="fila-botones"><button type="button" class="boton chico peligro-lleno" data-accion="descartar">Sí, descartar</button><button type="button" class="boton chico" data-accion="no-descartar">Cancelar</button></div>`;
    } else if (acc === 'descartar') {
      descartarCambios();
      sonar('delete');
      emitirAviso('Cambios descartados');
      resumenCambios();
      $('.confirmar-descartar', cuerpo).innerHTML = '';
    } else if (acc === 'no-descartar') {
      cuerpo.innerHTML = PANELES.publicar();
      resumenCambios();
    }
    const rev = e.target.closest('[data-revisar]');
    if (rev) abrirFicha(rev.dataset.revisar, null);
  });
  cuerpo.addEventListener('change', (e) => {
    if (!e.target.matches('[data-importar]') || !e.target.files?.[0]) return;
    e.target.files[0].text().then((t) => {
      try {
        importar(t);
        sonar('success');
        emitirAviso('Librero importado');
      } catch (err) {
        emitirAviso(`No se pudo importar: ${err.message}`);
      }
    });
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !cajon.hidden && !document.querySelector('.ficha-capa')) cerrarCajon();
  });

  escuchar('cambio', () => {
    if (raiz.hidden) return;
    estado();
    if (!cajon.hidden) resumenCambios();
  });

  return {
    render(nueva) {
      lista = nueva;
      pintarEncabezado();
      pintarCuerpo();
    },
  };
}
