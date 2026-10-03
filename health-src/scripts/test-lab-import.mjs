import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { read, utils } from 'xlsx'
import { createServer } from 'vite'
const auditPath = process.argv[2]
if (!auditPath) throw new Error('Usage: node scripts/test-lab-import.mjs <private audit JSON> [previous site JSON]')
const audit = JSON.parse(readFileSync(auditPath,'utf8'))
const data = JSON.parse(readFileSync('src/data/lab-data.json','utf8'))
const wb = read(readFileSync('lab_data.xlsx'))
const rows = utils.sheet_to_json(wb.Sheets.results,{defval:null})
const dictionary = new Set(utils.sheet_to_json(wb.Sheets.parameters).map(p=>p.canonical_id))
assert.equal(audit.rows.length,audit.measurementCount)
for(const expected of audit.rows) {
 const inMaster=rows.filter(r=>r.result_id===expected.result_id)
 const inSite=data.results.filter(r=>r.result_id===expected.result_id)
 assert.equal(inMaster.length,1);assert.equal(inSite.length,1)
 assert.ok(dictionary.has(expected.parameter_canonical))
 for(const [key,value] of Object.entries(expected)) {
  assert.equal(inMaster[0][key] ?? '',value ?? '',`Master: ${expected.parameter_canonical}.${key}`)
  assert.equal(inSite[0][key] ?? '',value ?? '',`Site: ${expected.parameter_canonical}.${key}`)
 }
}
if(process.argv[3]) {
 const previous=JSON.parse(readFileSync(process.argv[3],'utf8'))
 for(const r of previous.results) assert.deepEqual(data.results.find(n=>n.result_id===r.result_id),r,`Historical record changed: ${r.result_id}`)
}
assert.equal(new Set(data.results.map(r=>r.result_id)).size,data.results.length)
assert.ok(data.results.every(r=>!r.unit.includes('^')))
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'})
try {
 const { isOutOfRange, directionOf, displayResultValue }=await server.ssrLoadModule('/src/lib/data.ts')
 const sample={value_numeric:5,value_text:null,ref_low:null,ref_high:5,ref_operator:'<',abnormal_flag:false}
 assert.equal(isOutOfRange(sample),true);assert.equal(directionOf(sample),'above')
 assert.equal(isOutOfRange({...sample,ref_operator:'<='}),false)
 assert.equal(displayResultValue({...sample,value_operator:'<'}),'<5')
} finally {await server.close()}
console.log(`PASS: ${audit.measurementCount} source results in master and site, dictionary coverage, historical preservation, no duplicates, superscripts and strict bounds.`)
