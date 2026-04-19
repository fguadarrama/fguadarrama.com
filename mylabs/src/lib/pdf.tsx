// src/lib/pdf.tsx
// PDF report generation using @react-pdf/renderer.
// Layout per Francisco's spec: one date per section, list all parameters within.
// Tables are built with explicit column widths and word-break to prevent overlap.

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import { data, formatDateLong, formatValue, isOutOfRange, sortCategories } from './data'
import type { Parameter, Result } from './types'

// --- Register fonts from Google Fonts CDN so the PDF matches the web palette
// @react-pdf can't use CSS @font-face; it needs direct URLs.
// Using Google Fonts' CSS2 endpoint returns 404 for ttf directly, so we register
// each style with direct font-file URLs from the jsDelivr Google Fonts mirror.
Font.register({
  family: 'Ysabeau',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/ysabeau@latest/latin-400-normal.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/ysabeau@latest/latin-500-normal.ttf', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/ysabeau@latest/latin-600-normal.ttf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/ysabeau@latest/latin-400-italic.ttf', fontWeight: 400, fontStyle: 'italic' },
  ],
})
Font.register({
  family: 'SpaceGrotesk',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-400-normal.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-500-normal.ttf', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-600-normal.ttf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-700-normal.ttf', fontWeight: 700 },
  ],
})

// Defensive hyphenation: break long strings where possible
Font.registerHyphenationCallback((word) => (word.length > 24 ? [word.slice(0, 12), word.slice(12)] : [word]))

const COLORS = {
  ink: '#062540',
  ink70: '#405468',
  ink50: '#7d8a9a',
  ink30: '#b3bcc6',
  ink12: '#e1e4e9',
  ink06: '#f0f2f5',
  bg: '#f6f7fc',
  alarm: '#FF1D58',
  surface: '#ffffff',
  border: '#dde0e6',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    padding: 40,
    fontFamily: 'Ysabeau',
    fontSize: 10,
    color: COLORS.ink,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink,
    paddingBottom: 16,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.ink50,
    marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: 500 },
  subtitle: { fontSize: 10, color: COLORS.ink70, fontStyle: 'italic', marginTop: 4 },
  dateBlock: { marginBottom: 22, paddingBottom: 10 },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.ink30,
  },
  dateTitle: { fontSize: 14, fontWeight: 500 },
  dateLab: { fontSize: 9, color: COLORS.ink50, fontStyle: 'italic' },
  alarmChip: {
    backgroundColor: '#fce2ea',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    color: COLORS.alarm,
    fontWeight: 600,
  },
  okChip: {
    backgroundColor: '#e5efeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    color: '#1e8a6b',
  },
  catHeader: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.ink50,
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.ink12,
  },
  rowAbnormal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.ink12,
    backgroundColor: '#fdeef3',
    paddingHorizontal: 4,
    marginHorizontal: -4,
  },
  // Column widths sum to 100% of row width. Designed to avoid overlap.
  colName: { width: '38%', paddingRight: 6 },
  colValue: { width: '16%', paddingRight: 6, fontFamily: 'SpaceGrotesk', fontWeight: 600, textAlign: 'right' },
  colUnit: { width: '12%', paddingRight: 6, color: COLORS.ink50, fontSize: 9 },
  colRef: { width: '22%', paddingRight: 6, color: COLORS.ink50, fontSize: 9, fontFamily: 'SpaceGrotesk', textAlign: 'right' },
  colFlag: { width: '12%', textAlign: 'right', fontSize: 8 },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.ink30,
    marginBottom: 2,
  },
  tableHeadCell: {
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.ink50,
    fontWeight: 600,
  },
  nameText: { fontSize: 10 },
  paramMeta: { fontSize: 7.5, color: COLORS.ink50, marginTop: 1 },
  abnormalText: { color: COLORS.alarm, fontWeight: 600 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ink30,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: COLORS.ink50,
  },
})

function formatRef(low: number | null, high: number | null, op: string): string {
  if (op === '<=' && high !== null) return `≤ ${formatValue(high)}`
  if (op === '>=' && low !== null) return `≥ ${formatValue(low)}`
  if (low !== null && high !== null) return `${formatValue(low)} – ${formatValue(high)}`
  if (high !== null) return `≤ ${formatValue(high)}`
  if (low !== null) return `≥ ${formatValue(low)}`
  return '—'
}

