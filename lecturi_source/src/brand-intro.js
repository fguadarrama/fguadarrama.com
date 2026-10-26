// Generate (Bencho): masas, contornos y detalle, sobre el papel del tema activo.
// Un reloj de marca (3000 ms) entrega el movimiento a una entrada escalonada.
const DURATION = 3000;
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;

// El contraste pivota sobre cada canal del fondo, no sobre PAPER=.9 en todos los temas.
// Así los trazos azules no se convierten en negro al aplicar el filtro nocturno.
export function contrastIntercepts(background, contrast) {
  return background.map(channel => channel / 255 * (1 - contrast));
}

export async function startBrandIntro({ready = Promise.resolve()} = {}) {
  const root = document.documentElement;
  const content = document.getElementById('landing-content');
  const name = document.getElementById('brand-name');
  const images = [...document.querySelectorAll('#brand-intro .brand-mark, #brand-intro .brand-wordmark')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const layers = [], entrances = [];
  let definitions, frame = 0, safety, revealSafety;
  let brandResolved = false, completed = false;
  name.disabled = true;

  function releaseBrand() {
    cancelAnimationFrame(frame);
    clearTimeout(safety);
    for (const {image, sharp, wrapper} of layers) {
      image.style.removeProperty('filter'); image.style.removeProperty('opacity'); image.style.removeProperty('transform');
      sharp.remove();
      if (wrapper.isConnected) wrapper.replaceWith(image);
    }
    definitions?.remove();
  }
  function finish() {
    if (completed) return;
    completed = true;
    releaseBrand();
    clearTimeout(revealSafety);
    entrances.forEach(animation => animation.cancel());
    root.dataset.intro = 'ready';
    content.inert = false;
    name.disabled = false;
  }
  async function revealPage() {
    if (brandResolved || completed) return;
    brandResolved = true;
    releaseBrand();
    try {
      // Cada elemento retiene su opacidad editorial: el footer nunca se vuelve negro.
      const targets = [...content.children].filter(el => !el.hidden && getComputedStyle(el).display !== 'none');
      const easing = getComputedStyle(root).getPropertyValue('--ease').trim();
      targets.forEach((element, index) => {
        const quiet = element.matches('.fineprint,.site-footer');
        const opacity = Number(getComputedStyle(element).opacity);
        const transform = quiet ? 'translateY(4px)' : element.id === 'dropzone' ? 'translateY(8px) scale(.98)' : 'translateY(8px)';
        entrances.push(element.animate([
          {opacity:0, transform:reduce.matches ? 'none' : transform},
          {opacity, transform:'none'}
        ], {duration:reduce.matches ? 120 : quiet ? 250 : 300,
          delay:reduce.matches ? 0 : index * 50, easing, fill:'both'}));
      });
      // Las animaciones ya están preparadas al retirar la ocultación del contenedor.
      root.dataset.intro = 'revealing';
      content.inert = false;
      name.disabled = false;
      revealSafety = setTimeout(finish, 900);
      await Promise.allSettled(entrances.map(animation => animation.finished));
      finish();
    } catch (error) {
      finish();
      console.warn('[lecturi] Entrada de la portada:',error);
    }
  }
  try {
    // Resolver IndexedDB y la fuente de interfaz antes de animar evita saltos de posición.
    await Promise.allSettled([ready, document.fonts.load('14px "Albert Sans"'), ...images.map(image => image.decode())]);
    const background = (getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) || []).slice(0,3).map(Number);
    const paper = background.length === 3 ? background : root.dataset.theme === 'oscuro' ? [27,28,29] : [253,251,246];
    const intercepts = contrastIntercepts(paper,2.4);
    definitions = document.createElementNS('http://www.w3.org/2000/svg','svg');
    definitions.setAttribute('class','intro-definitions');
    definitions.setAttribute('aria-hidden','true');
    definitions.dataset.theme = root.dataset.theme;
    definitions.innerHTML = `<defs><filter id="brand-resolve" x="-30%" y="-50%" width="160%" height="200%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".006 .0078" numOctaves="2" seed="7" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" result="displaced" />
      <feGaussianBlur in="displaced" stdDeviation="20" />
      <feComponentTransfer><feFuncR type="linear" slope="2.4" intercept="${intercepts[0]}" /><feFuncG type="linear" slope="2.4" intercept="${intercepts[1]}" /><feFuncB type="linear" slope="2.4" intercept="${intercepts[2]}" /></feComponentTransfer>
    </filter></defs>`;
    document.body.append(definitions);
    const noise = definitions.querySelector('feTurbulence'), displacement = definitions.querySelector('feDisplacementMap'), blur = definitions.querySelector('feGaussianBlur');
    const channels = [...definitions.querySelectorAll('feFuncR,feFuncG,feFuncB')];
    for (const image of images) {
      const wrapper = document.createElement('span'); wrapper.className = 'intro-image';
      image.replaceWith(wrapper); wrapper.append(image);
      const sharp = image.cloneNode();
      sharp.className = 'intro-sharp'; sharp.removeAttribute('data-brand-mark'); sharp.removeAttribute('data-brand-wordmark');
      sharp.alt = ''; sharp.setAttribute('aria-hidden','true'); wrapper.append(sharp);
      layers.push({image,sharp,wrapper});
    }
    const start = performance.now();
    safety = setTimeout(revealPage, DURATION + 150);
    function tick(now) {
      const t = clamp((now - start) / DURATION);
      const broad = smooth(.1,.82,t), detail = smooth(.7,1,t), arrival = smooth(0,.3,t);
      if (!reduce.matches) {
        const frequency = .006 + .0018 * Math.sin(t * 4.4);
        noise.setAttribute('baseFrequency',`${frequency} ${frequency * 1.3}`);
        displacement.setAttribute('scale',16 * (1 - smooth(.05,.9,t)) ** 1.5);
        blur.setAttribute('stdDeviation',mix(20,1.6,1 - (1 - broad) ** 2.2));
        const contrast = mix(2.4,1,broad), currentIntercepts = contrastIntercepts(paper,contrast);
        channels.forEach((channel,index) => {channel.setAttribute('slope',contrast); channel.setAttribute('intercept',currentIntercepts[index]);});
      }
      for (const {image,sharp} of layers) {
        image.style.filter = reduce.matches ? 'none' : 'url(#brand-resolve)';
        image.style.opacity = reduce.matches ? arrival : arrival * mix(.7,1,broad);
        image.style.transform = reduce.matches ? 'none' : `scale(${mix(1.04,1,smooth(0,.9,t))})`;
        sharp.style.opacity = reduce.matches ? 0 : detail;
        sharp.style.filter = reduce.matches ? 'none' : `blur(${mix(1.6,0,detail)}px)`;
      }
      if (t < 1) frame = requestAnimationFrame(tick);
      else revealPage();
    }
    tick(start);
  } catch (error) {
    finish();
    console.warn('[lecturi] Entrada de marca:',error);
  }
}
