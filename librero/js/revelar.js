// "Texts reveal" de transitions.dev aplicado a la sinopsis: el texto se
// "escribe" solo. Cada palabra sube desde --stagger-distance, se aclara del
// desenfoque y aparece; las oraciones arrancan escalonadas (--stagger-stagger)
// y, dentro de cada oración, las palabras fluyen muy seguidas, como una
// pluma. El total se limita para que textos largos no tarden de más.

const raiz = document.documentElement;
const num = (n, fb) => {
  const v = parseFloat(getComputedStyle(raiz).getPropertyValue(n));
  return Number.isFinite(v) ? v : fb;
};

export function revelarTexto(cont, { retraso = 0 } = {}) {
  if (!cont || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const parrafos = [...cont.querySelectorAll('p')];
  if (!parrafos.length) return;
  const entreOraciones = num('--stagger-stagger', 40) * 4; // 160 ms entre oraciones
  const entrePalabras = 14;
  const TOPE = 1600; // la última palabra arranca, como mucho, a los 1.6 s
  let palabras = 0, oraciones = 0;
  const totalPalabras = cont.textContent.split(/\s+/).filter(Boolean).length;
  const factor = Math.min(1, TOPE / (totalPalabras * entrePalabras + 1));

  for (const p of parrafos) {
    const nodos = [...p.childNodes];
    p.textContent = '';
    for (const n of nodos) {
      if (n.nodeType !== Node.TEXT_NODE) {
        p.append(n);
        continue;
      }
      for (const trozo of n.textContent.split(/(\s+)/)) {
        if (!trozo) continue;
        if (/^\s+$/.test(trozo)) {
          p.append(document.createTextNode(trozo));
          continue;
        }
        const s = document.createElement('span');
        s.className = 't-stagger-line t-palabra';
        const espera = retraso + oraciones * entreOraciones * factor + palabras * entrePalabras * factor;
        s.style.transitionDelay = `${Math.round(espera)}ms`;
        s.textContent = trozo;
        p.append(s);
        palabras++;
        if (/[.!?…»”"]$/.test(trozo)) oraciones++;
      }
    }
  }
  cont.classList.add('t-stagger');
  cont.classList.remove('is-shown', 'is-hiding');
  void cont.offsetHeight;
  requestAnimationFrame(() => cont.classList.add('is-shown'));
}
