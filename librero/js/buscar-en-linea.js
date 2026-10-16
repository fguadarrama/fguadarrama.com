// Búsqueda en línea desde el navegador: Open Library (principal) y
// Google Books (respaldo). Nada se guarda sin tu aprobación.

import { norm } from './util.js';

const OL = 'https://openlibrary.org';
const CAMPOS = [
  'key', 'title', 'subtitle', 'author_name', 'cover_i', 'first_publish_year', 'number_of_pages_median',
  'editions', 'editions.key', 'editions.title', 'editions.cover_i', 'editions.isbn',
  'editions.publisher', 'editions.language', 'editions.number_of_pages_median',
].join(',');

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const portadaOL = (id, t = 'L') => `https://covers.openlibrary.org/b/id/${id}-${t}.jpg`;

export async function buscarCandidatos({ titulo = '', autor = '', isbn = '' }) {
  const res = [];
  const tareas = [];

  const p = new URLSearchParams({ fields: CAMPOS, limit: '12' });
  if (isbn) p.set('isbn', isbn.replace(/[^0-9Xx]/g, ''));
  else {
    if (titulo) p.set('title', titulo);
    if (autor) p.set('author', autor);
  }
  tareas.push(
    json(`${OL}/search.json?${p}`)
      .then((d) => {
        for (const doc of d.docs || []) {
          const ed = doc.editions?.docs?.[0] || {};
          const portadas = [ed.cover_i, doc.cover_i].filter(Boolean).map((i) => portadaOL(i));
          res.push({
            fuente: 'Open Library',
            clave: doc.key,
            titulo: ed.title || doc.title,
            subtitulo: doc.subtitle || null,
            autores: doc.author_name || [],
            anio: doc.first_publish_year || null,
            editorial: ed.publisher?.[0] || null,
            paginas: ed.number_of_pages_median || doc.number_of_pages_median || null,
            isbn: (ed.isbn || []).find((x) => x.length === 13) || ed.isbn?.[0] || null,
            portadas: [...new Set(portadas)],
            miniatura: portadas[0] ? portadas[0].replace('-L.jpg', '-M.jpg') : null,
            url: `${OL}${doc.key}`,
          });
        }
      })
      .catch(() => {})
  );

  const q = isbn ? `isbn:${isbn}` : [titulo && `intitle:${titulo}`, autor && `inauthor:${autor}`].filter(Boolean).join('+');
  tareas.push(
    json(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books`)
      .then((d) => {
        for (const it of d.items || []) {
          const v = it.volumeInfo || {};
          const img = v.imageLinks?.thumbnail?.replace('http:', 'https:');
          res.push({
            fuente: 'Google Books',
            clave: it.id,
            titulo: v.title,
            subtitulo: v.subtitle || null,
            autores: v.authors || [],
            anio: v.publishedDate ? Number(v.publishedDate.slice(0, 4)) : null,
            editorial: v.publisher || null,
            paginas: v.pageCount || null,
            isbn: v.industryIdentifiers?.find((x) => x.type === 'ISBN_13')?.identifier || null,
            descripcion: v.description || null,
            idioma: v.language || null,
            portadas: img ? [img.replace('&edge=curl', '').replace('zoom=1', 'zoom=0') + '&fife=w600', img] : [],
            miniatura: img || null,
            url: v.infoLink || `https://books.google.com/books?id=${it.id}`,
          });
        }
      })
      .catch(() => {})
  );

  await Promise.all(tareas);
  // Ordena por parecido con lo que escribiste.
  const nt = norm(titulo), na = norm(autor);
  const puntos = (c) =>
    (nt && norm(c.titulo).includes(nt) ? 2 : 0) +
    (na && c.autores.some((a) => norm(a).includes(na.split(' ').at(-1))) ? 2 : 0) +
    (c.portadas.length ? 1 : 0) + (c.descripcion ? 0.5 : 0);
  return res.sort((a, b) => puntos(b) - puntos(a));
}

export async function descripcionOpenLibrary(clave) {
  try {
    const d = await json(`${OL}${clave}.json`);
    const t = typeof d.description === 'string' ? d.description : d.description?.value;
    return t ? t.split(/\n-{3,}|\(\[source\]/)[0].trim() : null;
  } catch {
    return null;
  }
}

export async function buscarSinopsis(libro) {
  const cands = await buscarCandidatos({ titulo: libro.titulo, autor: String(libro.autor).split(',')[0] });
  const ap = norm(String(libro.autor).split(',')[0]).split(' ').at(-1);
  const validos = cands.filter((c) => c.autores.some((a) => norm(a).includes(ap)));
  for (const c of validos) {
    if (c.descripcion) return { texto: limpiarHTML(c.descripcion), fuente: c.fuente, url: c.url, idioma: c.idioma };
  }
  for (const c of validos.filter((x) => x.fuente === 'Open Library').slice(0, 3)) {
    const t = await descripcionOpenLibrary(c.clave);
    if (t) return { texto: t, fuente: 'Open Library', url: c.url, idioma: null };
  }
  return null;
}

export function limpiarHTML(t) {
  const d = document.createElement('div');
  d.innerHTML = String(t || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
  return d.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

// Reduce una imagen a un archivo WebP pequeño (≈300 px de ancho).
// Si el servidor no permite leer la imagen (CORS), devuelve la URL tal cual:
// el robot de GitHub la descargará y comprimirá al publicar.
export function comprimirImagen(src, { ancho = 300, alto = null, calidad = 0.74 } = {}) {
  return new Promise((resolver) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        if (img.naturalWidth < 60) return resolver(null);
        const escala = alto ? Math.min(1, alto / img.naturalHeight) : Math.min(1, ancho / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * escala);
        c.height = Math.round(img.naturalHeight * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolver(c.toDataURL('image/webp', calidad));
      } catch {
        resolver(src.startsWith('data:') || src.startsWith('blob:') ? null : src);
      }
    };
    img.onerror = () => resolver(null);
    img.src = src;
  });
}

export function leerArchivo(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = rechazar;
    lector.readAsDataURL(archivo);
  });
}
