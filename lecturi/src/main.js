import "./styles.css";
import { FONTS, THEMES, LIMITS, JUNICODE_CSS, fontById, themeById } from "./config.js";
import { getHyphenator, justifLanguage } from "./hyphenation.js";
import { Reader } from "./reader.js";
import * as store from "./storage.js";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
let prefs = store.loadPrefs();
let reader = null;
let currentBookId = null;

// Junicode (autoalojada) también en la interfaz.
const junicode = document.createElement("style");
junicode.textContent = JUNICODE_CSS;
document.head.append(junicode);

// Puente que usa justif-frame.js desde dentro de cada capítulo.
window.__lecturi = {
  getHyphenator,
  justifLanguage,
  bookLanguage: "",
  // Informe de cada capítulo compuesto por Justif (párrafos compuestos / rechazados).
  onJustified(report) {
    const done = reader ? reader.chapterComposed(report.doc) : Promise.resolve();
    const el = document.getElementById("justif-status");
    if (el) el.textContent = report.skipped
      ? `Capítulo: ${report.managed} párrafos compuestos con Justif · ${report.skipped} no admitidos (ver consola).`
      : `Capítulo: ${report.managed} de ${report.managed} párrafos compuestos con Justif.`;
    return done;
  },
};

/* ——— Preferencias → interfaz ——— */
function paintChrome() {
  const font = fontById(prefs.font);
  const theme = themeById(prefs.theme);
  root.dataset.theme = theme.id;
  root.style.setProperty("--font", font.stack);
  root.style.setProperty("--fs", prefs.fontSize);
  root.style.setProperty("--m", prefs.margin);
  document.querySelector('meta[name="theme-color"]').content = theme.bg;

  document.querySelectorAll(".font-opt").forEach((b) => {
    const on = b.dataset.id === font.id;
    b.classList.toggle("active", on);
    b.setAttribute("aria-checked", on);
  });
  document.querySelectorAll(".theme-opt").forEach((b) => {
    const on = b.dataset.id === theme.id;
    b.classList.toggle("active", on);
    b.setAttribute("aria-checked", on);
  });
  $("size-val").textContent = `${prefs.fontSize} px`;
  $("lh").value = prefs.lineHeight;
  $("lh-val").textContent = prefs.lineHeight.toFixed(2);
  $("margin").value = prefs.margin;
  $("margin-val").textContent = prefs.margin;
}

const timeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

// Los cambios se encolan: cada uno espera a que el anterior termine de recomponer el libro.
let queue = Promise.resolve();
function update(patch, opts) {
  queue = queue.then(() => applyUpdate(patch, opts)).catch((e) => console.warn(e));
  return queue;
}

// Cambia preferencias con animación (View Transitions) cuando el navegador la soporta.
async function applyUpdate(patch, { animate = null, event = null } = {}) {
  const next = { ...prefs, ...patch };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canVT = animate && document.startViewTransition && !reduce;

  const mutate = async () => {
    if (canVT && animate === "font") root.dataset.vtLine = "";
    prefs = next;
    paintChrome();
    if (patch.font) {
      const stack = fontById(prefs.font).stack;
      await timeout(Promise.allSettled([document.fonts.load(`24px ${stack}`), document.fonts.load(`17px ${stack}`)]), 1500);
    }
    if (reader) await timeout(reader.apply(prefs, { animateColors: !canVT }), 2200);
  };

  if (canVT) {
    if (event && event.clientX) {
      root.style.setProperty("--vt-x", `${event.clientX}px`);
      root.style.setProperty("--vt-y", `${event.clientY}px`);
    } else {
      root.style.removeProperty("--vt-x");
      root.style.removeProperty("--vt-y");
    }
    root.dataset.vt = animate;
    const t = document.startViewTransition(mutate);
    t.finished.finally(() => {
      delete root.dataset.vt;
      delete root.dataset.vtLine;
    });
    await t.updateCallbackDone.catch(() => {});
  } else {
    await mutate();
  }
  store.savePrefs(prefs);
}

