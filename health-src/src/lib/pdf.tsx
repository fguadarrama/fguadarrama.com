// src/lib/pdf.tsx
// Three PDF generators:
//   1. generateReportBlob(categories?) — full history report, last 3 measurements per param
//   2. generateParameterReportBlob(cid) — single-parameter landscape report with chart + table
//
// Fixes vs v2: uses fixed pt column widths summing correctly, reference column widened
// and right-padded to prevent "mg/dL" from clipping into the value column.

import React from 'react'
import { LAB_ACCENTS, LAB_TITLE_COLORS, pdfColor, WATERMELON_SRGB } from './palette'
import { StyleSheet, Font, pdf } from '@react-pdf/renderer'
import { Document, Page, Text, View, Svg, Path, Line, Circle, Rect, usePrintPdf } from './pdf-primitives'
// Latin includes Spanish, digits and basic punctuation. Latin-ext alone omits
// these glyphs and silently causes the PDF engine to fall back to Helvetica.
import albertSansRegularUrl from '@fontsource/albert-sans/files/albert-sans-latin-400-normal.woff?url'
import albertSansMediumUrl from '@fontsource/albert-sans/files/albert-sans-latin-500-normal.woff?url'
import albertSansSemiBoldUrl from '@fontsource/albert-sans/files/albert-sans-latin-600-normal.woff?url'
import albertSansBoldUrl from '@fontsource/albert-sans/files/albert-sans-latin-700-normal.woff?url'
import albertSansItalicUrl from '@fontsource/albert-sans/files/albert-sans-latin-400-italic.woff?url'
import {
  data,
  formatValue,
  directionOf,
  isOutOfRange,
  seriesFor,
  sortCategories,
  parametersInCategory,
  isCollapsibleCategory,
  findResult,
  displayResultValue,
  formatUnit,
} from './data'
import type { Parameter, Result } from './types'
import type { WeightRecord } from '../data/weight-data'
import { PATIENT as PRIVATE_PATIENT } from './patient'

