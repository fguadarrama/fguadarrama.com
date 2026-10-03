import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { WEIGHT_RECORDS: rows, mergeWeightRecords } = await server.ssrLoadModule('/src/data/weight-data.ts')
  const { massParts, compositionParts, unassignedMass, compositionSnapshots, compositionChange, rosePetals, bigSliceSegments, COMPOSITION_COLORS, WEIGHT_ACCENT } = await server.ssrLoadModule('/src/lib/body-composition.ts')
  assert.deepEqual(COMPOSITION_COLORS, { water:'#b9d6e5', fat:'#ffda8f', bone:'#03694c', protein:'#eb155c' })
  assert.equal(WEIGHT_ACCENT, '#eb155c')
  const source = JSON.parse(readFileSync('src/data/sources/2026-09-26-weight-audit.json', 'utf8'))
  assert.equal(rows.filter(r => !r.inBody).length, source.uniqueMeasurements)
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
  const { weightTrend } = await server.ssrLoadModule('/src/lib/weight-trend.ts')
  const original = JSON.stringify(rows)
  const trend = weightTrend(rows)
  assert.equal(trend.length, rows.length)
  for (const point of trend) {
    assert.ok(Math.abs(point.lean + point.fat - point.weight) < 1e-9)
    assert.deepEqual(point.fatBand, [point.lean, point.weight])
    if (point.composition) { assert.equal(point.lean, point.composition.fatFreeMass); assert.equal(point.leanCalculated, false) }
    else if (point.inBody) { assert.equal(point.lean, point.weight-point.inBody.fatMass); assert.equal(point.leanCalculated, true) }
    else { assert.equal(point.lean, point.weight*(1-point.bodyFat/100)); assert.equal(point.leanCalculated, true) }
  }
  assert.equal(weightTrend([manual])[0].lean, null, 'Never invent missing composition')
  assert.equal(weightTrend([manual])[0].fatBand, null)
  assert.equal(JSON.stringify(rows), original, 'Derived series must not mutate source records')
  const unknown = { ...manual, id: 'legacy-import-test' }
  const stale = rows.slice(0, 3).map(row => ({ ...row, weight: row.weight + 1, bodyFat: 0, composition: undefined }))
  const merged = mergeWeightRecords([...stale, manual, unknown])
  assert.equal(merged.length, rows.length + 2)
  assert.deepEqual(merged.find(r => r.id === manual.id), manual)
  assert.deepEqual(merged.find(r => r.id === unknown.id), unknown)
  for (const row of rows) assert.deepEqual(merged.find(r => r.id === row.id), row)
  assert.deepEqual(mergeWeightRecords(merged), merged, 'Merging must be idempotent')
  const snapshots = compositionSnapshots(rows), changes = compositionChange(snapshots[0], snapshots.at(-1))
  assert.equal(changes.length, 5)
  assert.ok(Math.abs(changes.reduce((n,p) => n+p.delta,0) - (snapshots.at(-1).weight-snapshots[0].weight)) < 1e-9)
  for (const row of snapshots) {
    const petals = rosePetals(massParts(row))
    assert.equal(petals.length, 4)
    const areaPerKg = petals[0].area/petals[0].mass
    for (const p of petals) assert.ok(Math.abs(p.area/p.mass-areaPerKg) < 1e-9, 'Petal area must be proportional to kg')
    const slices = bigSliceSegments(massParts(row), row.weight)
    assert.equal(slices.length, 5, 'Big Slice must include the unassigned mass')
    assert.ok(Math.abs(slices.reduce((sum,p) => sum+p.span,0)-2*Math.PI) < 1e-9)
    for (const p of slices) {
      assert.equal(p.radius, slices[0].radius, 'No invented radial variable')
      assert.ok(Math.abs(p.span/(2*Math.PI)-p.mass/row.weight) < 1e-9)
    }
  }
  console.log('PASS: source inventory, corrections, complete/missing fractions, mass balance, same-day records and cache migration without losing manual data.')
} finally { await server.close() }
