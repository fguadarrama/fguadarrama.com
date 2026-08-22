import { useState } from 'react'
import { AddWeightDialog, AnimatedNumber, MetricToggle, Page, WeightChart, useWeightRecords, useWeightSummary, type Metric } from './shared'
import { formatWeightDate as formatDate, formatWeight } from '../../data/weight-data'

export default function ClinicalWeight() {
  const { records, add } = useWeightRecords()
  const { latest, change } = useWeightSummary(records)
  const [metric, setMetric] = useState<Metric>('weight')
  const [adding, setAdding] = useState(false)
  return <Page><main className="clinical-main"><div className="weight-page-title"><div><span className="weight-eyebrow">Seguimiento</span><h1>Peso</h1></div><button className="weight-primary" onClick={() => setAdding(true)}>+ Añadir medición</button></div>
    <section className="clinical-card"><div className="clinical-summary"><div><span>Último registro</span><p><AnimatedNumber value={latest.weight} /> <small>kg</small></p><em>{formatDate(latest.date, true)}</em></div><div><span>Desde el primer registro</span><p className="weight-delta"><AnimatedNumber value={change} /> <small>kg</small></p><em>{records.length} mediciones</em></div><MetricToggle metric={metric} onChange={setMetric} /></div>
      <div className="clinical-grid"><div className="clinical-chart"><h2>Tendencia</h2><WeightChart records={records} metric={metric} /></div><div className="clinical-ledger"><h2>Historial</h2><div className="weight-table-wrap"><table><thead><tr><th>Fecha</th><th>Peso</th><th>Grasa corporal</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{formatDate(record.date)}</td><td>{formatWeight(record.weight)} kg</td><td>{record.bodyFat != null ? `${formatWeight(record.bodyFat)} %` : '—'}</td></tr>)}</tbody></table></div></div></div>
    </section></main><AddWeightDialog open={adding} onClose={() => setAdding(false)} onAdd={add} /></Page>
}