function resolvePdfFontUrl(url: string): string {
  if (typeof window === 'undefined' && url.startsWith('/node_modules/')) {
    const modulePath = decodeURIComponent(import.meta.url).replace(/^file:\/\//, '')
    const projectRoot = modulePath.split('/src/lib/pdf.tsx')[0]
    return `${projectRoot}${url}`
  }
  return url
}

// --- Font registration. Local assets keep PDF creation reliable on GitHub Pages.
Font.register({
  family: 'AlbertSans',
  fonts: [
    { src: resolvePdfFontUrl(albertSansRegularUrl), fontWeight: 400 },
    { src: resolvePdfFontUrl(albertSansMediumUrl), fontWeight: 500 },
    { src: resolvePdfFontUrl(albertSansSemiBoldUrl), fontWeight: 600 },
    { src: resolvePdfFontUrl(albertSansBoldUrl), fontWeight: 700 },
    { src: resolvePdfFontUrl(albertSansItalicUrl), fontWeight: 400, fontStyle: 'italic' },
  ],
})
Font.registerHyphenationCallback((w) => (w.length > 24 ? [w.slice(0, 12), w.slice(12)] : [w]))

const CAT_ACCENTS = LAB_ACCENTS
const CAT_HEADINGS: Record<string, string> = {
  'Hematología': 'Biometría hemática',
  'Hepática': 'Pruebas de funcionamiento hepático',
  'Química': 'Química sanguínea',
  'Lípidos': 'Perfil de lípidos',
  'Endocrinología': 'Endocrinología',
  'Electrolitos': 'Electrolitos séricos',
  'Orina': 'Examen general de orina',
  'Serología': 'Serología',
  'LCR': 'Líquido cefalorraquídeo',
}

const COLORS = {
  ink: '#2d2930',
  ink70: '#2d2930',
  ink50: '#2d2930',
  ink30: '#2d2930',
  ink12: '#2d2930',
  ink08: '#2d2930',
  alarm: '#ff1d58',
  white: '#FFFFFF',
}

const PATIENT = { ...PRIVATE_PATIENT, dob: PRIVATE_PATIENT.dobIso }

function ageInYears(dobIso: string, today: Date = new Date()): number {
  const dob = new Date(dobIso)
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function formatDobSpanish(iso: string): string {
  return formatShortDate(iso)
}

function formatRef(low: number | null, high: number | null, op: string): string {
  if (op === '<' && high !== null) return `< ${formatValue(high)}`
  if (op === '>' && low !== null) return `> ${formatValue(low)}`
  if (op === '<=' && high !== null) return `≤ ${formatValue(high)}`
  if (op === '>=' && low !== null) return `≥ ${formatValue(low)}`
  if (low !== null && high !== null) return `${formatValue(low)}-${formatValue(high)}`
  if (high !== null) return `<${formatValue(high)}`
  if (low !== null) return `>${formatValue(low)}`
  return '-'
}

function PdfReference({ text, style, fontSize = 8 }: { text: string; style?: any; fontSize?: number }) {
  const hasMathOperator = text.startsWith('≤') || text.startsWith('≥')
  const operator = text.slice(0, 1)
  const operatorPath = operator === '≤'
    ? 'M5.5 0.8 L1 3.1 L5.5 5.4 M1 6.8 H5.5'
    : 'M1 0.8 L5.5 3.1 L1 5.4 M1 6.8 H5.5'

  if (!hasMathOperator) return <Text style={style}>{text}</Text>

  return <View style={[style, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }]}>
    <Svg width={7} height={8} viewBox="0 0 7 8" style={{ marginRight: 2 }}>
      <Path d={operatorPath} fill="none" stroke={COLORS.ink} strokeWidth={0.85} />
    </Svg>
    <Text style={{ fontFamily: 'AlbertSans', fontSize, color: COLORS.ink }}>{text.slice(1).trimStart()}</Text>
  </View>
}

const PLAIN_SUPERSCRIPTS: Record<string, string> = {
  '⁻': '-', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
}

/** Render exponents with Albert Sans digits raised by the PDF text engine.
 * This avoids relying on incomplete precomposed superscript glyph subsets. */
export function PdfUnit({ unit, style, fontSize = 8 }: { unit: string; style?: any; fontSize?: number }) {
  const parts = formatUnit(unit).split(/([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g).filter(Boolean)
  return <Text style={[style, { fontSize, fontFamily: 'AlbertSans' }]}>{parts.map((part, index) => {
    const superscript = [...part].every((character) => PLAIN_SUPERSCRIPTS[character] !== undefined)
    if (!superscript) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    const plain = [...part].map((character) => PLAIN_SUPERSCRIPTS[character]).join('')
    return <Text key={`${part}-${index}`} style={{ verticalAlign: 'super' }}>{plain}</Text>
  })}</Text>
}

const MONTHS_PDF = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatShortDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  const mo = MONTHS_PDF[Number(m) - 1] || m
  return `${d.padStart(2, '0')} ${mo} ${y.slice(-2)}`
}

/** Format a numeric value to exactly 1 decimal place for chart axis labels */
function formatValueOneDec(v: number, step = 1): string {
  if (!Number.isFinite(v)) return '-'
  if (v !== 0 && (Math.abs(v) < 0.0001 || Math.abs(v) >= 1e7)) return v.toExponential(1)
  const decimals=Math.min(6,Math.max(0,1-Math.floor(Math.log10(Math.abs(step)||1))))
  return v.toFixed(decimals)
}

// --- Portrait main report ----------------------------------------------------
// Page is A4 portrait (595×842 pt). With 32pt margins we have 531pt wide.
// Five result columns remain readable; longer periods are split into horizontal
// blocks so no selected measurement is dropped or compressed beyond legibility.
// Date header needs its own style (no uppercase, no letterSpacing, tight lineHeight)
const PT = {
  pageWidth: 531,
  name: 156,
  unit: 43,
  value: 51,
  ref: 77,
}

const portraitStyles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    padding: 32,
    paddingBottom: 48,
    fontFamily: 'AlbertSans',
    fontSize: 10,
    color: COLORS.ink,
  },
  header: {
    paddingBottom: 13,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.ink50,
    marginBottom: 6,
    fontFamily: 'AlbertSans',
  },
  patientName: { fontSize: 20, fontWeight: 500, fontFamily: 'AlbertSans' },
  patientMeta: { marginTop: 5, fontSize: 8.5, fontFamily: 'AlbertSans', color: COLORS.ink },
  reportTitle: { fontSize: 13, fontWeight: 500, fontFamily: 'AlbertSans' },
  reportSubtitle: { fontSize: 8.5, color: COLORS.ink, marginTop: 3, fontFamily: 'AlbertSans' },
  monoInline: { fontFamily: 'AlbertSans', fontWeight: 400 },

  catPanel: { marginBottom: 16 },
  catAccentBar: { height: 3 },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 7,
    paddingBottom: 5,
  },
  catTitle: { fontSize: 13, fontWeight: 500, fontFamily: 'AlbertSans' },
  catContinuation: { fontSize: 8, color: COLORS.ink, fontFamily: 'AlbertSans' },
  table: {
    borderTopWidth: 0.8,
    borderTopColor: COLORS.ink,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.ink,
  },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.3,
    borderBottomColor: COLORS.ink30,
  },
  tableHeadCell: {
    fontSize: 7.5,
    letterSpacing: 0.1,
    color: COLORS.ink,
    fontWeight: 500,
    fontFamily: 'AlbertSans',
  },
  tableRow: {
    flexDirection: 'row',
    height: 24,
    alignItems: 'center',
    borderBottomWidth: 0.2,
    borderBottomColor: COLORS.ink12,
  },
  colName: { width: PT.name, paddingRight: 4 },
  colUnitHead: { width: PT.unit, paddingRight: 4 },
  colUnit: { width: PT.unit, paddingRight: 4, color: COLORS.ink50, fontSize: 8, fontFamily: 'AlbertSans' },
  colValue: {
    width: PT.value,
    paddingLeft: 2,
    paddingRight: 2,
    fontFamily: 'AlbertSans',
    fontWeight: 400,
    textAlign: 'center',
    fontSize: 8.5,
  },
  colRef: {
    width: PT.ref,
    paddingLeft: 6,
    paddingRight: 2,
    color: COLORS.ink,
    fontSize: 8,
    fontFamily: 'AlbertSans',
    textAlign: 'right',
  },
  colRefHead: { width: PT.ref, paddingLeft: 6, paddingRight: 2, textAlign: 'right' },
  nameText: { fontSize: 9.2, fontFamily: 'AlbertSans', lineHeight: 1.15 },
  // Date header: own style so tableHeadCell uppercase/letterSpacing don't interfere
  dateHead: {
    width: PT.value,
    paddingLeft: 2,
    paddingRight: 2,
    fontSize: 7,
    fontFamily: 'AlbertSans',
    fontWeight: 400,
    color: COLORS.ink,
    textAlign: 'center',
    lineHeight: 1.2,
  },
  abnormalValue: { color: COLORS.alarm, fontWeight: 400 },
  dash: { color: COLORS.ink, textAlign: 'center' },
  footerRule: {
    position: 'absolute',
    bottom: 38,
    left: 32,
    right: 32,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ink30,
  },
  footerLeft: {
    position: 'absolute', bottom: 24, left: 32,
    fontSize: 7,
    color: COLORS.ink,
    fontFamily: 'AlbertSans',
  },
  footerPage: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    fontSize: 7, color: COLORS.ink, fontFamily: 'AlbertSans', textAlign: 'center',
  },
  footerRight: {
    position: 'absolute', bottom: 24, right: 32,
    fontSize: 7, color: COLORS.ink, fontFamily: 'AlbertSans', textAlign: 'right',
  },
})

