import { readFileSync } from 'node:fs'

export function loginTemplate(favicon, root) {
  const logo = favicon.match(/href="([^"]+)"/)?.[1]
  if (!logo?.startsWith('data:image/svg+xml,')) throw new Error('Missing self-contained logo')
  const font = readFileSync(`${root}/node_modules/@fontsource-variable/albert-sans/files/albert-sans-latin-wght-normal.woff2`).toString('base64')
  return {
    style: `<style>
@font-face{font-family:Albert Sans;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-display:swap}
:root{--accent:#3A2EB4;--ink:#3A2EB4}
*{box-sizing:border-box}html{margin:0;background:#f6f7fc}body{margin:0;min-height:100vh;min-height:100dvh;display:flex;padding:24px;padding:max(24px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));color:var(--ink);font:375 16px/1.5 'Albert Sans',sans-serif}
.gate{margin:auto;width:min(100%,340px);text-align:center}
.gate__logo{display:block;width:64px;height:64px;margin:0 auto 20px}h1{margin:0 0 36px;font-size:28px;font-weight:450;letter-spacing:-.025em}label{display:block;margin-bottom:12px}input,button{width:100%;min-height:48px;padding:11px 13px;background:transparent;color:var(--ink);font:inherit}input{border:0;border-bottom:1px solid var(--ink);border-radius:0;text-align:center}input:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:4px}button{margin-top:24px;border:1px solid var(--accent);border-radius:8px;cursor:pointer;font-weight:450;touch-action:manipulation}button:disabled{cursor:wait}.error{min-height:24px;margin-top:12px;color:var(--ink);font-size:14px}
</style>`,
    body: `<main class="gate"><img class="gate__logo" src="${logo}" alt="" width="64" height="64"><h1>Historial médico</h1><form id="form"><label for="password">Introduce la contraseña</label><input id="password" type="password" autocomplete="current-password" required><button id="submit" type="submit">Abrir historial</button><div id="error" class="error" role="alert"></div></form></main>`,
  }
}
