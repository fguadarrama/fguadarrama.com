import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import NumberFlow, { useCanAnimate } from '@number-flow/react'
import { Dialog } from '@base-ui/react/dialog'
import clsx from 'clsx'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import labDataJson from '../data/lab-data.json'
import parameterLayoutJson from '../data/parameter-layout.json'
import type { LabData, Parameter, Result } from '../lib/types'
import { PATIENT as PRIVATE_PATIENT, patientDobShort } from '../lib/patient'

const labData = labDataJson as unknown as LabData
const latestDate = labData.dates[0]

const PATIENT = { name: PRIVATE_PATIENT.fullName, dob: patientDobShort(), curp: PRIVATE_PATIENT.curp }

const ACCENTS: Record<string, string> = {
  Hematología: '#3f6f8f',
  Química: '#2d694c',
  Hepática: '#009766',
  Lípidos: '#714fac',
  Orina: '#69da74',
  LCR: '#40302f',
  Electrolitos: '#2f7c86',
  Endocrinología: '#52659a',
  Serología: '#86586f',
}

const FEATURED_IDS = ['trigliceridos', 'tsh', 'creatinina', 'glucosa', 'hemoglobina']

type VariantName = 'Clinical Ledger' | 'Health Timeline'
type Metric = { parameter: Parameter; latest: Result; series: Result[] }

const variants: { name: VariantName; label: string; axis: string }[] = [
  { name: 'Clinical Ledger', label: 'Ledger', axis: 'comparison-first density' },
  { name: 'Health Timeline', label: 'Timeline', axis: 'chronology-first narrative' },
]

type ParameterLayout = { categories: Array<{ category: string; categoryOrder: number; items: Array<{ parameterId: string; order: number; visible: boolean }> }> }
const parameterLayout = parameterLayoutJson as ParameterLayout
const layoutCategoryNames = [...parameterLayout.categories].sort((a, b) => a.categoryOrder - b.categoryOrder).map((category) => category.category)
const CATEGORIES = [...layoutCategoryNames, ...labData.categories.filter((category) => !layoutCategoryNames.includes(category))]
const LAYOUT_ITEMS = new Map(parameterLayout.categories.flatMap((category) => category.items.map((item) => [item.parameterId, { ...item, category: category.category }] as const)))
const DEFAULT_VISIBLE_IDS = new Set([...LAYOUT_ITEMS].filter(([, item]) => item.visible).map(([id]) => id))

const SUPERSCRIPTS: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }

function formatUnit(unit: string): string {
  return unit
    .replace(/^x\s*/i, '')
    .replace(/\^(-?\d+)/g, (_, exponent: string) => [...exponent].map((character) => SUPERSCRIPTS[character] ?? character).join(''))
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
  metricsForCategory(category).forEach((metric) => metric.series.forEach((row) => {
    if (row.value_numeric != null) counts[decimalPlaces(row.value_numeric)]++
  }))
  const precision = counts.indexOf(Math.max(...counts))
  categoryPrecisionCache.set(category, precision)
  return precision
}

function smartPrecision(value: number, category: string): number {
  let precision = categoryPrecision(category)
  while (precision < 3) {
    const rounded = Number(value.toFixed(precision))
    const losesNonZero = value !== 0 && rounded === 0
    const relativeError = value === 0 ? 0 : Math.abs(rounded - value) / Math.abs(value)
    if (!losesNonZero && relativeError <= 0.01) break
    precision++
  }
  return precision
}

function formatNumeric(value: number, category: string): string {
  const precision = smartPrecision(value, category)
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value)
}

function normalizeQualitative(value: string, category: string): string {
  if (category !== 'Orina') return value
  const lower = value.trim().toLocaleLowerCase('es-MX')
  const normalized = lower === 'ambar' ? 'ámbar' : lower
  return normalized.charAt(0).toLocaleUpperCase('es-MX') + normalized.slice(1)
}

function displayValue(result: Result, parameter: Parameter): string {
  if (result.value_numeric != null) return `${result.value_operator || ''}${formatNumeric(result.value_numeric, parameter.category)}`
  return result.value_text ? normalizeQualitative(result.value_text, parameter.category) : '·'
}