function ParamRow({ p, dates }: { p: Parameter; dates: string[] }) {
  const monochrome = usePrintPdf()
  const series = seriesFor(p.canonical_id)
  if (series.length === 0) return null
  const latest = series[series.length - 1]
  const refText = formatRef(
    latest.ref_low ?? p.lab_ref_low,
    latest.ref_high ?? p.lab_ref_high,
    latest.ref_operator || p.lab_ref_operator,
  )

  return (
    <View style={portraitStyles.tableRow} wrap={false}>
      <View style={portraitStyles.colName}>
        <Text style={portraitStyles.nameText}>{p.display_name_es}</Text>
      </View>
      <PdfUnit style={portraitStyles.colUnit} unit={p.unit_mx || ''} />
      {dates.map((date) => {
        const r = findResult(p.canonical_id, date)
        if (!r) {
          return (
            <Text key={date} style={[portraitStyles.colValue, portraitStyles.dash]}>-</Text>
          )
        }
        const ab = isOutOfRange(r, p)
        return (
          <Text key={date} style={[portraitStyles.colValue, ab ? portraitStyles.abnormalValue : {}]}>
            {displayResultValue(r, p)}
            {monochrome && ab ? '*' : ''}
          </Text>
        )
      })}
      <PdfReference style={portraitStyles.colRef} text={refText} />
    </View>
  )
}

