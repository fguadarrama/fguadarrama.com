// Integración con epub.js: abrir el libro, inyectar estilos + Justif en cada capítulo,
// navegar, y aplicar cambios tipográficos conservando la posición de lectura.
import ePub from "epubjs";
import { ACCENT, GOOGLE_FONTS_URL, JUNICODE_CSS, fontById, themeById } from "./config.js";

const FRAME_SCRIPT = new URL(`${import.meta.env.BASE_URL}justif-frame.js`, location.href).href;
const STYLE_ID = "lecturi-style";
const BLOCKS = "p, li, dd, dt, blockquote, figcaption, h1, h2, h3, h4, h5, h6, pre, td, th, div, section, body";

// CSS que se inyecta en cada capítulo. Ojo: sin los caracteres < > & (el capítulo se
// serializa como XHTML y se escaparían dentro de <style>).
export function chapterCss(prefs) {
  const font = fontById(prefs.font);
  const theme = themeById(prefs.theme);
  return `${JUNICODE_CSS}
:root { color-scheme: ${theme.id === "oscuro" ? "dark" : "light"}; }
html:not([data-justif="on"]) body { visibility: hidden; }
html, body { background: transparent !important; color: ${theme.fg} !important; }
html.lecturi-anim, html.lecturi-anim body { transition: color 0.4s ease; }
body {
  font-family: ${font.stack} !important;
  font-size: ${prefs.fontSize}px !important;
  line-height: ${prefs.lineHeight} !important;
  font-kerning: normal; font-optical-sizing: auto;
  font-variant-ligatures: common-ligatures;
  text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;
}
body *:not(code):not(pre):not(kbd):not(samp):not(tt):not(svg):not(math) { font-family: inherit !important; }
body *:not(svg):not(svg *) { color: inherit !important; }
body p, body li, body dd, body blockquote, body figcaption, body div { line-height: ${prefs.lineHeight} !important; }
body p, body li, body dd, body blockquote, body figcaption {
  text-align: justify; hyphens: auto; -webkit-hyphens: auto;
}
body h1, body h2, body h3, body h4, body h5, body h6 { hyphens: manual; line-height: 1.2 !important; }
body a, body a * { color: ${ACCENT} !important; }
body a { text-decoration: underline; text-decoration-color: ${ACCENT}; text-decoration-thickness: 1px; text-underline-offset: 0.18em; }
::selection { background: ${ACCENT}; color: ${theme.bg}; }
`;
}

// Resuelve un CFI de elemento ("epubcfi(/6/2!/4/32)") en el DOM actual, sin depender de los
// nodos de texto (que Justif reescribe). Los pasos pares indican el n-ésimo hijo elemento.
function elementFromCfi(doc, cfi) {
  const path = (cfi.split("!")[1] || "").replace(/\)$/, "").split(":")[0];
  let el = doc.documentElement;
  for (const step of path.split("/").filter(Boolean)) {
    const n = parseInt(step, 10);
    if (!(n % 2 === 0)) break; // paso impar = nodo de texto: el elemento ya es el bloque
    el = el && el.children[n / 2 - 1];
  }
  return el || null;
}

// CFI de un párrafo -> CFI de su primer nodo de texto (epub.js no sitúa bien los de elemento).
const textCfi = (blockCfi) => blockCfi.replace(/\)$/, "/1:0)");

// Primer carácter realmente dibujado a partir de (nodo, desplazamiento). Los espacios entre
// líneas de Justif no tienen caja visible; epub.js los situaría en la página 1.
function renderedRange(doc, root, offset, fromEnd = false) {
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
  const visible = (n, i) => {
    const r = doc.createRange();
    r.setStart(n, i);
    r.setEnd(n, i + 1);
    return r.getClientRects().length && r.getBoundingClientRect().width > 0 ? r : null;
  };
  if (fromEnd) {
    for (let k = nodes.length - 1; k >= 0; k--)
      for (let i = nodes[k].length - 1; i >= 0; i--) {
        const r = visible(nodes[k], i);
        if (r) return r;
      }
    return null;
  }
  let left = offset;
  for (const n of nodes) {
    if (left >= n.length) {
      left -= n.length;
      continue;
    }
    for (let i = left; i < n.length; i++) {
      const r = visible(n, i);
      if (r) return r;
    }
    left = 0;
  }
  return null;
}

export class Reader {
  constructor(container, { prefs, onRelocated }) {
    this.container = container;
    this.prefs = prefs;
    this.onRelocated = onRelocated;
    this.book = null;
    this.rendition = null;
  }

