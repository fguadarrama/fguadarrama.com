// src/lib/pdf.tsx
// Three PDF generators:
//   1. generateReportBlob(categories?) — full history report, last 3 measurements per param
//   2. generateParameterReportBlob(cid) — single-parameter landscape report with chart + table
//
// Fixes vs v2: uses fixed pt column widths summing correctly, reference column widened
// and right-padded to prevent "mg/dL" from clipping into the value column.

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Line, Circle, Rect, pdf } from '@react-pdf/renderer'
import albertSansRegularUrl from '@fontsource/albert-sans/files/albert-sans-latin-ext-400-normal.woff?url'
import albertSansMediumUrl from '@fontsource/albert-sans/files/albert-sans-latin-ext-500-normal.woff?url'
import albertSansSemiBoldUrl from '@fontsource/albert-sans/files/albert-sans-latin-ext-600-normal.woff?url'
import albertSansBoldUrl from '@fontsource/albert-sans/files/albert-sans-latin-ext-700-normal.woff?url'
import albertSansItalicUrl from '@fontsource/albert-sans/files/albert-sans-latin-ext-400-italic.woff?url'
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

const CAT_ACCENTS: Record<string, string> = {
  'Hematología': '#3f6f8f',
  'Hepática': '#009766',
  'Química': '#2d694c',
  'Lípidos': '#714fac',
  'Endocrinología': '#52659a',
  'Electrolitos': '#2f7c86',
  'Orina': '#69da74',
  'Serología': '#86586f',
  'Infecciosos': '#a3683a',
  'LCR': '#40302f',
}
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
function PdfUnit({ unit, style, fontSize = 8 }: { unit: string; style?: any; fontSize?: number }) {
  const parts = formatUnit(unit).split(/([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g).filter(Boolean)
  return <Text style={[style, { fontSize }]}>{parts.map((part, index) => {
    const superscript = [...part].every((character) => PLAIN_SUPERSCRIPTS[character] !== undefined)
    if (!superscript) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    const plain = [...part].map((character) => PLAIN_SUPERSCRIPTS[character]).join('')
    return <Text key={`${part}-${index}`} style={{ verticalAlign: 'super' }}>{plain}</Text>
  })}</Text>
}

const MONTHS_PDF = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatShortDate(iso: string): string {
  if (!iso || iso.length < 10) return iso || '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  const mo = MONTHS_PDF[Number(m) - 1] || m
  return `${d.padStart(2, '0')} ${mo} ${y.slice(-2)}`
}

/** Format a numeric value to exactly 1 decimal place for chart axis labels */
function formatValueOneDec(v: number): string {
  return v.toFixed(1)
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

  const accent = CAT_ACCENTS[cat] || COLORS.ink
  const heading = CAT_HEADINGS[cat] || cat
  const dateChunks = chunks(categoryDates, 5)

  return (
    <>{dateChunks.map((chunk, index) => <View key={`${cat}-${index}`} style={portraitStyles.catPanel} wrap minPresenceAhead={110}>
        <View style={[portraitStyles.catAccentBar, { backgroundColor: accent }]} />
        <View style={portraitStyles.catHeader}>
          <Text style={[portraitStyles.catTitle, { color: accent }]}>{heading}</Text>
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
    <View style={[portraitStyles.catAccentBar, { backgroundColor: '#2d694c' }]} />
    <View style={portraitStyles.catHeader}><Text style={[portraitStyles.catTitle, { color: '#2d694c' }]}>Peso y composición corporal</Text></View>
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
  parameterIds?: string[]
  dates?: string[]
  periodLabel?: string
  latestPerCategory?: boolean
  includeWeight?: boolean
  weightRecords?: WeightRecord[]
  onlyCategories?: string[]
}

export function LabReportDocument({ parameterIds, dates, periodLabel = 'Últimas 5 mediciones', latestPerCategory = false, includeWeight = false, weightRecords = [], onlyCategories }: LabReportOptions = {}) {
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
    <Document>
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
        <Text style={portraitStyles.footerRight} fixed render={() => 'Valores fuera de rango en rojo'} />
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
    flex: 1.6,
    borderWidth: 0.5,
    borderColor: COLORS.ink12,
    borderRadius: 6,
    padding: 12,
  },
  chartTitle: { fontSize: 10, color: COLORS.ink70, fontStyle: 'italic', marginBottom: 6 },
  refText: { fontSize: 8.5, color: COLORS.ink50, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  tableArea: { flex: 1 },
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
    height: 28,
    alignItems: 'center',
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.ink12,
  },
  tDate: { width: 70, fontSize: 8.5, fontFamily: 'AlbertSans', color: COLORS.ink70 },
  tLab: { flex: 1, fontSize: 9, fontFamily: 'AlbertSans', color: COLORS.ink70, paddingRight: 6 },
  tValue: {
    width: 50,
    fontSize: 10,
    fontFamily: 'AlbertSans',
    fontWeight: 400,
    textAlign: 'right',
  },
  tRef: { width: 70, fontSize: 8, fontFamily: 'AlbertSans', color: COLORS.ink50, textAlign: 'right' },
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
    yTicks.push({ y: yOf(v), label: formatValueOneDec(v) })
  }

  // X ticks: all points if ≤ 8, else sample 6
  const xTickIdxs: number[] =
    points.length <= 8
      ? points.map((_, i) => i)
      : (() => {
          const step = Math.max(1, Math.floor((points.length - 1) / 5))
          const idx: number[] = []
          for (let i = 0; i < points.length; i += step) idx.push(i)
          if (idx[idx.length - 1] !== points.length - 1) idx.push(points.length - 1)
          return idx
        })()

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
  if (!p) return null as any
  const today = new Date()
  const age = ageInYears(PATIENT.dob, today)
  const series = seriesFor(cid)
  const chartPoints = series
    .filter((r) => r.value_numeric !== null)
    .map((r) => ({ date: r.date, value: r.value_numeric as number }))

  const accent = CAT_ACCENTS[p.category] || COLORS.ink
  const refLow = p.lab_ref_low ?? p.guideline_target_low
  const refHigh = p.lab_ref_high ?? p.guideline_target_high
  const refText = formatRef(refLow, refHigh, p.lab_ref_operator)

  // Landscape page: 842 × 595 pt, with 36 padding → ~770 × 523 usable
  // Chart area: ~460 × 300
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={landscapeStyles.page}>
        <View style={landscapeStyles.header}>
          <View>
            <Text style={landscapeStyles.eyebrow}>{p.category}</Text>
            <Text style={[landscapeStyles.paramName, { color: accent }]}>{p.display_name_es}</Text>
            <PdfUnit style={landscapeStyles.paramUnit} unit={p.unit_mx} fontSize={10} />
            <Text style={landscapeStyles.patientLine}>
              {PATIENT.fullName}  ·  <Text style={landscapeStyles.monoInline}>{formatDobSpanish(PATIENT.dob)}</Text>  ·  <Text style={landscapeStyles.monoInline}>{age}</Text> años  ·  CURP: <Text style={landscapeStyles.monoInline}>{PATIENT.curp}</Text>
            </Text>
          </View>
          <View style={landscapeStyles.rightBlock}>
            <Text style={landscapeStyles.printMeta}>
              <Text style={landscapeStyles.monoInline}>{chartPoints.length}</Text> mediciones · Impreso <Text style={landscapeStyles.monoInline}>{formatShortDate(today.toISOString())}</Text>
            </Text>
          </View>
        </View>

        <View style={landscapeStyles.body}>
          <View style={landscapeStyles.chartArea}>
            <Text style={landscapeStyles.chartTitle}>Evolución temporal</Text>
            <InlineChart
              points={chartPoints}
              refLow={refLow}
              refHigh={refHigh}
              accent={accent}
              width={450}
              height={280}
            />
            {refText !== '-' && (
              <View style={{ alignItems: 'center' }}>
                <Text style={landscapeStyles.refText}>Rango de referencia:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <PdfReference fontSize={8.5} text={refText} />
                  {p.unit_mx && <PdfUnit unit={` ${p.unit_mx}`} fontSize={8.5} />}
                </View>
              </View>
            )}
          </View>

          <View style={landscapeStyles.tableArea}>
            <View style={landscapeStyles.tableHead}>
              <Text style={[landscapeStyles.tableHeadCell, { width: 70 }]}>Fecha</Text>
              <Text style={[landscapeStyles.tableHeadCell, { flex: 1 }]}>Laboratorio</Text>
              <Text style={[landscapeStyles.tableHeadCell, { width: 50, textAlign: 'right' }]}>Valor</Text>
              <Text style={[landscapeStyles.tableHeadCell, { width: 70, textAlign: 'right' }]}>Referencia</Text>
            </View>
            {series
              .slice()
              .reverse()
              .map((r) => {
                const ab = isOutOfRange(r, p)
                return (
                  <View key={r.result_id} style={landscapeStyles.tableRow} wrap={false}>
                    <Text style={landscapeStyles.tDate}>{formatShortDate(r.date)}</Text>
                    <Text style={landscapeStyles.tLab}>{r.lab || '—'}</Text>
                    <Text style={[landscapeStyles.tValue, ab ? { color: COLORS.alarm } : {}]}>
                      {displayResultValue(r, p)}
                    </Text>
                    <PdfReference style={landscapeStyles.tRef} text={formatRef(
                        r.ref_low ?? p.lab_ref_low,
                        r.ref_high ?? p.lab_ref_high,
                        r.ref_operator || p.lab_ref_operator,
                      )} />
                  </View>
                )
              })}
          </View>
        </View>

        <Text style={landscapeStyles.footerRule} fixed render={() => ''} />
        <Text style={landscapeStyles.footerLeft} fixed render={() => PATIENT.fullName} />
        <Text style={landscapeStyles.footerPage} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        <Text style={landscapeStyles.footerRight} fixed render={() => 'Valores fuera de rango en rojo'} />
      </Page>
    </Document>
  )
}

export async function generateParameterReportBlob(cid: string): Promise<Blob> {
  const instance = pdf(<ParameterReportDoc cid={cid} />)
  return instance.toBlob()
}

// Re-export noop for any legacy code
export { isCollapsibleCategory }
