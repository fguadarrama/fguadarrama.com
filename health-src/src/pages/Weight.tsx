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
import { descendingWeights, formatWeight, formatWeightDate } from '../data/weight-data'
import { useWeightStore } from '../stores/weightStore'
import BodyComposition from '../components/BodyComposition'
import CompositionTimeline from '../components/CompositionTimeline'
import BigSlice from '../components/BigSlice'
import WeightHealth from '../components/WeightHealth'
import WeightReference from '../components/WeightReference'
import InBodyReadings from '../components/InBodyReadings'
import profile from '../data/body-profile.local.json'
import { ibwEstimates, weightHealth, type IbwMethod } from '../lib/weight-health'
import { massParts } from '../lib/body-composition'
import { play } from '../lib/sounds'
import '../prototypes/weight/weight.css'
import '../styles/integrated-pages.css'

export default function Weight() {
  const records = useWeightStore((state) => state.records)
  const addRecord = useWeightStore((state) => state.addRecord)
  const { latest, fromPeak } = useWeightSummary(records)
  const bmi = weightHealth(latest.weight, profile.heightCm, null, profile.sex).bmi
  const [metric, setMetric] = useState<Metric>('weight')
  const [adding, setAdding] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [ibwMethod, setIbwMethod] = useState<IbwMethod>('devine')
  const [targetBmi, setTargetBmi] = useState(22.5)
  const reference = ibwEstimates(profile.heightCm, profile.sex, targetBmi).find(m => m.id === ibwMethod)!
  const composition = descendingWeights(records.filter(r => r.composition))[0]
  async function downloadReport() {
    setExporting(true); setExportError('')
    try {
      const { generateWeightReportBlob } = await import('../lib/weight-pdf')
      const blob = await generateWeightReportBlob(records)
      const url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = `peso-composicion-${new Date(Date.now()-new Date().getTimezoneOffset()*60_000).toISOString().slice(0,10)}.pdf`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000); play('scan')
    } catch { setExportError('No se pudo generar el PDF. Inténtalo de nuevo.') }
    finally { setExporting(false) }
  }

  return (
    <div className="integrated-weight">
      <header className="page-heading">
        <div>
          <span className="eyebrow section-accent-weight">Seguimiento</span>
          <h1>Peso</h1>
        </div>
        <div className="weight-page-actions"><button className="outline-action" onClick={downloadReport} disabled={exporting}>{exporting ? 'Generando PDF…' : 'Descargar PDF'}</button><button className="outline-action" onClick={() => setAdding(true)}>Añadir medición</button></div>
      </header>
      {exportError && <p role="alert">{exportError}</p>}

      <section className="weight-overview" aria-label="Resumen de peso">
        <div className="weight-overview__current">
          <span>Peso actual</span>
          <strong><AnimatedNumber value={latest.weight} /> <small>kg</small></strong>
          <p>{formatWeightDate(latest.date, true)}</p>
        </div>
        <dl className="weight-overview__facts">
          <div><dt>Cambio desde el máximo</dt><dd><AnimatedNumber value={fromPeak} /> kg</dd></div>
          <div><dt>Grasa corporal</dt><dd>{latest.bodyFat == null ? '—' : <><AnimatedNumber value={latest.bodyFat} /> %</>}</dd></div>
          <div><dt>IMC actual</dt><dd><AnimatedNumber value={bmi} /> kg/m²</dd></div>
        </dl>
      </section>

      <div className="weight-data-grid weight-dashboard-grid">
        <section className="integrated-panel weight-trend-panel">
          <header>
            <h2>Tendencia</h2>
            <MetricToggle metric={metric} onChange={setMetric} />
          </header>
          <WeightChart records={records} metric={metric} referenceWeight={reference.value ?? undefined} referenceLabel={reference.name} />
        </section>
        {composition && <section className="integrated-panel weight-composition-panel"><header><h2>Composición actual</h2><span>{formatWeightDate(composition.date)}</span></header><div className="weight-composition-chart"><BigSlice parts={massParts(composition)} total={composition.weight} /></div></section>}
      </div>
      <WeightHealth latest={latest} />
      <WeightReference weight={latest.weight} method={ibwMethod} targetBmi={targetBmi} onMethod={setIbwMethod} onBmi={setTargetBmi} />
      <InBodyReadings records={records} />
      <CompositionTimeline records={records} />
        <section className="integrated-panel weight-history-panel">
          <header><h2>Mediciones</h2></header>
          <div className="integrated-table-scroll">
            <table>
              <thead><tr><th>Fecha</th><th>Peso</th><th>Grasa corporal</th><th>Fuente</th></tr></thead>
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
                    <td>{record.inBody ? 'InBody' : record.source.startsWith('Báscula Xiaomi') ? 'Xiaomi' : record.source}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      <BodyComposition records={records} />
      <AddWeightDialog open={adding} onClose={() => setAdding(false)} onAdd={addRecord} />
    </div>
  )
}
