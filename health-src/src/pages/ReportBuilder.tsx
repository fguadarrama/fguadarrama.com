import { useMemo, useState } from 'react'
import NumberFlow from '@number-flow/react'
import { categorySlug, data, displayResultValue, isOutOfRange, shortDate3Letter } from '../lib/data'
import type { WeightRecord } from '../data/weight-data'
import parameterLayoutJson from '../data/parameter-layout.json'
import type { Parameter } from '../lib/types'
import { useWeightStore } from '../stores/weightStore'
import { play } from '../lib/sounds'
import { PATIENT, patientDobShort } from '../lib/patient'
import '../styles/report-builder.css'
import '../styles/report-builder-selection.css'

const CATEGORY_NAMES: Record<string, string> = {
  Hematología: 'Biometría hemática', Hepática: 'Funcionamiento hepático', Química: 'Química sanguínea',
  Lípidos: 'Perfil de lípidos', Endocrinología: 'Endocrinología', Electrolitos: 'Electrolitos séricos',
  Serología: 'Serología', Orina: 'Examen general de orina', LCR: 'Líquido cefalorraquídeo',
  Infecciosos: 'Infecciosos',
}
const SUPERSCRIPTS: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }

type Period = 'latest' | 'year' | 'all'
type LayoutItem = { parameterId: string; label: string; order: number; visible: boolean }
type LayoutCategory = { category: string; categoryOrder: number; items: LayoutItem[] }
type Layout = { categories: LayoutCategory[] }

const PERIOD_NAMES: Record<Period, string> = { latest: 'Últimas 5 mediciones', year: 'Últimos 12 meses', all: 'Historial completo' }
const layout = parameterLayoutJson as Layout
const layoutCategories = [...layout.categories].sort((a, b) => a.categoryOrder - b.categoryOrder)
const categoryNames = [...layoutCategories.map((group) => group.category), ...data.categories.filter((category) => !layoutCategories.some((group) => group.category === category))]
const categoryGroups = categoryNames.map((category, categoryIndex) => {
  const group = layoutCategories.find((candidate) => candidate.category === category)
  const knownIds = new Set(group?.items.map((item) => item.parameterId) ?? [])
  const fallbackItems = data.parameters
    .filter((parameter) => parameter.category === category && !knownIds.has(parameter.canonical_id))
    .map((parameter, index) => ({ parameterId: parameter.canonical_id, label: parameter.display_name_es, order: 10000 + index, visible: false }))
  return {
    category,
    categoryOrder: group?.categoryOrder ?? 1000 + categoryIndex,
    name: CATEGORY_NAMES[category] ?? category,
    items: [...(group?.items ?? []), ...fallbackItems]
      .filter((item) => data.paramsById[item.parameterId]?.category === category)
      .sort((a, b) => a.order - b.order),
  }
}).filter((group) => group.items.length > 0)
const allParameterIds = categoryGroups.flatMap((group) => group.items.map((item) => item.parameterId))
const defaultParameterIds = categoryGroups.flatMap((group) => group.items.filter((item) => item.visible).map((item) => item.parameterId))

function formatUnit(unit: string) {
  return (unit || '').replace(/^x\s*/i, '').replace(/\^(-?\d+)/g, (_, exponent: string) => [...exponent].map((character) => SUPERSCRIPTS[character] ?? character).join(''))
}

function formatDate(date: string) {
  return shortDate3Letter(date)
}

function datesForPeriod(period: Period) {
  if (period === 'latest') return data.dates.slice(0, 5)
  if (period === 'year') {
    const threshold = new Date(`${data.dates[0]}T12:00:00`)
    threshold.setFullYear(threshold.getFullYear() - 1)
    return data.dates.filter((date) => new Date(`${date}T12:00:00`) >= threshold)
  }
  return data.dates
}

function chunkDates(dates: string[], size = 5) {
  const chunks: string[][] = []
  for (let index = 0; index < dates.length; index += size) chunks.push(dates.slice(index, index + size))
  return chunks
}

function referenceFor(parameter: Parameter) {
  const series = data.byCanonical[parameter.canonical_id] ?? []
  const latest = series[series.length - 1]
  const low = latest?.ref_low ?? parameter.lab_ref_low
  const high = latest?.ref_high ?? parameter.lab_ref_high
  const operator = latest?.ref_operator || parameter.lab_ref_operator
  if (operator === '<=' && high != null) return `≤ ${high}`
  if (operator === '>=' && low != null) return `≥ ${low}`
  if (low != null && high != null) return `${low}–${high}`
  if (high != null) return `< ${high}`
  if (low != null) return `> ${low}`
  return '·'
}

