// Menús que "brotan" de su botón (transición "Plus to menu morph" de
// transitions.dev, adaptada a menús desplegables): la caja crece desde el
// rectángulo del disparador hasta el panel completo con una curva elástica,
// el contenido entra con un desliz corto + desenfoque, y el ícono del botón
// gira y se desvanece. Al cerrar, todo regresa con la curva tranquila.

const raiz = document.documentElement;
const leer = (n, fb) => {
  const v = getComputedStyle(raiz).getPropertyValue(n).trim();
  return v || fb;
};
const ms = (n, fb) => parseFloat(leer(n, fb)) || parseFloat(fb);
const reducir = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function recorteDesde(panel, disparador) {
  const P = panel.getBoundingClientRect();
  const T = disparador.getBoundingClientRect();
  const w = Math.min(T.width, P.width), h = Math.min(T.height, P.height);
  // El rectángulo del botón, llevado al borde más cercano del panel.
  let left = Math.min(Math.max(T.left - P.left, 0), P.width - w);
  let top = Math.min(Math.max(T.top - P.top, 0), P.height - h);
  return `inset(${top}px ${P.width - left - w}px ${P.height - top - h}px ${left}px round ${leer('--morph-r-closed', '0px')})`;
}

export function abrirMorph(panel, disparador) {
  panel.hidden = false;
  panel.classList.remove('morph-cerrando');
  disparador?.classList.add('morph-abierto');
  if (reducir() || !panel.animate) return;
  const desde = disparador ? recorteDesde(panel, disparador) : 'inset(0 0 100% 0)';
  panel._anim?.cancel();
  panel._anim = panel.animate(
    [{ clipPath: desde }, { clipPath: `inset(0px 0px 0px 0px round ${leer('--morph-r-open', '0px')})` }],
    { duration: ms('--morph-open-dur', '350'), easing: leer('--morph-ease', 'ease-out') }
  );
  const lado = disparador && disparador.getBoundingClientRect().left > panel.getBoundingClientRect().left + panel.offsetWidth / 2 ? 1 : -1;
  [...panel.children].forEach((hijo) => {
    hijo.animate(
      [
        { opacity: 0, transform: `translateX(${lado * parseFloat(leer('--morph-slide', '40px')) * 0.4}px) scale(${leer('--morph-scale', '0.97')})`, filter: `blur(${leer('--morph-blur', '2px')})` },
        { opacity: 1, transform: 'none', filter: 'blur(0)' },
      ],
      { duration: ms('--morph-open-dur', '350'), easing: leer('--morph-close-ease', 'ease-out') }
    );
  });
}

export function cerrarMorph(panel, disparador, alTerminar) {
  if (panel.hidden || panel.classList.contains('morph-cerrando')) return;
  panel.classList.add('morph-cerrando');
  disparador?.classList.remove('morph-abierto');
  const fin = () => {
    if (!panel.classList.contains('morph-cerrando')) return;
    panel.hidden = true;
    panel.classList.remove('morph-cerrando');
    alTerminar?.();
  };
  if (reducir() || !panel.animate || !disparador) return fin();
  panel._anim?.cancel();
  const dur = ms('--morph-close-dur', '250');
  panel._anim = panel.animate(
    [{ clipPath: `inset(0px 0px 0px 0px round ${leer('--morph-r-open', '0px')})` }, { clipPath: recorteDesde(panel, disparador) }],
    { duration: dur, easing: leer('--morph-close-ease', 'ease-out'), fill: 'forwards' }
  );
  [...panel.children].forEach((hijo) =>
    hijo.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: `blur(${leer('--morph-blur', '2px')})` }], {
      duration: ms('--morph-fade-dur', '200'), easing: leer('--morph-close-ease', 'ease-out'), fill: 'forwards',
    })
  );
  panel._anim.finished.then(() => {
    fin();
    panel._anim?.cancel();
    [...panel.children].forEach((h) => h.getAnimations().forEach((a) => a.cancel()));
  }).catch(() => {});
}

export const estaAbierto = (panel) => !panel.hidden && !panel.classList.contains('morph-cerrando');
