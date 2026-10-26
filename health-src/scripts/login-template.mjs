import { readFileSync } from 'node:fs'
import { startTheme, themeControl, themeControlCss } from '../src/lib/theme-runtime.mjs'

export function loginTemplate(favicon, root) {
  const logo = favicon.match(/href="([^"]+)"/)?.[1]
  if (!logo?.startsWith('data:image/svg+xml,')) throw new Error('Missing self-contained logo')
  const neutralLogo = 'data:image/svg+xml,' + encodeURIComponent(decodeURIComponent(logo.slice('data:image/svg+xml,'.length)).replace(/#3a2eb4/gi, '#55565a'))
  const font = readFileSync(`${root}/node_modules/@fontsource-variable/albert-sans/files/albert-sans-latin-wght-normal.woff2`).toString('base64')
  return {
    style: `<style>
@font-face{font-family:Albert Sans;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-display:swap}
:root{--accent:#17181a;--ink:#17181a;--bg:#f6f7f9;--surface:#fff;--border:#ecebe7;--theme-blue:#17181a}
:root[data-theme="dark"]{--accent:#fdfdfc;--ink:#fdfdfc;--bg:#1c1e1e;--surface:#252828;--border:#737b7b;--theme-blue:#fdfdfc}
*{box-sizing:border-box}html{margin:0;background:var(--bg)}body{margin:0;min-height:100vh;min-height:100dvh;display:flex;padding:24px;padding:max(24px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));color:var(--ink);font:375 16px/1.5 'Albert Sans',sans-serif}
.gate{margin:auto;width:min(100%,340px);text-align:center}
.gate__logo{display:block;width:64px;height:64px;margin:0 auto 20px}h1{margin:0 0 36px;font-size:28px;font-weight:450;letter-spacing:-.025em}label{display:block;margin-bottom:12px}input,button{width:100%;min-height:48px;padding:11px 13px;background:transparent;color:var(--ink);font:inherit}input{border:0;border-bottom:1px solid var(--ink);border-radius:0;text-align:center}input:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:4px}button{margin-top:24px;border:1px solid var(--accent);border-radius:8px;cursor:pointer;font-weight:450;touch-action:manipulation}button:disabled{cursor:wait}.error{min-height:24px;margin-top:12px;color:var(--ink);font-size:14px}
/* Bencho's actual cell/slot/caret component; material tokens remain local. */
.gate{width:min(100%,380px)}
.gate .error{color:#ff0059}
.otp{--gate-error:#ff0059}
.otp-field{padding:0!important}
${readFileSync(`${root}/dist-gate/one-time-code.css`, 'utf8')}
${themeControlCss}
body>.theme-control{position:fixed;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top))}
</style><script>(${startTheme.toString()})()</script>`,
    body: `${themeControl}<main class="gate"><img class="gate__logo" src="${neutralLogo}" alt="" width="64" height="64"><h1>Historial médico</h1><div id="gate-input"></div></main><script>${readFileSync(`${root}/dist-gate/one-time-code.js`, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`,
  }
}
