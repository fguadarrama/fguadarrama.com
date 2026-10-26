// Hyphenopoly como motor de separación silábica para Justif.
// Hyphenopoly inserta guiones blandos (U+00AD); Justif necesita los fragmentos de la palabra,
// así que partimos el resultado por ese carácter: "justificación" -> ["jus","ti","fi","ca","ción"].
import Hyphenopoly from "hyphenopoly";

const BASE = import.meta.env.BASE_URL;
const SOFT_HYPHEN = "­";

let languages = null; // { hyphenopoly: [...], justif: [...] }
const engines = new Map(); // código Hyphenopoly -> Promise<función síncrona>

async function loadLanguages() {
  if (!languages) {
    languages = await fetch(`${BASE}vendor/languages.json`).then((r) => r.json());
  }
  return languages;
}

// "es-MX" -> "es", "en" -> "en-us", "el" -> "el-monoton", etc.
function pick(lang, available) {
  if (!lang) return null;
  const l = lang.toLowerCase().replace("_", "-");
  if (available.includes(l)) return l;
  const primary = l.split("-")[0];
  const aliases = { en: "en-us", el: "el-monoton", mn: "mn-cyrl", sr: "sr-cyrl", sh: "sh-latn" };
  if (available.includes(primary)) return primary;
  if (aliases[primary] && available.includes(aliases[primary])) return aliases[primary];
  return null;
}

export function justifLanguage(lang) {
  return languages ? pick(lang, languages.justif) : null;
}

export async function getHyphenator(lang) {
  const { hyphenopoly } = await loadLanguages();
  const code = pick(lang, hyphenopoly);
  if (!code) return null;
  if (!engines.has(code)) {
    const hyphenator = Hyphenopoly.config({
      require: [code],
      minWordLength: 5,
      // leftmin/rightmin = 0: se usan los mínimos propios de cada idioma (p. ej. 2/2 en español).
      loader: async (file) => {
        const res = await fetch(`${BASE}vendor/hyphenopoly/patterns/${file}`);
        if (!res.ok) throw new Error(`No se pudo cargar ${file}`);
        return new Uint8Array(await res.arrayBuffer());
      },
    }).get(code);
    const engine = hyphenator.then((hyphenateText) => {
      const cache = new Map();
      return (word) => {
        let parts = cache.get(word);
        if (!parts) {
          parts = hyphenateText(word).split(SOFT_HYPHEN);
          // Justif exige que los fragmentos vuelvan a formar exactamente la palabra.
          if (parts.join("") !== word) parts = [word];
          cache.set(word, parts);
        }
        return parts;
      };
    });
    engines.set(code, engine);
  }
  return engines.get(code);
}
