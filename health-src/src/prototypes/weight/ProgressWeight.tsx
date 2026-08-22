import { useState } from 'react'
import { AddWeightDialog, AnimatedNumber, MetricToggle, Page, WeightChart, useWeightRecords, useWeightSummary, type Metric } from './shared'
import { formatWeightDate as formatDate, formatWeight } from '../../data/weight-data'

export default function ProgressWeight() {
  const { records, add } = useWeightRecords()
  const { first, latest, fromPeak, bodyFatChange } = useWeightSummary(records)
  const [metric, setMetric] = useState<Metric>('weight')
  const [adding, setAdding] = useState(false)
  return <Page><main className="progress-main"><header className="progress-hero"><div><span className="weight-eyebrow">Progreso</span><h1><AnimatedNumber value={latest.weight} /> <small>kg</small></h1><p>{formatDate(latest.date, true)}</p></div><button className="weight-primary" onClick={() => setAdding(true)}>Registrar peso</button></header>
    <section className="progress-stats"><article><span>Desde el máximo</span><strong><AnimatedNumber value={fromPeak} /> kg</strong></article><article><span>Grasa corporal</span><strong><AnimatedNumber value={latest.bodyFat ?? 0} /> %</strong></article><article><span>Cambio en grasa</span><strong><AnimatedNumber value={bodyFatChange} /> pp</strong></article></section>
    <section className="progress-chart-card"><div><div><h2>Evolución</h2><p>{formatDate(first.date, true)} — {formatDate(latest.date, true)}</p></div><MetricToggle metric={metric} onChange={setMetric} /></div><WeightChart records={records} metric={metric} /></section>
    <section className="progress-strip"><h2>Mediciones</h2><div>{records.map((record) => <article key={record.id}><span>{formatDate(record.date)}</span><strong>{formatWeight(record.weight)} kg</strong><small>{record.bodyFat != null ? `${formatWeight(record.bodyFat)} % grasa` : 'Sin grasa corporal'}</small></article>)}</div></section>
  </main><AddWeightDialog open={adding} onClose={() => setAdding(false)} onAdd={add} /></Page>
}
