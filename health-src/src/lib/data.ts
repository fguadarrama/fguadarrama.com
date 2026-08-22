// src/lib/data.ts
import labDataJson from '../data/lab-data.json'
import type { LabData, Parameter, Result } from './types'
import { useState, useEffect } from 'react'
import { getMergedData, subscribeToDataUpdates } from './dynamicData'

// Build-time data — the static baseline, always available synchronously.
export const baseData = labDataJson as unknown as LabData

// `data` is a simple getter that returns whichever version of the data is
// current (build-time initially, merged after dynamic files load).
// All selector functions call getData() so they automatically see new data.
// This avoids any Proxy or circular import — just a plain function call.
export const data: LabData = labDataJson as unknown as LabData

/** Returns the most up-to-date merged data. Replaces direct `data` access
 *  in functions that need to react to dynamic updates. */
function getData(): LabData {
  return getMergedData()
}

/** React hook: re-renders the component when dynamic JSON files finish loading. */
export function useLiveData(): void {
  const [, setTick] = useState(0)
  useEffect(() => {
    return subscribeToDataUpdates(() => setTick(n => n + 1))
  }, [])
}

export function formatDate(iso: string): string {
  return shortDate3Letter(iso)
}

export function formatDateLong(iso: string): string {
  return shortDate3Letter(iso)
}

/** Pretty-format a numeric value, trimming trailing zeros and respecting precision. */
export function formatValue(v: number | null | undefined, unit?: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  // Decide decimals by magnitude
  const abs = Math.abs(v)
  let decimals = 2
  if (abs >= 100) decimals = 1
  if (abs >= 1000) decimals = 0
  const s = v.toFixed(decimals)
  // Trim trailing zeros only if there's a decimal point
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

const SUPERSCRIPTS: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
export function formatUnit(unit: string): string {
  return (unit || '').replace(/^x\s*/i, '').replace(/\^(-?\d+)/g, (_, exponent: string) => [...exponent].map((character) => SUPERSCRIPTS[character] ?? character).join(''))
}

export function formatComparisonOperator(operator?: string): string {
  if (operator === '<=') return '≤'
  if (operator === '>=') return '≥'
  return operator || ''
}

function decimalPlaces(value: number): number {
  const text = String(value)
  if (text.includes('e-')) return Math.min(3, Number(text.split('e-')[1]))
  return Math.min(3, (text.split('.')[1] ?? '').length)
}

const categoryPrecisionCache = new Map<string, number>()
function categoryPrecision(category: string): number {
  const cached = categoryPrecisionCache.get(category)
  if (cached != null) return cached
  const counts = [0, 0, 0, 0]
  const ids = new Set(getData().parameters.filter((parameter) => parameter.category === category).map((parameter) => parameter.canonical_id))
  getData().results.forEach((row) => { if (ids.has(row.parameter_canonical) && row.value_numeric != null) counts[decimalPlaces(row.value_numeric)]++ })
  const precision = counts.indexOf(Math.max(...counts))
  categoryPrecisionCache.set(category, precision)
  return precision
}

function smartFormattedValue(value: number, category: string): string {
  let precision = categoryPrecision(category)
  while (precision < 3) {
    const rounded = Number(value.toFixed(precision))
    const relativeError = value === 0 ? 0 : Math.abs(rounded - value) / Math.abs(value)
    if (!(value !== 0 && rounded === 0) && relativeError <= 0.01) break
    precision++
  }
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value)
}

/** Preserve qualifiers such as <10 and apply the accepted category-level precision. */
export function displayResultValue(r: Result, p?: Parameter): string {
  if (r.value_numeric !== null) return `${formatComparisonOperator(r.value_operator)}${p ? smartFormattedValue(r.value_numeric, p.category) : formatValue(r.value_numeric)}`
  if (!r.value_text) return '—'
  const trimmed = r.value_text.trim()
  const lower = trimmed.toLocaleLowerCase('es-MX')
  if (p?.canonical_id === 'grupo_sanguineo' && lower === 'o positivo') return 'O+'
  if (p?.canonical_id === 'orina_cristales' && (lower === 'no se observan' || lower === 'no se observa')) return '0'
  if (trimmed.toLocaleLowerCase('es-MX') === 'negativo') return 'Neg.'
  if (p?.category !== 'Orina') return r.value_text
  const normalized = lower === 'ambar' ? 'ámbar' : lower
  return normalized.charAt(0).toLocaleUpperCase('es-MX') + normalized.slice(1)
}

/** Decide whether a result is out of range.
 *  Uses the result's own ref band if present; otherwise falls back to
 *  the parameter's lab_ref, then guideline_target. */
export function isOutOfRange(r: Result, p?: Parameter): boolean {
  if (r.abnormal_flag) return true
  if (r.value_numeric === null) return false
  const v = r.value_numeric
  const lo = r.ref_low ?? p?.lab_ref_low ?? p?.guideline_target_low ?? null
  const hi = r.ref_high ?? p?.lab_ref_high ?? p?.guideline_target_high ?? null
  const op = r.ref_operator || p?.lab_ref_operator || ''
  if (op === '<=') return hi !== null && v > hi
  if (op === '>=') return lo !== null && v < lo
  if (lo !== null && v < lo) return true
  if (hi !== null && v > hi) return true
  return false
}

/** Build a stable sort order for categories that matches clinical reading. */
export const CATEGORY_ORDER = [
  'Hematología',
  'Química',
  'Lípidos',
  'Hepática',
  'Electrolitos',
  'Endocrinología',
  'Serología',
  'Orina',
  'LCR',
]

