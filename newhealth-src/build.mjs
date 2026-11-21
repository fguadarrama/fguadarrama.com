// Produce only an authenticated, encrypted artifact. Clinical values and intermediate
// browser bundles live in memory. The source release is opened read-only.
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { resolve, basename } from 'node:path'
import { pbkdf2Sync, createDecipheriv, createCipheriv, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
const here = fileURLToPath(new URL('.', import.meta.url))
const project = resolve(here, '../health-src')
const require = createRequire(resolve(project, 'package.json'))
const {build} = require('esbuild')
const {parse} = require('@babel/parser')
const source = await fs.readFile(resolve(here,'../health/index.html'),'utf8')
const match = source.match(/const payload=(\{[^\n]+\});/)
const payload = JSON.parse(match[1])
const password = (await fs.readFile('/dev/stdin','utf8')).trim()
const key = salt => pbkdf2Sync(password,salt,payload.iterations,32,'sha256')
const raw = Buffer.from(payload.data,'base64')
const open = createDecipheriv('aes-256-gcm',key(Buffer.from(payload.salt,'base64')),Buffer.from(payload.iv,'base64'))
open.setAuthTag(raw.subarray(-16))
const original = Buffer.concat([open.update(raw.subarray(0,-16)),open.final()]).toString()
const moduleCode = [...original.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('window.__healthPdfHost='))
const bindings = new Map()
for (const item of parse(moduleCode,{sourceType:'module'}).program.body)
  for (const decl of item.declarations || []) bindings.set(decl.id.name,decl.init)
// Read literal initializers only. Never execute the private module at build time.
function readLiteral(n) {
  switch(n.type) {
    case 'TemplateLiteral': assert.equal(n.expressions.length,0); return n.quasis[0].value.cooked
    case 'Identifier': return readLiteral(bindings.get(n.name))
    case 'ObjectExpression': return Object.fromEntries(n.properties.map(p=>[p.key.name??p.key.value,readLiteral(p.value)]))
    case 'ArrayExpression': return n.elements.map(readLiteral)
    case 'UnaryExpression': if(n.operator==='-') return -readLiteral(n.argument); if(n.operator==='!') return !readLiteral(n.argument); break
    case 'NullLiteral': return null
    case 'NumericLiteral': case 'StringLiteral': case 'BooleanLiteral': return n.value
    case 'CallExpression':
      if(n.callee.object?.name==='JSON' && n.callee.property?.name==='parse') return JSON.parse(readLiteral(n.arguments[0]))
      if(n.arguments[0]?.value?.startsWith?.('VITE_PATIENT_')) return n.arguments[1].value
  }
  throw Error('Unsupported private initializer '+n.type)
}
const clinical = readLiteral(bindings.get('X$')), weights = readLiteral(bindings.get('iD'))
const profile = readLiteral(bindings.get('Zu')), layout = readLiteral(bindings.get('yie')), patient = readLiteral(bindings.get('Ec'))
assert.ok(clinical.results.length && weights.length && layout.categories.length && patient.curp && profile.heightCm)
const inputs={'lab-data.json':clinical,'body-profile.local.json':profile,'weight-records.local.json':weights,'parameter-layout.json':layout}
const css = await fs.readFile(resolve(here,'paper.css'),'utf8')
const faculty = (await fs.readFile(resolve(here,'FacultyGlyphic-Regular.ttf'))).toString('base64')
const face = '@font-face{font-family:"Faculty Glyphic";src:url(data:font/ttf;base64,'+faculty+')}'
const fonts = {'.woff':'dataurl','.woff2':'dataurl'}
const result = await build({absWorkingDir:project,entryPoints:[resolve(here,'app/Workspace.tsx')],bundle:true,format:'iife',minify:true,write:false,outfile:'workspace.js',platform:'browser',target:'es2022',jsx:'automatic',nodePaths:[resolve(project,'node_modules')],loader:fonts,define:{
 'process.env.NODE_ENV':'"production"','import.meta.url':'""','import.meta.env.PROD':'true','import.meta.env.BASE_URL':'"./"',
 ...Object.fromEntries(Object.entries({FULL_NAME:patient.fullName,DOB:patient.dobIso,CURP:patient.curp}).map(([k,v])=>['import.meta.env.VITE_PATIENT_'+k,JSON.stringify(v)]))
},plugins:[{name:'clinical-release',setup(b){
 b.onResolve({filter:/\/(lab-data|parameter-layout|weight-records\.local|body-profile\.local)\.json$/},a=>({path:basename(a.path),namespace:'records'}))
 b.onLoad({filter:/.*/,namespace:'records'},a=>({contents:JSON.stringify(inputs[a.path]),loader:'json'}))
 b.onResolve({filter:/\.woff\?url$/},a=>({path:require.resolve(a.path.replace('?url',''))}))
 b.onLoad({filter:/weightStore\.ts$/},async a=>({contents:(await fs.readFile(a.path,'utf8')).replace('health-weight-records-v1','newhealth-weight-records-v1'),loader:'ts'}))
 b.onLoad({filter:/theme-runtime\.mjs$/},async a=>({contents:(await fs.readFile(a.path,'utf8')).replaceAll('health-display-theme','newhealth-display-theme').replace("|| 'auto'","|| 'light'"),loader:'js'}))
 b.onLoad({filter:/Timeline\.tsx$/},async a=>({contents:(await fs.readFile(a.path,'utf8')).replace('function Timeline()', "function Timeline({year=''}:{year?:string})").replace('return [...labEvents, ...weightEvents]', "return [...labEvents, ...weightEvents].filter(event=>event.date.startsWith(year))").replace('[filter, weights]', '[filter, weights, year]'),loader:'tsx'}))
 b.onLoad({filter:/Dashboard\.tsx$/},async a=>({contents:(await fs.readFile(a.path,'utf8')).replace('function CategoryPanel(', 'export function CategoryPanel('),loader:'tsx'}))
 b.onLoad({filter:/lib\/(weight-pdf|pdf)\.tsx$/},async a=>{
   let code=await fs.readFile(a.path,'utf8')
   const replacements=basename(a.path)==='weight-pdf.tsx'?[
     ['<Header printed={printed}/>','<Header printed={printed}/><DateSignal dates={records.map(r=>r.date)} width={523}/>'],
     ["gap:22,marginTop:18","gap:8,marginTop:4"],
     ['width={490}', 'width={440}']
   ]:[
     ["Peso y composición corporal</Text></View>", "Peso y composición corporal</Text></View><DateSignal dates={records.map(r=>r.date)} />"],
     ['<TableHead dates={chunk} />','<DateSignal dates={chunk} /><TableHead dates={chunk} />'],
     ['<View style={landscapeStyles.rightBlock}>','<View style={landscapeStyles.rightBlock}><DateSignal dates={series.map(r=>r.date)} width={175} />']]
   for(const [before,after] of replacements){assert.ok(code.includes(before));code=code.replace(before,after)}
   return {contents:'import {DateSignal} from '+JSON.stringify(resolve(here,'app/DateSignal.tsx'))+';\n'+code,loader:'tsx'}
 })
}}]})
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script')
const styles=result.outputFiles.find(f=>f.path.endsWith('.css')).text
const icon=source.match(/<link\b[^>]*rel="icon"[^>]*>/)[0]
const app='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Historial médico | FGC</title>'+icon+'<style>'+styles+'\n'+face+css+await fs.readFile(resolve(here,'app/workspace.css'),'utf8')+'</style></head><body><div id="root"></div><script>'+js+'</script></body></html>'
const salt=randomBytes(16),iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key(salt),iv)
const data=Buffer.concat([cipher.update(app),cipher.final(),cipher.getAuthTag()])
const check=createDecipheriv('aes-256-gcm',key(salt),iv)
check.setAuthTag(data.subarray(-16))
assert.equal(Buffer.concat([check.update(data.subarray(0,-16)),check.final()]).toString(),app)
const sealed={...payload,salt:salt.toString('base64'),iv:iv.toString('base64'),data:data.toString('base64')}
const gate=source.replace(match[0],()=> 'const payload='+JSON.stringify(sealed)+';').replaceAll('health-display-theme','newhealth-display-theme').replace("window.__healthThemeMode || 'auto'","window.__healthThemeMode || 'light'").replace('</head>',()=>'<style>'+face+css+'</style></head>')
await fs.writeFile(resolve(here,'../newhealth/index.html'),gate)
console.log('Encrypted redesigned application using the original laboratory, profile, layout and weight records.')
