import { mkdir, writeFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { WEIGHT_RECORDS } = await server.ssrLoadModule('/src/data/weight-data.ts')
  const { generateWeightReportBlob } = await server.ssrLoadModule('/src/lib/weight-pdf.tsx')
  const { generateReportBlob } = await server.ssrLoadModule('/src/lib/pdf.tsx')
  await mkdir('tmp/pdfs/print-check', { recursive: true })
  for (const [name, generate] of [
    ['laboratorios', monochrome => generateReportBlob({ monochrome, includeWeight: true, weightRecords: WEIGHT_RECORDS })],
    ['peso', monochrome => generateWeightReportBlob(WEIGHT_RECORDS, { monochrome })],
  ]) {
    for (const monochrome of [true, false]) {
      const bytes = Buffer.from(await (await generate(monochrome)).arrayBuffer())
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
      assert.ok(!bytes.includes(Buffer.from('/Helvetica')), 'Albert Sans must remain embedded')
      // Inspect uncompressed PDF paint operators, not a grayscale screenshot.
      const raw = bytes.toString('latin1')
      const streams = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
        try { return inflateSync(Buffer.from(match[1], 'latin1')).toString() } catch { return '' }
      }).join('\n')
      const paints = [...streams.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) (?:scn|SCN|rg|RG)\b/g)].map(m => m.slice(1, 4).map(Number))
      assert.ok(paints.length > 50, 'Must inspect actual paint operators')
      const colored = paints.filter(rgb => !rgb.every(v => v === 0) && !rgb.every(v => v === 1))
      if (monochrome) {
        assert.equal(colored.length, 0, `${name}: print must use only pure black/white`)
        for (const match of raw.matchAll(/\/ca\s+([\d.]+)|\/CA\s+([\d.]+)/g)) assert.ok([0, 1].includes(Number(match[1] ?? match[2])), 'Paint must be opaque; only empty SVG fills may be transparent')
      } else assert.ok(colored.length > 0, 'Color export must still have colors after printing')
      await writeFile(`tmp/pdfs/print-check/${name}-${monochrome ? 'impresion' : 'color'}.pdf`, bytes)
    }
  }
  console.log('PASS: lab and weight PDFs use only opaque black/white in print mode; color downloads unchanged.')
} finally { await server.close() }
