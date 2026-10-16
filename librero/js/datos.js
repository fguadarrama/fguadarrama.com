// Datos del librero.
// - data/libros.json es la fuente publicada (la que está en GitHub).
// - Tus cambios en la web se guardan en este navegador (localStorage) hasta
//   que los descargas como un libros.json nuevo y lo subes al repositorio.

import { norm } from './util.js';

const CLAVE = 'librero.cambios.v1';
const bus = new EventTarget();

export const datos = {
  repisas: [],
  libros: [],
  porId: new Map(),
  publicado: null, // copia intacta de libros.json
  cambios: { editados: {}, nuevos: {}, eliminados: [] },
};

export const escuchar = (tipo, fn) => bus.addEventListener(tipo, (e) => fn(e.detail));
const emitir = (tipo, detalle) => bus.dispatchEvent(new CustomEvent(tipo, { detail: detalle }));

const PERSONALES = { estado: null, calificacion: null, comentarios: '', sinopsis_propia: null };

export async function cargar() {
  let publicado;
  for (const ruta of ['data/libros.json', 'data/base.json']) {
    try {
      const r = await fetch(ruta, { cache: 'no-cache' });
      if (r.ok) {
        publicado = await r.json();
        break;
      }
    } catch {
      /* siguiente opción */
    }
  }
  if (!publicado) throw new Error('No se encontró data/libros.json');
  datos.publicado = publicado;
  try {
    datos.cambios = { ...datos.cambios, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') };
  } catch {
    /* almacenamiento bloqueado: se trabaja sin guardar localmente */
  }
  reconstruir();
}

function reconstruir() {
  const { publicado, cambios } = datos;
  const eliminados = new Set([...(publicado.eliminados || []), ...cambios.eliminados]);
  datos.repisas = publicado.repisas;
  datos.libros = [];
  for (const b of publicado.libros) {
    if (eliminados.has(b.id)) continue;
    datos.libros.push({ ...PERSONALES, ...b, ...(cambios.editados[b.id] || {}) });
  }
  for (const b of Object.values(cambios.nuevos)) {
    if (!eliminados.has(b.id)) datos.libros.push({ ...PERSONALES, ...b });
  }
  datos.porId = new Map(datos.libros.map((b) => [b.id, b]));
  for (const b of datos.libros) b._busqueda = textoBusqueda(b);
}

function textoBusqueda(b) {
  const repisa = datos.repisas.find((r) => r.id === b.repisa)?.nombre || '';
  return norm([b.titulo, b.subtitulo, b.autor, b.serie, repisa, b.isbn, b.editorial, b.anio].join(' '));
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos.cambios));
  } catch {
    emitir('error', 'No se pudo guardar en este navegador (¿modo privado o espacio lleno?).');
  }
}

export function actualizar(id, parcial) {
  const b = datos.porId.get(id);
  if (!b) return;
  Object.assign(b, parcial);
  if (datos.cambios.nuevos[id]) {
    Object.assign(datos.cambios.nuevos[id], parcial);
  } else {
    datos.cambios.editados[id] = { ...(datos.cambios.editados[id] || {}), ...parcial };
  }
  b._busqueda = textoBusqueda(b);
  guardar();
  emitir('cambio', { id, parcial });
}

export function agregar(libro) {
  const id = libro.id || `n${Date.now().toString(36)}`;
  const nuevo = { ...PERSONALES, ...libro, id, agregado: new Date().toISOString() };
  datos.cambios.nuevos[id] = nuevo;
  guardar();
  reconstruir();
  emitir('cambio', { id, nuevo: true });
  return datos.porId.get(id);
}

export function eliminar(id) {
  if (datos.cambios.nuevos[id]) delete datos.cambios.nuevos[id];
  else if (!datos.cambios.eliminados.includes(id)) datos.cambios.eliminados.push(id);
  delete datos.cambios.editados[id];
  guardar();
  reconstruir();
  emitir('cambio', { id, eliminado: true });
}

export function contarCambios() {
  const c = datos.cambios;
  return Object.keys(c.editados).length + Object.keys(c.nuevos).length + c.eliminados.length;
}

export function descartarCambios() {
  datos.cambios = { editados: {}, nuevos: {}, eliminados: [] };
  guardar();
  reconstruir();
  emitir('cambio', { todo: true });
}

// libros.json completo, listo para reemplazar el del repositorio.
export function exportar() {
  const limpiar = (b) => Object.fromEntries(Object.entries(b).filter(([k]) => !k.startsWith('_')));
  const salida = {
    version: 1,
    actualizado: new Date().toISOString(),
    repisas: datos.repisas,
    libros: datos.libros.map(limpiar),
    eliminados: [...new Set([...(datos.publicado.eliminados || []), ...datos.cambios.eliminados])],
  };
  return JSON.stringify(salida, null, 1);
}

export function importar(texto) {
  const json = JSON.parse(texto);
  if (!Array.isArray(json.libros)) throw new Error('El archivo no tiene una lista "libros".');
  datos.publicado = json;
  datos.cambios = { editados: {}, nuevos: {}, eliminados: [] };
  guardar();
  reconstruir();
  emitir('cambio', { todo: true });
}

export const nombreRepisa = (id) => datos.repisas.find((r) => r.id === id)?.nombre || 'Por clasificar';

// ----------------------------------------------------------- filtros y búsqueda
export const filtros = { q: '', estado: 'todos', formato: 'todos', orden: 'repisa' };

export function filtrar(lista = datos.libros) {
  const tokens = norm(filtros.q).split(/\s+/).filter(Boolean);
  return lista.filter((b) => {
    if (filtros.estado !== 'todos') {
      if (filtros.estado === 'sin' ? b.estado : b.estado !== filtros.estado) return false;
    }
    if (filtros.formato === 'fisico' && b.fisico === false) return false;
    if (filtros.formato === 'kindle' && b.fisico !== false) return false;
    return tokens.every((t) => b._busqueda.includes(t));
  });
}

export function cambiarFiltros(parcial) {
  Object.assign(filtros, parcial);
  emitir('filtros', { ...filtros });
}

export const ESTADOS = {
  'por-leer': { nombre: 'Por leer', color: 'var(--ruri)' },
  leido: { nombre: 'Leído', color: 'var(--koi)' },
  descartado: { nombre: 'Descartado', color: 'var(--nakabeni)' },
};

export function emitirAviso(texto) {
  emitir('aviso', texto);
}
