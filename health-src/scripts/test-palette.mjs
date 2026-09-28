import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
const luminance = hex => {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(s => parseInt(s,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4)
  return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722
}
try {
  const { LAB_ACCENTS, LAB_TITLE_COLORS } = await server.ssrLoadModule('/src/lib/palette.ts')
  const css = readFileSync('src/styles/tokens.css','utf8')
  for (const [name,color] of Object.entries(LAB_TITLE_COLORS)) {
    for (const bg of ['#ffffff','#f6f7fc']) assert.ok((luminance(bg)+.05)/(luminance(color)+.05) >= 4.5, `${name}: title contrast ${bg}`)
    assert.ok(css.includes(color), `${name}: CSS and PDF title palette agree`)
  }
  for (const color of ['#eb155c','#479a6d','#3e3bd7','#ffd449','#ff5f17','#8631b5']) assert.ok(Object.values(LAB_ACCENTS).includes(color))
  assert.ok(css.includes('color(display-p3 0.9215686275 0.0823529412 0.3607843137)'))
  const html = readFileSync('index.html','utf8')
  const icon = decodeURIComponent(html.match(/href="data:image\/svg\+xml,([^"]+)"/)[1])
  assert.ok(icon.includes('rgb(246,247,252)'))
  assert.ok(icon.includes('#3A2EB4'))
  console.log('PASS: all six chosen accents, readable title variants >=4.5:1, P3 watermelon and favicon background.')
} finally { await server.close() }
