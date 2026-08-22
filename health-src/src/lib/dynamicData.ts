// src/lib/dynamicData.ts
// Loads any *.json files from ./data/ at runtime and merges them into the
// existing lab-data.json that was baked in at build time.
//
// manifest.json format:  { "files": ["20260501-salud-digna.json"] }

import type { LabData, Result, RefOperator, ValueOperator } from './types'
// Import the build-time JSON directly (NOT from data.ts) to avoid circular imports.
import labDataJson from '../data/lab-data.json'

const buildTimeData = labDataJson as unknown as LabData

// Dynamic state — starts as build-time data, gets replaced after fetch
let mergedData: LabData = buildTimeData

// Subscribers that want to know when data updates
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeToDataUpdates(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  for (const fn of listeners) fn()
}

export function getMergedData(): LabData {
  return mergedData
}

// Track load state
let loadState: 'idle' | 'loading' | 'done' | 'error' = 'idle'

export function getLoadState() { return loadState }

// ---------------------------------------------------------------------------
// Normalization (mirrors build-data.mjs — ensures imported results have all
// required fields and consistent types)
// ---------------------------------------------------------------------------
function normalizeResult(r: Record<string, unknown>): Result {
  const toNum = (v: unknown) =>
    v === null || v === undefined || v === '' ? null : Number(v)
  const toBool = (v: unknown) =>
    v === true || v === 'true' || v === 'TRUE' || v === 1
  return {
    result_id: String(r.result_id || ''),
    date: String(r.date || '').slice(0, 10),
    lab: String(r.lab || ''),
    parameter_canonical: String(r.parameter_canonical || '') === 'hiv_screen' ? 'hiv_1_2' : String(r.parameter_canonical || ''),
    parameter_raw: String(r.parameter_raw || r.parameter_canonical || ''),
    value_numeric: toNum(r.value_numeric),
    value_text: r.value_text ? String(r.value_text) : null,
    value_operator: (r.value_operator ? String(r.value_operator) : '') as ValueOperator,
    unit: String(r.unit || ''),
    ref_low: toNum(r.ref_low),
    ref_high: toNum(r.ref_high),
    ref_operator: (r.ref_operator ? String(r.ref_operator) : '') as RefOperator,
    abnormal_flag: toBool(r.abnormal_flag),
    source_pdf: String(r.source_pdf || ''),
    notes: String(r.notes || ''),
  }
}

// ---------------------------------------------------------------------------
// Deduplication: if a result with the same result_id already exists in base
// data, the new file's version takes precedence.
// ---------------------------------------------------------------------------
function mergeResults(base: Result[], incoming: Result[]): Result[] {
  const byId = new Map<string, Result>()
  for (const r of base) byId.set(r.result_id, r)
  for (const r of incoming) byId.set(r.result_id, r)  // incoming wins
  return [...byId.values()]
}

// ---------------------------------------------------------------------------
// Rebuild the derived indices after merging
// ---------------------------------------------------------------------------
function rebuildIndices(all: Result[], base: LabData): LabData {
  const byDate: Record<string, Result[]> = {}
  const byCanonical: Record<string, Result[]> = {}

  for (const r of all) {
    if (!r.parameter_canonical || !r.date) continue
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(r)
    if (!byCanonical[r.parameter_canonical]) byCanonical[r.parameter_canonical] = []
    byCanonical[r.parameter_canonical].push(r)
  }

  // Sort time series ascending
  for (const cid of Object.keys(byCanonical)) {
    byCanonical[cid].sort((a, b) => a.date.localeCompare(b.date))
  }

  const dates = [...new Set(all.map(r => r.date))].sort().reverse()

  return {
    ...base,
    results: all,
    byDate,
    byCanonical,
    dates,
    counts: {
      ...base.counts,
      results: all.length,
      dates: dates.length,
    },
  }
}

// ---------------------------------------------------------------------------
// Main load function — call once on app startup
// ---------------------------------------------------------------------------
export async function loadDynamicData(): Promise<{ added: number; files: string[] }> {
  if (loadState === 'loading' || loadState === 'done') {
    return { added: 0, files: [] }
  }
  loadState = 'loading'

  const BASE_PATH = './data/'  // relative to the deployed app root, e.g. /mylabs/data/
  const loadedFiles: string[] = []
  let newResults: Result[] = []

  try {
    // Step 1: fetch manifest
    const manifestUrl = BASE_PATH + 'manifest.json'
    const manifestRes = await fetch(manifestUrl, { cache: 'no-cache' })

    if (!manifestRes.ok) {
      console.info(`[dynamicData] no manifest found at ${manifestUrl}: ${manifestRes.status}`)
      loadState = 'done'
      return { added: 0, files: [] }
    }

    const manifest = await manifestRes.json() as { files?: string[] }
    const files = (manifest.files || [])
      .filter(filename => typeof filename === 'string' && filename.trim().length > 0)
      .map(filename => filename.replace(/^\/+/, '').replace(/^data\//, ''))

    console.info('[dynamicData] manifest files:', files)

    if (files.length === 0) {
      loadState = 'done'
      return { added: 0, files: [] }
    }

    // Step 2: fetch each file in parallel
    const fetches = files.map(async (filename) => {
      try {
        const url = BASE_PATH + filename
        const res = await fetch(url, { cache: 'no-cache' })
        if (!res.ok) {
          console.warn(`[dynamicData] could not load ${url}: ${res.status}`)
          return []
        }
        const arr = await res.json() as Record<string, unknown>[]
        if (!Array.isArray(arr)) {
          console.warn(`[dynamicData] ${url} ignored: expected a top-level JSON array`)
          return []
        }
        loadedFiles.push(filename)
        return arr.map(normalizeResult).filter(r => r.parameter_canonical && r.date)
      } catch (err) {
        console.warn(`[dynamicData] failed to parse ${filename}:`, err)
        return []
      }
    })

    const allFetched = await Promise.all(fetches)
    newResults = allFetched.flat()

    if (newResults.length === 0) {
      loadState = 'done'
      return { added: 0, files: loadedFiles }
    }

    // Step 3: merge and rebuild
    const merged = mergeResults(buildTimeData.results, newResults)
    mergedData = rebuildIndices(merged, buildTimeData)
    loadState = 'done'
    notify()

    return { added: newResults.length, files: loadedFiles }
  } catch (err) {
    console.warn('[dynamicData] load failed:', err)
    loadState = 'error'
    return { added: 0, files: [] }
  }
}
