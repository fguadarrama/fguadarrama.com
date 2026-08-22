import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import NumberFlow, { useCanAnimate } from '@number-flow/react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ascendingWeights as ascending, descendingWeights as descending, formatWeightDate as formatDate, formatWeight, WEIGHT_RECORDS as INITIAL_WEIGHT_RECORDS, type WeightRecord } from '../../data/weight-data'
import { PATIENT, patientAge, patientDobShort } from '../../lib/patient'

export type Metric = 'weight' | 'bodyFat'

export function useWeightRecords() {
  const [records, setRecords] = useState<WeightRecord[]>(INITIAL_WEIGHT_RECORDS)
  const add = (record: Omit<WeightRecord, 'id' | 'source'>) => setRecords((current) => descending([
    ...current,
    { ...record, id: `manual-${Date.now()}`, source: 'Registro manual' },
  ]))
  return { records: descending(records), add }
}

export function AppHeader() {
  return <header className="weight-app-header"><div className="weight-brand"><span>FGC</span><strong>Historial de salud</strong></div><nav aria-label="Navegación principal"><span>Laboratorios</span><b>Peso</b></nav><div className="weight-profile"><strong>{PATIENT.fullName}</strong><small>{patientDobShort()} · {patientAge()} años</small></div></header>
}

export function MetricToggle({ metric, onChange }: { metric: Metric; onChange: (metric: Metric) => void }) {
  return <div className="weight-toggle" aria-label="Métrica de la gráfica"><button data-active={metric === 'weight' ? '' : undefined} onClick={() => onChange('weight')}>Peso</button><button data-active={metric === 'bodyFat' ? '' : undefined} onClick={() => onChange('bodyFat')}>Grasa corporal</button></div>
}

export function AnimatedNumber({ value, decimals = 1, className }: { value: number; decimals?: number; className?: string }) {
  const canAnimate = useCanAnimate()
  return <NumberFlow className={className} value={value} locales="es-MX" format={{ minimumFractionDigits: decimals, maximumFractionDigits: 2 }} animated={canAnimate} />
}

export function WeightChart({ records, metric, compact = false }: { records: WeightRecord[]; metric: Metric; compact?: boolean }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const unit = metric === 'weight' ? 'kg' : '%'
  const data = ascending(records).filter((record) => metric === 'weight' || record.bodyFat != null).map((record) => ({
    ...record,
    label: formatDate(record.date),
    value: metric === 'weight' ? record.weight : record.bodyFat,
  }))
  return <div className={compact ? 'weight-chart weight-chart--compact' : 'weight-chart'}>
    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: compact ? 210 : 330 }}>
      <LineChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: compact ? -18 : 4 }}>
        <CartesianGrid vertical={false} stroke="#2d293016" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#2d2930', fontFamily: 'Albert Sans Variable' }} tickLine={false} axisLine={false} minTickGap={22} />
        <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: '#2d2930', fontFamily: 'Albert Sans Variable' }} tickLine={false} axisLine={false} width={compact ? 34 : 42} />
        <Tooltip cursor={{ stroke: '#2d29302a' }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as WeightRecord & { value: number } | undefined
          if (!active || point?.value == null) return null
          return <div className="weight-tooltip"><span>{formatDate(point.date, true)}</span><strong>{formatWeight(point.value)} <small>{unit}</small></strong><p>{point.source}</p></div>
        }} />
        <Line type="monotone" dataKey="value" stroke="#2d694c" strokeWidth={2.4} dot={{ r: 3, fill: '#fff', stroke: '#2d694c', strokeWidth: 1.8 }} activeDot={{ r: 5 }} isAnimationActive={!reduceMotion} animationDuration={320} animationEasing="ease-out" />
      </LineChart>
    </ResponsiveContainer>
  </div>
}

export function AddWeightDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (record: Omit<WeightRecord, 'id' | 'source'>) => void }) {
  const [error, setError] = useState('')
  if (!open) return null
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const weight = Number(form.get('weight'))
    const bodyFatText = String(form.get('bodyFat') ?? '')
    const bodyFat = bodyFatText ? Number(bodyFatText) : undefined
    if (!Number.isFinite(weight) || weight <= 0 || weight > 500) { setError('Introduce un peso válido.'); return }
    if (bodyFat != null && (!Number.isFinite(bodyFat) || bodyFat <= 0 || bodyFat > 100)) { setError('Introduce un porcentaje válido.'); return }
    onAdd({ date: String(form.get('date')), time: '00:00', weight, bodyFat })
    onClose()
  }
  return <div className="weight-dialog-layer"><button className="weight-dialog-backdrop" aria-label="Cerrar" onClick={onClose} /><section className="weight-dialog" role="dialog" aria-modal="true" aria-labelledby="add-weight-title"><div className="weight-dialog-head"><div><span className="weight-eyebrow">Nueva medición</span><h2 id="add-weight-title">Registrar peso</h2></div><button className="weight-close" aria-label="Cerrar" onClick={onClose}>×</button></div><form onSubmit={submit}>
    <label>Fecha<input name="date" type="date" required defaultValue="2026-08-08" /></label>
    <label>Peso <span>kg</span><input name="weight" type="number" inputMode="decimal" min="1" max="500" step="0.01" required placeholder="72.20" /></label>
    <label>Grasa corporal <span>opcional · %</span><input name="bodyFat" type="number" inputMode="decimal" min="1" max="100" step="0.01" placeholder="23.50" /></label>
    {error && <p className="weight-form-error" role="alert">{error}</p>}
    <div className="weight-dialog-actions"><button type="button" onClick={onClose}>Cancelar</button><button className="weight-primary" type="submit">Guardar medición</button></div>
  </form></section></div>
}

export function Page({ children }: { children: ReactNode }) { return <div className="weight-page"><AppHeader />{children}</div> }

export function useWeightSummary(records: WeightRecord[]) {
  return useMemo(() => {
    const chronological = ascending(records)
    const first = chronological[0]
    const latest = chronological[chronological.length - 1]
    const peak = Math.max(...chronological.map((record) => record.weight))
    return { first, latest, peak, change: latest.weight - first.weight, fromPeak: latest.weight - peak, bodyFatChange: (latest.bodyFat ?? 0) - (first.bodyFat ?? 0) }
  }, [records])
}