function LabTable({ parameters, dates }: { parameters: Parameter[]; dates: string[] }) {
  return <div className="rb-table-scroll"><table><colgroup><col className="rb-col-analyte" /><col className="rb-col-unit" />{dates.map((date) => <col key={date} className="rb-col-result" />)}<col className="rb-col-reference" /></colgroup><thead><tr><th>Analito</th><th>Unidad</th>{dates.map((date) => <th className="rb-date-head" key={date}>{formatDate(date)}</th>)}<th>Referencia</th></tr></thead><tbody>{parameters.map((parameter) => <tr key={parameter.canonical_id}><td title={parameter.display_name_es}>{parameter.display_name_es}</td><td title={formatUnit(parameter.unit_mx)}>{formatUnit(parameter.unit_mx)}</td>{dates.map((date) => {
    const result = (data.byCanonical[parameter.canonical_id] ?? []).find((item) => item.date === date)
    const display = result ? displayResultValue(result, parameter) : '·'
    return <td key={date} title={display} className={result && isOutOfRange(result, parameter) ? 'is-abnormal' : undefined}>{display}</td>
  })}<td title={referenceFor(parameter)}>{referenceFor(parameter)}</td></tr>)}</tbody></table></div>
}

function LabSection({ group, selected, dates, period }: { group: (typeof categoryGroups)[number]; selected: Set<string>; dates: string[]; period: Period }) {
  const parameters = group.items.filter((item) => selected.has(item.parameterId)).map((item) => data.paramsById[item.parameterId]).filter(Boolean)
  if (parameters.length === 0) return null
  const eligibleDates = period === 'latest' ? data.dates : dates
  const availableDates = eligibleDates.filter((date) => parameters.some((parameter) => (data.byCanonical[parameter.canonical_id] ?? []).some((result) => result.date === date)))
  const categoryDates = period === 'latest' ? availableDates.slice(0, 5) : availableDates
  return <>{chunkDates(categoryDates).map((dateChunk, index, allChunks) => <section key={`${group.category}-${index}`} className={`rb-lab-section cat-${categorySlug(group.category)}`}><header><h3>{group.name}</h3>{allChunks.length > 1 && <span>{index + 1} / {allChunks.length}</span>}</header><LabTable parameters={parameters} dates={dateChunk} /></section>)}</>
}

function ReportPreview({ selected, period, weightRecords }: { selected: Set<string>; period: Period; weightRecords: WeightRecord[] }) {
  const dates = datesForPeriod(period)
  const selectedParameterCount = allParameterIds.filter((id) => selected.has(id)).length
  const weights = period === 'latest' ? weightRecords.slice(0, 5) : weightRecords
  return <article className="rb-sheet"><header><div><span>Historial médico · FGC</span><h2>{PATIENT.fullName}</h2><p><b className="rb-mono">{patientDobShort()}</b> · CURP: <b className="rb-mono">{PATIENT.curp}</b></p></div><div><strong>{PERIOD_NAMES[period]}</strong><p>Impreso: <b className="rb-mono">{shortDate3Letter(new Date().toISOString())}</b></p></div></header>
    {selectedParameterCount === 0 && !selected.has('Peso') ? <div className="rb-empty">Selecciona al menos un parámetro.</div> : <div className="rb-full-content">{categoryGroups.map((group) => <LabSection key={group.category} group={group} selected={selected} dates={dates} period={period} />)}{selected.has('Peso') && <section className="rb-lab-section rb-weight-section"><header><h3>Peso y composición corporal</h3></header><div className="rb-table-scroll"><table><thead><tr><th>Fecha</th><th>Peso</th><th>Grasa corporal</th></tr></thead><tbody>{weights.map((record) => <tr key={record.id}><td>{formatDate(record.date)}</td><td>{record.weight.toFixed(1)} kg</td><td>{record.bodyFat?.toFixed(1) ?? '·'} %</td></tr>)}</tbody></table></div></section>}</div>}
    <footer>{PATIENT.fullName}</footer></article>
}

