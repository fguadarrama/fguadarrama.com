import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { WEIGHT_RECORDS: rows, mergeWeightRecords } = await server.ssrLoadModule('/src/data/weight-data.ts')
  const { massParts, compositionParts, unassignedMass } = await server.ssrLoadModule('/src/lib/body-composition.ts')
  const source = JSON.parse(readFileSync('src/data/sources/2026-09-26-weight-audit.json', 'utf8'))
  assert.equal(rows.length, source.uniqueMeasurements)
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length)
  assert.equal(rows.filter(r => r.composition).length, source.completeCompositionMeasurements)
  for (const correction of source.corrections) assert.equal(rows.find(r => r.id === correction.id)[correction.field], correction.corrected)
  for (const row of rows) {
    assert.ok(Number.isFinite(row.weight) && row.weight > 0)
    assert.ok(row.bodyFat >= 0 && row.bodyFat <= 100)
    assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/)
    if (!row.composition) { assert.deepEqual(massParts(row), []); continue }
    assert.equal(compositionParts(row).length, 4)
    const sum = massParts(row).reduce((n, p) => n + p.mass, 0)
    assert.ok(Math.abs(sum - row.weight) < 1e-9, 'Mass conservation')
    assert.ok(unassignedMass(row) > 0, 'Preserve the unassigned residual')
    assert.ok(Math.abs(row.weight - row.composition.fatMass - row.composition.fatFreeMass) < 1e-9)
  }
  const manual = { id: 'manual-test', date: '2001-01-01', time: '12:00', weight: 60, source: 'Registro manual' }
  const unknown = { ...manual, id: 'legacy-import-test' }
  const stale = rows.slice(0, 3).map(row => ({ ...row, weight: row.weight + 1, bodyFat: 0, composition: undefined }))
  const merged = mergeWeightRecords([...stale, manual, unknown])
  assert.equal(merged.length, rows.length + 2)
  assert.deepEqual(merged.find(r => r.id === manual.id), manual)
  assert.deepEqual(merged.find(r => r.id === unknown.id), unknown)
  for (const row of rows) assert.deepEqual(merged.find(r => r.id === row.id), row)
  assert.deepEqual(mergeWeightRecords(merged), merged, 'Merging must be idempotent')
  console.log('PASS: source inventory, corrections, complete/missing fractions, mass balance, same-day records and cache migration without losing manual data.')
} finally { await server.close() }
