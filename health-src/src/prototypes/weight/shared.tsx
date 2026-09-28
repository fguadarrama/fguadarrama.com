import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import NumberFlow, { useCanAnimate } from '@number-flow/react'
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ascendingWeights as ascending, descendingWeights as descending, formatWeightDate as formatDate, formatWeight, WEIGHT_RECORDS as INITIAL_WEIGHT_RECORDS, type WeightRecord } from '../../data/weight-data'
import { PATIENT, patientAge, patientDobShort } from '../../lib/patient'
import { WEIGHT_ACCENT } from '../../lib/body-composition'
import { LEAN_ACCENT, webColor } from '../../lib/palette'
import { weightTrend } from '../../lib/weight-trend'

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
  const [chartWidth, setChartWidth] = useState(620)
  const isWeight = metric === 'weight'
  const data = weightTrend(records).filter(r => isWeight || r.bodyFat != null)
  const labelIndices = new Set(chartWidth >= 600 ? [0, Math.floor(data.length / 3), Math.floor(data.length * 2 / 3), data.length - 1] : [0, data.length - 1])
  const pink = webColor(WEIGHT_ACCENT)
  return <div className={compact ? 'weight-chart weight-chart--compact weight-breakdown' : 'weight-chart weight-breakdown'}>
    <div className="weight-breakdown__plot" role="img" aria-label={isWeight ? 'Peso total y masa libre de grasa a través del tiempo. La franja entre las líneas representa la masa grasa.' : 'Porcentaje de grasa corporal a través del tiempo'}>
    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: compact ? 190 : 310 }} onResize={width => setChartWidth(width)}>
      <ComposedChart data={data} margin={{ top: isWeight ? 42 : 16, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#2d2930" strokeWidth={.4} />
        <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={data.filter((_,i) => i === 0 || i === data.length-1 || i % Math.ceil(data.length/5) === 0).map(r => r.timestamp)} interval="preserveStartEnd" tickFormatter={(value) => { const d = new Date(value); return formatDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`) }} tick={{ fontSize: 11, fill: '#2d2930', fontFamily: 'Albert Sans Variable' }} tickLine={false} axisLine={false} minTickGap={22} />
        <YAxis tickCount={isWeight ? 8 : 5} domain={isWeight ? [(min: number) => Math.floor((min - 2) / 5) * 5, (max: number) => Math.ceil((max + 1) / 5) * 5] : ['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 12, fill: '#2d2930', fontFamily: 'Albert Sans Variable' }} tickFormatter={v => Number(v).toLocaleString('es-MX', { maximumFractionDigits: 1 })} tickLine={false} axisLine={false} width={38} />
        <Tooltip cursor={{ stroke: '#2d29302a' }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as ReturnType<typeof weightTrend>[number] | undefined
          if (!active || !point) return null
          return <div className="weight-tooltip"><span>{formatDate(point.date, true)}</span><strong>{formatWeight(point.weight)} <small>kg</small></strong>
            {point.bodyFat != null && <p>Grasa corporal: {formatWeight(point.bodyFat)} %</p>}
            {isWeight && point.lean != null && <><p>Masa libre de grasa: {formatWeight(point.lean)} kg</p><p>Masa grasa: {formatWeight(point.fat!)} kg</p><small>{point.leanCalculated ? 'Calculadas a partir del peso y el % de grasa.' : 'Masas reportadas por la báscula.'}</small></>}
          </div>
        }} />
        {isWeight && <Area type="monotoneX" dataKey="fatBand" stroke="none" fill={pink} fillOpacity={.13} isAnimationActive={false} connectNulls={false} tooltipType="none" />}
        {isWeight && <Line type="monotoneX" dataKey="lean" stroke={LEAN_ACCENT} strokeWidth={2.5} connectNulls={false} dot={({ cx, cy, payload }) => payload.lean == null ? <g /> : <rect x={(cx ?? 0)-3} y={(cy ?? 0)-3} width={6} height={6} fill={LEAN_ACCENT} />} activeDot={{ r: 4, fill: LEAN_ACCENT }} isAnimationActive={!reduceMotion} animationDuration={320} animationEasing="ease-out" />}
        <Line type="monotoneX" dataKey={isWeight ? 'weight' : 'bodyFat'} stroke={pink} strokeWidth={2.5} dot={({ cx, cy, index, payload }) => <g>
          <circle cx={cx} cy={cy} r={3.5} fill={pink} />
          {isWeight && labelIndices.has(index!) && <text x={cx} y={(cy ?? 0)-24} textAnchor={index === 0 ? 'start' : index === data.length-1 ? 'end' : 'middle'} fill="#2d2930" fontSize={12} fontFamily="Albert Sans Variable" fontWeight={450}>
            <tspan x={cx}>{formatWeight(payload.weight)} kg</tspan>
            {payload.bodyFat != null && <tspan x={cx} dy={14}>{formatWeight(payload.bodyFat)} %</tspan>}
          </text>}
        </g>} activeDot={{ r: 5, fill: pink }} isAnimationActive={!reduceMotion} animationDuration={320} animationEasing="ease-out" />
      </ComposedChart>
    </ResponsiveContainer>
    </div>
    {isWeight && <div className="weight-breakdown__legend"><span><i className="weight-key weight-key--total" />Peso total · kg</span><span><i className="weight-key weight-key--lean" />Masa libre de grasa · kg</span><span><i className="weight-key weight-key--fat" />Masa grasa · kg</span></div>}
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
    <label>Fecha<input name="date" type="date" required defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10)} /></label>
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
