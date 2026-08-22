#!/usr/bin/env node
// scripts/build-data.mjs
// Reads lab_data.xlsx → src/data/lab-data.json
// Reconciles the complete `parameters` sheet with source-specific additions.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { read, utils } from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const input = process.argv[2] || resolve(ROOT, 'lab_data.xlsx')
const output = resolve(ROOT, 'src/data/lab-data.json')
const questSourcePath = resolve(ROOT, 'src/data/sources/2026-08-07-quest.json')

console.log(`[build-data] reading ${input}`)
const buf = readFileSync(input)
const wb = read(buf, { type: 'buffer', cellDates: true })

const resultsSheet = wb.Sheets['results']
if (!resultsSheet) throw new Error('Missing sheet: results')
const dictSheet = wb.Sheets['parameters']
if (!dictSheet) throw new Error('Missing sheet: parameters')
const lcrSheet = wb.Sheets['lcr_results']

const resultsRaw = utils.sheet_to_json(resultsSheet, { defval: null })
const dictRaw = utils.sheet_to_json(dictSheet, { defval: null })
const lcrRaw = lcrSheet ? utils.sheet_to_json(lcrSheet, { defval: null }) : []
const questSource = JSON.parse(readFileSync(questSourcePath, 'utf8'))

const toIsoDate = (v) => {
  if (!v) return ''
  if (v instanceof Date) {
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const d = String(v.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(v).slice(0, 10)
}


const normalizeTextValue = (v) => {
  if (v === null || v === undefined || v === '') return null
  const text = String(v).trim()
  const lower = text.toLocaleLowerCase('es-MX')
  const qualitativeMap = {
    'negativo': 'Negativo',
    'negativa': 'Negativa',
    'positivo': 'Positivo',
    'positiva': 'Positiva',
    'ausente': 'Ausente',
    'ausentes': 'Ausentes',
    'presente': 'Presente',
    'presentes': 'Presentes',
    'reactivo': 'Reactivo',
    'no reactivo': 'No reactivo',
    'no detectado': 'No detectado',
    'detectado': 'Detectado',
  }
  return qualitativeMap[lower] || text
}

const normalizeLab = (value) => {
  const lab = String(value || '').trim()
  return /^Quest Diagnostics(?: México)?(?:\s*·.*)?$/i.test(lab) ? 'Quest Diagnostics' : lab
}

// Units are content, not mathematical source code. Normalize exponents at the
// data boundary so every consumer (ledger, charts, tooltips and PDFs) receives
// typographically correct Unicode superscripts instead of caret notation.
const SUPERSCRIPTS = { '-': '⁻', '−': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
const normalizeUnit = (value) => String(value || '')
  .trim()
  .replace(/^x\s*/i, '')
  .replace(/\^([−-]?\d+)/g, (_, exponent) => [...exponent].map((character) => SUPERSCRIPTS[character] ?? character).join(''))

const normalizeResult = (r) => ({
  result_id: r.result_id,
  date: toIsoDate(r.date),
  lab: normalizeLab(r.lab),
  parameter_canonical: r.parameter_canonical,
  parameter_raw: r.parameter_raw || '',
  value_numeric: r.value_numeric === null || r.value_numeric === '' ? null : Number(r.value_numeric),
  value_text: normalizeTextValue(r.value_text),
  value_operator: r.value_operator || '',
  unit: normalizeUnit(r.unit),
  ref_low: r.ref_low === null || r.ref_low === '' ? null : Number(r.ref_low),
  ref_high: r.ref_high === null || r.ref_high === '' ? null : Number(r.ref_high),
  ref_operator: r.ref_operator || '',
  abnormal_flag: r.abnormal_flag === true || r.abnormal_flag === 'TRUE' || r.abnormal_flag === 'true' || r.abnormal_flag === 1,
  source_pdf: r.source_pdf || '',
  notes: r.notes || '',
})

const normalizeParam = (p) => ({
  canonical_id: p.canonical_id,
  display_name_es: p.display_name_es || '',
  display_name_en: p.display_name_en || '',
  category: p.category || '',
  unit_mx: normalizeUnit(p.unit_mx),
  aliases: p.aliases || '',
  lab_ref_low: p.lab_ref_low === null || p.lab_ref_low === '' ? null : Number(p.lab_ref_low),
  lab_ref_high: p.lab_ref_high === null || p.lab_ref_high === '' ? null : Number(p.lab_ref_high),
  lab_ref_operator: p.lab_ref_operator || 'range',
  guideline_target_low: p.guideline_target_low === null || p.guideline_target_low === '' ? null : Number(p.guideline_target_low),
  guideline_target_high: p.guideline_target_high === null || p.guideline_target_high === '' ? null : Number(p.guideline_target_high),
  guideline_note: p.guideline_note || '',
  guideline_source: p.guideline_source || '',
  plottable: p.plottable === true || p.plottable === 'TRUE' || p.plottable === 'true' || p.plottable === 1,
  notes: p.notes || '',
})

const results = resultsRaw.map(normalizeResult).filter((r) => r.parameter_canonical && r.date)
const lcrResults = lcrRaw.map(normalizeResult).filter((r) => r.parameter_canonical && r.date)
const parameters = dictRaw.map(normalizeParam).filter((p) => p.canonical_id)

// A few parser generations emitted synonymous IDs. Preserve result_id provenance
// while unifying their time series under the established canonical parameter.
const CANONICAL_ALIASES = {
  alp: 'fosfatasa_alcalina',
  hiv_screen: 'hiv_1_2',
  mpv: 'vpm',
  relacion_ag: 'rel_a_g',
}
for (const row of [...results, ...lcrResults]) {
  row.parameter_canonical = CANONICAL_ALIASES[row.parameter_canonical] || row.parameter_canonical
}

const questColumns = questSource.columns
const questLab = 'Quest Diagnostics'
const questResults = questSource.measurements.map((values) => {
  const measurement = Object.fromEntries(questColumns.map((column, index) => [column, values[index]]))
  const canonical = CANONICAL_ALIASES[measurement.canonical] || measurement.canonical
  return normalizeResult({
    result_id: `${questSource.provenance.collectionDate}_quest-diagnostics-mexico-frontera-4_${canonical}`,
    date: questSource.provenance.collectionDate,
    lab: questLab,
    parameter_canonical: canonical,
    parameter_raw: measurement.raw,
    value_numeric: measurement.numeric,
    value_text: measurement.text,
    value_operator: measurement.valueOperator,
    unit: measurement.unit,
    ref_low: measurement.refLow,
    ref_high: measurement.refHigh,
    ref_operator: measurement.refOperator,
    abnormal_flag: measurement.abnormal,
    source_pdf: questSource.provenance.sourceFile,
    notes: `Requisición ${questSource.provenance.requisition}; toma ${questSource.provenance.collectionTime}.`,
  })
})

const questByCanonical = new Map(questResults.map((row) => [row.parameter_canonical, row]))
for (const [canonical_id, display_name_es, category, unit_mx] of questSource.parameterDefinitions) {
  if (parameters.some((parameter) => parameter.canonical_id === canonical_id)) continue
  const row = questByCanonical.get(canonical_id)
  const aliases = questResults
    .filter((result) => result.parameter_canonical === canonical_id)
    .map((result) => result.parameter_raw)
    .filter(Boolean)
    .join('|')
  parameters.push(normalizeParam({
    canonical_id, display_name_es, display_name_en: '', category, unit_mx, aliases,
    lab_ref_low: row?.ref_low ?? null, lab_ref_high: row?.ref_high ?? null,
    lab_ref_operator: row?.ref_operator || 'range', plottable: row?.value_numeric != null,
    guideline_note: '', guideline_source: '', notes: `Añadido desde ${questSource.provenance.sourceFile}.`,
  }))
}

// Inject params that have results but are absent from dict_parameters
const INJECTED = [
  { canonical_id: 'insulina', display_name_es: 'Insulina', display_name_en: 'Insulin',
    category: 'Endocrinología', unit_mx: 'µU/mL', aliases: 'INSULINA|Insulina',
    lab_ref_low: 2.6, lab_ref_high: 24.9, lab_ref_operator: 'range',
    guideline_target_low: null, guideline_target_high: null,
    guideline_note: '', guideline_source: 'Mexican lab consensus', plottable: true, notes: '' },
  { canonical_id: 'hiv_1_2', display_name_es: 'Anticuerpos VIH 1/2', display_name_en: 'HIV 1/2 antibodies',
    category: 'Serología', unit_mx: '', aliases: 'VIH 1/2|HIV 1/2|Anticuerpos VIH 1/2|ANTICUERPOS VIH 1/2',
    lab_ref_low: null, lab_ref_high: null, lab_ref_operator: '',
    guideline_target_low: null, guideline_target_high: null,
    guideline_note: 'Resultado cualitativo: negativo = no detectado', guideline_source: '', plottable: false, notes: '' },
  { canonical_id: 'hla_b27', display_name_es: 'HLA B27', display_name_en: 'HLA-B27 antigen',
    category: 'Serología', unit_mx: '', aliases: 'HLA B27|HLA-B27|ANTÍGENO DE COMPATIBILIDAD HLA B-27|ANTIGENO DE COMPATIBILIDAD HLA B-27',
    lab_ref_low: null, lab_ref_high: null, lab_ref_operator: '',
    guideline_target_low: null, guideline_target_high: null,
    guideline_note: 'Resultado cualitativo: negativo = no detectado', guideline_source: '', plottable: false, notes: '' },
  { canonical_id: 'ogtt75_basal', display_name_es: 'CTOG 75 g — glucosa basal', display_name_en: 'OGTT 75g — fasting glucose',
    category: 'Química', unit_mx: 'mg/dL', aliases: 'CTOG basal|OGTT basal',
    lab_ref_low: null, lab_ref_high: 100, lab_ref_operator: '<=',
    guideline_target_low: null, guideline_target_high: null,
    guideline_note: '', guideline_source: 'ADA 2026', plottable: true, notes: '' },
  { canonical_id: 'ogtt75_1h', display_name_es: 'CTOG 75 g — 1 hora', display_name_en: 'OGTT 75g — 1 hour',
    category: 'Química', unit_mx: 'mg/dL', aliases: 'CTOG 1h|OGTT 1h',
    lab_ref_low: null, lab_ref_high: 180, lab_ref_operator: '<=',
    guideline_target_low: null, guideline_target_high: null,
    guideline_note: '', guideline_source: 'ADA 2026', plottable: true, notes: '' },
  { canonical_id: 'ogtt75_2h', display_name_es: 'CTOG 75 g — 2 horas', display_name_en: 'OGTT 75g — 2 hours',
    category: 'Química', unit_mx: 'mg/dL', aliases: 'CTOG 2h|OGTT 2h',
    lab_ref_low: null, lab_ref_high: 140, lab_ref_operator: '<=',
    guideline_target_low: null, guideline_target_high: null,
    guideline_note: '', guideline_source: 'ADA 2026', plottable: true, notes: '' },
]
const existingIds = new Set(parameters.map((p) => p.canonical_id))
for (const p of INJECTED) { if (!existingIds.has(p.canonical_id)) parameters.push(p) }

// Category remaps
const REMAP = { 'Diabetes': 'Química' }
const CATEGORY_OVERRIDES = { insulina: 'Endocrinología', hiv_1_2: 'Serología', h_pylori_aliento: 'Infecciosos' }
const UNIT_OVERRIDES = { orina_cristales: '/µL' }

// Sort weights — lower = earlier row in the category panel
const WEIGHTS = {
  // Química: glucose cluster first, then renal, then enzymes
  glucosa: 10, hba1c: 11, glucosa_promedio_estimada: 12,
  ogtt75_basal: 13, ogtt75_1h: 14, ogtt75_2h: 15,
  urea: 20, bun: 21, bun_creat_ratio: 22, creatinina: 23,
  acido_urico: 30, amilasa: 40, lipasa: 41,
  // Endocrinología: thyroid first (1-20), reproductive second (21-40)
  tsh: 1, t4_libre: 2, t4_total: 3, t3_libre: 4, t3_total: 5,
  t3_captacion: 6, captacion_t3: 7, tiroglobulina: 8,
  yodo_proteico: 9, itl_fti: 10, ac_anti_tpo: 11, ac_anti_tiroglobulina: 12,
  lh: 21, fsh: 22, prolactina: 23, testosterona_total: 24, cortisol: 25, insulina: 26,
  // Lípidos: electrophoresis at end
  electroforesis_alfa: 90, electroforesis_prebeta: 91,
  electroforesis_beta: 92, quilomicrones: 93,
  hla_b27: 70,
}

const filteredParams = parameters
  .filter((p) => !CANONICAL_ALIASES[p.canonical_id])
  .map((p) => ({
    ...p,
    category: CATEGORY_OVERRIDES[p.canonical_id] || REMAP[p.category] || p.category,
    unit_mx: normalizeUnit(UNIT_OVERRIDES[p.canonical_id] || p.unit_mx),
    sort_weight: WEIGHTS[p.canonical_id] ?? 100,
  }))

const filteredResults = results
const filteredLcr = lcrResults

// Manually curated values identified from source PDFs/screenshots that were not
// present in the original Excel rows.
const MANUAL_RESULTS = [
  {
    result_id: '2026-04-18_salud-digna_hla_b27',
    date: '2026-04-18',
    lab: 'Salud Digna',
    parameter_canonical: 'hla_b27',
    parameter_raw: 'ANTÍGENO DE COMPATIBILIDAD HLA B-27',
    value_numeric: null,
    value_text: 'Negativo',
    unit: '',
    ref_low: null,
    ref_high: null,
    ref_operator: '',
    abnormal_flag: false,
    source_pdf: 'reporte_salud_digna_2026-04-18.pdf',
    notes: 'Agregado desde captura del reporte: Estudios especiales, HLA B-27 negativo.',
  },
]

const existingResultIds = new Set(filteredResults.map((r) => r.result_id))
const manualResults = MANUAL_RESULTS.filter((r) => !existingResultIds.has(r.result_id))
const unreconciledSourceResults = [...filteredResults, ...manualResults, ...filteredLcr, ...questResults]

// HIV was historically entered under two synonymous IDs. Keep every distinct
// clinical measurement under one Serología parameter, while collapsing the
// duplicate 2021 row and retaining its provenance in the surviving record.
const hivByClinicalKey = new Map()
const sourceResults = []
for (const row of unreconciledSourceResults) {
  if (row.parameter_canonical !== 'hiv_1_2') {
    sourceResults.push(row)
    continue
  }
  const key = `${row.date}|${row.lab}`
  const existing = hivByClinicalKey.get(key)
  if (!existing) {
    hivByClinicalKey.set(key, row)
    sourceResults.push(row)
    continue
  }
  const preferred = existing.source_pdf === 'manual_entry' && row.source_pdf !== 'manual_entry' ? row : existing
  const discarded = preferred === existing ? row : existing
  preferred.notes = [preferred.notes, `Registro equivalente reconciliado: ${discarded.result_id} (${discarded.source_pdf || 'sin archivo'}).`]
    .filter(Boolean)
    .join(' ')
  if (preferred !== existing) {
    const index = sourceResults.indexOf(existing)
    if (index >= 0) sourceResults[index] = preferred
    hivByClinicalKey.set(key, preferred)
  }
}

// Maintain the accepted eAG derivation for every HbA1c measurement.
const sourceIds = new Set(sourceResults.map((row) => row.result_id))
const sourceClinicalKeys = new Set(sourceResults.map((row) => `${row.date}|${row.lab}|${row.parameter_canonical}`))
const derivedEag = sourceResults
  .filter((row) => row.parameter_canonical === 'hba1c' && row.value_numeric != null)
  .map((row) => ({
    ...row,
    result_id: `${row.date}_${row.lab.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}_glucosa_promedio_estimada`,
    parameter_canonical: 'glucosa_promedio_estimada',
    parameter_raw: 'Glucosa promedio estimada (derivada de HbA1c)',
    value_numeric: Number((28.7 * row.value_numeric - 46.7).toFixed(2)),
    value_text: null,
    value_operator: '',
    unit: 'mg/dL',
    ref_low: null,
    ref_high: null,
    ref_operator: '',
    abnormal_flag: false,
    notes: `Derivada de HbA1c: eAG = 28.7 × HbA1c − 46.7. ${row.notes}`.trim(),
  }))
  .filter((row) => !sourceIds.has(row.result_id) && !sourceClinicalKeys.has(`${row.date}|${row.lab}|${row.parameter_canonical}`))
const allResults = [...sourceResults, ...derivedEag]

const paramsById = {}
for (const p of filteredParams) paramsById[p.canonical_id] = p

const dates = [...new Set(allResults.map((r) => r.date))].sort().reverse()
const categories = [...new Set(filteredParams.map((p) => p.category))].filter(Boolean)

const byDate = {}
for (const r of allResults) {
  if (!byDate[r.date]) byDate[r.date] = []
  byDate[r.date].push(r)
}

const byCanonical = {}
for (const r of allResults) {
  if (!byCanonical[r.parameter_canonical]) byCanonical[r.parameter_canonical] = []
  byCanonical[r.parameter_canonical].push(r)
}
for (const cid of Object.keys(byCanonical)) {
  byCanonical[cid].sort((a, b) => a.date.localeCompare(b.date))
}

const out = {
  generatedAt: new Date().toISOString(),
  counts: { results: allResults.length, parameters: filteredParams.length,
            lcrResults: filteredLcr.length, dates: dates.length },
  dates, categories,
  parameters: filteredParams, paramsById,
  results: allResults, lcrResults: filteredLcr, byDate, byCanonical,
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(out))
console.log(`[build-data] wrote ${output}`)
console.log(`[build-data] ${out.counts.results} results, ${out.counts.parameters} parameters, ${out.counts.dates} dates`)
