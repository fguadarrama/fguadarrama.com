#!/usr/bin/env node
// Encrypts the self-contained privacy build for static GitHub Pages hosting.
// The password is read only from the process environment and is never written.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { webcrypto } from 'node:crypto'

const password = process.env.LABS_PASSWORD || ''
if (password.length < 20) {
  throw new Error('LABS_PASSWORD must contain at least 20 characters. Use a unique passphrase and do not commit it.')
}

const root = resolve(process.cwd())
const sourcePath = resolve(root, 'dist-protected/index.html')
const outputDir = resolve(root, '../health')
const outputPath = resolve(outputDir, 'index.html')
const originalHtml = readFileSync(sourcePath, 'utf8')

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
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; worker-src blob:; connect-src 'none'; media-src data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">
<title>Historial médico | Acceso privado</title>
<style>*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{display:grid;place-items:center;padding:20px;background:#f6f7fc;color:#2d2930;font:16px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.gate{width:min(100%,420px);padding:28px;border:1px solid #2d2930;border-radius:18px;background:#fff}.eyebrow{margin:0 0 7px;color:#2d694c;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}h1{margin:0;font-size:27px;font-weight:500;letter-spacing:-.025em}p{margin:10px 0 22px}label{display:block;margin-bottom:7px;font-size:13px}input,button{width:100%;border:1px solid #2d2930;border-radius:10px;padding:12px 13px;background:#fff;color:#2d2930;font:inherit}input:focus{outline:2px solid #2d694c;outline-offset:2px}button{margin-top:10px;background:#2d2930;color:#fff;cursor:pointer}button:disabled{cursor:wait}.error{min-height:20px;margin-top:10px;color:#ff1d58;font-size:13px}</style>
</head><body><main class="gate"><p class="eyebrow">Acceso privado</p><h1>Historial médico</h1><p>Introduce la contraseña para descifrar los datos en este dispositivo.</p><form id="form"><label for="password">Contraseña</label><input id="password" type="password" autocomplete="current-password" autofocus required><button id="submit" type="submit">Abrir historial</button><div id="error" class="error" role="alert"></div></form></main>
<script>const payload=${JSON.stringify(payload)};const encoder=new TextEncoder,decoder=new TextDecoder,b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));async function openPrivatePage(password){const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(payload.salt),iterations:payload.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(payload.iv)},key,b64(payload.data));document.open();document.write(decoder.decode(bytes));document.close()}document.getElementById('form').addEventListener('submit',async event=>{event.preventDefault();const button=document.getElementById('submit'),input=document.getElementById('password'),error=document.getElementById('error');button.disabled=true;error.textContent='';try{await openPrivatePage(input.value)}catch{error.textContent='Contraseña incorrecta.';button.disabled=false;input.select()}});</script>
</body></html>`

rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })
writeFileSync(outputPath, wrapper, { encoding: 'utf8', mode: 0o600 })
console.log(`[protect-index] wrote encrypted single-file release: ${outputPath}`)
