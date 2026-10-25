// Exportar a PDF: una lista impresa por repisa (título, autor, serie y
// formato, con portada pequeña si se quiere). Se arma un documento aparte en
// un iframe y se abre la ventana de impresión del navegador; ahí se elige
// «Guardar como PDF». Así el PDF lleva texto real (se puede buscar y copiar)
// y las mismas tipografías del sitio, sin librerías externas.
import { datos, nombreRepisa } from './datos.js';
import { colores } from './lomos.js';
import { $, $$, esc, plural } from './util.js';
import { sonar } from './sonidos.js';

const FUENTES = 'https://fonts.googleapis.com/css2?family=Albert+Sans:ital,wght@0,300..700;1,400&family=Instrument+Serif:ital@0;1&display=swap';

const librosDe = (repisa) =>
  datos.libros
    .filter((b) => b.repisa === repisa)
    .sort((a, b) => (a.ubicacion?.posicion ?? 1e6) - (b.ubicacion?.posicion ?? 1e6) || a.titulo.localeCompare(b.titulo, 'es'));

const repisasConLibros = () => datos.repisas.filter((r) => datos.libros.some((b) => b.repisa === r.id));

// «Kostas Jaritos #2» → { nombre: 'Kostas Jaritos', numero: '2' }
function serie(b) {
  const m = /^(.*?)\s*#\s*(\d+)\s*$/.exec(b.serie || '');
  return b.serie ? { nombre: m ? m[1] : b.serie, numero: m ? m[2] : '' } : null;
}

// ------------------------------------------------------------------ diálogo
export function abrirExportar() {
  $('dialog.exportar')?.remove();
  const actual = (() => {
    try {
      return localStorage.getItem('librero.repisa');
    } catch {
      return null;
    }
  })();
  const lista = repisasConLibros();
  const d = document.createElement('dialog');
  d.className = 'exportar';
  d.setAttribute('aria-labelledby', 'exportar-titulo');
  d.innerHTML = `<form method="dialog">
      <h2 id="exportar-titulo">Exportar PDF</h2>
      <p class="exportar-ayuda">Elige las repisas. Se abrirá la ventana de impresión: en «Destino» elige <strong>Guardar como PDF</strong>.</p>
      <div class="exportar-atajos"><button type="button" class="enlace" data-todas>Todas</button><button type="button" class="enlace" data-ninguna>Ninguna</button></div>
      <div class="exportar-repisas">${lista
        .map((r) => {
          const n = librosDe(r.id).length;
          return `<label class="exportar-repisa"><input type="checkbox" name="repisa" value="${r.id}" ${r.id === actual || (!actual && r === lista[0]) ? 'checked' : ''}>
            <img src="iconos/rep-${r.id}.svg" alt="" width="28" height="28"><span>${esc(r.nombre)}</span><em>${n}</em></label>`;
        })
        .join('')}</div>
      <label class="exportar-opcion"><input type="checkbox" name="portadas" checked> Con portadas pequeñas</label>
      <div class="exportar-pie"><p class="exportar-resumen" aria-live="polite"></p>
        <div class="fila-botones"><button type="submit" value="cancelar" class="boton chico">Cancelar</button><button type="button" class="boton chico primario" data-crear>Crear PDF</button></div></div>
    </form>`;
  document.body.append(d);
  const marcadas = () => $$('input[name="repisa"]:checked', d).map((i) => i.value);
  const resumir = () => {
    const ids = marcadas();
    $$('.exportar-repisa', d).forEach((l) => l.classList.toggle('activa', $('input', l).checked));
    const n = ids.reduce((s, id) => s + librosDe(id).length, 0);
    $('.exportar-resumen', d).textContent = ids.length ? `${plural(ids.length, 'repisa', 'repisas')} · ${plural(n, 'libro', 'libros')}` : 'Elige al menos una repisa.';
    $('[data-crear]', d).disabled = !ids.length;
  };
  d.addEventListener('change', resumir);
  $('[data-todas]', d).addEventListener('click', () => ($$('input[name="repisa"]', d).forEach((i) => (i.checked = true)), resumir()));
  $('[data-ninguna]', d).addEventListener('click', () => ($$('input[name="repisa"]', d).forEach((i) => (i.checked = false)), resumir()));
  $('[data-crear]', d).addEventListener('click', () => {
    const ids = marcadas();
    if (!ids.length) return;
    sonar('success');
    d.close();
    imprimir(ids, { portadas: $('input[name="portadas"]', d).checked });
  });
  d.addEventListener('close', () => setTimeout(() => d.remove(), 200));
  resumir();
  sonar('expand');
  d.showModal();
}

