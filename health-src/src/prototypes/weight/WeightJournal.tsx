import { useState } from 'react'
import { AddWeightDialog, AnimatedNumber, Page, WeightChart, useWeightRecords, useWeightSummary } from './shared'
import { formatWeightDate as formatDate, formatWeight } from '../../data/weight-data'

export default function WeightJournal() {
  const { records, add } = useWeightRecords()
  const { latest, change } = useWeightSummary(records)
  const [adding, setAdding] = useState(false)
  return <Page><main className="journal-main"><aside className="journal-summary"><span className="weight-eyebrow">Peso actual</span><h1><AnimatedNumber value={latest.weight} /> <small>kg</small></h1><p>{formatDate(latest.date, true)}</p><div className="journal-mini"><WeightChart records={records} metric="weight" compact /></div><dl><div><dt>Cambio total</dt><dd><AnimatedNumber value={change} /> kg</dd></div><div><dt>Grasa actual</dt><dd><AnimatedNumber value={latest.bodyFat ?? 0} /> %</dd></div></dl><button className="weight-primary" onClick={() => setAdding(true)}>+ Nueva medición</button></aside>
    <section className="journal-feed"><header><span className="weight-eyebrow">Cronología</span><h2>Todas las mediciones</h2></header><ol>{records.map((record, index) => <li key={record.id}><span className="journal-dot" /><div className="journal-date"><strong>{formatDate(record.date, true)}</strong></div><article><div><span>Peso</span><strong>{formatWeight(record.weight)} <small>kg</small></strong></div><div><span>Grasa corporal</span><strong>{record.bodyFat != null ? formatWeight(record.bodyFat) : '—'} <small>{record.bodyFat != null ? '%' : ''}</small></strong></div><p>{record.source}{index === 0 ? ' · Último registro' : ''}</p></article></li>)}</ol></section>
  </main><AddWeightDialog open={adding} onClose={() => setAdding(false)} onAdd={add} /></Page>
}
