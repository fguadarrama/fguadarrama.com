import NumberFlow, { useCanAnimate } from '@number-flow/react'
import clsx from 'clsx'
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import labDataJson from '../../data/lab-data.json'
import type { LabData, Parameter, Result } from '../../lib/types'
import { PATIENT, patientAge, patientDobShort } from '../../lib/patient'

const labData = labDataJson as unknown as LabData

export type Metric = { parameter: Parameter; latest: Result; series: Result[] }
export const FEATURED_IDS = ['tsh', 'trigliceridos', 'creatinina'] as const

const ACCENTS: Record<string, string> = {
  Endocrinología: '#52659a', Lípidos: '#714fac', Química: '#2d694c', Hematología: '#3f6f8f',
}
const SUPERSCRIPTS: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }

export function formatUnit(unit: string) {
  return unit.replace(/^x\s*/i, '').replace(/\^(-?\d+)/g, (_, exponent: string) => [...exponent].map((character) => SUPERSCRIPTS[character] ?? character).join(''))
}

export function formatDate(iso: string, long = false) {
  void long
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day.padStart(2, '0')} ${months[Number(month) - 1] ?? month} ${year.slice(-2)}`
}

function decimalPlaces(value: number) {
  const text = String(value)
  if (text.includes('e-')) return Math.min(3, Number(text.split('e-')[1]))
  return Math.min(3, (text.split('.')[1] ?? '').length)
}

function precisionFor(metric: Metric) {
  const counts = [0, 0, 0, 0]
  metric.series.forEach((row) => { if (row.value_numeric != null) counts[decimalPlaces(row.value_numeric)]++ })
  return counts.indexOf(Math.max(...counts))
}

function smartPrecision(value: number, metric: Metric) {
  let precision = precisionFor(metric)
  while (precision < 3) {
    const rounded = Number(value.toFixed(precision))
    const relativeError = value === 0 ? 0 : Math.abs(rounded - value) / Math.abs(value)
    if (!(value !== 0 && rounded === 0) && relativeError <= .01) break
    precision++
  }
  return precision
}

export function formatValue(value: number, metric: Metric) {
  const precision = smartPrecision(value, metric)
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value)
}

export function isAbnormal(result: Result, parameter: Parameter) {
  if (result.abnormal_flag) return true
  if (result.value_numeric == null) return false
  const low = result.ref_low ?? parameter.lab_ref_low ?? parameter.guideline_target_low
  const high = result.ref_high ?? parameter.lab_ref_high ?? parameter.guideline_target_high
  return (low != null && result.value_numeric < low) || (high != null && result.value_numeric > high)
}

export function metricFor(id: string): Metric {
  const parameter = labData.paramsById[id]
  const series = (labData.byCanonical[id] ?? [])
    .filter((row) => row.value_numeric != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  return { parameter, latest: series[series.length - 1], series }
}

export const FEATURED_METRICS = FEATURED_IDS.map(metricFor)

export function referenceFor(result: Result, metric: Metric) {
  const low = result.ref_low ?? metric.parameter.lab_ref_low ?? metric.parameter.guideline_target_low
  const high = result.ref_high ?? metric.parameter.lab_ref_high ?? metric.parameter.guideline_target_high
  const operator = result.ref_operator || metric.parameter.lab_ref_operator
  if (operator === '<=' && high != null) return `≤ ${formatValue(high, metric)}`
  if (operator === '>=' && low != null) return `≥ ${formatValue(low, metric)}`
  if (low != null && high != null) return `${formatValue(low, metric)}–${formatValue(high, metric)}`
  if (high != null) return `≤ ${formatValue(high, metric)}`
  if (low != null) return `≥ ${formatValue(low, metric)}`
  return '—'
}

export function AnimatedLatest({ metric, className }: { metric: Metric; className?: string }) {
  const canAnimate = useCanAnimate()
  const value = metric.latest.value_numeric ?? 0
  const precision = smartPrecision(value, metric)
  return <NumberFlow className={className} value={value} locales="es-MX" format={{ minimumFractionDigits: precision, maximumFractionDigits: precision }} animated={canAnimate} trend={0} />
}

export function TrendChart({ metric, compact = false, recentOnly = false }: { metric: Metric; compact?: boolean; recentOnly?: boolean }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const rows = recentOnly ? metric.series.slice(-5) : metric.series
  const data = rows.map((row) => ({
    date: formatDate(row.date),
    value: row.value_numeric,
    unit: formatUnit(row.unit || metric.parameter.unit_mx),
    lab: row.lab || 'Centro no especificado',
  })).filter((row): row is { date: string; value: number; unit: string; lab: string } => row.value != null)
  const low = metric.latest.ref_low ?? metric.parameter.lab_ref_low ?? metric.parameter.guideline_target_low
  const high = metric.latest.ref_high ?? metric.parameter.lab_ref_high ?? metric.parameter.guideline_target_high
  const values = data.map((row) => row.value)
  const bandLow = low ?? Math.min(0, ...values)
  const bandHigh = high ?? Math.max(...values)
  const accent = ACCENTS[metric.parameter.category] ?? '#2d694c'
  return (
    <div className={clsx('detail-chart', compact && 'detail-chart--compact')} aria-label={`Tendencia de ${metric.parameter.display_name_es}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: compact ? 220 : 350 }}>
        <LineChart data={data} margin={{ top: 14, right: 14, left: compact ? -22 : -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#2d293016" />
          <XAxis dataKey="date" tick={{ fontSize: compact ? 9 : 11, fill: '#2d2930', fontFamily: 'Albert Sans Variable' }} tickLine={false} axisLine={false} minTickGap={26} />
          <YAxis tick={{ fontSize: 10, fill: '#2d2930', fontFamily: 'Albert Sans Variable' }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ stroke: '#2d29302a', strokeWidth: 1 }} content={({ active, payload, label }) => {
            const point = payload?.[0]?.payload as { value: number; unit: string; lab: string } | undefined
            if (!active || !point) return null
            return <div className="chart-tooltip"><span>{label}</span><strong>{formatValue(point.value, metric)} <small>{point.unit}</small></strong><p>{point.lab}</p></div>
          }} />
          {(low != null || high != null) && <ReferenceArea y1={bandLow} y2={bandHigh} fill="#2d2930" fillOpacity={.075} stroke="#2d2930" strokeOpacity={.18} ifOverflow="extendDomain" />}
          <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2.25} dot={{ r: 2.6, fill: '#fff', stroke: accent, strokeWidth: 1.5 }} activeDot={{ r: 4 }} connectNulls isAnimationActive={!reduceMotion} animationDuration={280} animationEasing="ease-out" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MeasurementTable({ metric, limit }: { metric: Metric; limit?: number }) {
  const rows = [...metric.series].reverse().slice(0, limit)
  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead><tr><th>Fecha</th><th>Valor</th><th>Referencia</th><th>Laboratorio</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.result_id}>
          <td>{formatDate(row.date)}</td>
          <td className={clsx(isAbnormal(row, metric.parameter) && 'is-abnormal')}>{formatValue(row.value_numeric!, metric)}</td>
          <td>{referenceFor(row, metric)}</td>
          <td>{row.lab || '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  )
}

