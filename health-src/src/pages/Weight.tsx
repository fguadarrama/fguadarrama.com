import WeightEditorialDashboard from '../components/WeightEditorialDashboard'
import { FileDown, Printer, Plus } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AddWeightDialog,
  useWeightSummary,
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
import { ibwEstimates, type IbwMethod } from '../lib/weight-health'
import { massParts } from '../lib/body-composition'
import { play } from '../lib/sounds'
import '../prototypes/weight/weight.css'
import '../styles/integrated-pages.css'

export default function Weight() {
  const records = useWeightStore((state) => state.records)
  const addRecord = useWeightStore((state) => state.addRecord)
  const { latest } = useWeightSummary(records)
  const [adding, setAdding] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [ibwMethod, setIbwMethod] = useState<IbwMethod>('devine')
  const [targetBmi, setTargetBmi] = useState(22.5)
  const reference = ibwEstimates(profile.heightCm, profile.sex, targetBmi).find(m => m.id === ibwMethod)!
  const composition = descendingWeights(records.filter(r => r.composition))[0]
  async function downloadReport(monochrome = false) {
    if (exporting) return
    setExporting(true); setExportError('')
    try {
      const { generateWeightReportBlob } = await import('../lib/weight-pdf')
      const blob = await generateWeightReportBlob(records, { monochrome, heightCm: profile.heightCm, referenceWeight: reference.value ?? undefined })
      const url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = `peso-composicion-${new Date(Date.now()-new Date().getTimezoneOffset()*60_000).toISOString().slice(0,10)}${monochrome ? '-impresion' : ''}.pdf`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000); play('scan')
    } catch { setExportError('No se pudo generar el PDF. Inténtalo de nuevo.') }
    finally { setExporting(false) }
  }

  const strip=document.querySelector(".patient-strip")
  const actions=<div className="weight-page-actions"><button className="outline-action weight-icon-action" aria-label="Descargar PDF" title="Descargar PDF" onClick={() => downloadReport()} disabled={exporting}><FileDown aria-hidden="true"/><span className="weight-action-label">{exporting ? 'Generando PDF…' : 'Descargar PDF'}</span></button><button className="outline-action weight-icon-action" aria-label="Imprimir" onClick={() => downloadReport(true)} disabled={exporting} title="Generar PDF en negro sobre blanco"><Printer aria-hidden="true"/><span className="weight-action-label">Imprimir</span></button><button className="outline-action weight-icon-action" aria-label="Añadir medición" title="Añadir medición" onClick={() => setAdding(true)}><Plus aria-hidden="true"/><span className="weight-action-label">Añadir medición</span></button></div>
  return (
    <div className="integrated-weight">
      <header className="page-heading weight-chart-actions-row">
        <div className="weight-heading-accessible"><h1>Peso</h1></div>
        {strip ? createPortal(actions,strip) : actions}
      </header>
      {exportError && <p role="alert">{exportError}</p>}

      <WeightEditorialDashboard records={records} heightCm={profile.heightCm} referenceWeight={reference.value ?? undefined} referenceLabel={reference.name} />
      <div className="weight-data-grid weight-dashboard-grid weight-composition-only">
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
