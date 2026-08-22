// src/components/ElectrophoresisChart.tsx
// Lipoprotein electrophoresis visualization using proper SVG coordinates.
// The migration strip runs left(−, origin) to right(+, albumin→α1→α2→β→γ).
// Patient fraction values drive peak heights on the curve and colored band widths.

import { useMemo } from 'react'
import { seriesFor, formatDate, formatValue } from '../lib/data'

const W = 700   // SVG logical width
const H = 160   // SVG logical height
const PAD_L = 0
const PAD_T = 10
const BASELINE_Y = H - 20  // y position of the x-axis

// Fraction definitions — x position on the strip (0=origin, 1=rightmost)
// Based on standard lipoprotein electrophoresis migration order
const FRACTIONS = [
  { canonical: 'quilomicrones',          label: 'Quilomicrones', sub: 'Origen',   x: 0.06, color: '#0eb8d9', refLow: null, refHigh: 0 },
  { canonical: 'electroforesis_prebeta', label: 'Pre-β',         sub: 'VLDL',    x: 0.36, color: '#062540', refLow: 2.0,  refHigh: 31.2 },
  { canonical: 'electroforesis_beta',    label: 'Beta (β)',      sub: 'LDL',     x: 0.52, color: '#25d266', refLow: 42.3, refHigh: 69.5 },
  { canonical: 'electroforesis_alfa',    label: 'Alfa (α)',      sub: 'HDL',     x: 0.72, color: '#e84ab7', refLow: 15.1, refHigh: 39.9 },
]

// Fixed albumin peak (always large, no patient value)
const ALBUMIN_X = 0.20
const ALBUMIN_HEIGHT_PCT = 0.80  // 80% of chart height

function getResult(canonical: string) {
  const s = seriesFor(canonical).filter(r => r.value_numeric !== null)
  if (!s.length) return null
  const last = s[s.length - 1]
  return { value: last.value_numeric as number, date: last.date, lab: last.lab }
}

function isAbnormal(fraction: typeof FRACTIONS[0], value: number): boolean {
  if (fraction.refHigh !== null && value > fraction.refHigh) return true
  if (fraction.refLow !== null && value < fraction.refLow) return true
  return false
}

