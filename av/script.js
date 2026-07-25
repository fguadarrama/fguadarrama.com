(() => {
  const avatar = document.getElementById('avatar');
  const viewer = document.getElementById('viewer');
  const backdrop = viewer.querySelector('.viewer__backdrop');
  const card = document.getElementById('openCard');
  const img = card.querySelector('.open-img');
  const canvas = card.querySelector('.open-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let open = false;
  let closing = false;
  let bendRaf = 0;
  let flightAnimation = null;
  let bendTimer = 0;

  const defaults = {
    enableTilt: true,
    enableBend: true,
    openDuration: 560,
    closeDuration: 380,
    tiltX: 18,
    tiltY: -11,
    lift: 54,
    perspective: 980,
    bendStrength: 15,
    bendDuration: 175,
    bendDelay: 55,
    tiltPeak: 34
  };

  const ids = Object.keys(defaults);
  const controls = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const outputs = {
    openDuration: document.getElementById('openDurationOut'),
    closeDuration: document.getElementById('closeDurationOut'),
    tiltX: document.getElementById('tiltXOut'),
    tiltY: document.getElementById('tiltYOut'),
    lift: document.getElementById('liftOut'),
    perspective: document.getElementById('perspectiveOut'),
    bendStrength: document.getElementById('bendStrengthOut'),
    bendDuration: document.getElementById('bendDurationOut'),
    bendDelay: document.getElementById('bendDelayOut'),
    tiltPeak: document.getElementById('tiltPeakOut')
  };

  function val(id) {
    const el = controls[id];
    return el.type === 'checkbox' ? el.checked : Number(el.value);
  }

  function syncOutputs() {
    outputs.openDuration.textContent = `${val('openDuration')} ms`;
    outputs.closeDuration.textContent = `${val('closeDuration')} ms`;
    outputs.tiltX.textContent = `${val('tiltX')}°`;
    outputs.tiltY.textContent = `${val('tiltY') < 0 ? '−' : ''}${Math.abs(val('tiltY'))}°`;
    outputs.lift.textContent = `${val('lift')} px`;
    outputs.perspective.textContent = `${val('perspective')} px`;
    outputs.bendStrength.textContent = `${val('bendStrength')} px`;
    outputs.bendDuration.textContent = `${val('bendDuration')} ms`;
    outputs.bendDelay.textContent = `${val('bendDelay')} ms`;
    outputs.tiltPeak.textContent = `${val('tiltPeak')}%`;
    document.documentElement.style.setProperty('--perspective', `${val('perspective')}px`);
  }

  ids.forEach(id => controls[id].addEventListener('input', syncOutputs));
  document.getElementById('reset').addEventListener('click', () => {
    ids.forEach(id => {
      if (controls[id].type === 'checkbox') controls[id].checked = defaults[id];
      else controls[id].value = defaults[id];
    });
    syncOutputs();
  });
  syncOutputs();

  // Hover behavior preserved from the accepted version.
  const magnetic = avatar.querySelector('.avatar__magnetic');
  const tilt = avatar.querySelector('.avatar__tilt');
  let hoverRaf = 0;
  const target = { mx:0, my:0, rx:0, ry:0, scale:1 };
  const current = { mx:0, my:0, rx:0, ry:0, scale:1 };
  function hoverTick() {
    const k = .18;
    Object.keys(current).forEach(key => current[key] += (target[key] - current[key]) * k);
    magnetic.style.transform = `translate3d(${current.mx}px,${current.my}px,0)`;
    tilt.style.transform = `rotateX(${current.rx}deg) rotateY(${current.ry}deg) scale(${current.scale})`;
    const delta = Math.max(...Object.keys(current).map(key => Math.abs(target[key] - current[key])));
    hoverRaf = delta > .001 ? requestAnimationFrame(hoverTick) : 0;
  }
  function hoverAnimate() { if (!hoverRaf) hoverRaf = requestAnimationFrame(hoverTick); }
  function hoverMove(e) {
    if (reduced || open) return;
    const r = avatar.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    const dist = Math.min(1, Math.hypot(nx, ny));
    const falloff = Math.pow(1 - dist * .35, 2);
    target.mx = nx * 9 * falloff;
    target.my = ny * 9 * falloff;
    target.rx = -ny * 14;
    target.ry = nx * 14;
    target.scale = 1.085;
    avatar.classList.add('is-hovering');
    hoverAnimate();
  }
  function hoverLeave() {
    Object.assign(target, { mx:0, my:0, rx:0, ry:0, scale:1 });
    avatar.classList.remove('is-hovering');
    hoverAnimate();
  }
  avatar.addEventListener('pointerenter', hoverMove);
  avatar.addEventListener('pointermove', hoverMove);
  avatar.addEventListener('pointerleave', hoverLeave);
  avatar.addEventListener('pointercancel', hoverLeave);

  function resetCard() {
    cancelAnimationFrame(bendRaf);
    clearTimeout(bendTimer);
    if (flightAnimation) flightAnimation.cancel();
    bendRaf = 0;
    bendTimer = 0;
    flightAnimation = null;
    card.className = 'open-card';
    card.removeAttribute('style');
    canvas.removeAttribute('style');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function geometry() {
    const sr = avatar.getBoundingClientRect();
    const stage = card.parentElement.getBoundingClientRect();
    return {
      sx: sr.width / stage.width,
      sy: sr.height / stage.height,
      dx: (sr.left + sr.width / 2) - (stage.left + stage.width / 2),
      dy: (sr.top + sr.height / 2) - (stage.top + stage.height / 2)
    };
  }

  function openViewer() {
    if (open || closing) return;
    open = true;
    resetCard();
    hoverLeave();
    viewer.classList.add('is-visible');
    viewer.setAttribute('aria-hidden', 'false');
    const g = geometry();
    card.classList.add('flip');
    card.style.transform = `translate3d(${g.dx}px,${g.dy}px,0) scale(${g.sx},${g.sy}) rotateX(0deg) rotateY(0deg)`;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const duration = val('openDuration');
      const peak = val('tiltPeak') / 100;
      const useTilt = val('enableTilt');
      const tx = useTilt ? val('tiltX') : 0;
      const ty = useTilt ? val('tiltY') : 0;
      const z = useTilt ? val('lift') : 0;
      flightAnimation = card.animate([
        { transform:`translate3d(${g.dx}px,${g.dy}px,0) scale(${g.sx},${g.sy}) rotateX(0deg) rotateY(0deg)`, offset:0, easing:'cubic-bezier(.26,.78,.38,1)' },
        { transform:`translate3d(${g.dx * .18}px,${g.dy * .18}px,${z}px) scale(.74) rotateX(${tx}deg) rotateY(${ty}deg)`, offset:peak, easing:'cubic-bezier(.32,0,.24,1)' },
        { transform:'translate3d(0,0,0) scale(1) rotateX(0deg) rotateY(0deg)', offset:1 }
      ], { duration, easing:'linear', fill:'forwards' });

      if (val('enableBend') && val('bendStrength') > 0) {
        bendTimer = setTimeout(() => runBend({
          strength: val('bendStrength'),
          duration: val('bendDuration'),
          sign: 1
        }), val('bendDelay'));
      }
    }));
  }

  function closeViewer() {
    if (!open || closing) return;
    closing = true;
    cancelAnimationFrame(bendRaf);
    clearTimeout(bendTimer);
    card.classList.remove('is-bending');
    const g = geometry();
    const duration = val('closeDuration');
    const tx = val('enableTilt') ? -val('tiltX') * .34 : 0;
    const ty = val('enableTilt') ? -val('tiltY') * .34 : 0;
    const z = val('enableTilt') ? val('lift') * .28 : 0;

    if (val('enableBend') && val('bendStrength') > 0) {
      runBend({ strength: val('bendStrength') * .55, duration: Math.min(150, duration * .45), sign: -1 });
    }

    flightAnimation = card.animate([
      { transform:'translate3d(0,0,0) scale(1) rotateX(0deg) rotateY(0deg)', offset:0, easing:'cubic-bezier(.38,.32,.46,1)' },
      { transform:`translate3d(${g.dx * .22}px,${g.dy * .22}px,${z}px) scale(.72) rotateX(${tx}deg) rotateY(${ty}deg)`, offset:.42, easing:'cubic-bezier(.45,0,.3,1)' },
      { transform:`translate3d(${g.dx}px,${g.dy}px,0) scale(${g.sx},${g.sy}) rotateX(0deg) rotateY(0deg)`, offset:1 }
    ], { duration, easing:'linear', fill:'forwards' });
    flightAnimation.onfinish = finishClose;
  }

  function finishClose() {
    viewer.classList.remove('is-visible');
    viewer.setAttribute('aria-hidden', 'true');
    resetCard();
    open = false;
    closing = false;
  }

  avatar.addEventListener('click', openViewer);
  backdrop.addEventListener('click', closeViewer);
  card.addEventListener('click', closeViewer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeViewer(); });

  // Alpha-aware organic bend. Samples outside the source become transparent.
  const NZ = 64;
  const nzR = new Float32Array(NZ * NZ);
  const nzG = new Float32Array(NZ * NZ);
  {
    let s = 11;
    for (let i = 0; i < NZ * NZ; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      nzR[i] = s / 2147483648 - 1;
      s = (s * 1664525 + 1013904223) >>> 0;
      nzG[i] = s / 2147483648 - 1;
    }
  }
  function grid(g,x,y) {
    const xi=Math.floor(x), yi=Math.floor(y);
    let fx=x-xi, fy=y-yi;
    fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy);
    const x0=((xi%NZ)+NZ)%NZ, x1=(x0+1)%NZ;
    const y0=((yi%NZ)+NZ)%NZ, y1=(y0+1)%NZ;
    const top=g[y0*NZ+x0]+(g[y0*NZ+x1]-g[y0*NZ+x0])*fx;
    const bot=g[y1*NZ+x0]+(g[y1*NZ+x1]-g[y1*NZ+x0])*fx;
    return top+(bot-top)*fy;
  }
  function noise(g,x,y) {
    return (grid(g,x/118,y/78)+.42*grid(g,x/61+37.7,y/43+11.3))/1.42;
  }

  function runBend({ strength, duration, sign }) {
    if (reduced || !img.complete || strength <= 0) return;
    cancelAnimationFrame(bendRaf);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const sw = Math.round(cw * dpr), sh = Math.round(ch * dpr);
    const pad = Math.ceil(Math.abs(strength) * .38) + 6;
    const pd = Math.round(pad * dpr);
    canvas.style.left = `-${pad}px`;
    canvas.style.top = `-${pad}px`;
    canvas.style.width = `${cw + pad * 2}px`;
    canvas.style.height = `${ch + pad * 2}px`;
    canvas.width = sw + pd * 2;
    canvas.height = sh + pd * 2;

    const sc = document.createElement('canvas');
    sc.width = sw; sc.height = sh;
    const sx = sc.getContext('2d', { willReadFrequently:true });
    sx.clearRect(0,0,sw,sh);
    sx.drawImage(img,0,0,sw,sh);
    const src = sx.getImageData(0,0,sw,sh).data;
    const out = ctx.createImageData(canvas.width,canvas.height);
    const dst = out.data;

    const LAT = 8;
    const lw = Math.ceil(canvas.width / LAT) + 2;
    const lh = Math.ceil(canvas.height / LAT) + 2;
    const fxf = new Float32Array(lw * lh);
    const fyf = new Float32Array(lw * lh);
    for (let ly=0; ly<lh; ly++) {
      const py=(ly*LAT-pd)/dpr;
      for (let lx=0; lx<lw; lx++) {
        const px=(lx*LAT-pd)/dpr;
        const q=(2*px-cw)/(1.55*cw);
        const i=ly*lw+lx;
        fxf[i]=.0012+.052*noise(nzR,px,py);
        fyf[i]=.31*(1-q*q)-.305+.058*noise(nzG,px,py);
      }
    }

    card.classList.add('is-bending');
    const t0 = performance.now();

    function sample(x,y,channel) {
      if (x < 0 || y < 0 || x > sw-1 || y > sh-1) return 0;
      const x0 = Math.min(sw-2,Math.floor(x));
      const y0 = Math.min(sh-2,Math.floor(y));
      const u=x-x0, v=y-y0;
      const i=(y0*sw+x0)*4;
      return src[i+channel]*(1-u)*(1-v)
        + src[i+4+channel]*u*(1-v)
        + src[i+sw*4+channel]*(1-u)*v
        + src[i+sw*4+4+channel]*u*v;
    }

    function frame(now) {
      const p = Math.min((now-t0)/duration,1);
      const eased = 1 - Math.pow(1-p,2.4);
      const env = Math.sin(Math.PI * eased);
      const sdev = strength * sign * env * dpr;
      const W=canvas.width, H=canvas.height, inv=1/LAT;
      let di=0;
      for (let y=0; y<H; y++) {
        const gy=y*inv, y0=gy|0, fy=gy-y0, r0=y0*lw, r1=r0+lw;
        for (let x=0; x<W; x++, di+=4) {
          const gx=x*inv, x0=gx|0, fx=gx-x0, a=r0+x0, b=r1+x0;
          const FX=(fxf[a]+(fxf[a+1]-fxf[a])*fx)*(1-fy)+(fxf[b]+(fxf[b+1]-fxf[b])*fx)*fy;
          const FY=(fyf[a]+(fyf[a+1]-fyf[a])*fx)*(1-fy)+(fyf[b]+(fyf[b+1]-fyf[b])*fx)*fy;
          const px=x-pd+sdev*FX, py=y-pd+sdev*FY;
          dst[di]=sample(px,py,0);
          dst[di+1]=sample(px,py,1);
          dst[di+2]=sample(px,py,2);
          dst[di+3]=sample(px,py,3);
        }
      }
      ctx.putImageData(out,0,0);
      if (p < 1) bendRaf=requestAnimationFrame(frame);
      else {
        card.classList.remove('is-bending');
        bendRaf=0;
      }
    }
    bendRaf=requestAnimationFrame(frame);
  }
})();
