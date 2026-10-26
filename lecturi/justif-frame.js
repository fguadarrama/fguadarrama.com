// Se ejecuta DENTRO del iframe de cada capítulo que crea epub.js.
// Justif es el motor que compone TODO el texto: epub.js solo abre el archivo y reparte en
// páginas el resultado. Justif tiene que vivir en el mismo documento que los párrafos que
// compone (usa document.fonts, canvas y comprobaciones `instanceof` propias de ese documento).
// La separación silábica la aporta Hyphenopoly, cargado una sola vez en la página principal.
//
// El capítulo permanece oculto (CSS: html:not([data-justif="on"]) body) hasta que Justif lo
// ha compuesto con las fuentes definitivas, para que nunca se vea la maquetación del navegador.
(() => {
  const script = document.currentScript;
  const base = script.src.replace(/justif-frame\.js.*$/, "");
  const host = window.parent && window.parent.__lecturi;
  const SELECTOR = "p, li, dd, blockquote, figcaption";
  const REVEAL_TIMEOUT = 5000; // red de seguridad: nunca dejar una página en blanco

  // Opciones tipográficas de Justif (ver README de justif).
  const OPTIONS = {
    protrusion: true, // protrusión óptica de márgenes
    hangingPunctuation: "line-end-only", // puntuación colgante al final de línea
    expansion: { max: 0.02, shrink: 0.02, step: 0.005 }, // solo fuentes con eje wdth (Junicode)
    tracking: { max: 0.015, shrink: 0.015 }, // ajuste mínimo de espaciado entre letras
    lastLineMinWidth: 0.33, // última línea: al menos un tercio de la medida
  };

  let justifModule = null;
  let controllers = [];
  let skipped = [];
  let disposed = false;
  let running = Promise.resolve();

  const langOf = (el) => {
    const owner = el.closest("[lang], [xml\\:lang]");
    const raw =
      (owner && (owner.getAttribute("lang") || owner.getAttribute("xml:lang"))) ||
      (host && host.bookLanguage) ||
      "";
    return raw.toLowerCase();
  };

  // Hyphenopoly (página principal) -> respaldo: patrones TeX incluidos en Justif.
  async function hyphenatorFor(lang) {
    if (host && host.getHyphenator) {
      try {
        const fn = await host.getHyphenator(lang);
        if (fn) return fn;
      } catch (e) {
        console.warn("[lecturi] Hyphenopoly no disponible para", lang, e);
      }
    }
    try {
      const code = host && host.justifLanguage ? host.justifLanguage(lang) : null;
      if (!code) return undefined;
      const mod = await import(`${base}vendor/justif/hyphenate/${code}.js`);
      return Object.values(mod).find((v) => typeof v === "function");
    } catch {
      return undefined;
    }
  }

  const onSkip = (el, reason) => {
    skipped.push(el);
    console.info("[lecturi] Justif no admite este párrafo:", reason, el);
  };

  // Avisa a la página principal; esta restaura la posición de lectura antes de mostrar nada.
  function report() {
    const managed = new Set(controllers.flatMap(c => c.managed)).size;
    if (host && host.onJustified) return host.onJustified({ doc: document, managed, skipped: skipped.length });
  }

  async function run() {
    justifModule = justifModule || (await import(`${base}vendor/justif/index.js`));
    if (disposed) return;
    // Medir con las fuentes finales, incluidas las cursivas y negritas del EPUB.
    const bodyStyle = getComputedStyle(document.body);
    const family = bodyStyle.fontFamily, size = bodyStyle.fontSize;
    await Promise.allSettled(['400', '700', 'italic 400', 'italic 700'].map(style => document.fonts.load(`${style} ${size} ${family}`)));
    await document.fonts.ready;
    if (disposed) return;
    const groups = new Map();
    // Solo bloques de texto "hoja": un <blockquote> o <li> que envuelve párrafos no se compone
    // como un todo; se componen los párrafos que contiene.
    for (const el of document.querySelectorAll(SELECTOR)) {
      if (el.querySelector(SELECTOR)) continue;
      const lang = langOf(el);
      if (!groups.has(lang)) groups.set(lang, []);
      groups.get(lang).push(el);
    }
    for (const [lang, els] of groups) {
      const hyphenate = await hyphenatorFor(lang);
      const c = justifModule.justify(els, { ...OPTIONS, hyphenate, onSkip });
      controllers.push(c);
      await c.ready;
      await promoteOneLiners(c, hyphenate);
    }
    // Esperar a que las fuentes reales estén cargadas y Justif haya recompuesto con ellas.
    await Promise.allSettled(controllers.map((c) => c.ready));
    await report();
  }

  // Caso límite de Justif: si un párrafo cabe en UNA línea comprimiendo espacios (típico con
  // una URL u otra palabra larga indivisible), Justif lo deja en la maquetación del navegador,
  // que no comprime y lo parte en dos líneas mal espaciadas. Esos párrafos se recomponen con
  // Justif con una compresión más estricta:
  //   1) modo normal: la solución de una línea deja de ser viable -> Knuth–Plass en 2+ líneas;
  //   2) si aun así queda en una línea, modo rectangular: una sola línea, apenas ajustada.
  const STRICT = {
    spacing: { stretch: 0.5, shrink: 0.12, pull: 0.7, boundaryShrink: 0 },
    tracking: { max: 0.015, shrink: 0.005 },
  };
  const wraps = (el) => {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 0;
    return lh > 0 && el.getBoundingClientRect().height > lh * 1.5;
  };
  const stuckIn = (c) => c.managed.filter((el) => !el.hasAttribute("data-justif") && wraps(el));

  async function promoteOneLiners(controller, hyphenate) {
    let stuck = stuckIn(controller);
    if (!stuck.length) return;
    justifModule.unjustify(stuck);
    const strict = justifModule.justify(stuck, { ...OPTIONS, ...STRICT, hyphenate, onSkip });
    controllers.push(strict);
    await strict.ready;
    stuck = stuckIn(strict);
    if (!stuck.length) return;
    justifModule.unjustify(stuck);
    controllers.push(justifModule.justify(stuck, { ...OPTIONS, ...STRICT, hyphenate, onSkip, lastLineMinWidth: 1 }));
  }

  function destroy() {
    for (const c of controllers) c.destroy();
    controllers = [];
    skipped = [];
  }

  const reveal = () => (document.documentElement.dataset.justif = "on");

  // API para la página principal (cambios de fuente, tamaño, interlineado).
  window.__lecturiJustif = {
    ready: null,
    // Tras cambiar fuente, tamaño o interlineado: recomponer desde cero (así también se
    // re-evalúa qué párrafos necesitan el modo rectangular).
    rescan() {
      running = running.catch(() => {}).then(async () => {
        if (disposed) return;
        document.documentElement.removeAttribute('data-justif');
        destroy();
        try { await run(); } finally { reveal(); }
      });
      return running;
    },
    count() {
      return new Set(controllers.flatMap(c => c.managed)).size;
    },
  };

  const start = () => {
    const safety = setTimeout(() => {
      console.error("[lecturi] Justif no terminó a tiempo; se muestra el capítulo igualmente.");
      reveal();
    }, REVEAL_TIMEOUT);
    window.__lecturiJustif.ready = running = run()
      .catch((e) => console.error("[lecturi] Justif:", e))
      .finally(() => {
        clearTimeout(safety);
        reveal();
      });
  };
  window.addEventListener('pagehide', () => { disposed = true; destroy(); }, {once:true});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