function ResultRow({ r, p }: { r: Result; p: Parameter }) {
  const ab = isOutOfRange(r, p)
  return (
    <View style={ab ? styles.rowAbnormal : styles.row} wrap={false}>
      <View style={styles.colName}>
        <Text style={styles.nameText}>{p.display_name_es}</Text>
        {r.notes ? <Text style={styles.paramMeta}>{r.notes}</Text> : null}
      </View>
      <Text style={[styles.colValue, ab ? styles.abnormalText : {}]}>
        {r.value_numeric !== null ? formatValue(r.value_numeric) : r.value_text || '—'}
      </Text>
      <Text style={styles.colUnit}>{r.unit || p.unit_mx || ''}</Text>
      <Text style={styles.colRef}>{formatRef(r.ref_low ?? p.lab_ref_low, r.ref_high ?? p.lab_ref_high, r.ref_operator || p.lab_ref_operator)}</Text>
      <Text style={[styles.colFlag, ab ? styles.abnormalText : {}]}>{ab ? '⚠ fuera' : ''}</Text>
    </View>
  )
}

function TableHead() {
  return (
    <View style={styles.tableHead} fixed>
      <Text style={[styles.tableHeadCell, styles.colName]}>Parámetro</Text>
      <Text style={[styles.tableHeadCell, styles.colValue]}>Resultado</Text>
      <Text style={[styles.tableHeadCell, styles.colUnit]}>Unidad</Text>
      <Text style={[styles.tableHeadCell, styles.colRef]}>Rango</Text>
      <Text style={[styles.tableHeadCell, styles.colFlag]}>Flag</Text>
    </View>
  )
}

function DateSection({ date }: { date: string }) {
  const rows = [...(data.byDate[date] || [])]
  if (rows.length === 0) return null
  const lab = rows[0]?.lab || ''
  const abnormal = rows.filter((r) => isOutOfRange(r, data.paramsById[r.parameter_canonical])).length

  // Group rows by category; within category sort: abnormal first
  const byCat: Record<string, Result[]> = {}
  for (const r of rows) {
    const p = data.paramsById[r.parameter_canonical]
    if (!p) continue
    const cat = p.category || 'Otros'
    if (!byCat[cat]) byCat[cat] = []
    byCat[cat].push(r)
  }
  for (const c of Object.keys(byCat)) {
    byCat[c].sort((a, b) => {
      const pa = data.paramsById[a.parameter_canonical]
      const pb = data.paramsById[b.parameter_canonical]
      const oa = isOutOfRange(a, pa)
      const ob = isOutOfRange(b, pb)
      if (oa !== ob) return oa ? -1 : 1
      return (pa?.display_name_es || '').localeCompare(pb?.display_name_es || '')
    })
  }
  const orderedCats = sortCategories(Object.keys(byCat))

  return (
    <View style={styles.dateBlock} wrap>
      <View style={styles.dateHeader}>
        <View>
          <Text style={styles.dateTitle}>{formatDateLong(date)}</Text>
          <Text style={styles.dateLab}>{lab}</Text>
        </View>
        {abnormal > 0 ? (
          <Text style={styles.alarmChip}>{abnormal} FUERA DE RANGO</Text>
        ) : (
          <Text style={styles.okChip}>TODO EN RANGO</Text>
        )}
      </View>

      <TableHead />

      {orderedCats.map((cat) => (
        <View key={cat} wrap>
          <Text style={styles.catHeader}>{cat}</Text>
          {byCat[cat].map((r) => {
            const p = data.paramsById[r.parameter_canonical]
            if (!p) return null
            return <ResultRow key={r.result_id} r={r} p={p} />
          })}
        </View>
      ))}
    </View>
  )
}

export function LabReportDocument({ dates }: { dates: string[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Laboratorios · reporte personal</Text>
          <Text style={styles.title}>Resultados históricos</Text>
          <Text style={styles.subtitle}>
            {dates.length} fechas · {dates[dates.length - 1] ? formatDateLong(dates[dates.length - 1]) : ''} — {dates[0] ? formatDateLong(dates[0]) : ''}
          </Text>
        </View>

        {dates.map((d) => (
          <DateSection key={d} date={d} />
        ))}

        <View style={styles.footer} fixed>
          <Text>Francisco Ángel Guadarrama Conzuelo</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
          <Text>Generado {new Date().toLocaleDateString('es-MX')}</Text>
        </View>
      </Page>
    </Document>
  )
}

/** Generate the PDF as a Blob (works in browser). */
export async function generateReportBlob(dates: string[]): Promise<Blob> {
  const instance = pdf(<LabReportDocument dates={dates} />)
  return instance.toBlob()
}