function TableHead({ dates }: { dates: string[] }) {
  return (
    <View style={portraitStyles.tableHead} fixed>
      <Text style={[portraitStyles.tableHeadCell, portraitStyles.colName]}>Analito</Text>
      <Text style={[portraitStyles.tableHeadCell, portraitStyles.colUnitHead]}>Unidad</Text>
      {dates.map((date) => <Text key={date} style={portraitStyles.dateHead}>{formatShortDate(date)}</Text>)}
      <Text style={[portraitStyles.tableHeadCell, portraitStyles.colRefHead]}>Referencia</Text>
    </View>
  )
}

function chunks<T>(items: T[], size: number): T[][] {
  const output: T[][] = []
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size))
  return output
}

function CategorySection({ cat, parameterIds, dates, latestPerCategory }: { cat: string; parameterIds: string[]; dates: string[]; latestPerCategory: boolean }) {
  const params = parameterIds.map((id) => data.paramsById[id]).filter((p): p is Parameter => Boolean(p && p.category === cat))
  if (params.length === 0) return null

  const availableDates = dates.filter((date) => params.some((p) => Boolean(findResult(p.canonical_id, date))))
  const categoryDates = latestPerCategory ? availableDates.slice(0, 5) : availableDates
  if (categoryDates.length === 0) return null

  const accent = pdfColor(CAT_ACCENTS[cat] || COLORS.ink)
  const heading = CAT_HEADINGS[cat] || cat
  const dateChunks = chunks(categoryDates, 5)

  return (
    <>{dateChunks.map((chunk, index) => <View key={`${cat}-${index}`} style={portraitStyles.catPanel} wrap minPresenceAhead={110}>
        <View style={[portraitStyles.catAccentBar, { backgroundColor: accent }]} />
        <View style={portraitStyles.catHeader}>
          <Text style={[portraitStyles.catTitle, { color: LAB_TITLE_COLORS[cat] || COLORS.ink }]}>{heading}</Text>
          {dateChunks.length > 1 && <Text style={portraitStyles.catContinuation}>{index + 1} / {dateChunks.length}</Text>}
        </View>
        <View style={portraitStyles.table}>
          <TableHead dates={chunk} />
          {params.map((p) => <ParamRow key={p.canonical_id} p={p} dates={chunk} />)}
        </View>
      </View>)}</>
  )
}

function WeightSection({ records }: { records: WeightRecord[] }) {
  if (records.length === 0) return null
  return <View style={portraitStyles.catPanel} wrap minPresenceAhead={110}>
    <View style={[portraitStyles.catAccentBar, { backgroundColor: WATERMELON_SRGB }]} />
    <View style={portraitStyles.catHeader}><Text style={[portraitStyles.catTitle, { color: '#c6004d' }]}>Peso y composición corporal</Text></View>
    <View style={portraitStyles.table}>
      <View style={portraitStyles.tableHead} fixed>
        <Text style={[portraitStyles.tableHeadCell, { width: 190 }]}>Fecha</Text>
        <Text style={[portraitStyles.tableHeadCell, { width: 170, textAlign: 'right' }]}>Peso</Text>
        <Text style={[portraitStyles.tableHeadCell, { width: 171, textAlign: 'right' }]}>Grasa corporal</Text>
      </View>
      {records.map((record) => <View key={record.id} style={portraitStyles.tableRow} wrap={false}>
        <Text style={{ width: 190, fontSize: 9, fontFamily: 'AlbertSans' }}>{formatShortDate(record.date)}</Text>
        <Text style={{ width: 170, fontSize: 9, fontFamily: 'AlbertSans', textAlign: 'right' }}>{record.weight.toFixed(1)} kg</Text>
        <Text style={{ width: 171, fontSize: 9, fontFamily: 'AlbertSans', textAlign: 'right' }}>{record.bodyFat == null ? '-' : `${record.bodyFat.toFixed(1)} %`}</Text>
      </View>)}
    </View>
  </View>
}

export type LabReportOptions = {
  monochrome?: boolean
  parameterIds?: string[]
  dates?: string[]
  periodLabel?: string
  latestPerCategory?: boolean
  includeWeight?: boolean
  weightRecords?: WeightRecord[]
  onlyCategories?: string[]
}

