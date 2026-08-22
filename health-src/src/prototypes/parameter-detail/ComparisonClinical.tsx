import { useState } from 'react'
import { AnimatedLatest, DetailHeading, LedgerContext, MeasurementTable, MetricSelector, TrendChart, formatUnit, metricFor, referenceFor } from './shared'

export default function ComparisonClinical() {
  const [metricId, setMetricId] = useState('tsh')
  const [open, setOpen] = useState(true)
  const metric = metricFor(metricId)
  const select = (id: string) => { setMetricId(id); setOpen(true) }
  return <div className="detail-variant comparison-variant"><LedgerContext onOpen={select} />{open && <div className="comparison-layer"><button className="detail-backdrop" aria-label="Cerrar detalle" onClick={() => setOpen(false)} /><section className="comparison-modal" role="dialog" aria-modal="true" aria-label={`Detalle de ${metric.parameter.display_name_es}`}>
    <div className="comparison-head"><DetailHeading metric={metric} /><button className="close-button" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button></div>
    <MetricSelector activeId={metricId} onSelect={setMetricId} />
    <div className="comparison-grid"><div><div className="current-inline"><AnimatedLatest metric={metric} /><span>{formatUnit(metric.latest.unit || metric.parameter.unit_mx)}</span><small>Referencia {referenceFor(metric.latest, metric)}</small></div><TrendChart metric={metric} /><p className="range-caption">El área gris representa el intervalo de referencia de la medición más reciente.</p></div><MeasurementTable metric={metric} /></div>
  </section></div>}</div>
}
