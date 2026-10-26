// La animación vive fuera del iframe: sobrevive a la repaginación de epub.js.
// Nunca añade envolturas al texto que Justif mide o a las rutas CFI.
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
export async function transitionFont(viewer, compose) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { await compose(); return; }
  let animation;
  viewer.setAttribute('aria-busy', 'true');
  try {
    viewer.dataset.fontTransition = 'leaving';
    animation = viewer.animate([{opacity:1},{opacity:0}], {duration:100, easing:'ease', fill:'forwards'});
    await animation.finished;
    viewer.style.opacity = '0';
    animation.cancel();
    viewer.dataset.fontTransition = 'composing';
    await compose();
    // Dos fotogramas permiten que la página restaurada se asiente antes del revelado.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    viewer.dataset.fontTransition = 'entering';
    viewer.style.removeProperty('opacity');
    animation = viewer.animate([
      {opacity:0, transform:'translateY(0.4em)'},
      {opacity:1, transform:'translateY(0)'}
    ], {duration:420, easing:EASE, fill:'both'});
    await animation.finished;
  } finally {
    animation?.cancel();
    viewer.style.removeProperty('opacity');
    delete viewer.dataset.fontTransition;
    viewer.removeAttribute('aria-busy');
  }
}
