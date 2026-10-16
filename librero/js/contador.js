// Contador giratorio ("Spinning counter" de transitions.dev): cada dígito es
// un carrete de 0-9 que da varias vueltas antes de caer en su número, con un
// pequeño retraso por columna y desenfoque solo vertical mientras gira.

const raiz = document.documentElement;
const num = (n, fb) => {
  const v = parseFloat(getComputedStyle(raiz).getPropertyValue(n));
  return Number.isFinite(v) ? v : fb;
};
let serie = 0;

export function crearContador(el, { vueltas = 2 } = {}) {
  el.classList.add('t-reel');
  let actual = null;

  function columnas(n) {
    const texto = String(n);
    while (el.children.length < texto.length) {
      const id = `reel-blur-${++serie}`;
      const col = document.createElement('span');
      col.className = 't-reel-col';
      col.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="${id}"><feGaussianBlur stdDeviation="0 0"/></filter></svg>
        <span class="t-reel-strip" style="filter:url(#${id})">${Array.from({ length: (vueltas + 2) * 10 }, (_, i) => `<span class="t-reel-digit">${i % 10}</span>`).join('')}</span>`;
      col.dataset.pos = '0';
      el.append(col);
    }
    while (el.children.length > texto.length) el.lastElementChild.remove();
    return [...el.children];
  }

  function fijar(n, animar = true) {
    if (n === actual) return;
    actual = n;
    el.setAttribute('aria-label', String(n));
    const texto = String(n);
    const cols = columnas(n);
    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const celda = el.getBoundingClientRect().height || num('--reel-cell', 30);
    const dur = num('--reel-dur', 1400);
    const escalon = num('--reel-stagger', 90);
    const blur = num('--reel-spin-blur', 3);
    cols.forEach((col, i) => {
      const tira = col.querySelector('.t-reel-strip');
      const filtro = col.querySelector('feGaussianBlur');
      const d = Number(texto[i]);
      // Volver a la primera vuelta (sin animación) y luego girar hacia adelante.
      const desde = Number(col.dataset.pos) % 10;
      tira.style.transition = 'none';
      tira.style.transform = `translateY(${-desde * celda}px)`;
      void tira.offsetHeight;
      const destino = animar && !reducir ? vueltas * 10 + d : d;
      col.dataset.pos = String(d);
      if (!animar || reducir) {
        tira.style.transform = `translateY(${-d * celda}px)`;
        return;
      }
      const retraso = i * escalon;
      tira.style.transition = `transform ${dur}ms var(--reel-ease) ${retraso}ms`;
      tira.style.transform = `translateY(${-destino * celda}px)`;
      const t0 = performance.now() + retraso;
      const paso = (t) => {
        const p = Math.min(1, Math.max(0, (t - t0) / (dur * 0.7)));
        filtro.setAttribute('stdDeviation', `0 ${(blur * (1 - p)).toFixed(2)}`);
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
      // Al terminar, deja la tira en la primera vuelta para el siguiente giro.
      setTimeout(() => {
        tira.style.transition = 'none';
        tira.style.transform = `translateY(${-d * celda}px)`;
      }, dur + retraso + 30);
    });
  }

  return { fijar };
}
