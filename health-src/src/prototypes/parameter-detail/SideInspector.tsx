import { useState } from 'react'
import { AnimatedLatest, DetailHeading, LedgerContext, MeasurementTable, MetricSelector, TrendChart, formatDate, formatUnit, isAbnormal, metricFor, referenceFor } from './shared'

export default function SideInspector() {
  const [metricId, setMetricId] = useState('tsh')
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<'trend' | 'history'>('trend')
  const metric = metricFor(metricId)
  const select = (id: string) => { setMetricId(id); setTab('trend'); setOpen(true) }
  return <div className="detail-variant inspector-variant"><LedgerContext onOpen={select} />{open && <><button className="inspector-scrim" aria-label="Cerrar detalle" onClick={() => setOpen(false)} /><aside className="inspector-panel" aria-label={`Detalle de ${metric.parameter.display_name_es}`}>
    <div className="inspector-head"><DetailHeading metric={metric} /><button className="close-button" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button></div><MetricSelector activeId={metricId} onSelect={select} />
    <div className="inspector-value"><div className={isAbnormal(metric.latest, metric.parameter) ? 'is-abnormal' : ''}><AnimatedLatest metric={metric} /><span>{formatUnit(metric.latest.unit || metric.parameter.unit_mx)}</span></div><p>{formatDate(metric.latest.date, true)} · referencia {referenceFor(metric.latest, metric)}</p></div>
    <div className="inspector-tabs" role="tablist"><button role="tab" aria-selected={tab === 'trend'} onClick={() => setTab('trend')}>Tendencia</button><button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>Mediciones</button></div>
    <div className="inspector-content">{tab === 'trend' ? <><TrendChart metric={metric} compact /><div className="inspector-status"><span className={isAbnormal(metric.latest, metric.parameter) ? 'status-dot is-abnormal' : 'status-dot'} /><div><strong>{isAbnormal(metric.latest, metric.parameter) ? 'Fuera del intervalo' : 'Dentro del intervalo'}</strong><p>Área gris: referencia de la medición más reciente.</p></div></div></> : <MeasurementTable metric={metric} />}</div>
  </aside></>}</div>
}
