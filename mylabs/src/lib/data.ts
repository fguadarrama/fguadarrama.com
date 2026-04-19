// src/lib/data.ts
import labDataJson from '../data/lab-data.json'
import type { LabData, Parameter, Result } from './types'

// The build-time JSON has the exact shape of LabData.
// Using a cast here rather than JSON import assertions to keep compat broad.
export const data = labDataJson as unknown as LabData

export function formatDate(iso: string): string {
  if (!iso) return ''
  // Spanish-friendly short date: "19 may 2024"
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateLong(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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
  'Diabetes',
  'Tiroides',
  'Orina',
  'Serología',
  'LCR',
]

export function sortCategories(cats: string[]): string[] {
  return [...cats].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
  )
}

/** Results on a given date, grouped by canonical, keeping only the first
 *  occurrence per canonical (should be unique by construction). */
export function resultsOnDate(date: string): Result[] {
  const rows = data.byDate[date] || []
  return rows
}

/** Latest N dates, newest first. */
export function latestDates(n: number): string[] {
  return data.dates.slice(0, n)
}

/** For a canonical_id, return the sorted time series. */
export function seriesFor(cid: string): Result[] {
  return data.byCanonical[cid] || []
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
    const p = data.paramsById[r.parameter_canonical]
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