function isAbnormal(result: Result, parameter: Parameter): boolean {
  if (result.abnormal_flag) return true
  if (result.value_numeric == null) return false
  const low = result.ref_low ?? parameter.lab_ref_low ?? parameter.guideline_target_low
  const high = result.ref_high ?? parameter.lab_ref_high ?? parameter.guideline_target_high
  return (low != null && result.value_numeric < low) || (high != null && result.value_numeric > high)
}

function metricFor(id: string): Metric | null {
  const lcrRows = labData.lcrResults.filter((row) => row.parameter_canonical === id)
  const firstLcrRow = lcrRows[0]
  const parameter = labData.paramsById[id] ?? (firstLcrRow ? {
    canonical_id: id,
    display_name_es: firstLcrRow.parameter_raw,
    display_name_en: '',
    category: 'LCR',
    unit_mx: firstLcrRow.unit,
    aliases: '',
    lab_ref_low: firstLcrRow.ref_low,
    lab_ref_high: firstLcrRow.ref_high,
    lab_ref_operator: firstLcrRow.ref_operator,
    guideline_target_low: null,
    guideline_target_high: null,
    guideline_note: '',
    guideline_source: '',
    plottable: firstLcrRow.value_numeric != null,
    notes: firstLcrRow.notes,
  } satisfies Parameter : null)
  const series = (labData.byCanonical[id] ?? lcrRows)
    .filter((row) => row.value_numeric != null || row.value_text != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  const latest = series[series.length - 1]
  return parameter && latest ? { parameter, latest, series } : null
}

function metricsForCategory(category: string): Metric[] {
  const ids = category === 'LCR'
    ? [...new Set(labData.lcrResults.map((row) => row.parameter_canonical))]
    : labData.parameters.filter((parameter) => parameter.category === category).map((parameter) => parameter.canonical_id)
  return ids
    .map((id) => metricFor(id))
    .filter((metric): metric is Metric => metric !== null)
    .sort((a, b) => (LAYOUT_ITEMS.get(a.parameter.canonical_id)?.order ?? a.parameter.sort_weight ?? 100) - (LAYOUT_ITEMS.get(b.parameter.canonical_id)?.order ?? b.parameter.sort_weight ?? 100)
      || a.parameter.display_name_es.localeCompare(b.parameter.display_name_es))
}

function datesForCategory(category: string): string[] {
  const dates = new Set<string>()
  metricsForCategory(category).forEach((metric) => metric.series.forEach((row) => dates.add(row.date)))
  return [...dates].sort().reverse()
}

function referenceFor(result: Result, parameter: Parameter): string {
  const low = result.ref_low ?? parameter.lab_ref_low ?? parameter.guideline_target_low
  const high = result.ref_high ?? parameter.lab_ref_high ?? parameter.guideline_target_high
  const operator = result.ref_operator || parameter.lab_ref_operator
  if (operator === '<=' && high != null) return `≤ ${formatNumeric(high, parameter.category)}`
  if (operator === '>=' && low != null) return `≥ ${formatNumeric(low, parameter.category)}`
  if (low != null && high != null) return `${formatNumeric(low, parameter.category)}–${formatNumeric(high, parameter.category)}`
  if (high != null) return `≤ ${formatNumeric(high, parameter.category)}`
  if (low != null) return `≥ ${formatNumeric(low, parameter.category)}`
  return '—'
}

const featured = FEATURED_IDS.map(metricFor).filter((metric): metric is Metric => metric !== null)

function formatDate(iso: string, long = false): string {
  void long
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day.padStart(2, '0')} ${months[Number(month) - 1] ?? month} ${year.slice(-2)}`
}

function decimals(value: number): number {
  if (Number.isInteger(value)) return 0
  return Math.abs(value) < 10 ? 2 : 1
}

function AnimatedValue({ value, className }: { value: number; className?: string }) {
  const canAnimate = useCanAnimate()
  return (
    <NumberFlow
      className={clsx('number-flow', className)}
      value={value}
      locales="es-MX"
      format={{ maximumFractionDigits: decimals(value) }}
      animated={canAnimate}
      trend={0}
    />
  )
}

function Header({ compact = false }: { compact?: boolean }) {
  return (
    <header className={clsx('proto-header', compact && 'proto-header--compact')}>
      <div className="proto-brand">
        <span className="proto-brand__mark">FGC</span>
        <span>Historial de salud</span>
      </div>
      <nav className="proto-nav" aria-label="Secciones principales">
        <button data-active>Resumen</button>
        <button>Laboratorios</button>
        <button>Peso</button>
        <button>Reportes</button>
      </nav>
      <div className="proto-profile">
        <strong>{PATIENT.name}</strong>
        <span>{PATIENT.dob} · 33 años · CURP {PATIENT.curp}</span>
      </div>
    </header>
  )
}

function AnimatedTrend({ metric, compact = false }: { metric: Metric; compact?: boolean }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const chartData = metric.series.map((row) => ({
    date: formatDate(row.date),
    value: row.value_numeric,
  })).filter((row) => row.value != null)
  const accent = ACCENTS[metric.parameter.category] ?? '#2d694c'
  const latest = metric.latest
  const referenceLow = latest.ref_low ?? metric.parameter.lab_ref_low ?? metric.parameter.guideline_target_low
  const referenceHigh = latest.ref_high ?? metric.parameter.lab_ref_high ?? metric.parameter.guideline_target_high
  const plottedValues = chartData.map((row) => row.value).filter((value): value is number => value != null)
  const referenceBandLow = referenceLow ?? Math.min(0, ...plottedValues)
  const referenceBandHigh = referenceHigh ?? Math.max(...plottedValues)
  if (chartData.length < 2) {
    return <div className="qualitative-chart"><strong>Resultado cualitativo</strong><span>Este parámetro no tiene suficientes valores numéricos para mostrar una tendencia.</span></div>
  }
  return (
    <div className={clsx('trend-chart', compact && 'trend-chart--compact')} aria-label={`Tendencia de ${metric.parameter.display_name_es}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: compact ? 120 : 245 }}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: compact ? -26 : -10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#2d293016" />
          <XAxis dataKey="date" tick={{ fontSize: compact ? 9 : 11, fill: '#2d293088' }} tickLine={false} axisLine={false} minTickGap={28} />
          {!compact && <YAxis tick={{ fontSize: 10, fill: '#2d293077' }} tickLine={false} axisLine={false} />}
          <Tooltip contentStyle={{ border: '1px solid #2d293024', borderRadius: 10, color: '#2d2930', fontFamily: 'Albert Sans Variable, Arial, sans-serif', fontSize: 13 }} />
          {(referenceLow != null || referenceHigh != null) && (
            <ReferenceArea
              y1={referenceBandLow}
              y2={referenceBandHigh}
              fill="#2d2930"
              fillOpacity={0.075}
              stroke="#2d2930"
              strokeOpacity={0.18}
              ifOverflow="extendDomain"
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={accent}
            strokeWidth={2.25}
            dot={{ r: 2.5, fill: '#f6f7fc', stroke: accent, strokeWidth: 1.5 }}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={!reduceMotion}
            animationDuration={280}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricDialog({ metric, onClose }: { metric: Metric | null; onClose: () => void }) {
  const numericMeasurements = metric?.series.filter((row) => row.value_numeric != null).length ?? 0
  return (
    <Dialog.Root open={metric !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="metric-dialog__backdrop" />
        <Dialog.Viewport className="metric-dialog__viewport">
          <Dialog.Popup className="metric-dialog">
            {metric && (
              <>
                <div className="metric-dialog__head">
                  <div>
                    <span className="eyebrow">{metric.parameter.category}</span>
                    <Dialog.Title>{metric.parameter.display_name_es}</Dialog.Title>
                    <Dialog.Description>{metric.latest.unit || metric.parameter.unit_mx ? `${formatUnit(metric.latest.unit || metric.parameter.unit_mx)} · ` : ''}{metric.series.length} {metric.series.length === 1 ? 'medición' : 'mediciones'}</Dialog.Description>
                  </div>
                  <Dialog.Close className="icon-button" aria-label="Cerrar">×</Dialog.Close>
                </div>
                <div className="metric-dialog__content">
                  <div className="metric-dialog__chart">
                    <AnimatedTrend metric={metric} />
                    {numericMeasurements >= 2 && <p className="reference-caption">Intervalo mostrado: {referenceFor(metric.latest, metric.parameter)} {formatUnit(metric.latest.unit || metric.parameter.unit_mx)}</p>}
                  </div>
                  <div className="measurement-table-wrap">
                    <table className="measurement-table">
                      <thead><tr><th>Fecha</th><th>Valor</th><th>Referencia</th></tr></thead>
                      <tbody>
                        {[...metric.series].reverse().map((row) => {
                          const rowAbnormal = isAbnormal(row, metric.parameter)
                          return (
                            <tr key={row.result_id}>
                              <td>{formatDate(row.date)}</td>
                              <td className={clsx(rowAbnormal && 'is-abnormal')}>{displayValue(row, metric.parameter)}</td>
                              <td>{referenceFor(row, metric.parameter)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function MetricPickerDialog({
  open,
  onClose,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  open: boolean
  onClose: () => void
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="metric-dialog__backdrop" />
        <Dialog.Viewport className="metric-dialog__viewport">
          <Dialog.Popup className="picker-dialog">
            <div className="metric-dialog__head">
              <div>
                <span className="eyebrow">Vista inicial</span>
                <Dialog.Title>Analitos visibles</Dialog.Title>
                <Dialog.Description>Marca los que quieres ver por defecto. Los demás siguen disponibles en “Mostrar restantes”.</Dialog.Description>
              </div>
              <Dialog.Close className="icon-button" aria-label="Cerrar">×</Dialog.Close>
            </div>
            <div className="picker-dialog__actions">
              <button onClick={onSelectAll}>Seleccionar todos</button>
              <button onClick={onClear}>Limpiar selección</button>
            </div>
            <div className="picker-groups">
              {CATEGORIES.map((category) => {
                const metrics = metricsForCategory(category)
                if (metrics.length === 0) return null
                return (
                  <fieldset className="picker-group" key={category}>
                    <legend style={{ color: ACCENTS[category] ?? '#2d694c' }}>{category}</legend>
                    <div>
                      {metrics.map((metric) => (
                        <label key={metric.parameter.canonical_id}>
                          <input type="checkbox" checked={selected.has(metric.parameter.canonical_id)} onChange={() => onToggle(metric.parameter.canonical_id)} />
                          <span>{metric.parameter.display_name_es}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )
              })}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ClinicalLedger({ onMetric }: { onMetric: (metric: Metric) => void }) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [revealedRows, setRevealedRows] = useState<Record<string, boolean>>({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(DEFAULT_VISIBLE_IDS)
  })
  const categories = CATEGORIES
    .filter((category) => metricsForCategory(category).length > 0)
  const allMetricIds = categories.flatMap((category) => metricsForCategory(category).map((metric) => metric.parameter.canonical_id))
  return (
    <div className="variant variant-ledger">
      <Header compact />
      <main className="ledger-page">
        <section className="ledger-overview">
          <div>
            <span className="eyebrow">Última actualización · {formatDate(latestDate, true)}</span>
            <h1>Laboratorios</h1>
          </div>
          <button className="choose-metrics" onClick={() => setPickerOpen(true)}>Elegir analitos</button>
        </section>

        <div className="category-ledger-stack">
          {categories.map((category) => {
            const metrics = metricsForCategory(category)
            const visibleByDefault = metrics.filter((metric) => selectedIds.has(metric.parameter.canonical_id))
            const showEveryRow = Boolean(revealedRows[category])
            const visibleMetrics = showEveryRow ? metrics : visibleByDefault
            const hiddenCount = metrics.length - visibleByDefault.length
            const allDates = datesForCategory(category)
            const showAll = Boolean(expandedCategories[category])
            const visibleDates = showAll ? allDates : allDates.slice(0, 5)
            const isCollapsible = category === 'Orina' || category === 'LCR'
            const sectionOpen = !isCollapsible || Boolean(expandedSections[category])
            return (
              <section className="category-ledger" key={category} style={{ '--category-accent': ACCENTS[category] ?? '#2d694c' } as CSSProperties}>
                <header className="category-ledger__head">
                  <div><h2>{category}</h2></div>
                  <div className="category-controls">
                    {isCollapsible && <button onClick={() => setExpandedSections((state) => ({ ...state, [category]: !sectionOpen }))}>{sectionOpen ? 'Contraer' : 'Mostrar sección'}</button>}
                    {sectionOpen && hiddenCount > 0 && <button onClick={() => setRevealedRows((state) => ({ ...state, [category]: !showEveryRow }))}>{showEveryRow ? 'Mostrar selección' : `Mostrar ${hiddenCount} restantes`}</button>}
                    {sectionOpen && allDates.length > 5 && <button onClick={() => setExpandedCategories((state) => ({ ...state, [category]: !showAll }))}>{showAll ? 'Mostrar últimas 5' : 'Ver todas las fechas →'}</button>}
                  </div>
                </header>
                {sectionOpen && <div className="ledger-table-wrap">
                  <table className="ledger-table">
                    <thead><tr><th>Analito</th><th>Unidad</th>{visibleDates.map((date) => <th key={date}>{formatDate(date)}</th>)}</tr></thead>
                    <tbody>
                      {visibleMetrics.map((metric) => (
                        <tr key={metric.parameter.canonical_id} onClick={() => onMetric(metric)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onMetric(metric) } }}>
                          <td>{metric.parameter.display_name_es}</td>
                          <td>{formatUnit(metric.parameter.unit_mx || metric.latest.unit)}</td>
                          {visibleDates.map((date) => {
                            const result = metric.series.find((row) => row.date === date)
                            const bad = result ? isAbnormal(result, metric.parameter) : false
                            return <td key={date} className={clsx(bad && 'is-abnormal', !result && 'is-empty')}>{result ? displayValue(result, metric.parameter) : '·'}{bad && <span className="visually-hidden"> fuera de rango</span>}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
              </section>
            )
          })}
        </div>
      </main>
      <MetricPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={selectedIds}
        onToggle={(id) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })}
        onSelectAll={() => setSelectedIds(new Set(allMetricIds))}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  )
}

function HealthTimeline({ onMetric }: { onMetric: (metric: Metric) => void }) {
  const [filter, setFilter] = useState<'Todo' | 'Laboratorios' | 'Peso'>('Todo')
  const dates = labData.dates.slice(0, 4)
  const showLabs = filter === 'Todo' || filter === 'Laboratorios'
  return (
    <div className="variant variant-timeline">
      <Header compact />
      <main className="timeline-main">
        <div className="timeline-title"><span className="eyebrow">Historial</span><h1>Cronología</h1></div>
        <div className="timeline-toolbar">{(['Todo', 'Laboratorios', 'Peso'] as const).map((option) => <button key={option} data-active={filter === option ? '' : undefined} onClick={() => setFilter(option)}>{option}</button>)}</div>
        <section className="timeline">
          {showLabs && dates.map((date, index) => {
            const rows = labData.byDate[date] ?? []
            const abnormalRows = rows.filter((row) => isAbnormal(row, labData.paramsById[row.parameter_canonical]))
            const highlights = featured.map((metric) => metric.series.find((row) => row.date === date)).filter((row): row is Result => Boolean(row)).slice(0, 3)
            return (
              <article className="timeline-event" key={date}>
                <div className="timeline-date"><strong>{formatDate(date)}</strong></div>
                <div className="timeline-marker"><i /></div>
                <div className="timeline-card">
                  <div className="timeline-card__head"><div><span className="eyebrow">Laboratorio</span><h2>{index === 0 ? 'Resultados recientes' : 'Resultados'}</h2></div><span className={clsx('event-status', abnormalRows.length && 'is-abnormal')}><AnimatedValue value={abnormalRows.length} /> fuera de rango</span></div>
                  <div className="timeline-metrics">
                    {highlights.map((row) => { const metric = metricFor(row.parameter_canonical)!; return <button key={row.result_id} onClick={() => onMetric(metric)}><span>{metric.parameter.display_name_es}</span><strong className={clsx(isAbnormal(row, metric.parameter) && 'is-abnormal')}>{displayValue(row, metric.parameter)} <small>{formatUnit(row.unit)}</small></strong></button> })}
                  </div>
                  <div className="timeline-card__foot"><span>{rows.length} resultados en {new Set(rows.map((row) => labData.paramsById[row.parameter_canonical]?.category)).size} secciones</span></div>
                </div>
              </article>
            )
          })}
          {!showLabs && <article className="timeline-event timeline-event--empty">
            <div className="timeline-date"><strong>—</strong><span>{filter}</span></div><div className="timeline-marker"><i /></div>
            <div className="timeline-card"><h2>Sin registros</h2></div>
          </article>}
        </section>
      </main>
    </div>
  )
}

function Picker({ current, setCurrent, replay }: { current: number; setCurrent: (index: number) => void; replay: () => void }) {
  const pickerRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const highlightRef = useRef<HTMLSpanElement>(null)

  const moveHighlight = useCallback(() => {
    const item = itemRefs.current[current]
    const highlight = highlightRef.current
    if (!item || !highlight) return
    highlight.style.width = `${item.offsetWidth}px`
    highlight.style.transform = `translateX(${item.offsetLeft}px)`
  }, [current])

  useLayoutEffect(moveHighlight, [moveHighlight])
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => pickerRef.current?.setAttribute('data-ready', '')))
    window.addEventListener('resize', moveHighlight)
    return () => window.removeEventListener('resize', moveHighlight)
  }, [moveHighlight])

  return (
    <nav className="proto-picker" aria-label="Prototype variants" ref={pickerRef}>
      <span className="proto-picker-highlight" aria-hidden="true" ref={highlightRef} />
      {variants.map((variant, index) => <button key={variant.name} ref={(element) => { itemRefs.current[index] = element }} className="proto-picker-item" data-active={index === current ? '' : undefined} aria-current={index === current ? 'true' : undefined} onClick={() => setCurrent(index)}>{variant.label}</button>)}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={replay}>↻</button>
    </nav>
  )
}

export default function HealthOverviewPrototype() {
  const initial = Math.min(Math.max(Number(new URLSearchParams(location.search).get('v') ?? 1) - 1, 0), variants.length - 1)
  const [current, setCurrentState] = useState(initial)
  const [replayKey, setReplayKey] = useState(0)
  const [metric, setMetric] = useState<Metric | null>(null)

  const setCurrent = useCallback((index: number) => {
    if (index < 0 || index >= variants.length) return
    setCurrentState(index)
    setMetric(null)
    setReplayKey((key) => key + 1)
    const url = new URL(location.href)
    url.searchParams.set('v', String(index + 1))
    history.replaceState(null, '', url)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const number = Number.parseInt(event.key, 10)
      if (number >= 1 && number <= variants.length) setCurrent(number - 1)
      else if (event.key === 'ArrowRight') setCurrent((current + 1) % variants.length)
      else if (event.key === 'ArrowLeft') setCurrent((current - 1 + variants.length) % variants.length)
      else if (event.key.toLowerCase() === 'r') setReplayKey((key) => key + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, setCurrent])

  const surface = useMemo(() => {
    if (current === 0) return <ClinicalLedger onMetric={setMetric} />
    return <HealthTimeline onMetric={setMetric} />
  }, [current, replayKey])

  return (
    <>
      <div id="stage" key={`${current}-${replayKey}`}>{surface}</div>
      <MetricDialog metric={metric} onClose={() => setMetric(null)} />
      <Picker current={current} setCurrent={setCurrent} replay={() => setReplayKey((key) => key + 1)} />
    </>
  )
}
