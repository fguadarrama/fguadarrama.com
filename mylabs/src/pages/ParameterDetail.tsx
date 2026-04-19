import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Dot,
} from 'recharts'
import {
  data,
  formatDate,
  formatValue,
  isOutOfRange,
  seriesFor,
  latestResultFor,
} from '../lib/data'
import type { Parameter, RefSource, Result } from '../lib/types'

function effectiveRef(p: Parameter, r: Result | null, source: RefSource) {
  if (source === 'per-point' && r) {
    return { low: r.ref_low, high: r.ref_high, op: r.ref_operator, kind: 'Del laboratorio', note: r.lab }
  }
  if (source === 'guideline') {
    return {
      low: p.guideline_target_low,
      high: p.guideline_target_high,
      op: p.lab_ref_operator,
      kind: 'Meta de guía',
      note: p.guideline_source || '',
    }
  }
  // 'latest' = parameter dictionary's lab_ref (Mexican consensus)
  return {
    low: p.lab_ref_low,
    high: p.lab_ref_high,
    op: p.lab_ref_operator,
    kind: 'Rango de laboratorio',
    note: p.guideline_source || '',
  }
}

function CustomDot(props: {
  cx?: number
  cy?: number
  payload?: { _abnormal?: boolean }
}) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined) return null
  const ab = payload?._abnormal
  return (
    <g>
      <circle cx={cx} cy={cy} r={ab ? 6 : 4} fill={ab ? 'var(--alarm)' : 'var(--ink)'} />
      <circle cx={cx} cy={cy} r={ab ? 10 : 0} fill="var(--alarm)" opacity={0.18} />
    </g>
  )
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        padding: '10px 14px',
        borderRadius: 'var(--r-md)',
        boxShadow: 'var(--shadow-2)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
        {p.lab || '—'}
      </div>
      <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>
        {formatValue(p.value)} <span style={{ fontSize: 12, opacity: 0.7 }}>{p.unit}</span>
      </div>
      <div style={{ marginTop: 4, opacity: 0.75 }}>{formatDate(p.date)}</div>
    </div>
  )
}

type ChartPoint = {
  date: string
  dateLabel: string
  value: number
  unit: string
  lab: string
  _abnormal: boolean
}

