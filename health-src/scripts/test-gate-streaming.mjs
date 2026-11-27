// Exercise the shipped gate in parser order with a disposable encrypted fixture.
import assert from 'node:assert/strict'
import { createCipheriv, pbkdf2Sync, randomBytes, webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

const html = readFileSync(new URL('../../health/index.html', import.meta.url), 'utf8')
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
const bootstrap = scripts.find(match => match[1].includes('window.decryptPage='))
const data = scripts.find(match => match[1].includes('const payload='))
const field = html.indexOf('id="gate-input"')
assert.ok(bootstrap.index < field && field < data.index)

const code = randomBytes(8).toString('hex')
const salt = randomBytes(16), iv = randomBytes(12)
const cipher = createCipheriv('aes-256-gcm', pbkdf2Sync(code, salt, 10, 32, 'sha256'), iv)
const sealed = Buffer.concat([cipher.update('opened'), cipher.final(), cipher.getAuthTag()])
const payload = {iterations:10, salt:salt.toString('base64'), iv:iv.toString('base64'), data:sealed.toString('base64')}
const document = Object.assign(new EventTarget(), {readyState:'loading'})
const window = {}
const context = createContext({document, window, crypto:webcrypto, TextEncoder, TextDecoder, atob})
runInContext(bootstrap[1], context)
const early = window.decryptPage(code)
runInContext('const payload=' + JSON.stringify(payload), context)
document.readyState = 'interactive'
document.dispatchEvent(new Event('DOMContentLoaded'))
assert.equal(await early, 'opened')
await assert.rejects(window.decryptPage(code + 'x'), {name:'OperationError'})
assert.equal(await window.decryptPage(code), 'opened')
console.log('PASS: valid entry during download, wrong code rejected, valid retry after load.')
