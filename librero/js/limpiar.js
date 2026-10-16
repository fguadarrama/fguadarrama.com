// "Input clear with dissolve" de transitions.dev: al borrar la búsqueda, el
// texto cae y se desenfoca mientras una estela suave se enciende bajo cada
// palabra y el texto de ayuda baja desde arriba. Requiere JS por cuadro.

const raiz = document.documentElement;
const num = (n, fb) => {
  const v = parseFloat(getComputedStyle(raiz).getPropertyValue(n));
  return Number.isFinite(v) ? v : fb;
};
function bezier(str) {
  const m = String(str).match(/cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
  if (!m) return (t) => t;
  const [x1, y1, x2, y2] = m.slice(1).map(parseFloat);
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const dx = ((ax * s + bx) * s + cx) * s - t;
      const d = (3 * ax * s + 2 * bx) * s + cx;
      if (Math.abs(dx) < 1e-6 || d === 0) break;
      s -= dx / d;
    }
    return ((ay * s + by) * s + cy) * s;
  };
}
const oscuro = () =>
  raiz.dataset.theme === 'dark' || (!raiz.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

export function sincronizarClear(wrap) {
  const input = wrap.querySelector('input');
  const tiene = input.value.length > 0;
  wrap.classList.toggle('has-value', tiene);
  if (tiene) wrap.querySelector('.t-clear-mirror').textContent = input.value.replace(/ /g, ' ');
}

const lienzo = document.createElement('canvas').getContext('2d');
function estela(wrap, input, texto) {
  lienzo.font = getComputedStyle(input).font;
  const rgb = oscuro() ? '255,255,255' : '0,0,0';
  const w = wrap.clientWidth || 280;
  const pad = parseFloat(getComputedStyle(input).paddingLeft) || 12;
  const spread = num('--glow-spread', 1.5);
  const capas = [];
  let x = 0;
  texto.split(/(\s+)/).forEach((seg) => {
    const segW = lienzo.measureText(seg).width;
    if (seg.trim()) {
      const cx = pad + x + segW / 2;
      const hw = Math.max(segW * 0.45, 8) * spread;
      [[0, 0.8, 7, 0.22], [hw * 0.45, 0.55, 8, 0.18], [-hw * 0.4, 0.65, 6, 0.16], [hw * 0.15, 0.9, 5, 0.14]].forEach(([dx, rwm, rh, a]) => {
        const lx = (((cx + dx) / w) * 100).toFixed(2);
        capas.push(`radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${lx}% 100%, rgba(${rgb},${a}), transparent)`);
      });
    }
    x += segW;
  });
  return capas.join(', ');
}

export function limpiarConDisolucion(wrap, alVaciar) {
  const input = wrap.querySelector('input');
  const espejo = wrap.querySelector('.t-clear-mirror');
  const ayuda = wrap.querySelector('.t-clear-placeholder');
  const brillo = wrap.querySelector('.t-clear-glow');
  if (wrap.dataset.limpiando || !input.value) return;
  wrap.dataset.limpiando = '1';
  const conFoco = document.activeElement === input;
  espejo.textContent = input.value.replace(/ /g, ' ');
  input.value = '';
  alVaciar?.();
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  wrap.classList.remove('has-value');
  if (reducir) {
    delete wrap.dataset.limpiando;
    espejo.textContent = '';
    return;
  }
  const total = num('--clear-dur', 1000), outDur = num('--clear-out-dur', 400), inDur = num('--clear-in-dur', 400);
  const outFly = num('--clear-out-fly', 12), inFly = num('--clear-in-fly', 12), blur = num('--clear-blur', 2);
  const retraso = num('--glow-delay', 50), pico = num('--glow-peak-at', 0.15);
  const gOp = oscuro() ? 0.85 : num('--glow-opacity', 0.42);
  const easeOut = bezier(getComputedStyle(raiz).getPropertyValue('--clear-out-ease'));
  const easeIn = bezier(getComputedStyle(raiz).getPropertyValue('--clear-in-ease'));
  wrap.classList.add('is-clearing');
  brillo.style.mixBlendMode = oscuro() ? 'screen' : 'multiply';
  brillo.style.background = estela(wrap, input, espejo.textContent);
  brillo.style.opacity = '0';
  ayuda.style.transform = `translateY(-${inFly}px)`;
  ayuda.style.opacity = '0.9';
  ayuda.style.filter = `blur(${blur}px)`;
  const t0 = performance.now();
  (function cuadro(ahora) {
    const el = ahora - t0;
    const eo = easeOut(Math.min(1, el / outDur));
    espejo.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`;
    espejo.style.opacity = (1 - eo).toFixed(3);
    espejo.style.filter = `blur(${(eo * blur).toFixed(1)}px)`;
    const ei = easeIn(Math.min(1, el / inDur));
    ayuda.style.transform = `translateY(${(-inFly + ei * inFly).toFixed(1)}px)`;
    ayuda.style.opacity = (0.9 + ei * 0.1).toFixed(3);
    ayuda.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`;
    let g = 0;
    if (el > retraso) {
      const gp = Math.min(1, (el - retraso) / Math.max(1, total - retraso));
      g = gp < pico ? gp / pico : 1 - (gp - pico) / (1 - pico);
    }
    brillo.style.opacity = (g * gOp).toFixed(3);
    if (el < total) return requestAnimationFrame(cuadro);
    wrap.classList.remove('is-clearing');
    [espejo, ayuda].forEach((x) => (x.style.cssText = ''));
    espejo.textContent = '';
    brillo.style.opacity = '0';
    brillo.style.background = '';
    delete wrap.dataset.limpiando;
    if (conFoco) requestAnimationFrame(() => input.focus({ preventScroll: true }));
  })(performance.now());
}
