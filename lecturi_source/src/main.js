import "./styles.css";
import { FONTS, THEMES, LIMITS, LOCAL_FONTS_CSS, FONT_SAMPLE, accentColor, fontById, themeById } from "./config.js";
import { getHyphenator, justifLanguage } from "./hyphenation.js";
import { Reader } from "./reader.js";
import { startBrandIntro } from "./brand-intro.js";
import { transitionFont } from "./font-transition.js";
import { createScrubber } from "./controls.js";
import { icon } from "./brand.js";
import { sound, setSound, unlockAudio, playSound, notificationkndwr } from "./sound.js";
import * as store from "./storage.js";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
let prefs = store.loadPrefs();
let reader = null;
let currentBookId = null;
let sizeScrubber, lhScrubber, marginScrubber;
let opening = false;
setSound(prefs.sound);

// Junicode (autoalojada) también en la interfaz.
const junicode = document.createElement("style");
junicode.textContent = LOCAL_FONTS_CSS;
document.head.append(junicode);

// Puente que usa justif-frame.js desde dentro de cada capítulo.
window.__lecturi = {
  getHyphenator,
  justifLanguage,
  bookLanguage: "",
  // Restaurar el ancla cuando termina la composición del capítulo.
  onJustified(report) {
    return reader ? reader.chapterComposed(report.doc) : Promise.resolve();
  },
};

/* ——— Preferencias → interfaz ——— */
function paintChrome() {
  const font = fontById(prefs.font);
  const theme = themeById(prefs.theme);
  root.dataset.theme = theme.id;
  root.style.setProperty("--reading-font", font.stack);
  root.style.setProperty("--accent", accentColor(prefs));
  root.style.setProperty("--blue", accentColor(prefs));
  root.style.setProperty("--pink", accentColor(prefs));
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
  sizeScrubber?.set(prefs.fontSize);
  lhScrubber?.set(prefs.lineHeight);
  marginScrubber?.set(prefs.margin);
  document.querySelectorAll('[data-brand-mark]').forEach(img => {
    img.src = `${import.meta.env.BASE_URL}brand/logo/lecturi-mark${theme.id === 'oscuro' ? '-night' : ''}.svg`;
  });
  document.querySelectorAll('[data-brand-wordmark]').forEach(img => {
    img.src = `${import.meta.env.BASE_URL}brand/logo/lecturi-wordmark${theme.id === 'oscuro' ? '-night' : ''}.svg`;
  });
  $("sound-toggle").setAttribute('aria-checked', prefs.sound);
  $("sound-toggle").setAttribute('aria-label', prefs.sound ? 'Desactivar sonidos' : 'Activar sonidos');
  $("sound-toggle").innerHTML = icon(prefs.sound ? 'sound-on' : 'sound-off') + `<span>${prefs.sound ? 'Activados' : 'Desactivados'}</span>`;
  setSound(prefs.sound);
}

// Los cambios se encolan: cada uno espera a que el anterior termine de recomponer el libro.
let queue = Promise.resolve();
function update(patch, opts) {
  queue = queue.then(() => applyUpdate(patch, opts)).catch((e) => console.warn(e));
  return queue;
}

// La animación pertenece a los controles; el libro se recompone sin capturas
// de View Transitions, cuyo plazo puede vencer en capítulos extensos.
async function applyUpdate(patch, {animate = null} = {}) {
  const next = {...prefs, ...patch};
  const fontChanged = patch.font && patch.font !== prefs.font;
  // Precargar antes de ocultar la página; la red no alarga el fundido.
  if (fontChanged) {
    const stack = fontById(next.font).stack;
    await Promise.allSettled([document.fonts.load(`24px ${stack}`), document.fonts.load(`italic 24px ${stack}`)]);
  }
  const compose = async () => {
    prefs = next;
    paintChrome();
    store.savePrefs(prefs);
    if (reader) await reader.apply(prefs);
  };
  if (reader && fontChanged && animate === 'font') await transitionFont($("viewer"), compose);
  else await compose();
}