// ------------------------------------------------------------------ documento
function fila(b, i, conPortada) {
  const c = colores(b);
  const s = serie(b);
  const mini = !conPortada
    ? ''
    : b.portada
      ? `<img class="mini" src="${esc(b.portada)}" alt="">`
      : `<span class="mini dibujada" style="background:${c.fondo};color:${c.texto}"><i style="background:${c.acento}"></i></span>`;
  const extra = [s ? `${esc(s.nombre)}${s.numero ? ` · n.º ${s.numero}` : ''}` : '', b.formato && b.formato !== 'Desconocido' ? esc(b.formato) : '']
    .filter(Boolean)
    .join('<span class="punto">·</span>');
  return `<li${s ? ' class="en-serie"' : ''}>
    <span class="num">${String(i + 1).padStart(2, '0')}</span>${mini}
    <div class="datos"><p class="titulo">${esc(b.titulo)}</p><p class="autor">${esc(b.autor)}</p>${extra ? `<p class="extra">${extra}</p>` : ''}</div>
  </li>`;
}

function documento(ids, { portadas }) {
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const bloques = ids.map((id) => ({ id, nombre: nombreRepisa(id), libros: librosDe(id) }));
  const total = bloques.reduce((s, x) => s + x.libros.length, 0);
  const nombreArchivo = `Librero · ${ids.length === 1 ? bloques[0].nombre : `${ids.length} repisas`}`;
  const secciones = bloques
    .map((r) => {
      const series = new Set(r.libros.map((b) => serie(b)?.nombre).filter(Boolean)).size;
      return `<section class="repisa">
        <header><img src="iconos/rep-${r.id}.svg" alt=""><div>
          <p class="antetitulo">Repisa</p><h2>${esc(r.nombre)}</h2>
          <p class="cuenta">${plural(r.libros.length, 'libro', 'libros')}${series ? ` · ${plural(series, 'serie', 'series')}` : ''}</p></div></header>
        <ol class="libros${portadas ? ' con-portadas' : ''}">${r.libros.map((b, i) => fila(b, i, portadas)).join('')}</ol>
      </section>`;
    })
    .join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<base href="${esc(location.href.split('#')[0])}">
<title>${esc(nombreArchivo)}</title>
<link rel="stylesheet" href="${FUENTES}">
<style>
  /* Tinta y papel del Librero. A4 con márgenes generosos; cada repisa
     empieza en página nueva y ningún libro se parte entre dos páginas. */
  @page { size: A4; margin: 18mm 16mm 20mm; }
  @page { @bottom-center { content: counter(page); font: 400 9pt 'Albert Sans', sans-serif; color: #8a9096; } }
  :root { --tinta: #303840; --tenue: #7b828a; --linea: #d9dcdf; --acento: #C93756; --papel: #ffffff; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: var(--papel); color: var(--tinta); font: 400 10pt/1.35 'Albert Sans', system-ui, sans-serif; }
  .portada { height: 245mm; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 18mm; break-after: page; }
  .portada .marca { width: 22mm; height: 22mm; margin-bottom: 10mm; }
  .portada h1 { margin: 0; font: italic 400 64pt/0.95 'Instrument Serif', Georgia, serif; letter-spacing: -0.01em; }
  .portada .sub { margin: 6mm 0 0; font: 400 15pt/1.3 'Instrument Serif', Georgia, serif; }
  .portada .meta { margin: 10mm 0 0; padding-top: 4mm; border-top: 0.6pt solid var(--tinta); font-size: 8.5pt; letter-spacing: .16em; text-transform: uppercase; color: var(--tenue); display: flex; justify-content: space-between; }
  .repisa + .repisa { break-before: page; }
  .repisa header { display: flex; align-items: center; gap: 6mm; padding-bottom: 5mm; margin-bottom: 6mm; border-bottom: 0.8pt solid var(--tinta); }
  .repisa header img { width: 18mm; height: 18mm; }
  .antetitulo { margin: 0; font-size: 7.5pt; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--acento); }
  .repisa h2 { margin: 1mm 0 0; font: 400 30pt/1 'Instrument Serif', Georgia, serif; }
  .cuenta { margin: 2mm 0 0; font: italic 400 12pt/1 'Instrument Serif', Georgia, serif; color: var(--tenue); }
  .libros { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 10mm; }
  .libros li { break-inside: avoid; display: grid; grid-template-columns: 7mm auto 1fr; align-items: start; gap: 0 3mm; padding: 2.4mm 0; border-bottom: 0.4pt solid var(--linea); }
  .libros:not(.con-portadas) li { grid-template-columns: 7mm 1fr; }
  .num { font: italic 400 10pt/1.2 'Instrument Serif', Georgia, serif; color: var(--acento); padding-top: 0.6mm; }
  .mini { width: 9mm; height: 13.5mm; object-fit: cover; border-radius: 0.8mm; box-shadow: 0 0 0 0.3pt rgba(0,0,0,.18); display: block; }
  .mini.dibujada { position: relative; overflow: hidden; }
  .mini.dibujada i { position: absolute; left: 1.4mm; right: 1.4mm; top: 6mm; height: 0.6mm; }
  .datos { min-width: 0; }
  .titulo { margin: 0; font: 400 12.5pt/1.12 'Instrument Serif', Georgia, serif; }
  .autor { margin: 0.8mm 0 0; font-size: 7.6pt; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
  .extra { margin: 0.8mm 0 0; font-size: 7.6pt; color: var(--tenue); }
  .punto { margin: 0 1.2mm; }
  .en-serie .num { color: var(--tinta); }
</style></head><body>
  <section class="portada">
    <img class="marca" src="iconos/favicon.svg" alt="">
    <h1>Librero</h1>
    <p class="sub">${esc(bloques.map((x) => x.nombre).join(' · '))}</p>
    <p class="meta"><span>${plural(total, 'libro', 'libros')}</span><span>${esc(fecha)}</span></p>
  </section>
  ${secciones}
</body></html>`;
}

function imprimir(ids, opciones) {
  $('iframe.exportar-marco')?.remove();
  const f = document.createElement('iframe');
  f.className = 'exportar-marco';
  f.setAttribute('aria-hidden', 'true');
  f.tabIndex = -1;
  document.body.append(f);
  f.addEventListener('load', async () => {
    const doc = f.contentDocument;
    // espera las tipografías y las portadas: si no, el PDF sale a medias
    await Promise.race([
      Promise.all([doc.fonts?.ready, ...[...doc.images].map((im) => im.decode?.().catch(() => {}))]),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
    const original = document.title;
    document.title = doc.title; // Safari usa el título de la página como nombre del archivo
    f.contentWindow.focus();
    f.contentWindow.print();
    document.title = original;
    setTimeout(() => f.remove(), 1000);
  }, { once: true });
  f.srcdoc = documento(ids, opciones);
}

// Para pruebas: el HTML del documento sin imprimir.
export const documentoExportar = documento;