/* ——— Panel de tipografía ——— */
function buildSettings() {
  $("font-list").innerHTML = "";
  for (const f of FONTS) {
    const b = document.createElement("button");
    b.className = "font-opt";
    b.dataset.id = f.id;
    b.setAttribute("role", "radio");
    b.innerHTML = `<span class="font-name" style="font-family:${f.stack.replace(/"/g, "'")}">${f.name}</span><span class="font-note">${f.note}</span>`;
    b.addEventListener("click", (e) => prefs.font !== f.id && update({ font: f.id }, { animate: "font", event: e }));
    $("font-list").append(b);
  }
  $("theme-list").innerHTML = "";
  for (const t of THEMES) {
    const b = document.createElement("button");
    b.className = "theme-opt";
    b.dataset.id = t.id;
    b.setAttribute("role", "radio");
    b.innerHTML = `<span class="swatch" style="background:${t.bg};color:${t.fg}">a</span><span>${t.name}</span>`;
    b.addEventListener("click", (e) => prefs.theme !== t.id && update({ theme: t.id }, { animate: "theme", event: e }));
    $("theme-list").append(b);
  }

  const L = LIMITS;
  const step = (d) => {
    const v = Math.min(L.fontSize.max, Math.max(L.fontSize.min, prefs.fontSize + d));
    if (v !== prefs.fontSize) update({ fontSize: v });
  };
  $("size-down").onclick = () => step(-1);
  $("size-up").onclick = () => step(+1);

  Object.assign($("lh"), L.lineHeight);
  Object.assign($("margin"), L.margin);
  // Vista previa inmediata del valor; se aplica al libro al soltar el control.
  $("lh").oninput = (e) => ($("lh-val").textContent = Number(e.target.value).toFixed(2));
  $("lh").onchange = (e) => update({ lineHeight: Number(e.target.value) });
  $("margin").oninput = (e) => {
    $("margin-val").textContent = e.target.value;
    root.style.setProperty("--m", e.target.value);
  };
  $("margin").onchange = (e) => {
    prefs.margin = Number(e.target.value);
    store.savePrefs(prefs);
  };

}

/* ——— Cajones ——— */
function openDrawer(id) {
  for (const d of document.querySelectorAll(".drawer")) {
    const on = d.id === id && !d.classList.contains("open");
    d.classList.toggle("open", on);
    d.inert = !on;
  }
}
const closeDrawers = () => openDrawer(null);
document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeDrawers));
$("btn-toc").onclick = () => openDrawer("toc");
$("btn-settings").onclick = () => openDrawer("settings");
$("stage").addEventListener("pointerdown", (e) => {
  if (document.querySelector(".drawer.open") && !e.target.closest(".drawer")) closeDrawers();
});

/* ——— Índice ——— */
function buildToc(toc) {
  const list = $("toc-list");
  list.innerHTML = "";
  const add = (items, depth) =>
    items.forEach((it) => {
      const b = document.createElement("button");
      b.className = "toc-item";
      b.style.setProperty("--depth", depth);
      b.dataset.href = it.href;
      b.innerHTML = "<span></span>";
      b.firstChild.textContent = (it.label || "").trim();
      b.onclick = () => {
        reader.display(it.href);
        closeDrawers();
      };
      list.append(b);
      if (it.subitems?.length) add(it.subitems, depth + 1);
    });
  add(toc || [], 0);
  if (!list.children.length) list.innerHTML = '<p class="toc-empty">Este libro no incluye índice.</p>';
}

function markToc(item) {
  document.querySelectorAll(".toc-item").forEach((b) => b.classList.toggle("current", !!item && b.dataset.href === item.href));
}

/* ——— Progreso ——— */
function onRelocated(loc) {
  if (!reader || !loc?.start) return;
  const cfi = reader.paragraphCfi() || loc.start.cfi;
  const pct = reader.percentage(cfi);
  const chapter = reader.chapterFor(loc.start.href);
  markToc(chapter);
  $("chapter-label").textContent = chapter?.label?.trim() || "";
  if (pct !== null) {
    const p = loc.atEnd ? 100 : Math.round(pct * 100);
    $("percent").textContent = `${p} %`;
    $("progress-fill").style.width = `${p}%`;
  } else {
    const d = loc.start.displayed;
    $("percent").textContent = d ? `${d.page} / ${d.total}` : "";
  }
  store.saveProgress(currentBookId, {
    cfi,
    offset: reader.anchorOffset(),
    href: loc.start.href,
    chapter: chapter?.label?.trim() || "",
    percentage: pct,
  });
}

/* ——— Abrir un libro ——— */
async function openFile(file) {
  const msg = $("landing-msg");
  msg.textContent = "";
  if (!file || !/\.epub$/i.test(file.name) && file.type !== "application/epub+zip") {
    msg.textContent = "Ese archivo no parece un .epub.";
    return;
  }
  showApp(true);
  $("loading").hidden = false;
  closeDrawers();
  try {
    const buffer = await file.arrayBuffer();
    reader?.destroy();
    // (window.__lecturi.reader queda expuesto para diagnóstico desde la consola)
    reader = window.__lecturi.reader = new Reader($("viewer"), { prefs, onRelocated });

    await reader.open(buffer, (id, meta) => {
      currentBookId = id;
      window.__lecturi.bookLanguage = meta.language || "";
      return store.loadProgress(id);
    });
    wire(reader);
    const meta = reader.metadata;
    $("book-title").textContent = meta.title || file.name.replace(/\.epub$/i, "");
    $("book-author").textContent = meta.creator || "";
    document.title = `${meta.title || "Libro"} · Lecturi`;
    buildToc(reader.toc);
    $("loading").hidden = true;
    store.saveLastBook(file, { title: meta.title, author: meta.creator, id: currentBookId });
    initLocations();
  } catch (err) {
    console.error(err);
    reader?.destroy();
    reader = null;
    showApp(false);
    msg.textContent = "No se pudo abrir el libro. ¿Está dañado o protegido con DRM?";
  }
}