  // resolveStart(id, metadata) devuelve la posición guardada { cfi, offset } o nada.
  async open(buffer, resolveStart) {
    this.destroy();
    const book = (this.book = ePub(buffer));
    await book.opened;
    const [metadata, navigation] = await Promise.all([book.loaded.metadata, book.loaded.navigation]);
    this.metadata = metadata;
    this.toc = navigation.toc;
    this.language = metadata.language || "";
    this.id = metadata.identifier || `${metadata.title}|${metadata.creator}`;

    // Antes de serializar cada capítulo: quitar scripts del EPUB e inyectar los nuestros.
    book.spine.hooks.content.register((doc) => this.prepareChapter(doc));

    // allowScriptedContent permite que corra Justif dentro del iframe. Los <script> propios
    // del EPUB se eliminan en prepareChapter(), así que solo se ejecuta nuestro código.
    // epub.js se limita a repartir en páginas (columnas CSS) el texto que compone Justif.
    this.rendition = book.renderTo(this.container, {
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: "none",
      gap: this.container.clientWidth < 520 ? 32 : 64, // espacio para la puntuación colgante
      allowScriptedContent: true,
    });

    // ——— Ancla de lectura ———
    // Los CFI de epub.js son rutas por el DOM, y Justif reescribe el interior de cada párrafo.
    // Además, al cambiar el ancho epub.js destruye y recrea el iframe, y Justif recompone desde
    // cero. Por eso el ancla es independiente del DOM: { capítulo, CFI del PÁRRAFO, nº de
    // carácter dentro de él }. Cuando Justif termina de componer un capítulo, se vuelve a
    // mostrar exactamente la página que contiene ese carácter (ver chapterComposed()).
    this.anchor = null;
    this.busy = 0; // recomposiciones en curso: sus "relocated" no mueven el ancla
    this.restoring = false; // esperando a que Justif componga para restaurar el ancla
    this.pendingNav = true; // la próxima ubicación la ha pedido el lector
    this.backFrom = null; // retroceder a un capítulo anterior -> ir a su última página
    this.lastPageFor = null;

    this.rendition.on("resized", () => {
      this.restoring = true;
      // El iframe aún no existe: basta con llevar a epub.js al inicio del párrafo
      // (primer nodo de texto, "/1:0"); la posición exacta se ajusta en chapterComposed().
      if (this.anchor && this.rendition.location?.start)
        this.rendition.location.start.cfi = textCfi(this.anchor.blockCfi);
    });
    this.rendition.on("relocated", (loc) => {
      if (this.backFrom !== null) {
        if (loc.start.index < this.backFrom) this.lastPageFor = loc.start.index;
        this.backFrom = null;
      }
      if (this.pendingNav || (!this.busy && !this.restoring) || !this.anchor) {
        this.anchor = this.anchorFrom(loc) || this.anchor;
      }
      this.pendingNav = false;
      this.onRelocated?.(loc);
    });

    const start = resolveStart?.(this.id, metadata);
    const section = start?.cfi && book.spine.get(start.cfi);
    if (section) {
      this.anchor = { index: section.index, blockCfi: start.cfi, offset: start.offset || 0 };
      this.pendingNav = false;
      this.restoring = true;
    }
    try {
      await this.rendition.display(section ? textCfi(start.cfi) : undefined);
    } catch {
      this.anchor = null;
      this.restoring = false;
      this.pendingNav = true;
      await this.rendition.display(); // posición guardada inválida: empezar desde el principio
    }
    return this;
  }

  prepareChapter(doc) {
    doc.querySelectorAll("script").forEach((s) => s.remove());
    for (const el of doc.querySelectorAll("*")) {
      for (const attr of [...el.attributes]) if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    }
    const head = doc.querySelector("head") || doc.documentElement;
    const link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", GOOGLE_FONTS_URL);
    const style = doc.createElement("style");
    style.setAttribute("id", STYLE_ID);
    style.textContent = chapterCss(this.prefs);
    const script = doc.createElement("script");
    script.setAttribute("src", FRAME_SCRIPT);
    script.setAttribute("defer", "defer");
    script.textContent = " "; // evita <script/> autocerrado al serializar
    head.append(link, style, script);
  }

  contents() {
    return this.rendition ? this.rendition.getContents() : [];
  }

  contentsFor(index) {
    return this.contents().find((c) => c.sectionIndex === index);
  }

  // Muestra un CFI sin que cuente como navegación del lector (no mueve el ancla).
  async quietDisplay(cfi) {
    this.busy++;
    try {
      await this.rendition.display(cfi);
    } finally {
      setTimeout(() => this.busy--, 300);
    }
  }

  // Lo llama justif-frame.js (vía main.js) cuando Justif ha compuesto un capítulo. El capítulo
  // sigue oculto hasta que esta promesa termina, así que el lector nunca ve un salto de página.
  async chapterComposed(doc) {
    const c = this.contents().find((x) => x.document === doc);
    if (!c) return;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (this.lastPageFor === c.sectionIndex) {
      this.lastPageFor = null;
      const r = renderedRange(c.document, c.document.body, 0, true);
      if (r) {
        r.collapse(true);
        await this.quietDisplay(c.cfiFromRange(r));
      }
    } else if (this.anchor && this.anchor.index === c.sectionIndex) {
      const cfi = this.anchorCfi();
      if (cfi) await this.quietDisplay(cfi);
    }
    this.restoring = false;
  }