export default function ElectrophoresisChart() {
  const results = useMemo(() => {
    const map: Record<string, { value: number; date: string; lab: string } | null> = {}
    for (const f of FRACTIONS) map[f.canonical] = getResult(f.canonical)
    return map
  }, [])

  const hasData = FRACTIONS.some(f => results[f.canonical] !== null)
  if (!hasData) return null

  const measureDate = Object.values(results).find(Boolean)?.date || ''
  const measureLab = Object.values(results).find(Boolean)?.lab || ''

  // Compute peak heights — value% maps to a height in the chart
  // Max visible height = BASELINE_Y - PAD_T - 10
  const maxH = BASELINE_Y - PAD_T - 10
  const peakH = (pct: number) => Math.max(4, (pct / 100) * maxH)

  // Build wave control points:
  // key peaks at each fraction position, with albumin as a fixed tall peak
  const fractionPeaks: Record<string, number> = {}
  for (const f of FRACTIONS) {
    const r = results[f.canonical]
    fractionPeaks[f.canonical] = r ? peakH(r.value) : 0
  }
  const albuminPeak = ALBUMIN_HEIGHT_PCT * maxH

  // Control points along the x-axis for the wave [x, y]
  // x is 0..W, y is SVG coordinate (BASELINE_Y - height)
  const pts: [number, number][] = [
    [PAD_L,        BASELINE_Y],
    [0.03 * W,     BASELINE_Y - fractionPeaks['quilomicrones'] * 0.5],
    [0.06 * W,     BASELINE_Y - fractionPeaks['quilomicrones']],
    [0.10 * W,     BASELINE_Y - 2],
    [0.15 * W,     BASELINE_Y - albuminPeak * 0.4],
    [ALBUMIN_X*W,  BASELINE_Y - albuminPeak],
    [0.28 * W,     BASELINE_Y - 4],
    [0.33 * W,     BASELINE_Y - fractionPeaks['electroforesis_prebeta'] * 0.3],
    [0.36 * W,     BASELINE_Y - fractionPeaks['electroforesis_prebeta']],
    [0.44 * W,     BASELINE_Y - fractionPeaks['electroforesis_prebeta'] * 0.2],
    [0.52 * W,     BASELINE_Y - fractionPeaks['electroforesis_beta']],
    [0.60 * W,     BASELINE_Y - fractionPeaks['electroforesis_beta'] * 0.2],
    [0.66 * W,     BASELINE_Y - fractionPeaks['electroforesis_alfa'] * 0.3],
    [0.72 * W,     BASELINE_Y - fractionPeaks['electroforesis_alfa']],
    [0.80 * W,     BASELINE_Y - fractionPeaks['electroforesis_alfa'] * 0.15],
    [0.88 * W,     BASELINE_Y - 3],
    [W,            BASELINE_Y],
  ]

  // Smooth cubic bezier through control points
  let wavePath = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const cp1x = px + (cx - px) / 3
    const cp2x = cx - (cx - px) / 3
    wavePath += ` C ${cp1x.toFixed(1)},${py.toFixed(1)} ${cp2x.toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)}`
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: '2px solid var(--cat-lipidos)',
      borderRadius: 'var(--r-lg)',
    }}>
      {/* Accent stripe */}
      <div style={{ height: 4, background: 'var(--cat-lipidos)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }} />

      <div style={{ padding: '18px 24px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--cat-lipidos)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
            Lípidos
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)',
            fontFamily: 'var(--font-ui)', marginTop: 2 }}>
            Electroforesis de lipoproteínas
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-50)', marginTop: 4, fontFamily: 'var(--font-ui)' }}>
            {formatDate(measureDate)} · {measureLab}
          </div>
        </div>

        {/* SVG chart */}
        <div style={{ overflowX: 'auto' }}>
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ display: 'block', maxWidth: '100%' }}
            aria-label="Electroforesis de lipoproteínas"
          >
            {/* Thin colored vertical bands showing patient fraction widths */}
            {FRACTIONS.map(f => {
              const r = results[f.canonical]
              if (!r) return null
              const px = f.x * W
              // Band width: ~20px base + proportion of value
              const bw = 6 + (r.value / 100) * 60
              const ab = isAbnormal(f, r.value)
              return (
                <rect
                  key={f.canonical}
                  x={px - bw / 2}
                  y={BASELINE_Y - peakH(r.value)}
                  width={bw}
                  height={peakH(r.value)}
                  fill={f.color}
                  fillOpacity={0.15}
                  rx={3}
                />
              )
            })}

            {/* Horizontal grid lines — subtle */}
            {[0.25, 0.5, 0.75].map(pct => (
              <line
                key={pct}
                x1={0} y1={BASELINE_Y - pct * maxH}
                x2={W} y2={BASELINE_Y - pct * maxH}
                stroke="var(--ink-12)" strokeWidth={0.5}
              />
            ))}

            {/* Main electrophoresis wave */}
            <path
              d={wavePath}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Fraction markers at peaks */}
            {FRACTIONS.map(f => {
              const r = results[f.canonical]
              if (!r) return null
              const px = f.x * W
              const ph = peakH(r.value)
              const py = BASELINE_Y - ph
              const ab = isAbnormal(f, r.value)
              return (
                <g key={f.canonical}>
                  {/* Dashed vertical drop line */}
                  <line
                    x1={px} y1={BASELINE_Y}
                    x2={px} y2={py + 4}
                    stroke={f.color} strokeWidth={1}
                    strokeDasharray="3,2"
                  />
                  {/* Peak dot */}
                  <circle cx={px} cy={py} r={4} fill={f.color} />
                  {/* Value label above peak */}
                  <text
                    x={px}
                    y={py - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="700"
                    fill={ab ? '#FF1D58' : f.color}
                    fontFamily="'Albert Sans Variable', Arial, sans-serif"
                  >
                    {formatValue(r.value)}%
                  </text>
                </g>
              )
            })}

            {/* Albumin label */}
            <text
              x={ALBUMIN_X * W}
              y={BASELINE_Y - albuminPeak - 8}
              textAnchor="middle"
              fontSize={9}
              fill="var(--ink-50)"
              fontFamily="var(--font-ui)"
              fontStyle="italic"
            >
              Albumina
            </text>

            {/* X-axis baseline */}
            <line
              x1={0} y1={BASELINE_Y}
              x2={W} y2={BASELINE_Y}
              stroke="var(--ink-30)" strokeWidth={0.8}
            />

            {/* X-axis migration labels */}
            {[
              { x: 0.02, label: 'origen (−)' },
              { x: ALBUMIN_X, label: '' },  // handled above
              { x: 0.36, label: 'Pre-β' },
              { x: 0.52, label: 'β' },
              { x: 0.72, label: 'α' },
              { x: 0.98, label: '(+)' },
            ].map(({ x, label }) => label && (
              <text
                key={label}
                x={x * W}
                y={H - 4}
                textAnchor="middle"
                fontSize={9}
                fill="var(--ink-50)"
                fontFamily="'Albert Sans Variable', Arial, sans-serif"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>

        {/* Legend chips */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, marginBottom: 20 }}>
          {FRACTIONS.map(f => {
            const r = results[f.canonical]
            const ab = r ? isAbnormal(f, r.value) : false
            return (
              <div key={f.canonical} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                fontFamily: 'var(--font-ui)' }}>
                <div style={{ width: 12, height: 12, background: f.color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ color: 'var(--ink-70)' }}>
                  {f.label}:&nbsp;
                  <strong style={{ fontFamily: 'var(--font-num)', color: ab ? 'var(--alarm)' : 'var(--ink)' }}>
                    {r ? `${formatValue(r.value)}%` : '—'}
                  </strong>
                </span>
              </div>
            )
          })}
        </div>

        {/* Data table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.2px solid var(--ink)' }}>
              {['Fracción', 'Resultado (%)', 'Referencia (%)', 'Estado'].map((h, i) => (
                <th key={h} style={{
                  padding: '8px', textAlign: i > 0 ? 'right' : 'left',
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--ink-50)', fontFamily: 'var(--font-ui)'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FRACTIONS.map(f => {
              const r = results[f.canonical]
              const v = r?.value ?? null
              const ab = v !== null ? isAbnormal(f, v) : false
              const isHigh = v !== null && f.refHigh !== null && v > f.refHigh
              return (
                <tr key={f.canonical} style={{ borderBottom: '0.5px solid var(--ink-12)' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, background: f.color, borderRadius: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 500, fontSize: 13 }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-50)' }}>{f.sub}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-num)',
                    fontWeight: 600, fontSize: 13, color: ab ? 'var(--alarm)' : 'var(--ink)' }}>
                    {v !== null ? `${formatValue(v)}%` : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-num)',
                    color: 'var(--ink-50)', fontSize: 13 }}>
                    {f.refLow !== null && f.refHigh !== null
                      ? `${f.refLow}–${f.refHigh}%`
                      : f.refHigh !== null ? `≤ ${f.refHigh}%` : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {ab
                      ? <span style={{ color: 'var(--alarm)', fontWeight: 700, fontSize: 16 }}>{isHigh ? '↑' : '↓'}</span>
                      : v !== null
                        ? <span style={{ color: 'var(--ok)', fontSize: 13 }}>✓</span>
                        : <span style={{ color: 'var(--ink-30)' }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Clinical note */}
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--ink-06)',
          borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--ink-70)', fontStyle: 'italic',
          lineHeight: 1.5 }}>
          Interpretación: el patrón Pre-β elevado (VLDL) con Alfa bajo sugiere hipertrigliceridemia con
          riesgo cardiovascular aumentado. Correlacionar con perfil de lípidos completo y hallazgos clínicos.
        </div>
      </div>
    </div>
  )
}
