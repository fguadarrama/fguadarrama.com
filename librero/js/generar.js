// Generate — de Bencho (bencho.dev), licencia MIT (bencho.dev/licence).
// Original: lab/Generate.tsx, un componente de React. El Librero es HTML +
// JavaScript sin React ni compilación, así que aquí va traducido a un módulo
// normal: mismos números, mismas curvas, mismos comentarios. Lo que en React
// era estado (t, made, held) aquí son variables, y pintar() hace lo que hacía
// el render. Uso: Generate(contenedor, { src, alt, … }) → { generate, destroy }.

/* ── inlined from lab/spring ──────────────────────── */
/* ── one spring, for everything that settles ───────────────
   The maths was already on this bench twice, copied by hand:
   Humidity's wheel and Brightness's column both accumulate
   velocity toward a target, damp it, and snap when both the
   delta and the velocity fall under 0.02. Two copies is a
   coincidence; five would be a policy, so it comes out here
   before the elastic blocks are written against it.

   The two shipped copies are deliberately NOT refactored onto
   this. They work, they are tuned, and rewriting the innards
   of two live components to prove a point about duplication
   is how a good afternoon becomes a bad one. This is the one
   new code uses.

   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. Multiplying is the
   version that makes a spring behave differently on a busy
   page, which is the hardest kind of bug to see.

   The loop parks itself the moment the value has settled.
   CLAUDE.md is not complimentary about the one permanent
   requestAnimationFrame already on this bench and there is no
   case for five more. */

/* Read once, the way the wheel and the pill nav do. A
   preference, not a live input. */
const stillness = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* FLOWER was Bencho's own pictures, which is not licensed
   to travel. Point this at yours. */
/* En el Librero cada ficha trae su propia imagen: la portada del
   libro llega como `src` (o, si el libro no tiene portada, la
   portada dibujada llega como `html`). FLOWER queda solo como
   respaldo: el ícono del sitio. */
const FLOWER = 'iconos/favicon.svg';

/* ══ Generate ═════════════════════════════════════════════
   A picture that is made in front of you, slowly. Press
   Generate and the flower arrives the way a generated image
   does — the large decisions first and the fine ones last —
   under a glassy liquid surface that stills as it lands.

   ── THREE SCALES OF DETAIL, IN ORDER ───────────────────
   · SHAPES. Heavily blurred and pushed hard in contrast, the
     flower is a few clean glassy masses — where the dark is,
     nothing more. The contrast is what makes them shapes
     rather than fog.
   · FORM. The blur lets go on a slow curve and the contrast
     eases back to the print's own, so the petals find their
     edges and their tones. A low drifting ripple keeps the
     surface liquid while it happens.
   · GRAIN. The halftone only comes in over the last quarter,
     through the print itself. The finest detail is the last
     thing decided, which is what makes it read as generated
     rather than revealed.

   It replaced a version built from halftone dots in passes,
   coarse to fine. That read as pixels arriving rather than a
   picture forming, and every stage of it was too busy.

   ── IDENTITY AT REST ────────────────────────────────────
   The filter only exists while a run is going. At rest the
   card is the print and nothing else, so a wall of these costs
   one image each. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const u = clamp((v - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

/* the print's paper, as a luminance. Contrast turns about THIS
   rather than mid-grey: about 0.5 the paper went to white and
   the card was a glowing sheet that snapped back to grey at the
   end. About the paper, the ground holds and the ink deepens. */
const PAPER = 0.9;

/* ── the count keeps its own time ─────────────────────────
   A number climbing at one steady rate reads as a timer, not
   as work. So the count runs on a curve of its own, re-rolled
   every run: a quick start, a slow stretch, a burst, a stall,
   another burst, and a crawl through the last tenth. The
   picture still forms on the plain clock underneath — only
   the number is uneven, which is how a real one behaves.

   Knots are (time, value) pairs, both 0..1 and both rising,
   so the count can never go backwards. Between two knots it
   is half linear and half smoothstep: speed changes read as
   easing rather than as corners, and never quite stop. */
const r = (a, b) => a + Math.random() * (b - a);
const knots = () => [
  [0, 0],
  [r(0.1, 0.16), r(0.1, 0.16)],   /* quick start */
  [r(0.32, 0.38), r(0.22, 0.3)],  /* slow stretch */
  [r(0.44, 0.49), r(0.5, 0.6)],   /* burst */
  [r(0.56, 0.61), r(0.62, 0.68)], /* stall */
  [r(0.68, 0.72), r(0.84, 0.88)], /* burst */
  [1, 1],                         /* and the long last bit */
];
const along = (ks, t) => {
  for (let i = 1; i < ks.length; i++) {
    const [t0, v0] = ks[i - 1];
    const [t1, v1] = ks[i];
    if (t > t1) continue;
    const u = clamp((t - t0) / (t1 - t0), 0, 1);
    return mix(v0, v1, mix(u, u * u * (3 - 2 * u), 0.5));
  }
  return 1;
};