async function initLocations() {
  const key = `lecturi:locations:${currentBookId}`;
  let cached = null;
  try {
    cached = localStorage.getItem(key);
  } catch {}
  const bookId = currentBookId;
  const saved = await reader.generateLocations(cached);
  if (bookId !== currentBookId) return;
  if (saved) {
    try {
      localStorage.setItem(key, saved);
    } catch {}
  }
  const loc = reader.rendition?.currentLocation();
  if (loc?.start) onRelocated(loc);
}

function showApp(on) {
  $("app").hidden = !on;
  $("landing").hidden = on;
  if (!on) {
    document.title = "Lecturi";
    refreshResume();
  }
}

async function refreshResume() {
  const last = await store.loadLastBook();
  if (!last?.blob) return;
  const progress = last.id ? store.loadProgress(last.id) : null;
  $("resume").hidden = false;
  $("resume-title").textContent = last.title || last.name;
  const bits = [last.author, progress?.chapter, progress?.percentage != null ? `${Math.round(progress.percentage * 100)} %` : null];
  $("resume-meta").textContent = bits.filter(Boolean).join(" · ");
  $("resume").onclick = () => openFile(new File([last.blob], last.name, { type: "application/epub+zip" }));
}

/* ——— Entrada: archivo, arrastrar y soltar, teclado ——— */
$("file-input").onchange = (e) => openFile(e.target.files[0]);
$("btn-open").onclick = () => {
  reader?.destroy();
  reader = null;
  showApp(false);
};
$("dropzone").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") $("file-input").click();
});

let dragDepth = 0;
const isFileDrag = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
window.addEventListener("dragenter", (e) => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  dragDepth++;
  if (!$("app").hidden) $("drop-overlay").hidden = false;
  $("dropzone").classList.add("over");
});
window.addEventListener("dragover", (e) => isFileDrag(e) && e.preventDefault());
window.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    $("drop-overlay").hidden = true;
    $("dropzone").classList.remove("over");
  }
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  $("drop-overlay").hidden = true;
  $("dropzone").classList.remove("over");
  const file = e.dataTransfer?.files?.[0];
  if (file) openFile(file);
});

function onKey(e) {
  if (!reader || $("app").hidden || e.target.closest?.("input")) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === "ArrowRight" || k === "PageDown" || (k === " " && !e.shiftKey)) reader.next();
  else if (k === "ArrowLeft" || k === "PageUp" || (k === " " && e.shiftKey)) reader.prev();
  else if (k === "Escape") closeDrawers();
  else if (k === "t" || k === "T") openDrawer("toc");
  else if (k === "a" || k === "A") openDrawer("settings");
  else return;
  e.preventDefault?.();
}
window.addEventListener("keydown", onKey);
$("btn-prev").onclick = () => reader?.prev();
$("btn-next").onclick = () => reader?.next();

// Eventos dentro del iframe (teclado y gestos táctiles) que epub.js reenvía.
function wire(r) {
  let x0 = null;
  r.rendition.on("keydown", onKey);
  r.rendition.on("touchstart", (e) => (x0 = e.changedTouches[0].screenX));
  r.rendition.on("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].screenX - x0;
    if (Math.abs(dx) > 40) dx < 0 ? r.next() : r.prev();
    x0 = null;
  });
  r.rendition.on("click", () => document.querySelector(".drawer.open") && closeDrawers());
}

// El ancho de la columna depende del tamaño de letra y de los márgenes (y de la ventana).
// epub.js solo repagina al cambiar la ventana, así que observamos la propia columna.
let resizeTimer;
let lastWidth = 0;
new ResizeObserver(([entry]) => {
  const w = Math.round(entry.contentRect.width);
  if (!w || w === lastWidth) return;
  lastWidth = w;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => reader?.resize(), 180); // tras la animación del ancho
}).observe($("viewer"));

// Precarga discreta de todas las fuentes: así el cambio de tipografía es inmediato.
function preloadFonts() {
  for (const f of FONTS) {
    document.fonts.load(`20px ${f.stack}`).catch(() => {});
    document.fonts.load(`italic 20px ${f.stack}`).catch(() => {});
  }
}
(window.requestIdleCallback || ((fn) => setTimeout(fn, 1500)))(preloadFonts);

buildSettings();
paintChrome();
refreshResume();
