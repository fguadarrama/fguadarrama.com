// Persistencia local.
//  - localStorage: preferencias y progreso de cada libro (pequeño).
//  - IndexedDB: el último archivo .epub, para poder "continuar leyendo" sin volver a arrastrarlo.
// Todo va en try/catch: en modo privado el navegador puede bloquear el almacenamiento.
import { DEFAULTS, FONTS, THEMES, LIMITS } from "./config.js";

const PREFS_KEY = "lecturi:prefs";
const PROGRESS_KEY = (id) => `lecturi:progress:${id}`;

export function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    delete saved.accent;
    delete saved.justif; // opción antigua: Justif ya no se puede desactivar
    // En pantallas estrechas, 18 px da una medida más cómoda (~38 caracteres por línea).
    const base = innerWidth < 600 ? { ...DEFAULTS, fontSize: 18 } : DEFAULTS;
    const prefs = { ...base, ...saved };
    if (!FONTS.some(f => f.id === prefs.font)) prefs.font = DEFAULTS.font;
    if (!THEMES.some(t => t.id === prefs.theme)) prefs.theme = DEFAULTS.theme;
    prefs.sound = prefs.sound !== false;
    for (const [key, {min, max, step}] of Object.entries(LIMITS)) {
      const value = Number(prefs[key]);
      prefs[key] = Number.isFinite(value) ? Number(Math.min(max, Math.max(min, min + Math.round((value - min) / step) * step)).toFixed(2)) : base[key];
    }
    return prefs;
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function loadProgress(bookId) {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY(bookId)) || "null");
  } catch {
    return null;
  }
}

export function saveProgress(bookId, progress) {
  try {
    localStorage.setItem(PROGRESS_KEY(bookId), JSON.stringify({ ...progress, updated: Date.now() }));
  } catch {}
}

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("lecturi", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLastBook(file, meta) {
  try {
    const d = await db();
    const tx = d.transaction("files", "readwrite");
    tx.objectStore("files").put({ blob: file, name: file.name, ...meta }, "last");
    await new Promise((r, j) => ((tx.oncomplete = r), (tx.onerror = j)));
  } catch {}
}

export async function loadLastBook() {
  try {
    const d = await db();
    const req = d.transaction("files").objectStore("files").get("last");
    return await new Promise((r, j) => ((req.onsuccess = () => r(req.result || null)), (req.onerror = j)));
  } catch {
    return null;
  }
}