const SVG = 'http://www.w3.org/2000/svg';
const atr = (el, a) => {
  for (const k in a) el.setAttribute(k, a[k]);
  return el;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let serie = 0;

export function Generate(raiz, {
  /* la imagen: la portada del libro (o `html`, la portada dibujada) */
  src = FLOWER,
  html = '',
  alt = '',
  /* otras caras que se forman a la vez que la imagen (en la ficha:
     el lomo del libro 3D). Pasan por las mismas tres escalas y con
     los mismos números; en reposo vuelven a ser ellas mismas. */
  caras = [],
  /* el texto de la píldora (la interfaz del Librero es en español) */
  etiqueta = 'Generar',
  /* seconds from the press to the picture */
  pace = 5,
  /* how liquid the surface is while it forms, 0..100 */
  ripple = 50,
  /* the frame's corner, px. The button is a pill at every
     setting — the frame is the picture, the pill is a control,
     and squaring one is no reason to square the other. */
  corner = 20,
} = {}) {
  const still = stillness();
  const id = `gen-${++serie}`;
  let t = 1;
  let raf = 0;
  let curve = knots();
  /* ── 100 is held for a beat ──────────────────────────────
     The run ending and the pill reading "Generate" again on
     the same frame means nobody ever sees 100 — the count
     would stop at 99 and vanish. So the pill stays a loader
     for a moment after the picture lands. */
  let held = false;
  /* ── it starts EMPTY ─────────────────────────────────────
     A plain frame of paper until the first run. A block about
     making a picture that already has the picture in it has
     answered its own question before anybody pressed it. Once
     made, the print stays, and pressing again remakes it from
     blank. */
  let made = false;
  let hold = 0;

  const gen = document.createElement('div');
  gen.className = 'gen';
  gen.innerHTML = `<div class="gen-card" style="border-radius:${clamp(corner, 0, 40)}px">
      <button type="button" class="gen-go" aria-label="${esc(etiqueta)}"><span>${esc(etiqueta)}</span></button>
      <span class="gen-pct" role="status" aria-live="off">0%</span>
    </div>`;
  const card = gen.firstElementChild;
  const go = card.querySelector('.gen-go');
  const pctEl = card.querySelector('.gen-pct');
  raiz.append(gen);

  // una capa de la imagen: <img> con la portada, o la portada dibujada
  const capaImagen = (visible) => {
    if (html) {
      const d = document.createElement('div');
      d.innerHTML = html;
      if (visible && alt) atr(d, { role: 'img', 'aria-label': alt });
      else d.setAttribute('aria-hidden', 'true');
      d.className = 'gen-print';
      return d;
    }
    const im = new Image();
    im.className = 'gen-print';
    im.src = src;
    im.alt = visible ? alt : '';
    im.draggable = false;
    return im;
  };

  let defs = null, haze = null, print = null, fx = null;
  const extras = caras.filter(Boolean).map((cara) => ({ cara, velo: null, haze: null, print: null }));
  // una copia de la cara, sin su lugar en 3D: la misma pinta, plana
  const copiaDe = (cara) => {
    const c = cara.cloneNode(true);
    c.querySelectorAll('.gen-cara').forEach((n) => n.remove());
    c.classList.add('gen-copia');
    c.setAttribute('aria-hidden', 'true');
    return c;
  };
  const crearNiebla = () => {
    defs = document.createElementNS(SVG, 'svg');
    atr(defs, { class: 'gen-defs', 'aria-hidden': 'true' });
    const filtro = atr(document.createElementNS(SVG, 'filter'), { id, x: '-10%', y: '-10%', width: '120%', height: '120%', 'color-interpolation-filters': 'sRGB' });
    const el = (tag, a) => filtro.appendChild(atr(document.createElementNS(SVG, tag), a));
    fx = {
      ruido: el('feTurbulence', { type: 'fractalNoise', numOctaves: 2, seed: 7, result: 'n' }),
      agua: el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
      blur: el('feGaussianBlur', { in: 'd' }),
    };
    const ct = el('feComponentTransfer', {});
    fx.canales = ['feFuncR', 'feFuncG', 'feFuncB'].map((tag) => ct.appendChild(atr(document.createElementNS(SVG, tag), { type: 'linear' })));
    defs.appendChild(filtro);
    haze = capaImagen(false);
    haze.style.filter = `url(#${id})`;
    card.insertBefore(defs, card.firstChild);
    card.insertBefore(haze, defs.nextSibling);
  };

  // lo que en React era el render: se llama en cada cuadro de una corrida
  const pintar = () => {
    const busy = t < 1;
    const loading = busy || held;
    /* 99 at most until the run has actually finished — the 100
       belongs to the picture landing, not to the curve */
    const pct = held ? 100 : Math.min(99, Math.floor(along(curve, t) * 100));
    gen.dataset.busy = busy;
    gen.dataset.loading = loading;
    gen.dataset.made = made;
    go.disabled = loading;
    go.tabIndex = loading ? -1 : 0;
    pctEl.textContent = `${pct}%`;

    /* ── the three windows ───────────────────────────────────── */
    /* one long rise, no pulse: the haze used to breathe while
       nothing was decided, and a picture that dims and brightens
       before it has started reads as hesitating */
    const hz = smooth(0, 0.3, t);
    const form = smooth(0.1, 0.82, t);
    const grain = smooth(0.7, 1, t);
    /* blur falls fast at first and then crawls through the small
       radii, which is where the detail actually lives */
    const sd = mix(20, 1.6, 1 - Math.pow(1 - form, 2.2));
    const k = mix(2.4, 1, form);
    const warp = (clamp(ripple, 0, 100) / 100) * 32 * Math.pow(1 - smooth(0.05, 0.9, t), 1.5);
    /* a slow drift in the noise so the water moves rather than
       sitting as a fixed distortion */
    const f = 0.006 + 0.0018 * Math.sin(t * 4.4);
    const cut = (PAPER - PAPER * k).toFixed(3);

    if (busy && !still) {
      if (!haze) crearNiebla();
      fx.ruido.setAttribute('baseFrequency', `${f.toFixed(4)} ${(f * 1.3).toFixed(4)}`);
      fx.agua.setAttribute('scale', warp.toFixed(2));
      fx.blur.setAttribute('stdDeviation', sd.toFixed(2));
      for (const c of fx.canales) atr(c, { slope: k.toFixed(3), intercept: cut });
      haze.style.opacity = hz * mix(0.7, 1, form);
      haze.style.scale = `${mix(1.04, 1, smooth(0, 0.9, t))}`;
    } else if (haze) {
      defs.remove();
      haze.remove();
      defs = haze = fx = null;
    }

    /* las otras caras, con los mismos números: la página en blanco
       (el velo), la niebla filtrada y el grano que llega al final.
       En reposo, ya hecha, el velo se va y la cara es ella misma. */
    for (const x of extras) {
      if (made && !busy) {
        x.velo?.remove();
        x.velo = x.haze = x.print = null;
        continue;
      }
      if (!x.velo) {
        x.velo = document.createElement('div');
        x.velo.className = 'gen-cara';
        x.velo.setAttribute('aria-hidden', 'true');
        x.cara.append(x.velo);
      }
      if (busy && !still) {
        if (!x.haze) x.velo.prepend((x.haze = copiaDe(x.cara)));
        x.haze.style.filter = `url(#${id})`;
        x.haze.style.opacity = hz * mix(0.7, 1, form);
        x.haze.style.scale = `${mix(1.04, 1, smooth(0, 0.9, t))}`;
      } else if (x.haze) {
        x.haze.remove();
        x.haze = null;
      }
      if (busy) {
        if (!x.print) x.velo.append((x.print = copiaDe(x.cara)));
        x.print.style.opacity = still ? t : grain;
        x.print.style.filter = still ? '' : `blur(${mix(1.6, 0, grain).toFixed(2)}px)`;
      } else if (x.print) {
        x.print.remove();
        x.print = null;
      }
    }

    /* the print: the whole card at rest once made, and the
       grain that arrives last during a run */
    if (made || busy) {
      if (!print) {
        print = capaImagen(true);
        card.insertBefore(print, go);
      }
      print.style.opacity = busy ? (still ? t : grain) : '';
      print.style.filter = busy && !still ? `blur(${mix(1.6, 0, grain).toFixed(2)}px)` : '';
    } else if (print) {
      print.remove();
      print = null;
    }
  };

  const destroy = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    window.clearTimeout(hold);
  };

  const generate = () => {
    if (t < 1 || held) return;
    const total = still ? 400 : Math.max(2, pace) * 1000;
    let t0 = 0;
    const tick = (now) => {
      if (!gen.isConnected) return destroy(); // la ficha se cerró a media corrida
      if (!t0) t0 = now;
      const v = Math.min(1, (now - t0) / total);
      t = v;
      if (v < 1) raf = requestAnimationFrame(tick);
      else {
        raf = 0;
        made = true;
        held = true;
        hold = window.setTimeout(() => {
          held = false;
          pintar();
        }, 650);
      }
      pintar();
    };
    curve = knots();
    t = 0;
    pintar();
    raf = requestAnimationFrame(tick);
  };

  /* ── the way in, in the middle of the page ───────────
     On the blank frame it is the only thing there. Once a
     picture is made it steps aside and only comes back
     under the pointer, so the print is left clean. */
  go.addEventListener('click', (e) => {
    e.stopPropagation();
    generate();
  });
  /* ── and the count, small, in the corner ─────────────
     Just the number going up. Held at 100 for a beat so
     it is seen, then it leaves with the run. */
  pintar();
  return { generate, destroy, el: gen };
}
