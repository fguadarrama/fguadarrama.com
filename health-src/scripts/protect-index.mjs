#!/usr/bin/env node
// Encrypts the self-contained privacy build for static GitHub Pages hosting.
// The password is read only from the process environment and is never written.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { webcrypto } from 'node:crypto'
import { loginTemplate } from './login-template.mjs'

const password = process.env.LABS_PASSWORD || ''
if (password.length < 16) {
  throw new Error('LABS_PASSWORD must contain at least 16 characters. Use a unique passphrase and do not commit it.')
}

const root = resolve(process.cwd())
const sourcePath = resolve(root, 'dist-protected/index.html')
const outputDir = resolve(root, '../health')
const outputPath = resolve(outputDir, 'index.html')
const originalHtml = readFileSync(sourcePath, 'utf8')
// Reuse only the self-contained favicon from the app, including on the locked gate.
const favicon = originalHtml.match(/<link\b(?=[^>]*\brel="icon")(?=[^>]*\bhref="data:image\/svg\+xml,)[^>]*>/i)?.[0] || ''
const gate = loginTemplate(favicon, root)

if (/\b(?:src|href)=["'][^"']+\.(?:js|css|json|xlsx|woff2?)/i.test(originalHtml)) {
  throw new Error('Protected build is not self-contained; refusing to encrypt a page with public asset references.')
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const salt = webcrypto.getRandomValues(new Uint8Array(16))
const iv = webcrypto.getRandomValues(new Uint8Array(12))
const iterations = 600_000
const baseKey = await webcrypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
const key = await webcrypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
  baseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt'],
)
const cipher = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(originalHtml)))
const roundTrip = decoder.decode(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher))
if (roundTrip !== originalHtml) throw new Error('Encryption round-trip verification failed.')
const b64 = (bytes) => Buffer.from(bytes).toString('base64')

const payload = { v: 2, kdf: 'PBKDF2-SHA256', cipher: 'AES-256-GCM', iterations, salt: b64(salt), iv: b64(iv), data: b64(cipher) }
const wrapper = `<!doctype html>
<html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex"><meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; worker-src blob:; connect-src 'none'; media-src data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">
<title>Historial médico | Acceso privado</title>
${favicon}
${gate.style}
</head><body>${gate.body}
<script>
const payload=${JSON.stringify(payload)};
const encoder=new TextEncoder,decoder=new TextDecoder,b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function decryptPage(password){
const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(payload.salt),iterations:payload.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(payload.iv)},key,b64(payload.data));
return decoder.decode(bytes);
}
const form=document.getElementById('form'),button=document.getElementById('submit'),input=document.getElementById('password'),error=document.getElementById('error');
const submitLabel=button.textContent;
const CHECK_SVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const MIN_CHECK_MS=reduceMotion?0:360;
form.addEventListener('submit',async event=>{
event.preventDefault();
form.classList.remove('is-no','is-ok');
form.classList.add('is-checking');
button.disabled=true;
error.textContent='';
const started=performance.now();
let html=null,ok=true;
try{html=await decryptPage(input.value)}catch{ok=false}
const wait=MIN_CHECK_MS-(performance.now()-started);
if(wait>0)await new Promise(r=>setTimeout(r,wait));
form.classList.remove('is-checking');
if(ok){
form.classList.add('is-ok');
button.innerHTML='<span class="gate-ok-check">'+CHECK_SVG+'Verificado</span>';
await new Promise(r=>setTimeout(r,reduceMotion?80:420));
document.open();document.write(html);document.close();
}else{
form.classList.add('is-no');
error.textContent='Contraseña incorrecta.';
button.disabled=false;
input.value='';
setTimeout(()=>{form.classList.remove('is-no');button.textContent=submitLabel;input.focus()},reduceMotion?0:560);
}
});
</script>
</body></html>`

rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })
writeFileSync(outputPath, wrapper, { encoding: 'utf8', mode: 0o600 })
console.log(`[protect-index] wrote encrypted single-file release: ${outputPath}`)