export default function ParameterDetail() {
  const { cid = '' } = useParams<{ cid: string }>()
  const nav = useNavigate()
  const p = data.paramsById[cid]
  const [refSource, setRefSource] = useState<RefSource>('latest')

  if (!p) {
    return (
      <div className="card">
        <div className="card__body">
          <h2>Parámetro no encontrado</h2>
          <p className="muted">El identificador "{cid}" no existe en el diccionario.</p>
          <Link to="/" className="btn btn--ghost" style={{ marginTop: 16 }}>← Volver al dashboard</Link>
        </div>
      </div>
    )
  }

  const series = seriesFor(cid)
  const latest = latestResultFor(cid)

  const chartData: ChartPoint[] = useMemo(
    () =>
      series
        .filter((r) => r.value_numeric !== null)
        .map((r) => ({
          date: r.date,
          dateLabel: formatDate(r.date),
          value: r.value_numeric as number,
          unit: r.unit || p.unit_mx || '',
          lab: r.lab,
          _abnormal: isOutOfRange(r, p),
        })),
    [series, p],
  )

  const ref = effectiveRef(p, latest, refSource)
  const numericSeries = chartData.map((d) => d.value)
  const min = numericSeries.length ? Math.min(...numericSeries) : 0
  const max = numericSeries.length ? Math.max(...numericSeries) : 1

  // Y domain: pad by 10% on each side, include ref band
  const yLo = Math.min(min, ref.low ?? min)
  const yHi = Math.max(max, ref.high ?? max)
  const yPad = (yHi - yLo || Math.abs(yHi) || 1) * 0.12
  const yDomain: [number, number] = [yLo - yPad, yHi + yPad]

  // Trend & delta
  const first = chartData[0]?.value
  const last = chartData[chartData.length - 1]?.value
  const delta = first !== undefined && last !== undefined ? last - first : null
  const deltaPct = delta !== null && first ? (delta / first) * 100 : null

  return (
    <div className="stack-5">
      {/* Breadcrumb + title */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <button onClick={() => nav(-1)} className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
          ← Volver
        </button>
        <div className="row row--spread" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow">{p.category}</div>
            <h1 style={{ marginTop: 6 }}>{p.display_name_es}</h1>
            {p.display_name_en && (
              <div className="muted" style={{ fontStyle: 'italic', marginTop: 4 }}>
                {p.display_name_en}
              </div>
            )}
          </div>
          {latest && (
            <div style={{ textAlign: 'right' }}>
              <div className="eyebrow">último</div>
              <div
                className="num"
                style={{
                  fontSize: 40,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: isOutOfRange(latest, p) ? 'var(--alarm)' : 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {latest.value_numeric !== null ? formatValue(latest.value_numeric) : latest.value_text}
                <span className="muted" style={{ fontSize: 16, marginLeft: 6, fontWeight: 400 }}>
                  {latest.unit || p.unit_mx}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {formatDate(latest.date)} · {latest.lab}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Summary stats row */}
      {chartData.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="card"
        >
          <div className="card__body">
            <div className="grid-3">
              <SummaryStat label="mediciones" value={chartData.length.toString()} />
              <SummaryStat label="rango observado" value={`${formatValue(min)} – ${formatValue(max)}`} unit={p.unit_mx} />
              <SummaryStat
                label="cambio desde el inicio"
                value={delta === null ? '—' : `${delta > 0 ? '+' : ''}${formatValue(delta)}`}
                sub={deltaPct === null ? '' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
                accent={deltaPct !== null && Math.abs(deltaPct) >= 10}
              />
            </div>
          </div>
        </motion.section>
      )}

      {/* Chart */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="card"
      >
        <div className="card__head">
          <div>
            <div className="card__title">Evolución</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Línea suave · área sombreada = {ref.kind.toLowerCase()}
            </div>
          </div>
          <RefToggle value={refSource} onChange={setRefSource} />
        </div>
        <div className="card__body" style={{ height: 340 }}>
          {chartData.length === 0 ? (
            <div className="muted" style={{ padding: 32, textAlign: 'center' }}>
              Sin mediciones numéricas para graficar.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: 'var(--ink-50)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fill: 'var(--ink-50)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                {/* Reference band */}
                {ref.low !== null && ref.high !== null && (
                  <ReferenceArea
                    y1={ref.low}
                    y2={ref.high}
                    fill="var(--ink)"
                    fillOpacity={0.05}
                    stroke="none"
                  />
                )}
                {ref.low !== null && (
                  <ReferenceLine y={ref.low} stroke="var(--ink-30)" strokeDasharray="4 4" />
                )}
                {ref.high !== null && (
                  <ReferenceLine y={ref.high} stroke="var(--ink-30)" strokeDasharray="4 4" />
                )}
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--ink-30)', strokeDasharray: '3 3' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--ink)"
                  strokeWidth={2}
                  dot={<CustomDot />}
                  activeDot={<CustomDot />}
                  isAnimationActive
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.section>

      {/* Reference info + guideline note */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="card"
      >
        <div className="card__body">
          <div className="row row--spread" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: '1 1 300px' }}>
              <h4>{ref.kind}</h4>
              <div style={{ marginTop: 8, fontSize: 15 }}>
                {formatRef(ref.low, ref.high, ref.op)} {p.unit_mx ? <span className="muted">{p.unit_mx}</span> : null}
              </div>
              {ref.note && (
                <div className="muted" style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
                  {ref.note}
                </div>
              )}
            </div>
            {p.guideline_note && (
              <div style={{ flex: '1 1 300px' }}>
                <h4>Nota clínica</h4>
                <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>{p.guideline_note}</div>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Data table */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="card"
      >
        <div className="card__head">
          <div className="card__title">Historial</div>
          <span className="chip">{series.length} mediciones</span>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Laboratorio</th>
                <th className="num">Resultado</th>
                <th>Unidad</th>
                <th className="num">Rango</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {series
                .slice()
                .reverse()
                .map((r) => {
                  const ab = isOutOfRange(r, p)
                  return (
                    <tr key={r.result_id} className={ab ? 'is-abnormal' : ''}>
                      <td>{formatDate(r.date)}</td>
                      <td>{r.lab}</td>
                      <td className="num">
                        {r.value_numeric !== null ? formatValue(r.value_numeric) : r.value_text}
                      </td>
                      <td className="muted">{r.unit || p.unit_mx}</td>
                      <td className="num muted">{formatRef(r.ref_low, r.ref_high, r.ref_operator)}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{r.notes || ''}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string
  value: string
  unit?: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div
        className="num"
        style={{
          fontSize: 22,
          fontWeight: 500,
          marginTop: 6,
          color: accent ? 'var(--alarm)' : 'var(--ink)',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
        {unit && <span className="muted" style={{ fontSize: 12, marginLeft: 6, fontWeight: 400 }}>{unit}</span>}
      </div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function RefToggle({ value, onChange }: { value: RefSource; onChange: (v: RefSource) => void }) {
  const opts: { k: RefSource; l: string }[] = [
    { k: 'latest', l: 'Rango del laboratorio' },
    { k: 'per-point', l: 'Por visita' },
    { k: 'guideline', l: 'Meta de guía' },
  ]
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--r-pill)',
        padding: 3,
        gap: 2,
      }}
    >
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            borderRadius: 'var(--r-pill)',
            background: value === o.k ? 'var(--ink)' : 'transparent',
            color: value === o.k ? 'var(--bg)' : 'var(--ink-70)',
            transition: 'background var(--dur-sm), color var(--dur-sm)',
          }}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function formatRef(low: number | null, high: number | null, op: string): string {
  if (op === '<=' && high !== null) return `≤ ${formatValue(high)}`
  if (op === '>=' && low !== null) return `≥ ${formatValue(low)}`
  if (low !== null && high !== null) return `${formatValue(low)} – ${formatValue(high)}`
  if (high !== null) return `≤ ${formatValue(high)}`
  if (low !== null) return `≥ ${formatValue(low)}`
  return '—'
}