export function LabReportDocument({ monochrome = false, parameterIds, dates, periodLabel = 'Últimas 5 mediciones', latestPerCategory = false, includeWeight = false, weightRecords = [], onlyCategories }: LabReportOptions = {}) {
  const today = new Date()
  const age = ageInYears(PATIENT.dob, today)
  const dobLong = formatDobSpanish(PATIENT.dob)

  const orderedParameterIds = parameterIds?.length ? parameterIds : data.parameters.map((p) => p.canonical_id)
  const reportDates = dates?.length ? dates : data.dates.slice(0, 5)
  const allCats = [...new Set(orderedParameterIds.map((id) => data.paramsById[id]?.category).filter(Boolean))] as string[]
  let categories = sortCategories(allCats).filter((c) => parametersInCategory(c).length > 0)
  if (onlyCategories && onlyCategories.length > 0) {
    const set = new Set(onlyCategories)
    categories = categories.filter((c) => set.has(c))
  }

  return (
    <Document monochrome={monochrome}>
      <Page size="A4" style={portraitStyles.page}>
        <View style={portraitStyles.header}>
          <View>
            <Text style={portraitStyles.eyebrow}>Historial médico · FGC</Text>
            <Text style={portraitStyles.patientName}>{PATIENT.fullName}</Text>
            <Text style={portraitStyles.patientMeta}>
            <Text style={portraitStyles.monoInline}>{dobLong}</Text>
              <Text style={{ color: COLORS.ink30 }}>  ·  </Text>
              <Text style={portraitStyles.monoInline}>{age}</Text><Text> años</Text>
              <Text style={{ color: COLORS.ink30 }}>  ·  </Text>
              <Text>CURP: </Text><Text style={portraitStyles.monoInline}>{PATIENT.curp}</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={portraitStyles.reportTitle}>{periodLabel}</Text>
            <Text style={portraitStyles.reportSubtitle}>
              Impreso: <Text style={portraitStyles.monoInline}>{formatShortDate(today.toISOString())}</Text>
            </Text>
          </View>
        </View>

        {categories.map((cat) => <CategorySection key={cat} cat={cat} parameterIds={orderedParameterIds} dates={reportDates} latestPerCategory={latestPerCategory} />)}
        {includeWeight && <WeightSection records={weightRecords} />}

        <Text style={portraitStyles.footerRule} fixed render={() => ''} />
        <Text style={portraitStyles.footerLeft} fixed render={() => PATIENT.fullName} />
        <Text style={portraitStyles.footerPage} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        <Text style={portraitStyles.footerRight} fixed render={() => monochrome ? '* Valores fuera de rango' : 'Valores fuera de rango en rojo'} />
      </Page>
    </Document>
  )
}

export async function generateReportBlob(options: LabReportOptions = {}): Promise<Blob> {
  const instance = pdf(<LabReportDocument {...options} />)
  return instance.toBlob()
}

// =============================================================================
// Single-parameter landscape report
// =============================================================================

const landscapeStyles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    padding: 36,
    paddingBottom: 50,
    fontFamily: 'AlbertSans',
    fontSize: 10,
    color: COLORS.ink,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.ink50,
    marginBottom: 4,
  },
  paramName: { fontSize: 22, fontWeight: 500 },
  paramUnit: { fontSize: 11, fontFamily: 'AlbertSans', color: COLORS.ink50, marginTop: 2 },
  patientLine: { fontSize: 9, fontFamily: 'AlbertSans', color: COLORS.ink70, marginTop: 6 },
  rightBlock: { alignItems: 'flex-end' },
  printMeta: { fontSize: 9, color: COLORS.ink50, fontFamily: 'AlbertSans' },
  monoInline: { fontFamily: 'AlbertSans', fontWeight: 400 },
  body: {
    flexDirection: 'row',
    gap: 20,
  },
  chartArea: {
    width: 426,
    flexShrink: 0,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: COLORS.ink12,
    borderRadius: 6,
    padding: 12,
  },
  chartTitle: { fontSize: 10, color: COLORS.ink70, fontStyle: 'italic', marginBottom: 6 },
  refText: { fontSize: 8.5, color: COLORS.ink50, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  tableArea: { width: 324, flexShrink: 0 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.ink,
    paddingBottom: 5,
    marginBottom: 3,
  },
  tableHeadCell: {
    fontSize: 8,
    letterSpacing: 0.1,
    color: COLORS.ink70,
    fontWeight: 500,
    fontFamily: 'AlbertSans',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 24,
    paddingVertical: 5,
    alignItems: 'center',
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.ink12,
  },
  tDate: { width: 54, fontSize: 8, fontFamily: 'AlbertSans', color: COLORS.ink70 },
  tLab: { flex: 1, fontSize: 8, fontFamily: 'AlbertSans', color: COLORS.ink70, paddingRight: 6 },
  tValue: {
    width: 60,
    fontSize: 8,
    fontFamily: 'AlbertSans',
    fontWeight: 400,
    textAlign: 'right',
  },
  tRef: { width: 70, fontSize: 7.5, fontFamily: 'AlbertSans', color: COLORS.ink50, textAlign: 'right' },
  footerRule: {
    position: 'absolute',
    bottom: 32,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ink30,
  },
  footerLeft: { position: 'absolute', bottom: 20, left: 36, fontSize: 7, color: COLORS.ink50, fontFamily: 'AlbertSans' },
  footerPage: { position: 'absolute', bottom: 20, left: 0, right: 0, fontSize: 7, color: COLORS.ink50, fontFamily: 'AlbertSans', textAlign: 'center' },
  footerRight: { position: 'absolute', bottom: 20, right: 36, fontSize: 7, color: COLORS.ink50, fontFamily: 'AlbertSans', textAlign: 'right' },
})

