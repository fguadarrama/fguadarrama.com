import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fields, extractWeight, validateRecord } from './weight-image-parser.mjs'
import { loginTemplate } from './login-template.mjs'

// Synthetic fixture: no patient values or source images belong in Git.
const values = { bodyScore:80,bmi:24,bodyFat:20,waterMass:40,fatMass:14,boneMass:3,
  proteinMass:12,waterPercent:57.1,bonePercent:4.3,proteinPercent:17.1,muscleMass:53,
  musclePercent:75.7,skeletalMuscleMass:28,visceralFatRating:8,basalMetabolicRate:1600,
  waistHipRatio:.9,bodyAge:30,fatFreeMass:56,heartRate:75 }
const lines = [
  {text:'10/05/2026 07:30',x:.2,y:.03,confidence:1},
  {text:'70.0 kg',x:.36,y:.06,confidence:1},
  {text:'Body score',x:.08,y:.132,confidence:1},
  ...fields.map(([key,,y,col]) => ({text:`${values[key]} ${key.endsWith('Percent') || key === 'bodyFat' ? '%' : ''}`,x:col ? .56 : .07,y,confidence:1})),
]
const draft = extractWeight({width:1440,height:7922,lines},'synthetic.jpg')
assert.equal(draft.reviewed,false)
assert.equal(draft.record.date,'2026-10-05','MM/DD/YYYY date convention')
assert.equal(draft.record.time,'07:30')
assert.equal(draft.record.weight,70)
assert.equal(draft.record.bodyFat,20)
assert.deepEqual(validateRecord(draft.record),[])
const broken = structuredClone(draft.record)
broken.date='2026-02-30'; broken.time='25:01'; broken.weight=NaN; broken.composition.waterMass=200
assert.ok(validateRecord(broken).length >= 3)
broken.weight = 70
assert.ok(validateRecord(broken).some(s => s.startsWith('waterMass')))
const low = extractWeight({width:231,height:1280,lines:lines.filter(l => l.y !== .03).map(l => l.y === .06 ? {...l,text:'64.i',confidence:.3} : l)},'tiny.jpg')
assert.equal(low.record.date,null)
assert.equal(low.record.weight,null,'Never silently truncate a garbled decimal')
assert.ok(low.warnings.some(s => s.includes('baja resolución')))
const split = extractWeight({width:1440,height:7922,lines:lines.map(l=>l.y===.06 ? {...l,text:'64:ї'}:l),weightParts:{integer:[{text:'64',confidence:1}],decimal:[{text:'1',confidence:.5}]}},'synthetic-split.png')
assert.equal(split.record.weight,64.1,'Reconstruct the small decimal, not the integer prefix')
const html = readFileSync('index.html','utf8'), icon = html.match(/<link\b[^>]*rel="icon"[^>]*>/)[0]
const gate = loginTemplate(icon,process.cwd())
assert.ok(gate.body.includes('class="gate__logo"'))
assert.ok(gate.style.includes('100dvh'))
assert.ok(gate.style.includes('Albert Sans'))
assert.ok(gate.style.includes('--ink:#3A2EB4'))
assert.ok(gate.style.includes('--bg:#f6f7fc'))
assert.ok(gate.style.includes('--bg:#1c1e1e'))
assert.ok(!gate.style.includes('background:#fff'))
assert.ok(!gate.body.includes('Acceso privado'))
assert.ok(gate.body.includes('<label for="password">Introduce la contraseña</label>'))
assert.ok(!gate.body.includes('autofocus'),'Do not automatically summon the mobile keyboard')
// Exercise the actual CLI in an isolated fixture, never the user's history.
const fixture = mkdtempSync(join(tmpdir(),'health-import-test-'))
mkdirSync(join(fixture,'scripts')); mkdirSync(join(fixture,'src/data'),{recursive:true})
for (const file of ['import-weight-image.mjs','weight-image-parser.mjs']) copyFileSync(`scripts/${file}`,join(fixture,'scripts',file))
const data = join(fixture,'src/data/weight-records.local.json'), review = join(fixture,'review.json')
const history = [{ id:'old',date:'2000-01-01',time:'12:00',weight:80,bodyFat:25,source:'Synthetic' }]
writeFileSync(data,JSON.stringify(history))
writeFileSync(review,JSON.stringify(draft))
const run = () => spawnSync(process.execPath,[join(fixture,'scripts/import-weight-image.mjs'),'--review',review,'--apply'],{encoding:'utf8'})
assert.notEqual(run().status,0,'Unreviewed data must not be applied')
assert.deepEqual(JSON.parse(readFileSync(data)),history)
draft.reviewed=true; writeFileSync(review,JSON.stringify(draft))
const firstRun=run(); assert.equal(firstRun.status,0,firstRun.stderr)
let imported=JSON.parse(readFileSync(data)); assert.equal(imported.length,2); assert.deepEqual(imported[0],history[0])
assert.equal(run().status,0); assert.equal(JSON.parse(readFileSync(data)).length,2,'Idempotent import')
draft.record.composition.bodyScore=81; writeFileSync(review,JSON.stringify(draft))
assert.notEqual(run().status,0,'Conflicting reading must not overwrite history')
assert.deepEqual(JSON.parse(readFileSync(data)),imported)
const backups=readdirSync(join(fixture,'src/data/sources/weight-imports')).filter(s=>s.startsWith('backup-'))
assert.equal(backups.length,1)
assert.deepEqual(JSON.parse(readFileSync(join(fixture,'src/data/sources/weight-imports',backups[0]))),history)
console.log('PASS: local OCR parsing, missing/invalid values, date convention, mass validation and responsive branded login.')
