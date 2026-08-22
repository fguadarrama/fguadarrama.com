import { useState } from 'react'
import { AnimatedLatest, DetailHeading, LedgerContext, MeasurementTable, MetricSelector, TrendChart, formatDate, formatUnit, isAbnormal, metricFor, referenceFor } from './shared'
import { PATIENT } from '../../lib/patient'

export default function TrendCanvas() {
  const [metricId, setMetricId] = useState('tsh')
  const [open, setOpen] = useState(true)
  const [recentOnly, setRecentOnly] = useState(false)
  const metric = metricFor(metricId)
  const select = (id: string) => { setMetricId(id); setOpen(true) }
  if (!open) return <div className="detail-variant"><LedgerContext onOpen={select} /></div>
  return <div className="detail-variant canvas-variant"><header className="canvas-topbar"><button onClick={() => setOpen(false)}>← Volver al Ledger</button><span>{PATIENT.fullName}</span></header><main className="canvas-main">
    <div className="canvas-title"><DetailHeading metric={metric} /><MetricSelector activeId={metricId} onSelect={setMetricId} /></div>
    <section className="canvas-summary"><div><span className="detail-eyebrow">Último resultado</span><div className={`canvas-value${isAbnormal(metric.latest, metric.parameter) ? ' is-abnormal' : ''}`}><AnimatedLatest metric={metric} /><span>{formatUnit(metric.latest.unit || metric.parameter.unit_mx)}</span></div><p>{formatDate(metric.latest.date, true)}</p></div><div><span className="detail-eyebrow">Intervalo de referencia</span><strong>{referenceFor(metric.latest, metric)} {formatUnit(metric.latest.unit || metric.parameter.unit_mx)}</strong><p>{isAbnormal(metric.latest, metric.parameter) ? 'Fuera del intervalo' : 'Dentro del intervalo'}</p></div><div><span className="detail-eyebrow">Historial</span><strong>{metric.series.length} mediciones</strong><p>Desde {formatDate(metric.series[0].date, true)}</p></div></section>
    <section className="canvas-chart-card"><div className="canvas-chart-head"><div><h3>Tendencia</h3><p>Área gris: intervalo de referencia</p></div><div className="range-toggle"><button data-active={!recentOnly ? '' : undefined} onClick={() => setRecentOnly(false)}>Todo</button><button data-active={recentOnly ? '' : undefined} onClick={() => setRecentOnly(true)}>Últimas 5</button></div></div><TrendChart metric={metric} recentOnly={recentOnly} /></section>
    <section className="canvas-history"><div><span className="detail-eyebrow">Mediciones</span><h3>Historial completo</h3></div><MeasurementTable metric={metric} /></section>
  </main></div>
}
