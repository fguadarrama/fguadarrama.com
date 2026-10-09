#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, renameSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { createInterface } from 'node:readline/promises'
import { extractWeight, validateRecord } from './weight-image-parser.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  review: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' },
  apply: { type: 'boolean' }, build: { type: 'boolean' }, help: { type: 'boolean' },
} })
const help = `Importar una captura Xiaomi (OCR local, macOS):
  npm run weight:import -- "/ruta/captura.jpg"
  npm run weight:import -- --review "/ruta/borrador.json" --apply --build

Primero se extrae un borrador privado. Revisa sus cifras, corrige lo necesario y
cambia reviewed a true. --apply agrega el registro con respaldo y sin duplicados.
--date AAAA-MM-DD y --time HH:MM permiten confirmar fechas/hora poco legibles.
--build reconstruye únicamente el sitio cifrado usando .release-password.local
o LABS_PASSWORD. Nunca publica ni hace push automáticamente.`
try {
  if (values.help) { console.log(help); process.exit(0) }
  const folder = resolve(root, 'src/data/sources/weight-imports')
  mkdirSync(folder, { recursive: true, mode: 0o700 })
  let draft, draftPath
  if (values.review) {
    draftPath = resolve(values.review)
    draft = JSON.parse(readFileSync(draftPath, 'utf8'))
    if (draft.schema !== 'health-weight-image/v1') throw new Error('Formato de borrador no reconocido.')
  } else {
    if (positionals.length !== 1 || process.platform !== 'darwin') throw new Error(help)
    if (values.apply) throw new Error('Primero extrae y revisa el borrador; --apply requiere --review.')
    const image = resolve(positionals[0]), bytes = readFileSync(image)
    const hash = createHash('sha256').update(bytes).digest('hex')
    draftPath = resolve(folder, `${hash.slice(0,16)}.json`)
    if (existsSync(draftPath)) throw new Error(`Ya existe una extracción de esta imagen. Revisa: ${draftPath}`)
    const cache = resolve(root, 'tmp/swift-cache')
    mkdirSync(cache,{recursive:true})
    const result = spawnSync('swift', ['-module-cache-path', cache, resolve(root,'scripts/weight-ocr.swift'), image],
      { encoding:'utf8', maxBuffer:8*1024*1024, timeout:120000 })
    if (result.status !== 0) throw new Error(`OCR local falló: ${result.error?.message ?? result.stderr}. No se modificó el historial.`)
    draft = extractWeight(JSON.parse(result.stdout), basename(image))
    draft.sourceSha256 = hash
  }
  if (values.date) draft.record.date = values.date
  if (values.time) draft.record.time = values.time
  const errors = validateRecord(draft.record)
  console.table({ fecha:draft.record.date, hora:draft.record.time, peso:draft.record.weight,
    grasaPorcentaje:draft.record.bodyFat, ...draft.record.composition })
  console.log([...draft.warnings, ...errors].join('\n'))
  if (!values.review) {
    writeFileSync(draftPath, JSON.stringify(draft,null,2)+'\n', { mode:0o600, flag:'wx' })
    console.log(`Borrador privado: ${draftPath}\nSin cambios en el historial.`)
    if (process.stdin.isTTY && !errors.length) {
      const prompt = createInterface({input:process.stdin,output:process.stdout})
      const answer = await prompt.question('¿Cotejaste TODAS las cifras y la fecha con la imagen? Escribe CONFIRMAR para guardar: ')
      prompt.close()
      if (answer === 'CONFIRMAR') {
        draft.reviewed = true
        writeFileSync(draftPath,JSON.stringify(draft,null,2)+'\n',{mode:0o600})
        values.apply = true
      }
    }
  }
  if (!values.apply) { console.log(help); process.exit(0) }
  if (draft.reviewed !== true) throw new Error('Revisa el borrador y establece reviewed: true antes de aplicar.')
  if (errors.length) throw new Error('Resuelve los campos indicados. No se modificó el historial.')
  let password
  if (values.build) {
    password = process.env.LABS_PASSWORD || readFileSync(resolve(root,'.release-password.local'),'utf8').trim()
    if (password.length < 16) throw new Error('Contraseña de release no disponible o inválida.')
  }
  const dataPath = resolve(root,'src/data/weight-records.local.json')
  const before = readFileSync(dataPath,'utf8'), records = JSON.parse(before)
  const row = { ...draft.record, id:`${draft.record.date}-${draft.record.time.replace(':','')}` }
  const same = records.find(r => r.id === row.id || r.date === row.date && r.time === row.time)
  if (same) {
    const comparable = r => JSON.stringify(Object.fromEntries(Object.entries({...r.composition,weight:r.weight,bodyFat:r.bodyFat}).filter(([k]) => k !== 'sourceImage').sort(([a],[b]) => a.localeCompare(b))))
    if (comparable(same) !== comparable(row)) throw new Error('Hay una lectura distinta en esa fecha/hora. No se sobrescribirá.')
    console.log('Esta medición ya está registrada; no se duplicó.')
  } else {
    const backup = resolve(folder,`backup-${Date.now()}.json`)
    copyFileSync(dataPath,backup)
    // Only append. Never re-round, reclassify or rewrite historical entries.
    const updated = [...records,row]
    const temp = `${dataPath}.tmp`
    writeFileSync(temp,JSON.stringify(updated,null,2)+'\n',{mode:0o600})
    if (readFileSync(dataPath,'utf8') !== before) throw new Error('El historial cambió durante la revisión. Inténtalo de nuevo.')
    renameSync(temp,dataPath)
    writeFileSync(resolve(folder,`${row.id}-import.json`),JSON.stringify({sourceSha256:draft.sourceSha256,record:row,importedAt:new Date().toISOString()},null,2)+'\n',{mode:0o600})
    console.log(`Medición añadida. Respaldo: ${backup}`)
  }
  if (values.build) {
    const build = spawnSync('npm',['run','build:protected'],{cwd:root,stdio:'inherit',env:{...process.env,LABS_PASSWORD:password}})
    if (build.status !== 0) throw new Error('Datos guardados, pero falló la compilación. No publiques hasta resolverlo.')
    console.log('Sitio cifrado actualizado. No se ha hecho push.')
  }
} catch(error) { console.error(error.message); process.exitCode = 1 }
