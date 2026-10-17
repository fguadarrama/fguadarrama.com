import { readFileSync } from 'node:fs'
import { startTheme, themeControl, themeControlCss } from '../src/lib/theme-runtime.mjs'

export function loginTemplate(favicon, root) {
  const logo = favicon.match(/href="([^"]+)"/)?.[1]
  if (!logo?.startsWith('data:image/svg+xml,')) throw new Error('Missing self-contained logo')
  const font = readFileSync(`${root}/node_modules/@fontsource-variable/albert-sans/files/albert-sans-latin-wght-normal.woff2`).toString('base64')
  return {
    style: `<style>
@font-face{font-family:Albert Sans;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-display:swap}
:root{--accent:#3A2EB4;--ink:#3A2EB4;--bg:#f6f7fc;--surface:#f6f7fc;--border:#3A2EB4;--theme-blue:#3A2EB4}
:root[data-theme="dark"]{--accent:#54bbee;--ink:#fdfdfc;--bg:#1c1e1e;--surface:#252828;--border:#737b7b;--theme-blue:#54bbee}
*{box-sizing:border-box}html{margin:0;background:var(--bg)}body{margin:0;min-height:100vh;min-height:100dvh;display:flex;padding:24px;padding:max(24px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));color:var(--ink);font:375 16px/1.5 'Albert Sans',sans-serif}
.gate{margin:auto;width:min(100%,340px);text-align:center}
.gate__logo{display:block;width:64px;height:64px;margin:0 auto 20px}h1{margin:0 0 36px;font-size:28px;font-weight:450;letter-spacing:-.025em}label{display:block;margin-bottom:12px}input,button{width:100%;min-height:48px;padding:11px 13px;background:transparent;color:var(--ink);font:inherit}input{border:0;border-bottom:1px solid var(--ink);border-radius:0;text-align:center}input:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:4px}button{margin-top:24px;border:1px solid var(--accent);border-radius:8px;cursor:pointer;font-weight:450;touch-action:manipulation}button:disabled{cursor:wait}.error{min-height:24px;margin-top:12px;color:var(--ink);font-size:14px}
/* ── Bencho "One-time code", adapted ───────────────────────
   MIT licensed — bencho.dev/licence. The original choreographs
   4-6 digit cells: a breathing check, a liquid merge into a
   "Verified" capsule on success, a shake-and-drain on a wrong
   code. This gate takes one passphrase, not digits, so the
   "cells" become the two controls already here — the password
   field and the submit button — merging into one confirmed
   pill instead of six, with the same breathing-check and shake
   timing as the original.
   THE PART THAT NEEDED JUDGEMENT: no SVG goo filter. That
   machinery exists to visually fuse N discrete, separated cells
   into one blob; with only two controls that are already
   rounded rectangles sitting close together, closing the gap
   between them and filling one with colour already reads as
   "becoming one" — the filter would be solving a problem this
   layout doesn't have. Token mapping: --card -> var(--surface);
   --fill-on -> var(--ink); --fill-slab -> var(--bg); --font-ui
   -> this page's own font stack (already set on body, above). */
#form.is-checking input,#form.is-checking button{animation:gate-breathe 900ms ease-in-out infinite;pointer-events:none}
#form.is-no input,#form.is-no button{animation:gate-shake 520ms cubic-bezier(.36,.07,.19,.97) both}
#form.is-ok button{margin-top:8px;background:var(--accent);color:var(--bg);border-color:var(--accent);border-radius:999px;transform:scale(1.01)}
#form.is-ok input{opacity:0;transform:scale(.94);margin-bottom:-60px;pointer-events:none}
.gate-ok-check{display:inline-flex;align-items:center;justify-content:center;gap:8px}
.gate-ok-check svg{opacity:0;transform:scale(.6);transition:opacity 220ms ease 80ms,transform 420ms cubic-bezier(.24,1.34,.38,1) 80ms}
#form.is-ok .gate-ok-check svg{opacity:1;transform:scale(1)}
@keyframes gate-breathe{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes gate-shake{0%{transform:translateX(0)}15%{transform:translateX(-6px)}30%{transform:translateX(5px)}45%{transform:translateX(-4px)}60%{transform:translateX(3px)}75%{transform:translateX(-2px)}90%{transform:translateX(1px)}100%{transform:translateX(0)}}
@media (prefers-reduced-motion:reduce){#form.is-checking input,#form.is-checking button,#form.is-no input,#form.is-no button{animation:none}}
${themeControlCss}
body>.theme-control{position:fixed;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top))}
</style><script>(${startTheme.toString()})()</script>`,
    body: `${themeControl}<main class="gate"><img class="gate__logo" src="${logo}" alt="" width="64" height="64"><h1>Historial médico</h1><form id="form"><label for="password">Introduce la contraseña</label><input id="password" type="password" autocomplete="current-password" required><button id="submit" type="submit">Abrir historial</button><div id="error" class="error" role="alert"></div></form></main>`,
  }
}
