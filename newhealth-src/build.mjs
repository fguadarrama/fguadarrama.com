// Build from the shipped release so encrypted records, the unlock protocol and clinical logic stay in sync.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

const here = path => new URL(path, import.meta.url)
const original = await readFile(here('../health/index.html'), 'utf8')
const face = await readFile(here('FacultyGlyphic-Regular.ttf'))
const css = await readFile(here('paper.css'), 'utf8')
const style = '<style id="newhealth-paper">@font-face{font-family:"Faculty Glyphic";font-weight:400;font-display:swap;src:url(data:font/ttf;base64,' + face.toString('base64') + ') format("truetype")}' + css + '</style>'

function replaceOnce(html, needle, value) {
  assert.equal(html.split(needle).length, 2, 'Unexpected health release structure: ' + needle)
  return html.replace(needle, () => value)
}

// Called after successful authenticated decryption, before the original app mounts.
function applyDesign(html) {
  const style = document.getElementById('newhealth-paper').outerHTML
  const sourceKey = 'health-weight-records-v1'
  const variantKey = 'newhealth-weight-records-v1'
  try {
    const existing = localStorage.getItem(sourceKey)
    if (existing !== null && localStorage.getItem(variantKey) === null) {
      localStorage.setItem(variantKey, existing)
    }
  } catch { /* Private browsing can disable storage. */ }
  return html.replaceAll('health-display-theme', 'newhealth-display-theme')
    .replaceAll(sourceKey, variantKey)
    .replace('</head>', () => style + '</head>')
}

let variant = replaceOnce(original, '</head>', style + '</head>')
variant = variant.replaceAll('health-display-theme', 'newhealth-display-theme')
variant = replaceOnce(variant, "window.__healthThemeMode || 'auto'", "window.__healthThemeMode || 'light'")
variant = replaceOnce(variant, 'return decoder.decode(bytes);', 'return (' + applyDesign.toString() + ')(decoder.decode(bytes));')
const payload = html => html.match(/const payload=(\{[^\n]+\});/)[1]
assert.equal(payload(variant), payload(original))
await mkdir(here('../newhealth/'), { recursive: true })
await writeFile(here('../newhealth/index.html'), variant)
console.log('Built /newhealth with an identical encrypted payload.')