/** Line chart for the landscape single-parameter PDF.
 *
 * react-pdf's Svg element only renders SVG primitives — you cannot nest
 * react-pdf's <Text> with layout styles inside <Svg>. So we build axis labels
 * using View/Text wrappers positioned around the chart SVG:
 *
 *   [ Y-label col ]  [ chart Svg ]
 *                    [ X-label row ]
 */
function InlineChart({
  points,
  refLow,
  refHigh,
  accent,
  width,
  height,
}: {
  points: { date: string; value: number }[]
  refLow: number | null
  refHigh: number | null
  accent: string
  width: number
  height: number
}) {
  if (points.length === 0) return null

  // Layout constants
  const Y_GUTTER = 32   // width of Y-axis label column
  const X_GUTTER = 18   // height of X-axis label row
  const chartW = width - Y_GUTTER
  const chartH = height - X_GUTTER

  // Domain — include ref band in range, pad 12%
  const values = points.map((p) => p.value)
  const allYs = [...values]
  if (refLow !== null) allYs.push(refLow)
  if (refHigh !== null) allYs.push(refHigh)
  const rawMin = Math.min(...allYs)
  const rawMax = Math.max(...allYs)
  const rangePad = (rawMax - rawMin || Math.abs(rawMax) || 1) * 0.12
  const yMin = rawMin - rangePad
  const yMax = rawMax + rangePad

  const xOf = (i: number): number =>
    points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW
  const yOf = (v: number): number =>
    chartH - ((v - yMin) / (yMax - yMin)) * chartH

  // Smooth cubic bezier path
  let pathD = ''
  for (let i = 0; i < points.length; i++) {
    const x = xOf(i)
    const y = yOf(points[i].value)
    if (i === 0) {
      pathD = `M${x.toFixed(2)},${y.toFixed(2)}`
    } else {
      const px = xOf(i - 1)
      const py = yOf(points[i - 1].value)
      const cp1x = px + (x - px) / 3
      const cp2x = x - (x - px) / 3
      pathD += ` C${cp1x.toFixed(2)},${py.toFixed(2)} ${cp2x.toFixed(2)},${y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`
    }
  }

  // Reference band SVG y-coords
  const bandY1 = refLow !== null ? yOf(refLow) : null
  const bandY2 = refHigh !== null ? yOf(refHigh) : null

  // Y ticks: 5 evenly-spaced, values to 1 decimal
  const Y_TICK_COUNT = 5
  const yTicks: { y: number; label: string }[] = []
  for (let i = 0; i <= Y_TICK_COUNT; i++) {
    const v = yMin + ((yMax - yMin) * i) / Y_TICK_COUNT
    yTicks.push({ y: yOf(v), label: formatValueOneDec(v, (yMax-yMin)/Y_TICK_COUNT) })
  }

  // Evenly distributed indices include both endpoints without a near-duplicate
  // last tick. The old floor(step) sampler put the final two dates together.
  const tickCount = Math.min(points.length, Math.max(2, Math.floor(chartW / 65)))
  const xTickIdxs = Array.from({length:tickCount},(_,i)=>Math.round(i*(points.length-1)/Math.max(1,tickCount-1)))

  return (
    <View style={{ flexDirection: 'column', width, height }}>
      {/* Main row: Y-labels + SVG chart */}
      <View style={{ flexDirection: 'row', height: chartH }}>
        {/* Y-axis label column */}
        <View style={{ width: Y_GUTTER, height: chartH, position: 'relative' }}>
          {yTicks.map((t, i) => (
            <Text
              key={`yt-${i}`}
              style={{
                position: 'absolute',
                right: 4,
                top: Math.max(0, t.y - 4),
                fontSize: 6.5,
                color: COLORS.ink50,
                fontFamily: 'AlbertSans',
                textAlign: 'right',
              }}
            >
              {t.label}
            </Text>
          ))}
        </View>

        {/* Chart SVG — only SVG primitives inside */}
        <Svg width={chartW} height={chartH}>
          {/* Gridlines */}
          {yTicks.map((t, i) => (
            <Line key={`gl-${i}`} x1={0} y1={t.y} x2={chartW} y2={t.y}
              stroke={COLORS.ink12} strokeWidth={0.35} />
          ))}
          {/* Reference band */}
          {bandY1 !== null && bandY2 !== null && (
            <Rect
              x={0} y={Math.min(bandY1, bandY2)}
              width={chartW} height={Math.abs(bandY2 - bandY1)}
              fill={COLORS.ink} fillOpacity={0.06}
            />
          )}
          {/* Reference dashed lines */}
          {bandY1 !== null && (
            <Line x1={0} y1={bandY1} x2={chartW} y2={bandY1}
              stroke={COLORS.ink30} strokeWidth={0.6} strokeDasharray="3,2" />
          )}
          {bandY2 !== null && (
            <Line x1={0} y1={bandY2} x2={chartW} y2={bandY2}
              stroke={COLORS.ink30} strokeWidth={0.6} strokeDasharray="3,2" />
          )}
          {/* X baseline */}
          <Line x1={0} y1={chartH} x2={chartW} y2={chartH}
            stroke={COLORS.ink30} strokeWidth={0.6} />
          {/* Trend line */}
          {pathD && <Path d={pathD} stroke={accent} strokeWidth={2.2} fill="none" />}
          {/* Data points */}
          {points.map((pt, i) => (
            <Circle key={`pt-${i}`} cx={xOf(i)} cy={yOf(pt.value)} r={3} fill={accent} />
          ))}
        </Svg>
      </View>

      {/* X-axis label row */}
      <View style={{ flexDirection: 'row', height: X_GUTTER }}>
        {/* Spacer matching Y-gutter */}
        <View style={{ width: Y_GUTTER }} />
        {/* Labels container */}
        <View style={{ width: chartW, height: X_GUTTER, position: 'relative' }}>
          {xTickIdxs.map((i) => {
            const x = xOf(i)
            const lbl = formatShortDate(points[i].date)
            // approximate width: ~4.5px per char
            const approxW = lbl.length * 4.5
            return (
              <Text
                key={`xl-${i}`}
                style={{
                  position: 'absolute',
                  left: Math.max(0, Math.min(chartW - approxW, x - approxW / 2)),
                  top: 4,
                  fontSize: 6.5,
                  color: COLORS.ink50,
                  fontFamily: 'AlbertSans',
                }}
              >
                {lbl}
              </Text>
            )
          })}
        </View>
      </View>
    </View>
  )
}

