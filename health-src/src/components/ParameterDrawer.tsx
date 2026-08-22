// src/components/ParameterDrawer.tsx
// Modal drawer showing a parameter's trend chart + data table.
// Updated: discreet header (white with accent stripe + left border), export-PDF icon.

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { goeyToast } from 'goey-toast'
import { play } from '../lib/sounds'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
} from 'recharts'
import {
  data,
  formatDate,
  formatValue,
  displayResultValue,
  isOutOfRange,
  seriesFor,
  categorySlug,
  categoryAccentVar,
  shortDate,
  shortDate3Letter,
  formatUnit,
} from '../lib/data'
import type { Parameter } from '../lib/types'

interface Props {
  cid: string | null
  onClose: () => void
}

function formatRef(low: number | null, high: number | null, op: string): string {
  if (op === '<=' && high !== null) return `≤ ${formatValue(high)}`
  if (op === '>=' && low !== null) return `≥ ${formatValue(low)}`
  if (low !== null && high !== null) return `${formatValue(low)}–${formatValue(high)}`
  if (high !== null) return `≤ ${formatValue(high)}`
  if (low !== null) return `≥ ${formatValue(low)}`
  return '—'
}

function displayLabName(lab: string): string {
  return lab.split(' · ')[0] || '—'
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function ParameterDrawer({ cid, onClose }: Props) {
  const open = !!cid
  const p: Parameter | null = cid ? data.paramsById[cid] || null : null
  const series = useMemo(() => (cid ? seriesFor(cid) : []), [cid])
  const [exporting, setExporting] = useState(false)

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const chartData = useMemo(
    () =>
      series
        .filter((r) => r.value_numeric !== null)
        .map((r) => ({
          date: r.date,
          dateLabel: shortDate3Letter(r.date),
          value: r.value_numeric as number,
          unit: r.unit || (p?.unit_mx ?? ''),
          lab: r.lab,
          _abnormal: p ? isOutOfRange(r, p) : false,
        })),
    [series, p],
  )

  const refLow = p?.lab_ref_low ?? p?.guideline_target_low ?? null
  const refHigh = p?.lab_ref_high ?? p?.guideline_target_high ?? null
  const refOp = p?.lab_ref_operator || ''
  const refText = p ? formatRef(refLow, refHigh, refOp) : ''

  const values = chartData.map((d) => d.value)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const yLo = Math.min(min, refLow ?? min)
  const yHi = Math.max(max, refHigh ?? max)
  const range = yHi - yLo || Math.abs(yHi) || 1
  const pad = range * 0.15
  // Round to 1 decimal to avoid floating-point domain values that Recharts
  // turns into ugly tick labels like "1999995.0"
  const yDomMin = Math.floor((yLo - pad) * 10) / 10
  const yDomMax = Math.ceil((yHi + pad) * 10) / 10
  const yDomain: [number, number] = [yDomMin, yDomMax]

  const slug = p ? categorySlug(p.category) : ''
  const accentVar = p ? categoryAccentVar(p.category) : 'var(--ink)'

  async function handleExport() {
    if (!p) return
    setExporting(true)
    try {
      await goeyToast.promise(
        (async () => {
          const { generateParameterReportBlob } = await import('../lib/pdf')
          const blob = await generateParameterReportBlob(p.canonical_id)
          play('scan')
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${p.canonical_id}-${new Date().toISOString().slice(0, 10)}.pdf`
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(url), 30_000)
        })(),
        {
          loading: 'Generando PDF…',
          success: 'Descargando PDF',
          error: 'No se pudo generar el PDF',
        },
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && p && (
        <motion.div
          className="drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            className={`drawer-panel cat-${slug}`}
            initial={{ scale: 0.96, opacity: 0, borderRadius: 32 }}
            animate={{
              scale: 1,
              opacity: 1,
              borderRadius: 24,
              transition: {
                type: 'spring',
                stiffness: 260,
                damping: 24,
                mass: 0.9,
              },
            }}
            exit={{
              scale: 0.97,
              opacity: 0,
              borderRadius: 999,
              transition: { duration: 0.22, ease: [0.65, 0, 0.35, 1] },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <div className="drawer-header__eyebrow">{p.category}</div>
                <div className="drawer-header__title">{p.display_name_es}</div>
                <div className="drawer-header__unit">{formatUnit(p.unit_mx)}</div>
              </div>
              <div className="drawer-header__actions">
                <button
                  className="drawer-header__icon-btn"
                  onClick={handleExport}
                  disabled={exporting}
                  aria-label="Exportar PDF"
                  title="Exportar gráfica y tabla como PDF"
                >
                  <DownloadIcon />
                </button>
                <button className="drawer-header__close" onClick={onClose} aria-label="Cerrar">
                  ×
                </button>
              </div>
            </div>

            <div className="drawer-body">
              <div>
                <div className="drawer-chart" style={{ height: 320 }}>
                  {chartData.length === 0 ? (
                    <div className="muted" style={{ padding: 32, textAlign: 'center' }}>
                      Sin mediciones numéricas.
                    </div>
                  ) : chartData.length === 1 ? (
                    <SinglePointView point={chartData[0]} />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 20, right: 20, left: 8, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ink-12)" />
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fill: 'var(--ink-50)', fontSize: 10, fontFamily: 'var(--font-num)' }}
                          axisLine={{ stroke: 'var(--ink-30)' }}
                          tickLine={false}
                          interval={0}
                          angle={-45}
                          dy={14}
                          height={48}
                          textAnchor="end"
                        />
                        <YAxis
                          domain={yDomain}
                          tick={{ fill: 'var(--ink-50)', fontSize: 10, fontFamily: 'var(--font-num)' }}
                          tickFormatter={(v: number) => v.toFixed(1)}
                          axisLine={false}
                          tickLine={false}
                          width={44}
                        />
                        {refLow !== null && refHigh !== null && (
                          <ReferenceArea y1={refLow} y2={refHigh} fill="var(--ink)" fillOpacity={0.06} stroke="none" />
                        )}
                        {refLow !== null && <ReferenceLine y={refLow} stroke="var(--ink-30)" strokeDasharray="4 4" />}
                        {refHigh !== null && <ReferenceLine y={refHigh} stroke="var(--ink-30)" strokeDasharray="4 4" />}
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--ink-30)', strokeDasharray: '3 3' }} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={accentVar}
                          strokeWidth={2.5}
                          dot={{ fill: accentVar, r: 4, strokeWidth: 0 }}
                          activeDot={{ fill: accentVar, r: 6, strokeWidth: 0 }}
                          isAnimationActive
                          animationDuration={700}
                          animationEasing="ease-out"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {refText !== '—' && (
                  <div className="drawer-ref-text">
                    Rango de referencia para visualización: {refText} {p.unit_mx}.
                  </div>
                )}
              </div>

              <div>
                <table className="drawer-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Laboratorio</th>
                      <th className="num">Valor</th>
                      <th className="num">Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series
                      .slice()
                      .reverse()
                      .map((r) => {
                        const ab = p ? isOutOfRange(r, p) : false
                        return (
                          <tr key={r.result_id}>
                            <td className="date">{shortDate3Letter(r.date)}</td>
                            <td className="lab" title={r.lab || undefined}>{displayLabName(r.lab)}</td>
                            <td className={`num${ab ? ' is-abnormal' : ''}`}>
                              {displayResultValue(r, p)}
                            </td>
                            <td className="ref">
                              {formatRef(
                                r.ref_low ?? p.lab_ref_low,
                                r.ref_high ?? p.lab_ref_high,
                                r.ref_operator || p.lab_ref_operator,
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CustomTooltip(props: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  const { active, payload } = props
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div
      style={{
        background: 'var(--surface)',
        color: 'var(--ink)',
        padding: '10px 14px',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--ink)',
        boxShadow: 'none',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
        {p.lab || '—'}
      </div>
      <div className="num" style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-num)' }}>
        {formatValue(p.value)} <span style={{ fontSize: 12 }}>{p.unit}</span>
      </div>
      <div style={{ marginTop: 4 }}>{formatDate(p.date)}</div>
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

function SinglePointView({ point }: { point: ChartPoint }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-50)' }}>
        Única medición
      </div>
      <div
        className="num"
        style={{
          fontFamily: 'var(--font-num)',
          fontSize: 64,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: point._abnormal ? 'var(--alarm)' : 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {formatValue(point.value)}
      </div>
      <div className="muted" style={{ fontSize: 13 }}>
        {formatDate(point.date)} · {point.lab}
      </div>
    </div>
  )
}