  // Aplica preferencias a los capítulos ya cargados y re-justifica sin perder la posición.
  // (Si cambia el ancho de la columna, epub.js recreará además el iframe: ver "resized".)
  async apply(prefs, { animateColors = false } = {}) {
    const prev = this.prefs;
    this.prefs = prefs;
    if (!this.rendition) return;
    this.busy++;
    const layoutChanged =
      prev.font !== prefs.font || prev.fontSize !== prefs.fontSize || prev.lineHeight !== prefs.lineHeight;

    const jobs = this.contents().map(async (c) => {
      const doc = c.document;
      doc.documentElement.classList.toggle("lecturi-anim", animateColors);
      const style = doc.getElementById(STYLE_ID);
      if (style) style.textContent = chapterCss(prefs);
      if (prev.font !== prefs.font) {
        const stack = fontById(prefs.font).stack;
        await Promise.allSettled([doc.fonts.load(`${prefs.fontSize}px ${stack}`), doc.fonts.load(`italic ${prefs.fontSize}px ${stack}`)]);
      }
      const api = c.window.__lecturiJustif;
      if (api && layoutChanged) {
        await api.ready;
        await api.rescan();
      }
    });
    try {
      await Promise.allSettled(jobs);
      const cfi = layoutChanged && this.anchorCfi();
      if (cfi) await this.rendition.display(cfi);
    } finally {
      setTimeout(() => this.busy--, 300);
    }
  }

  resize() {
    this.rendition?.resize(); // epub.js recrea el iframe; el ancla se restaura en chapterComposed()
  }

  next() {
    this.pendingNav = true;
    return this.rendition?.next();
  }
  prev() {
    this.pendingNav = true;
    this.backFrom = this.rendition?.currentLocation()?.start?.index ?? null;
    return this.rendition?.prev();
  }
  display(target) {
    this.pendingNav = true;
    return this.rendition?.display(target);
  }

  // Ubicación de epub.js -> ancla { capítulo, CFI del párrafo, nº de carácter }.
  anchorFrom(loc) {
    const c = this.contentsFor(loc?.start?.index);
    if (!c) return null;
    try {
      const range = c.range(loc.start.cfi);
      const node = range.startContainer;
      const el = node.nodeType === 1 ? node : node.parentElement;
      const block = el.closest(BLOCKS) || el;
      const before = c.document.createRange();
      before.selectNodeContents(block);
      before.setEnd(range.startContainer, range.startOffset);
      return { index: loc.start.index, blockCfi: c.cfiFromNode(block), offset: before.toString().length };
    } catch {
      return null;
    }
  }

  // Ancla -> CFI válido para el DOM tal como está ahora.
  anchorCfi() {
    const a = this.anchor;
    const c = a && this.contentsFor(a.index);
    if (!c) return null;
    try {
      const block = elementFromCfi(c.document, a.blockCfi);
      if (!block) return a.blockCfi;
      const r = renderedRange(c.document, block, a.offset);
      if (!r) return a.blockCfi;
      r.collapse(true);
      return c.cfiFromRange(r);
    } catch {
      return a.blockCfi;
    }
  }

  // Para guardar el progreso y calcular el porcentaje: el CFI del párrafo es estable aunque
  // Justif recomponga, y coincide con el EPUB original (sobre el que se generan las "locations").
  paragraphCfi() {
    return this.anchor?.blockCfi || null;
  }
  anchorOffset() {
    return this.anchor?.offset || 0;
  }

  // Ubicaciones para calcular el porcentaje del libro (se guardan para no recalcular).
  async generateLocations(cached) {
    if (cached) {
      this.book.locations.load(cached);
      return null;
    }
    await this.book.locations.generate(1200);
    return this.book.locations.save();
  }

  percentage(cfi) {
    const l = this.book?.locations;
    if (!l || !l.length()) return null;
    return l.percentageFromCfi(cfi);
  }

  // Capítulo del índice que contiene la posición actual.
  chapterFor(href) {
    if (!href || !this.toc) return null;
    const clean = (h) => decodeURIComponent((h || "").split("#")[0]).replace(/^\.?\//, "");
    const target = clean(href);
    const flat = [];
    const walk = (items, depth) =>
      items.forEach((it) => {
        flat.push({ ...it, depth });
        if (it.subitems?.length) walk(it.subitems, depth + 1);
      });
    walk(this.toc, 0);
    const exact = flat.filter((it) => clean(it.href).endsWith(target) || target.endsWith(clean(it.href)));
    if (exact.length) return exact[0];
    // Si el capítulo no está en el índice, usar la última entrada anterior en el orden del libro.
    const idx = this.book.spine.get(href)?.index ?? -1;
    let best = null;
    for (const it of flat) {
      const s = this.book.spine.get(clean(it.href));
      if (s && s.index <= idx) best = it;
    }
    return best;
  }

  destroy() {
    try {
      this.rendition?.destroy();
      this.book?.destroy();
    } catch {}
    this.rendition = null;
    this.book = null;
    this.container.innerHTML = "";
  }
}
