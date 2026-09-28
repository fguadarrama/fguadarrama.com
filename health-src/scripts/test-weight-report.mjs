import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { WEIGHT_RECORDS } = await server.ssrLoadModule('/src/data/weight-data.ts')
  const { generateWeightReportBlob } = await server.ssrLoadModule('/src/lib/weight-pdf.tsx')
  const blob = await generateWeightReportBlob(WEIGHT_RECORDS)
  const bytes = Buffer.from(await blob.arrayBuffer())
  assert.equal(bytes.subarray(0,5).toString(), '%PDF-')
  assert.ok(bytes.length > 10_000)
  assert.ok(!bytes.includes(Buffer.from('/Helvetica')), 'Every PDF text run must use Albert Sans, not a fallback font')
  await mkdir('output/pdf', { recursive: true })
  await writeFile('output/pdf/peso-composicion-revision.pdf', bytes)
  console.log('PASS: weight/body-composition PDF generated in output/pdf/peso-composicion-revision.pdf')
} finally { await server.close() }