export default function ReportBuilder() {
  const weightRecords = useWeightStore((state) => state.records)
  const [selected, setSelected] = useState(() => new Set([...defaultParameterIds, 'Peso']))
  const [period, setPeriod] = useState<Period>('latest')
  const [generating, setGenerating] = useState(false)
  const selectedParameterCount = allParameterIds.filter((id) => selected.has(id)).length
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleGroup = (group: (typeof categoryGroups)[number]) => setSelected((current) => {
    const next = new Set(current)
    const everySelected = group.items.every((item) => next.has(item.parameterId))
    group.items.forEach((item) => everySelected ? next.delete(item.parameterId) : next.add(item.parameterId))
    return next
  })
  const selectedResults = useMemo(() => {
    const dates = new Set(datesForPeriod(period))
    return data.results.filter((result) => dates.has(result.date) && selected.has(result.parameter_canonical)).length
  }, [period, selected])

  const downloadPdf = async () => {
    if (generating || (selectedParameterCount === 0 && !selected.has('Peso'))) return
    setGenerating(true)
    try {
      const dates = period === 'latest' ? data.dates : datesForPeriod(period)
      const parameterIds = categoryGroups.flatMap((group) => group.items.filter((item) => selected.has(item.parameterId)).map((item) => item.parameterId))
      const reportWeights = period === 'latest' ? weightRecords.slice(0, 5) : weightRecords
      const { generateReportBlob } = await import('../lib/pdf')
      const blob = await generateReportBlob({ parameterIds, dates, periodLabel: PERIOD_NAMES[period], latestPerCategory: period === 'latest', includeWeight: selected.has('Peso'), weightRecords: reportWeights })
      play('scan')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte-salud-${new Date().toISOString().slice(0, 10)}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setGenerating(false)
    }
  }

  return <div className="rb-page"><header className="rb-title hidden-print"><div><span className="eyebrow">Crear reporte</span><h1>Compositor</h1><p>{selectedParameterCount} parámetros · {selectedResults} resultados</p></div><button className="rb-primary" disabled={generating || (selectedParameterCount === 0 && !selected.has('Peso'))} onClick={downloadPdf}>{generating ? 'Generando PDF…' : 'Descargar PDF'}</button></header><div className="rb-grid"><aside className="hidden-print"><div className="rb-section-title"><h2>Parámetros</h2><p><NumberFlow value={selectedParameterCount} /> de {allParameterIds.length}</p></div><div className="rb-select-actions"><button data-cuelume-toggle="toggle" onClick={() => setSelected(new Set([...defaultParameterIds, 'Peso']))}>Mi selección</button><button data-cuelume-toggle="toggle" onClick={() => setSelected(new Set([...allParameterIds, 'Peso']))}>Todos</button><button data-cuelume-toggle="toggle" onClick={() => setSelected(new Set())}>Ninguno</button></div><div className="rb-parameter-groups">{categoryGroups.map((group) => {
    const selectedInGroup = group.items.filter((item) => selected.has(item.parameterId)).length
    return <section key={group.category}><header><button data-cuelume-toggle="toggle" onClick={() => toggleGroup(group)} aria-label={`Seleccionar ${group.name}`}><span className={selectedInGroup === group.items.length ? 'is-full' : selectedInGroup > 0 ? 'is-partial' : ''}>{selectedInGroup === group.items.length ? '✓' : selectedInGroup > 0 ? '–' : ''}</span><strong>{group.name}</strong></button><small>{selectedInGroup}/{group.items.length}</small></header><div className="rb-checks">{group.items.map((item) => <label key={item.parameterId} data-checked={selected.has(item.parameterId) ? '' : undefined}><input type="checkbox" data-cuelume-toggle="toggle" checked={selected.has(item.parameterId)} onChange={() => toggle(item.parameterId)} /><span>✓</span><div><strong>{item.label}</strong></div></label>)}</div></section>
  })}<section className="rb-weight-choice"><label data-checked={selected.has('Peso') ? '' : undefined}><input type="checkbox" data-cuelume-toggle="toggle" checked={selected.has('Peso')} onChange={() => toggle('Peso')} /><span>✓</span><div><strong>Peso y composición corporal</strong><small>{weightRecords.length} mediciones</small></div></label></section></div><h2 className="rb-period-title">Periodo</h2><div className="rb-period-control">{(Object.keys(PERIOD_NAMES) as Period[]).map((item) => <button key={item} data-cuelume-toggle="toggle" data-active={period === item ? '' : undefined} onClick={() => setPeriod(item)}>{PERIOD_NAMES[item]}</button>)}</div></aside><section className="rb-preview"><span className="hidden-print">Vista previa</span><ReportPreview selected={selected} period={period} weightRecords={weightRecords} /></section></div></div>
}
