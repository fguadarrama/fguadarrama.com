import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-8, `${a} != ${b}`)
try {
  const { weightHealth, ibwEstimates, energyEstimates } = await server.ssrLoadModule('/src/lib/weight-health.ts')
  // Synthetic fixture, not a patient record.
  const h = weightHealth(70, 180, 40, 'male')
  close(h.bmi, 70/3.24); close(h.resting, 1630)
  close(weightHealth(71,180,40,'male').resting-h.resting, 10)
  close(weightHealth(70,180,41,'male').resting-h.resting, -5)
  assert.equal(weightHealth(70,180,null,'male').resting, null)
  assert.throws(() => weightHealth(0,180,40,'male'))
  const methods = ibwEstimates(177.8,'male')
  for (const [id,expected] of [['devine',73],['robinson',71],['miller',70.3],['hamwi',75]]) close(methods.find(m=>m.id===id).value, expected)
  assert.equal(ibwEstimates(150,'male')[1].value,null)
  close(ibwEstimates(180,'male',24)[0].value, 24*3.24)
  const energy = energyEstimates(70,180,40,'male',55)
  close(energy[0].value,1630); close(energy[1].value,1662.892); close(energy[2].value,1593); close(energy[3].value,1676.14); close(energy[4].value,1710)
  assert.equal(energyEstimates(70,180,40,'male',null)[4].value,null)
  assert.equal(energyEstimates(70,180,60,'male',55)[3].value,null)
  const { WEIGHT_RECORDS: rows, mergeWeightRecords } = await server.ssrLoadModule('/src/data/weight-data.ts')
  const audit = JSON.parse(readFileSync('src/data/sources/inbody-import.local.json','utf8'))
  const r = rows.find(r => r.id === audit.recordId)
  assert.ok(r); assert.equal(r.composition,undefined)
  for (const [key,value] of Object.entries(audit.values)) assert.equal(r[key] ?? r.inBody[key], value)
  assert.equal(mergeWeightRecords(rows).length,rows.length)
  console.log('PASS: BMI, five IBW formulas, five energy equations, applicability, dynamic weight/age, InBody provenance and idempotent import.')
} finally { await server.close() }
