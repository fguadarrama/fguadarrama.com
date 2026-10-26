import { sound } from './sound.js';
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Regla con lanzamiento y encaje en un solo resorte, como Time Scrubber.
// La posición es continua; se recompone el EPUB una sola vez al asentarse.
export function createScrubber(host, { label, icon = "", min, max, step, value, format, onCommit }) {
  host.classList.add('scrubber');
  host.innerHTML = `<div class="scrub-heading"><span class="scrub-label">${icon}${label}</span><output class="scrub-value"></output></div>
    <div class="scrub-ruler" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="${min}" aria-valuemax="${max}">
      <div class="scrub-ticks" aria-hidden="true"></div><span class="scrub-mark" aria-hidden="true"></span>
    </div><div class="scrub-help">Arrastra para ajustar</div>`;
  const ruler = host.querySelector('.scrub-ruler'), ticks = host.querySelector('.scrub-ticks'), output = host.querySelector('output');
  const count = Math.round((max - min) / step), pitch = 16;
  let x = (value - min) / step, target = x, velocity = 0, raf = 0, drag = null, previous = Math.round(x), time = 0;
  const tickNodes = Array.from({ length: count + 1 }, (_, i) => {
    const tick = document.createElement('span');
    tick.className = 'scrub-tick'; tick.dataset.major = i % 5 === 0;
    if (i % 5 === 0) { const text = document.createElement('small'); text.textContent = format(min + i * step); tick.append(text); }
    ticks.append(tick); return tick;
  });
  function draw(audible = true) {
    const index = clamp(Math.round(x), 0, count), v = Number((min + index * step).toFixed(2));
    if (index !== previous && audible) sound(index % 5 === 0 ? 'notch' : 'tock', 35);
    previous = index;
    const text = format(v);
    if (output.dataset.value !== text) {
      output.dataset.value = text;
      output.setAttribute('aria-label', text);
      const old = [...output.children];
      output.replaceChildren(...[...text].map((char, index) => {
        if (/\d/.test(char) && old.length === text.length && old[index]?.querySelector('.digit-strip')) {
          old[index].querySelector('.digit-strip').style.transform = `translateY(${-Number(char) * 1.5}em)`;
          return old[index];
        }
        const col = document.createElement('span'); col.className = 'digit'; col.setAttribute('aria-hidden','true');
        if (/\d/.test(char)) {
          const strip = document.createElement('span'); strip.className = 'digit-strip';
          strip.style.transform = `translateY(${-Number(char) * 1.5}em)`;
          for (let i = 0; i < 10; i++) { const d = document.createElement('span'); d.textContent = i; strip.append(d); }
          col.append(strip);
        } else col.textContent = char === ' ' ? '\u00a0' : char;
        return col;
      }));
      if (!reduce()) output.animate([{ transform:'translateY(2px)', opacity:.65 },{ transform:'translateY(0)', opacity:1 }], {duration:120, easing:'ease-out'});
    }
    ruler.setAttribute('aria-valuenow', v); ruler.setAttribute('aria-valuetext', text);
    const half = ruler.clientWidth / 2 || 132;
    tickNodes.forEach((tick, i) => {
      const offset = (i - x) * pitch, f = clamp(1 - (Math.abs(offset) / half) ** 2, 0, 1);
      tick.style.transform = `translateX(${offset}px) scaleY(${.55 + .45 * f})`;
      tick.style.opacity = Math.abs(offset) > half ? 0 : .18 + .82 * f;
    });
  }
  const commit = () => onCommit(Number((min + clamp(Math.round(x), 0, count) * step).toFixed(2)));
  function settle(to, v = 0, immediate = false) {
    cancelAnimationFrame(raf); target = clamp(Math.round(to), 0, count); velocity = v; time = 0;
    if (reduce() || immediate) { x = target; draw(); raf = 0; commit(); return; }
    function frame(now) {
      const dt = time ? clamp((now - time) / 16.67, 0, 2.5) : 1; time = now;
      velocity += ((target - x) * .022 - velocity * .26) * dt;
      x = clamp(x + velocity * dt, 0, count); draw();
      if (Math.abs(target - x) < .01 && Math.abs(velocity) < .01) { x = target; draw(); raf = 0; commit(); }
      else raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }
  ruler.onpointerdown = e => {
    if (e.button !== 0) return;
    cancelAnimationFrame(raf); raf = 0; ruler.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, time: performance.now(), v: 0 }; ruler.classList.add('dragging');
  };
  ruler.onpointermove = e => {
    if (!drag) return;
    const now = performance.now(), delta = -(e.clientX - drag.x) / pitch;
    drag.v = drag.v * .5 + delta / Math.max(1, (now - drag.time) / 16.67) * .5;
    drag.x = e.clientX; drag.time = now; x = clamp(x + delta, 0, count); draw();
  };
  function release(e, cancel = false) {
    if (!drag) return;
    const v = cancel || performance.now() - drag.time > 80 ? 0 : clamp(drag.v, -3, 3);
    drag = null; ruler.classList.remove('dragging');
    if (ruler.hasPointerCapture(e.pointerId)) ruler.releasePointerCapture(e.pointerId);
    settle(x + v * 21, v * .6);
  }
  ruler.onpointerup = e => release(e); ruler.onpointercancel = e => release(e, true);
  ruler.onkeydown = e => {
    let to;
    if (['ArrowRight','ArrowUp'].includes(e.key)) to = Math.round(x) + 1;
    if (['ArrowLeft','ArrowDown'].includes(e.key)) to = Math.round(x) - 1;
    if (e.key === 'Home') to = 0;
    if (e.key === 'End') to = count;
    if (to !== undefined) { e.preventDefault(); settle(to, 0, true); }
  };
  let wheelTimer;
  ruler.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); cancelAnimationFrame(raf); raf = 0; x = clamp(x + e.deltaX / pitch, 0, count); draw();
    clearTimeout(wheelTimer); wheelTimer = setTimeout(() => settle(x), 120);
  }, {passive:false});
  new ResizeObserver(() => draw(false)).observe(ruler);
  draw(false);
  return { set(v) { if (!drag && !raf) { x = target = (v - min) / step; draw(false); } } };
}