function ParameterReportDoc({ cid }: { cid: string }) {
  const p = data.paramsById[cid]
  if (!p) throw new Error('Parámetro desconocido: ' + cid)
  const today = new Date()
  const age = ageInYears(PATIENT.dob, today)
  const series = seriesFor(cid)
  const chartPoints = series
    .filter((r) => typeof r.value_numeric === 'number' && Number.isFinite(r.value_numeric))
    .map((r) => ({ date: r.date, value: r.value_numeric as number }))

  const accent = LAB_TITLE_COLORS[p.category] || COLORS.ink
  const refLow = p.lab_ref_low ?? p.guideline_target_low ?? null
  const refHigh = p.lab_ref_high ?? p.guideline_target_high ?? null
  const refText = formatRef(refLow, refHigh, p.lab_ref_operator)

  // Explicit pages keep the chart intact and repeat the table heading. Estimate
  // wrapped row height conservatively; never let a two-column body auto-split.
  const records = series.slice().reverse()
  const groups: Result[][] = [[]]
  let used = 24
  for (const r of records) {
    const full = groups.length > 1
    const valueLines = Math.ceil(displayResultValue(r,p).length / (full ? 30 : 12))
    const labLines = Math.ceil((r.lab || '—').length / (full ? 85 : 27))
    const height = Math.max(24, Math.max(valueLines,labLines) * 11 + 10)
    if (used + height > 400 && groups[groups.length-1].length) { groups.push([]); used = 24 }
    groups[groups.length-1].push(r)
    used += height
  }
  if (groups.length > 1 && groups[groups.length-1].length < 3) {
    const previous = groups[groups.length-2], last = groups[groups.length-1]
    while(last.length < 3 && previous.length > 3)last.unshift(previous.pop()!)
  }
  return (
    <Document>
      {groups.map((rows,pageIndex) => <Page key={pageIndex} size="A4" orientation="landscape" style={landscapeStyles.page}>
        <View style={landscapeStyles.header} wrap={false}>
          <View style={{maxWidth:550}}>
            <Text style={landscapeStyles.eyebrow}>{p.category}</Text>
            <Text style={[landscapeStyles.paramName, { color: accent }]}>{p.display_name_es}</Text>
            <PdfUnit style={landscapeStyles.paramUnit} unit={p.unit_mx} fontSize={10} />
            <Text style={landscapeStyles.patientLine}>
              {PATIENT.fullName} · {formatDobSpanish(PATIENT.dob)} · {age} años · CURP: {PATIENT.curp}
            </Text>
          </View>
          <View style={landscapeStyles.rightBlock}>
            <Text style={landscapeStyles.printMeta}>{series.length} mediciones · Impreso {formatShortDate(today.toISOString())}</Text>
            {pageIndex > 0 && <Text style={landscapeStyles.printMeta}>Resultados · continuación</Text>}
          </View>
        </View>
        <View style={landscapeStyles.body} wrap={false}>
          {pageIndex === 0 && <View style={landscapeStyles.chartArea} wrap={false}>
            <Text style={landscapeStyles.chartTitle}>Evolución temporal</Text>
            {chartPoints.length ? <InlineChart points={chartPoints} refLow={refLow} refHigh={refHigh} accent={accent} width={400} height={250} />
              : <Text style={{fontSize:10,marginVertical:30}}>Sin resultados numéricos para graficar.</Text>}
            {refText !== '-' && <View style={{alignItems:'center'}}>
              <Text style={landscapeStyles.refText}>Rango de referencia:</Text>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',marginTop:2}}>
                <PdfReference fontSize={8.5} text={refText}/>
                {!!p.unit_mx && <View style={{marginLeft:4}}><PdfUnit unit={p.unit_mx} fontSize={8.5}/></View>}
              </View>
            </View>}
          </View>}
          <View style={[landscapeStyles.tableArea, pageIndex > 0 ? {width:770} : {}]}>
            <View style={landscapeStyles.tableHead} wrap={false}>
              <Text style={[landscapeStyles.tableHeadCell,{width:54}]}>Fecha</Text>
              <Text style={[landscapeStyles.tableHeadCell,{flex:1}]}>Laboratorio</Text>
              <Text style={[landscapeStyles.tableHeadCell,{width:pageIndex > 0 ? 130 : 60,textAlign:'right'}]}>Valor</Text>
              <Text style={[landscapeStyles.tableHeadCell,{width:70,textAlign:'right'}]}>Referencia</Text>
            </View>
            {!rows.length && <Text style={{fontSize:9,marginTop:12}}>Sin resultados disponibles.</Text>}
            {rows.map(r=><View key={r.result_id} style={landscapeStyles.tableRow} wrap={false}>
              <Text style={landscapeStyles.tDate}>{formatShortDate(r.date)}</Text>
              <Text style={landscapeStyles.tLab}>{r.lab || '—'}</Text>
              <Text style={[landscapeStyles.tValue,pageIndex > 0 ? {width:130} : {},isOutOfRange(r,p)?{color:COLORS.alarm}:{}]}>{displayResultValue(r,p)}</Text>
              <PdfReference style={landscapeStyles.tRef} text={formatRef(r.ref_low ?? p.lab_ref_low,r.ref_high ?? p.lab_ref_high,r.ref_operator || p.lab_ref_operator)}/>
            </View>)}
          </View>
        </View>
        <Text style={landscapeStyles.footerRule} fixed render={()=>''}/>
        <Text style={landscapeStyles.footerLeft} fixed render={()=>PATIENT.fullName}/>
        <Text style={landscapeStyles.footerPage} fixed render={({pageNumber,totalPages})=>`${pageNumber} / ${totalPages}`}/>
        <Text style={landscapeStyles.footerRight} fixed render={()=>'Valores fuera de rango en rojo'}/>
      </Page>)}
    </Document>
  )
}

export async function generateParameterReportBlob(cid:string):Promise<Blob>{
  if(!data.paramsById[cid])throw new Error('Parámetro desconocido: '+cid)
  return pdf(<ParameterReportDoc cid={cid}/>).toBlob()
}
export { isCollapsibleCategory }