/* ——— Panel de tipografía ——— */
function buildSettings() {
  $("font-list").innerHTML = "";
  for (const f of FONTS) {
    const b = document.createElement("button");
    b.className = "font-opt";
    b.dataset.id = f.id;
    b.setAttribute("role", "radio");
    b.innerHTML = `<span class="font-name">${f.name}</span><span class="font-sample"></span>`;
    b.querySelector('.font-sample').textContent = FONT_SAMPLE;
    b.querySelector('.font-sample').style.fontFamily = f.stack;
    b.setAttribute('aria-label', f.name);
    b.addEventListener("click", (e) => prefs.font !== f.id && update({ font: f.id }, { animate: "font", event: e }));
    $("font-list").append(b);
  }
  $("theme-list").innerHTML = "";
  for (const t of THEMES) {
    const b = document.createElement("button");
    b.className = "theme-opt";
    b.dataset.id = t.id;
    b.setAttribute("role", "radio");
    b.innerHTML = `<span class="swatch" style="background:${t.bg};color:${t.fg};--swatch-accent:${accentColor({theme:t.id})}">a</span><span>${t.name}</span>`;
    b.addEventListener("click", () => { if (prefs.theme !== t.id) { sound("expand"); update({theme:t.id}); } });
    $("theme-list").append(b);
  }

  sizeScrubber = createScrubber($("size-scrubber"), {label:'Tamaño', icon:icon('text-size'), ...LIMITS.fontSize, value:prefs.fontSize, format:v => `${v} px`, onCommit:v => v !== prefs.fontSize && update({fontSize:v})});
  lhScrubber = createScrubber($("lh-scrubber"), {label:'Interlineado', icon:icon('line-height'), ...LIMITS.lineHeight, value:prefs.lineHeight, format:v => v.toFixed(2), onCommit:v => v !== prefs.lineHeight && update({lineHeight:v})});
  marginScrubber = createScrubber($("margin-scrubber"), {label:'Márgenes', icon:icon('margins'), ...LIMITS.margin, value:prefs.margin, format:v => `${v} %`, onCommit:v => v !== prefs.margin && update({margin:v})});
  $("btn-settings").innerHTML = icon('font');
  $("btn-settings").classList.add("brand-icon");
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
  // Misma frase y mismo tamaño para todas las muestras, incluso al estrechar el panel.
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
  function fitSamples() {
    const samples = [...document.querySelectorAll('.font-sample')];
    const width = Math.min(...samples.map(el => el.clientWidth).filter(Boolean));
    if (!Number.isFinite(width) || !ctx) return;
    const widest = Math.max(...FONTS.map(f => { ctx.font = `17px ${f.stack}`; return ctx.measureText(FONT_SAMPLE).width; }));
    $("font-list").style.setProperty('--sample-size', `${Math.min(17, 17 * (width - 4) / widest)}px`);
  }
  new ResizeObserver(fitSamples).observe($("font-list"));
  document.fonts.ready.then(fitSamples);
  document.fonts.addEventListener('loadingdone',fitSamples);
  $("sound-toggle").onclick = () => {
    const on = !prefs.sound; prefs = {...prefs, sound:on};
    setSound(on); paintChrome(); store.savePrefs(prefs); if (on) sound('tock');
  };

}

