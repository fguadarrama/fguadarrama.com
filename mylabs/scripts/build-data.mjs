#!/usr/bin/env node
// scripts/build-data.mjs
// Reads lab_data.xlsx at build time and produces src/data/lab-data.json.
// This keeps the runtime bundle small (no SheetJS at runtime) and lets
// Francisco simply drop a new xlsx in the project root to rebuild.
//
// Usage: node scripts/build-data.mjs [path/to/lab_data.xlsx]
// Default input: ./lab_data.xlsx
// Output:        ./src/data/lab-data.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { read, utils } from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

const input = process.argv[2] || resolve(ROOT, 'lab_data.xlsx')
const output = resolve(ROOT, 'src/data/lab-data.json')

console.log(`[build-data] reading ${input}`)
const buf = readFileSync(input)
const wb = read(buf, { type: 'buffer', cellDates: true })

// --- Sheet: results ---
const resultsSheet = wb.Sheets['results']
if (!resultsSheet) throw new Error('Missing sheet: results')
const resultsRaw = utils.sheet_to_json(resultsSheet, { defval: null })

// --- Sheet: parameters ---
const paramsSheet = wb.Sheets['parameters']
if (!paramsSheet) throw new Error('Missing sheet: parameters')
const paramsRaw = utils.sheet_to_json(paramsSheet, { defval: null })

// --- Sheet: lcr_results (optional) ---
const lcrSheet = wb.Sheets['lcr_results']
const lcrRaw = lcrSheet ? utils.sheet_to_json(lcrSheet, { defval: null }) : []

// Normalize dates to ISO YYYY-MM-DD strings (xlsx sometimes returns Date objects)
const toIsoDate = (v) => {
  if (!v) return ''
  if (v instanceof Date) {
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const d = String(v.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  // Already a string like '2024-05-19' or '2024-05-19T00:00:00'
  return String(v).slice(0, 10)
}

const normalizeResultRow = (r) => ({
  result_id: r.result_id,
  date: toIsoDate(r.date),
  lab: r.lab || '',
  parameter_canonical: r.parameter_canonical,
  parameter_raw: r.parameter_raw || '',
  value_numeric: r.value_numeric === null || r.value_numeric === '' ? null : Number(r.value_numeric),
  value_text: r.value_text || null,
  unit: r.unit || '',
  ref_low: r.ref_low === null || r.ref_low === '' ? null : Number(r.ref_low),
  ref_high: r.ref_high === null || r.ref_high === '' ? null : Number(r.ref_high),
  ref_operator: r.ref_operator || '',
  abnormal_flag: r.abnormal_flag === true || r.abnormal_flag === 'TRUE' || r.abnormal_flag === 'true' || r.abnormal_flag === 1,
  source_pdf: r.source_pdf || '',
  notes: r.notes || '',
})

const normalizeParamRow = (p) => ({
  canonical_id: p.canonical_id,
  display_name_es: p.display_name_es || '',
  display_name_en: p.display_name_en || '',
  category: p.category || '',
  unit_mx: p.unit_mx || '',
  aliases: p.aliases || '',
  lab_ref_low: p.lab_ref_low === null || p.lab_ref_low === '' ? null : Number(p.lab_ref_low),
  lab_ref_high: p.lab_ref_high === null || p.lab_ref_high === '' ? null : Number(p.lab_ref_high),
  lab_ref_operator: p.lab_ref_operator || '',
  guideline_target_low: p.guideline_target_low === null || p.guideline_target_low === '' ? null : Number(p.guideline_target_low),
  guideline_target_high: p.guideline_target_high === null || p.guideline_target_high === '' ? null : Number(p.guideline_target_high),
  guideline_note: p.guideline_note || '',
  guideline_source: p.guideline_source || '',
  plottable: p.plottable === true || p.plottable === 'TRUE' || p.plottable === 'true' || p.plottable === 1,
  notes: p.notes || '',
})

const results = resultsRaw.map(normalizeResultRow).filter((r) => r.parameter_canonical && r.date)
const lcrResults = lcrRaw.map(normalizeResultRow).filter((r) => r.parameter_canonical && r.date)
const parameters = paramsRaw.map(normalizeParamRow).filter((p) => p.canonical_id)

// Build derived indices used by the UI
const paramsById = {}
for (const p of parameters) paramsById[p.canonical_id] = p

const dates = [...new Set(results.map((r) => r.date))].sort().reverse()
const categories = [...new Set(parameters.map((p) => p.category))].filter(Boolean)

// Build lookup: date -> list of { canonical_id, ...row }
const byDate = {}
for (const r of results) {
  if (!byDate[r.date]) byDate[r.date] = []
  byDate[r.date].push(r)
}

// Build trend index: canonical_id -> sorted series [{ date, value, lab, ... }]
const byCanonical = {}
for (const r of results) {
  if (!byCanonical[r.parameter_canonical]) byCanonical[r.parameter_canonical] = []
  byCanonical[r.parameter_canonical].push(r)
}
for (const cid of Object.keys(byCanonical)) {
  byCanonical[cid].sort((a, b) => a.date.localeCompare(b.date))
}

const out = {
  generatedAt: new Date().toISOString(),
  counts: {
    results: results.length,
    parameters: parameters.length,
    lcrResults: lcrResults.length,
    dates: dates.length,
  },
  dates,
  categories,
  parameters,
  paramsById,
  results,
  lcrResults,
  byDate,
  byCanonical,
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(out))
console.log(`[build-data] wrote ${output}`)
console.log(`[build-data] ${out.counts.results} results, ${out.counts.parameters} parameters, ${out.counts.dates} dates`)
