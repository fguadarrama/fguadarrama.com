import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AddWeightDialog,
  AnimatedNumber,
  MetricToggle,
  WeightChart,
  useWeightSummary,
  type Metric,
} from '../prototypes/weight/shared'
import { formatWeight, formatWeightDate } from '../data/weight-data'
import { useWeightStore } from '../stores/weightStore'
import '../prototypes/weight/weight.css'
import '../styles/integrated-pages.css'

export default function Weight() {
  const records = useWeightStore((state) => state.records)
  const addRecord = useWeightStore((state) => state.addRecord)
  const { latest, change } = useWeightSummary(records)
  const [metric, setMetric] = useState<Metric>('weight')
  const [adding, setAdding] = useState(false)

  return (
    <div className="integrated-weight">
      <header className="page-heading">
        <div>
          <span className="eyebrow section-accent-weight">Seguimiento</span>
          <h1>Peso</h1>
        </div>
        <button className="outline-action" onClick={() => setAdding(true)}>Añadir medición</button>
      </header>

      <section className="weight-overview" aria-label="Resumen de peso">
        <div className="weight-overview__current">
          <span>Peso actual</span>
          <strong><AnimatedNumber value={latest.weight} /> <small>kg</small></strong>
          <p>{formatWeightDate(latest.date, true)}</p>
        </div>
        <dl className="weight-overview__facts">
          <div><dt>Cambio total</dt><dd><AnimatedNumber value={change} /> kg</dd></div>
          <div><dt>Grasa corporal</dt><dd><AnimatedNumber value={latest.bodyFat ?? 0} /> %</dd></div>
          <div><dt>Mediciones</dt><dd>{records.length}</dd></div>
        </dl>
      </section>

      <div className="weight-data-grid">
        <section className="integrated-panel weight-trend-panel">
          <header>
            <h2>Tendencia</h2>
            <MetricToggle metric={metric} onChange={setMetric} />
          </header>
          <WeightChart records={records} metric={metric} />
        </section>

        <section className="integrated-panel weight-history-panel">
          <header><h2>Mediciones</h2></header>
          <div className="integrated-table-scroll">
            <table>
              <thead><tr><th>Fecha</th><th>Peso</th><th>Grasa corporal</th></tr></thead>
              <tbody>
                {records.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.15), ease: [0.23, 1, 0.32, 1] }}
                  >
                    <td title={record.source}>{formatWeightDate(record.date)}</td>
                    <td>{formatWeight(record.weight)} kg</td>
                    <td>{record.bodyFat != null ? `${formatWeight(record.bodyFat)} %` : '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AddWeightDialog open={adding} onClose={() => setAdding(false)} onAdd={addRecord} />
    </div>
  )
}