/* ——— Cajones ——— */
let drawerTrigger = null;
function openDrawer(id) {
  let opened = null;
  for (const d of document.querySelectorAll(".drawer")) {
    const on = d.id === id && !d.classList.contains("open");
    d.classList.toggle("open", on);
    d.inert = !on;
    if (on) opened = d;
  }
  if (opened) {
    drawerTrigger = document.activeElement;
    opened.querySelector('[data-close]').focus({preventScroll:true});
  } else if (drawerTrigger?.isConnected) { drawerTrigger.focus({preventScroll:true}); drawerTrigger = null; }
  $("btn-settings").setAttribute('aria-expanded', opened?.id === 'settings');
  $("btn-toc").setAttribute('aria-expanded', opened?.id === 'toc');
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
function uploadError() {
  sound('deny');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
    $("dropzone").animate([{transform:'translateX(0)'},{transform:'translateX(-7px)'},{transform:'translateX(6px)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'}],{duration:260});
}
async function openFile(file) {
  const msg = $("landing-msg");
  msg.textContent = "";
  if (!file || !/\.epub$/i.test(file.name) && file.type !== "application/epub+zip") {
    uploadError();
    msg.textContent = "Ese archivo no parece un .epub.";
    return;
  }
  if (opening) return;
  opening = true;
  void unlockAudio();
  $("dropzone").classList.add('busy');
  $("dropzone").setAttribute('aria-busy','true');
  $("upload-file").hidden = false;
  $("upload-file").textContent = file.name;
  $("dropzone").querySelector('.dz-title').textContent = 'Abriendo tu libro…';
  $("upload-progress").style.transform = 'scaleX(.15)';
  $("loading").hidden = false;
  $("app").classList.add("preparing");
  $("app").hidden = false;
  closeDrawers();
  try {
    const buffer = await file.arrayBuffer();
    $("upload-progress").style.transform = "scaleX(.4)";
    reader?.destroy();
    // (window.__lecturi.reader queda expuesto para diagnóstico desde la consola)
    reader = window.__lecturi.reader = new Reader($("viewer"), { prefs, onRelocated });

    await reader.open(buffer, (id, meta) => {
      currentBookId = id;
      window.__lecturi.bookLanguage = meta.language || "";
      return store.loadProgress(id);
    });
    $("upload-progress").style.transform = "scaleX(1)";
    void playSound(notificationkndwr);
    showApp(true);
    wire(reader);
    const meta = reader.metadata;
    $("book-title").textContent = meta.title || file.name.replace(/\.epub$/i, "");
    $("book-author").textContent = meta.creator || "";
    document.title = `${meta.title || "Libro"} · Lecturi`;
    buildToc(reader.toc);
    $("loading").hidden = true;
    store.saveLastBook(file, { title: meta.title, author: meta.creator, id: currentBookId });
    initLocations().catch(e => console.warn("No se pudo calcular el progreso", e));
  } catch (err) {
    console.error(err);
    reader?.destroy();
    reader = null;
    showApp(false);
    uploadError();
    msg.textContent = "No se pudo abrir el libro. ¿Está dañado o protegido con DRM?";
  } finally {
    $("app").classList.remove("preparing");
    opening = false;
    $("loading").hidden = true;
    $("dropzone").classList.remove('busy');
    $("dropzone").removeAttribute('aria-busy');
    $("dropzone").querySelector('.dz-title').textContent = 'Abrir un EPUB';
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
$("file-input").onchange = (e) => { const file = e.target.files[0]; e.target.value = ""; if (file) openFile(file); };
$("btn-open").onclick = () => {
  closeDrawers();
  reader?.destroy();
  reader = window.__lecturi.reader = null;
  currentBookId = null;
  $("upload-file").hidden = true;
  $("upload-file").textContent = '';
  $("upload-progress").style.transform = 'scaleX(0)';
  showApp(false);
  $("dropzone").focus({preventScroll:true});
};
$("dropzone").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file-input").click(); }
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
  if (e.key === "Escape") { closeDrawers(); return; }
  if (!reader || $("app").hidden || e.target.closest?.("input, button, [role=slider], [role=radio]")) return;
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
const resumeReady = refreshResume();

// Tooltip de la wordmark: demora solo al abrir, salida inmediata y geometría estable.
const nameButton = $("brand-name"), nameNote = $("brand-note");
const tooltipGroup = nameButton.closest('.t-tt-group');
function positionNameNote() {
  const group = tooltipGroup.getBoundingClientRect();
  const trigger = nameButton.getBoundingClientRect();
  const width = Math.min(370, innerWidth - 32);
  const center = trigger.left + trigger.width / 2;
  const left = Math.max(16, Math.min(innerWidth - 16 - width, center - width / 2));
  nameNote.style.width = `${width}px`;
  nameNote.style.setProperty('--tt-x', `${left - group.left}px`);
  nameNote.dataset.placement = trigger.top - nameNote.offsetHeight - 8 >= 8 ? 'above' : 'below';
}
function showNameNote(on) {
  if (on && nameButton.disabled) return;
  if (on) {
    // La geometría salta a su posición cuando está cerrado; solo la entrada se anima.
    if (nameNote.dataset.show !== 'true') nameNote.style.setProperty('--tt-move-dur','0ms');
    positionNameNote();
  }
  nameNote.dataset.show = String(on);
  nameNote.setAttribute('aria-hidden', String(!on));
  nameButton.setAttribute('aria-expanded', String(on));
  if (on) requestAnimationFrame(() => nameNote.style.removeProperty('--tt-move-dur'));
}
nameButton.addEventListener('pointerenter', e => {
  if (e.pointerType === 'mouse' && matchMedia('(hover:hover)').matches) showNameNote(true);
});
tooltipGroup.addEventListener('pointerleave', () => {
  if (!nameButton.matches(':focus-visible')) showNameNote(false);
});
nameButton.addEventListener('focus', () => showNameNote(true));
tooltipGroup.addEventListener('focusout', e => { if (!tooltipGroup.contains(e.relatedTarget)) showNameNote(false); });
nameButton.addEventListener('click', () => showNameNote(true));
document.addEventListener('pointerdown', e => { if (!tooltipGroup.contains(e.target)) showNameNote(false); });
nameButton.addEventListener('keydown', e => { if (e.key === 'Escape') { showNameNote(false); e.stopPropagation(); } });
window.addEventListener('resize', () => { if (nameNote.dataset.show === 'true') positionNameNote(); }, {passive:true});

// Una sola entrada por carga de página; volver del libro no la repite.
startBrandIntro({ready:resumeReady});
