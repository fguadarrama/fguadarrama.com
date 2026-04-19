// src/lib/types.ts
// Shape of the build-time JSON (see scripts/build-data.mjs)

export type RefOperator = 'range' | '<=' | '>=' | ''

export interface Parameter {
  canonical_id: string
  display_name_es: string
  display_name_en: string
  category: string
  unit_mx: string
  aliases: string
  lab_ref_low: number | null
  lab_ref_high: number | null
  lab_ref_operator: RefOperator
  guideline_target_low: number | null
  guideline_target_high: number | null
  guideline_note: string
  guideline_source: string
  plottable: boolean
  notes: string
}

export interface Result {
  result_id: string
  date: string // ISO YYYY-MM-DD
  lab: string
  parameter_canonical: string
  parameter_raw: string
  value_numeric: number | null
  value_text: string | null
  unit: string
  ref_low: number | null
  ref_high: number | null
  ref_operator: RefOperator
  abnormal_flag: boolean
  source_pdf: string
  notes: string
}

export interface LabData {
  generatedAt: string
  counts: {
    results: number
    parameters: number
    lcrResults: number
    dates: number
  }
  dates: string[] // desc
  categories: string[]
  parameters: Parameter[]
  paramsById: Record<string, Parameter>
  results: Result[]
  lcrResults: Result[]
  byDate: Record<string, Result[]>
  byCanonical: Record<string, Result[]>
}

// Which reference range source the UI is currently displaying for a chart/table.
export type RefSource = 'latest' | 'per-point' | 'guideline'