export function MetricSelector({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return <div className="metric-selector" aria-label="Elegir parámetro">{FEATURED_METRICS.map((metric) => <button key={metric.parameter.canonical_id} data-active={metric.parameter.canonical_id === activeId ? '' : undefined} onClick={() => onSelect(metric.parameter.canonical_id)}>{metric.parameter.display_name_es}</button>)}</div>
}

export function LedgerContext({ onOpen }: { onOpen: (id: string) => void }) {
  const dates = labData.dates.slice(0, 5)
  return (
    <div className="detail-ledger-context">
      <header className="context-header"><div className="context-brand"><span>FGC</span><strong>Historial de salud</strong></div><div><strong>{PATIENT.fullName}</strong><small>{patientDobShort()} · {patientAge()} años</small></div></header>
      <main><span className="detail-eyebrow">Última actualización · 6 de junio de 2026</span><h1>Laboratorios</h1>
        <section className="context-card"><div className="context-card__head"><div><h2>Parámetros seleccionados</h2><p>Haz clic en una fila para abrir el detalle</p></div></div>
          <div className="context-table-wrap"><table><thead><tr><th>Analito</th><th>Unidad</th>{dates.map((date) => <th key={date}>{formatDate(date)}</th>)}</tr></thead>
            <tbody>{FEATURED_METRICS.map((metric) => <tr key={metric.parameter.canonical_id} onClick={() => onOpen(metric.parameter.canonical_id)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(metric.parameter.canonical_id) }}><td>{metric.parameter.display_name_es}</td><td>{formatUnit(metric.parameter.unit_mx)}</td>{dates.map((date) => { const row = metric.series.find((item) => item.date === date); return <td key={date} className={clsx(row && isAbnormal(row, metric.parameter) && 'is-abnormal')}>{row?.value_numeric != null ? formatValue(row.value_numeric, metric) : '·'}</td> })}</tr>)}</tbody>
          </table></div>
        </section>
      </main>
    </div>
  )
}

export function DetailHeading({ metric }: { metric: Metric }) {
  return <div className="detail-heading"><span className="detail-eyebrow">{metric.parameter.category}</span><h2>{metric.parameter.display_name_es}</h2><p>{formatUnit(metric.latest.unit || metric.parameter.unit_mx)} · {metric.series.length} mediciones</p></div>
}