export function sortCategories(cats: string[]): string[] {
  return [...cats].sort(
    (a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a)
      const bi = CATEGORY_ORDER.indexOf(b)
      // Unknown categories sort to the end alphabetically
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    },
  )
}

/** Results on a given date, grouped by canonical, keeping only the first
 *  occurrence per canonical (should be unique by construction). */
export function resultsOnDate(date: string): Result[] {
  const rows = getData().byDate[date] || []
  return rows
}

/** Latest N dates, newest first. */
export function latestDates(n: number): string[] {
  return getData().dates.slice(0, n)
}

/** For a canonical_id, return the sorted time series. */
export function seriesFor(cid: string): Result[] {
  return getData().byCanonical[cid] || []
}

/** For a canonical_id, return the latest result (or null). */
export function latestResultFor(cid: string): Result | null {
  const s = seriesFor(cid)
  return s.length ? s[s.length - 1] : null
}

/** Count of abnormal results for a given date. */
export function abnormalCountOn(date: string): number {
  const rows = resultsOnDate(date)
  let n = 0
  for (const r of rows) {
    const p = getData().paramsById[r.parameter_canonical]
    if (isOutOfRange(r, p)) n++
  }
  return n
}

/** Compute a "trend direction" indicator for the last two measurements. */
export function trendOf(cid: string): 'up' | 'down' | 'flat' | null {
  const s = seriesFor(cid).filter((r) => r.value_numeric !== null)
  if (s.length < 2) return null
  const a = s[s.length - 2].value_numeric!
  const b = s[s.length - 1].value_numeric!
  const diff = b - a
  if (Math.abs(diff) < Math.abs(a) * 0.03) return 'flat' // < 3% change
  return diff > 0 ? 'up' : 'down'
}

/** Determine if a numeric value is above or below reference range.
 *  Returns 'above', 'below', or null (in range or unknown). */
export function directionOf(r: Result, p?: Parameter): 'above' | 'below' | null {
  if (r.value_numeric === null) return null
  const v = r.value_numeric
  const lo = r.ref_low ?? p?.lab_ref_low ?? p?.guideline_target_low ?? null
  const hi = r.ref_high ?? p?.lab_ref_high ?? p?.guideline_target_high ?? null
  const op = r.ref_operator || p?.lab_ref_operator || ''
  if (op === '<=') {
    if (hi !== null && v > hi) return 'above'
    return null
  }
  if (op === '>=') {
    if (lo !== null && v < lo) return 'below'
    return null
  }
  if (hi !== null && v > hi) return 'above'
  if (lo !== null && v < lo) return 'below'
  return null
}

/** Short date for table headers: "dd/mm" or "dd/mm/yy" */
export function shortDate(iso: string, includeYear = true): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return includeYear ? `${d}/${m}/${y.slice(-2)}` : `${d}/${m}`
}

/** Clinical date format used everywhere: "07 Ago 26". */
const MONTHS_ES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export function shortDate3Letter(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  const mi = Number(m) - 1
  const mo = MONTHS_ES_SHORT[mi] || m
  return `${d.padStart(2, '0')} ${mo} ${y.slice(-2)}`
}

/** Lowercase slug used to attach CSS class `cat-*` to DOM nodes. */
export function categorySlug(cat: string): string {
  const map: Record<string, string> = {
    'Hematología': 'hematologia',
    'Hepática': 'hepatica',
    'Química': 'quimica',
    'Lípidos': 'lipidos',
    'Endocrinología': 'endocrinologia',
    'Electrolitos': 'electrolitos',
    'Orina': 'orina',
    'Serología': 'serologia',
    'LCR': 'lcr',
  }
  return map[cat] || cat.toLowerCase().replace(/[^a-záéíóúüñ]/g, '').replace(/[áéíóúüñ]/g, (c) => ({ á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u',ñ:'n' }[c] || c))
}

/** All parameters in a given category that have at least ONE measurement.
 *  Ordering: sort_weight (smaller first), then alphabetical. */
export function parametersInCategory(cat: string): Parameter[] {
  return getData().parameters
    .filter((p) => p.category === cat && !!getData().byCanonical[p.canonical_id])
    .sort((a, b) => {
      const sa = a.sort_weight ?? 100
      const sb = b.sort_weight ?? 100
      if (sa !== sb) return sa - sb
      return a.display_name_es.localeCompare(b.display_name_es)
    })
}

/** Categories that render as collapsed panels at the bottom of the dashboard. */
export const COLLAPSIBLE_CATEGORIES = new Set(['Orina', 'LCR'])
export function isCollapsibleCategory(cat: string): boolean {
  return COLLAPSIBLE_CATEGORIES.has(cat)
}

/** All dates on which any result for the given category exists, desc. */
export function datesForCategory(cat: string): string[] {
  const params = parametersInCategory(cat)
  const set = new Set<string>()
  for (const p of params) {
    for (const r of getData().byCanonical[p.canonical_id] || []) {
      set.add(r.date)
    }
  }
  return [...set].sort().reverse()
}

/** Find the result for a (canonical, date) pair, or null. */
export function findResult(cid: string, date: string): Result | null {
  const s = getData().byCanonical[cid] || []
  return s.find((r) => r.date === date) || null
}

/** Compute accent color for a given category (returns a CSS var string). */
export function categoryAccentVar(cat: string): string {
  return `var(--cat-${categorySlug(cat)})`
}
