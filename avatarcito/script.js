(function initOpenTilt() {
  const card = document.getElementById("opentilt-card");
  if (!card) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Bend driver: a rAF envelope pushes the displacement 0 → peak → 0
  // (sin(π · ease(p)), peaking when the eased progress crosses 0.5;
  // close runs a smaller opposite bow). The warp is drawn in software
  // on the .t-opentilt-canvas layer — the displacement FIELD is
  //   Fy = 0.4116 · (1 − q²) − 0.41 + 0.09 · noise   q = (2x − w)/(1.4w)
  //   Fx = 0.0016 + 0.09 · noise
  // (a blurred horizontal parabola mixed 18% with low-frequency organic
  // noise, channels − 0.5), scaled by strength · sign · envelope.
  const img = card.querySelector(".t-opentilt-img");
  const canvas = card.querySelector(".t-opentilt-canvas");
  const cctx = canvas ? canvas.getContext("2d") : null;
  let bendRaf = null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Deterministic 2-octave value noise (≈110/70px wavelengths).
  const NZ = 64;
  const nzR = new Float32Array(NZ * NZ);
  const nzG = new Float32Array(NZ * NZ);
  (function seed() {
    let s = 11;
    for (let i = 0; i < NZ * NZ; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      nzR[i] = s / 2147483648 - 1;
      s = (s * 1664525 + 1013904223) >>> 0;
      nzG[i] = s / 2147483648 - 1;
    }
  })();
  function grid(g, x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % NZ) + NZ) % NZ, x1 = (x0 + 1) % NZ;
    const y0 = ((yi % NZ) + NZ) % NZ, y1 = (y0 + 1) % NZ;
    const top = g[y0 * NZ + x0] + (g[y0 * NZ + x1] - g[y0 * NZ + x0]) * fx;
    const bot = g[y1 * NZ + x0] + (g[y1 * NZ + x1] - g[y1 * NZ + x0]) * fx;
    return top + (bot - top) * fy;
  }
  function noise(g, px, py) {
    return (grid(g, px / 110, py / 70) +
            0.5 * grid(g, px / 55 + 37.7, py / 35 + 11.3)) / 1.5;
  }

  // Per-run state: unclipped photo snapshot + the displacement field
  // (per unit strength) on a coarse lattice — the field is ultra-smooth,
  // so 8-device-px cells lose nothing.
  const LAT = 8;
  let snapData = null, outData = null;
  let latFX = null, latFY = null, latW = 0, latH = 0;
  let pad = 0, padDev = 0, sw = 0, sh = 0;

  function prepareBend(strength) {
    const cw = card.offsetWidth, ch = card.offsetHeight;
    sw = Math.max(2, Math.round(cw * dpr));
    sh = Math.max(2, Math.round(ch * dpr));
    // Max |displacement| ≈ 0.30 · strength (parabola + noise).
    pad = Math.ceil(Math.abs(strength) * 0.32) + 4;
    padDev = Math.round(pad * dpr);
    // Canvas is a REPLACED element: absolute + inset does NOT stretch
    // it (it keeps its intrinsic attribute size), so the CSS box must
    // be sized explicitly.
    canvas.style.left = -pad + "px";
    canvas.style.top = -pad + "px";
    canvas.style.width = (cw + pad * 2) + "px";
    canvas.style.height = (ch + pad * 2) + "px";
    canvas.width = sw + padDev * 2;
    canvas.height = sh + padDev * 2;
    outData = cctx.createImageData(canvas.width, canvas.height);
    // Snapshot the cover-cropped photo UNCLIPPED — the rounded clip is
    // applied per pixel during the warp so the outline bends too.
    const sc = document.createElement("canvas");
    sc.width = sw;
    sc.height = sh;
    const scx = sc.getContext("2d");
    if (img && img.naturalWidth) {
      const k = Math.max(sw / img.naturalWidth, sh / img.naturalHeight);
      const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      scx.drawImage(img, (sw - dw) / 2, (sh - dh) / 2, dw, dh);
    }
    snapData = scx.getImageData(0, 0, sw, sh).data;
    latW = Math.ceil(canvas.width / LAT) + 2;
    latH = Math.ceil(canvas.height / LAT) + 2;
    latFX = new Float32Array(latW * latH);
    latFY = new Float32Array(latW * latH);
    for (let ly = 0; ly < latH; ly++) {
      const py = (ly * LAT - padDev) / dpr;
      for (let lx = 0; lx < latW; lx++) {
        const px = (lx * LAT - padDev) / dpr;
        const q = (2 * px - cw) / (1.4 * cw);
        const li = ly * latW + lx;
        latFX[li] = 0.0016 + 0.09 * noise(nzR, px, py);
        latFY[li] = 0.4116 * (1 - q * q) - 0.41 + 0.09 * noise(nzG, px, py);
      }
    }
  }

  function renderBend(s, rCss) {
    // Radius passed in analytically (see runBend) — reading
    // getComputedStyle here every frame forces a style recalc
    // mid-animation, which is cheap in Blink but expensive enough in
    // Safari to drop the bend to ~30fps.
    const rr = rCss * dpr;
    const W = canvas.width, H = canvas.height;
    const src = snapData, dst = outData.data;
    const sDev = s * dpr;
    const invLat = 1 / LAT;
    let di = 0;
    for (let y = 0; y < H; y++) {
      const gy = y * invLat, gy0 = gy | 0, fyL = gy - gy0;
      const row0 = gy0 * latW, row1 = row0 + latW;
      for (let x = 0; x < W; x++, di += 4) {
        const gx = x * invLat, gx0 = gx | 0, fxL = gx - gx0;
        const a = row0 + gx0, b = row1 + gx0;
        const Fx = (latFX[a] + (latFX[a + 1] - latFX[a]) * fxL) * (1 - fyL) +
                   (latFX[b] + (latFX[b + 1] - latFX[b]) * fxL) * fyL;
        const Fy = (latFY[a] + (latFY[a + 1] - latFY[a]) * fxL) * (1 - fyL) +
                   (latFY[b] + (latFY[b + 1] - latFY[b]) * fxL) * fyL;
        const sxf = x - padDev + sDev * Fx;
        const syf = y - padDev + sDev * Fy;
        // Bilinear photo fetch. Preserve the WebP source alpha exactly so
        // the transparent area outside the circular portrait never becomes black.
        let sx0 = Math.floor(sxf), sy0 = Math.floor(syf);
        if (sx0 < 0) sx0 = 0; else if (sx0 > sw - 2) sx0 = sw - 2;
        if (sy0 < 0) sy0 = 0; else if (sy0 > sh - 2) sy0 = sh - 2;
        const u = Math.min(Math.max(sxf - sx0, 0), 1);
        const v = Math.min(Math.max(syf - sy0, 0), 1);
        const w00 = (1-u)*(1-v), w10 = u*(1-v);
        const w01 = (1-u)*v, w11 = u*v;
        const i00=(sy0*sw+sx0)*4, i10=i00+4, i01=i00+sw*4, i11=i01+4;
        dst[di]   = src[i00]*w00 + src[i10]*w10 + src[i01]*w01 + src[i11]*w11;
        dst[di+1] = src[i00+1]*w00 + src[i10+1]*w10 + src[i01+1]*w01 + src[i11+1]*w11;
        dst[di+2] = src[i00+2]*w00 + src[i10+2]*w10 + src[i01+2]*w01 + src[i11+2]*w11;
        dst[di+3] = src[i00+3]*w00 + src[i10+3]*w10 + src[i01+3]*w01 + src[i11+3]*w11;
      }
    }
    cctx.putImageData(outData, 0, 0);
  }

  function readNum(name, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return fallback;
    if (raw.endsWith("ms")) return parseFloat(raw);
    if (raw.endsWith("s") && !raw.endsWith("ms")) return parseFloat(raw) * 1000;
    const n = parseFloat(raw);
    return isNaN(n) ? fallback : n;
  }
  function readStr(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Cubic-bezier sampler (Newton's method), matching the CSS easing named
  // in --opentilt-bend-ease (keyword or cubic-bezier).
  function makeBendEase(raw) {
    const kw = {
      "linear": [0, 0, 1, 1],
      "ease": [0.25, 0.1, 0.25, 1],
      "ease-in": [0.42, 0, 1, 1],
      "ease-out": [0, 0, 0.58, 1],
      "ease-in-out": [0.42, 0, 0.58, 1],
    };
    let c = kw[(raw || "").trim()];
    if (!c) {
      const m = (raw || "").match(
        /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/
      );
      if (m) c = [+m[1], +m[2], +m[3], +m[4]];
    }
    if (!c) c = kw["ease"];
    const x1 = c[0], y1 = c[1], x2 = c[2], y2 = c[3];
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const dxf = (t) => (3 * ax * t + 2 * bx) * t + cx;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 6; i++) {
        const e = sx(t) - x;
        if (Math.abs(e) < 1e-4) break;
        const d = dxf(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      return sy(t);
    };
  }

  function runBend(sign, flightMs) {
    if (!canvas || !cctx || reduced) return;
    const strength = readNum("--opentilt-bend", 0);
    if (!strength) return;
    const explicit = readNum("--opentilt-bend-dur", 0);
    const durMs = explicit > 0 ? explicit : flightMs;
    if (durMs <= 0) return;
    const ease = makeBendEase(readStr("--opentilt-bend-ease"));
    // Radius over the flight, computed analytically with the same
    // duration + curve as the CSS border-radius transition (read once
    // here; per-frame getComputedStyle would force a Safari style
    // recalc every frame). 32px rest ↔ 16px open — must match the
    // .t-opentilt-card / .is-open CSS.
    const rFrom = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0;
    const rTo = 0;
    const flightEase = makeBendEase(
      readStr(sign > 0 ? "--opentilt-open-ease" : "--opentilt-close-ease")
    );
    if (bendRaf) cancelAnimationFrame(bendRaf);
    prepareBend(strength);
    card.classList.add("is-bending");
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min((now - t0) / durMs, 1);
      const e = Math.min(Math.max(ease(p), 0), 1);
      const env = Math.sin(Math.PI * e);
      const p2 = Math.min((now - t0) / Math.max(flightMs, 1), 1);
      renderBend(strength * sign * env, rFrom + (rTo - rFrom) * flightEase(p2));
      if (p < 1) {
        bendRaf = requestAnimationFrame(tick);
      } else {
        bendRaf = null;
        card.classList.remove("is-bending");
      }
    })(t0);
  }

  card.addEventListener("click", function () {
    const open = card.classList.contains("is-open");
    if (open) {
      card.classList.remove("is-open");
      card.classList.add("is-closing");
      card.setAttribute("aria-expanded", "false");
      runBend(-0.6, readNum("--opentilt-close-dur", 420));
    } else {
      card.classList.remove("is-closing");
      card.classList.add("is-open");
      card.setAttribute("aria-expanded", "true");
      runBend(1, readNum("--opentilt-open-dur", 620));
    }
  });
  card.addEventListener("animationend", function (e) {
    if (e.animationName === "t-opentilt-close") {
      card.classList.remove("is-closing");
    }
  });
})();
(function initAvatarInteractions() {
  const avatar = document.getElementById("avatar");
  const tilt = document.getElementById("avatarTilt");
  const viewer = document.getElementById("viewer");
  const backdrop = document.getElementById("viewerBackdrop");
  const card = document.getElementById("opentilt-card");
  if (!avatar || !tilt || !viewer || !backdrop || !card) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0, scale = 1;

  function render() {
    cx += (tx - cx) * .2;
    cy += (ty - cy) * .2;
    scale += (1.085 - scale) * .2;
    tilt.style.transform = `rotateX(${cx}deg) rotateY(${cy}deg) scale(${scale})`;
    if (Math.abs(tx-cx)>.015 || Math.abs(ty-cy)>.015 || Math.abs(1.085-scale)>.002) raf=requestAnimationFrame(render); else raf=0;
  }
  avatar.addEventListener("pointermove", e => {
    if (reduced || viewer.classList.contains("is-open")) return;
    const r=avatar.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
    tx=-y*16; ty=x*18;
    tilt.style.setProperty("--mx", `${(x+.5)*100}%`);
    tilt.style.setProperty("--my", `${(y+.5)*100}%`);
    if(!raf) raf=requestAnimationFrame(render);
  });
  avatar.addEventListener("pointerenter",()=>{ scale=1; if(!raf&&!reduced) raf=requestAnimationFrame(render); });
  avatar.addEventListener("pointerleave",()=>{
    tx=ty=0; scale=1;
    cancelAnimationFrame(raf); raf=0;
    tilt.style.transform="rotateX(0deg) rotateY(0deg) scale(1)";
  });

  function openViewer(){
    viewer.classList.add("is-open"); viewer.setAttribute("aria-hidden","false");
    avatar.setAttribute("aria-expanded","true");
    requestAnimationFrame(()=>card.click());
  }
  function closeViewer(){ if(card.classList.contains("is-open")) card.click(); }
  avatar.addEventListener("click", openViewer);
  backdrop.addEventListener("click", closeViewer);
  card.addEventListener("click",()=>{
    if(card.classList.contains("is-open")) return;
    // the recipe click handler runs before this listener and has just started closing
    if(card.classList.contains("is-closing")) {
      setTimeout(()=>{
        viewer.classList.remove("is-open"); viewer.setAttribute("aria-hidden","true");
        avatar.setAttribute("aria-expanded","false");
      },420);
    }
  });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&viewer.classList.contains("is-open")) closeViewer(); });
})();

(function initAvatarHover(){
  const avatar=document.getElementById("avatar");
  const magnetic=document.getElementById("avatarMagnetic");
  const tilt=document.getElementById("avatarTilt");
  if(!avatar||!magnetic||!tilt)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf=0,target={mx:0,my:0,rx:0,ry:0,scale:1},current={mx:0,my:0,rx:0,ry:0,scale:1};
  function tick(){
    const k=.18;
    for(const key in current) current[key]+=(target[key]-current[key])*k;
    magnetic.style.transform=`translate3d(${current.mx}px,${current.my}px,0)`;
    tilt.style.transform=`rotateX(${current.rx}deg) rotateY(${current.ry}deg) scale(${current.scale})`;
    if(Math.max(...Object.keys(current).map(k=>Math.abs(target[k]-current[k])))>.001) raf=requestAnimationFrame(tick); else raf=0;
  }
  function animate(){if(!raf)raf=requestAnimationFrame(tick)}
  function move(e){
    if(reduced)return;
    const r=avatar.getBoundingClientRect();
    const nx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2)));
    const ny=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(r.height/2)));
    const dist=Math.min(1,Math.hypot(nx,ny));
    const falloff=Math.pow(1-dist*.35,2);
    const cs=getComputedStyle(document.documentElement);
    const tiltAmount=parseFloat(cs.getPropertyValue('--hover-tilt'))||14;
    const magneticAmount=parseFloat(cs.getPropertyValue('--hover-magnetic'))||9;
    target.mx=nx*magneticAmount*falloff; target.my=ny*magneticAmount*falloff;
    target.rx=-ny*tiltAmount; target.ry=nx*tiltAmount;
    target.scale=parseFloat(cs.getPropertyValue('--hover-scale'))||1.085;
    avatar.classList.add('is-hovering'); animate();
  }
  function leave(){target={mx:0,my:0,rx:0,ry:0,scale:1};avatar.classList.remove('is-hovering');animate()}
  avatar.addEventListener('pointerenter',move); avatar.addEventListener('pointermove',move); avatar.addEventListener('pointerleave',leave); avatar.addEventListener('pointercancel',leave);
})();
