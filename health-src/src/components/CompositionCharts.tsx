// Adapted from Lieflat Charts; see THIRD_PARTY_NOTICES.md.
// Preserve its pop/fade stagger and ECharts quarticOut timings.
import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import { TooltipComponent, AriaComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { useReducedMotion } from 'framer-motion'
import type { CompositionPart } from '../lib/body-composition'
import { formatWeight } from '../data/weight-data'
echarts.use([TreemapChart, TooltipComponent, AriaComponent, SVGRenderer])
type Props = { parts: CompositionPart[]; total: number }
const reading = (p: CompositionPart) => `${p.label}: ${formatWeight(p.mass)} kg${p.percentage == null ? '' : ` · ${formatWeight(p.percentage)} %`}`
function useCompactChart() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 540px)').matches)
  useEffect(() => { const query = window.matchMedia('(max-width: 540px)'); const update = () => setCompact(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update) }, [])
  return compact
}

export function DotCascade({ parts }: Props) {
  const compact = useCompactChart(), width = compact ? 360 : 640
  const ranked = [...parts].filter(p => p.key !== 'unassigned').sort((a, b) => a.mass - b.mass)
  return <svg viewBox={`0 0 ${width} 370`} role="img" aria-label="Cascada de puntos: cada punto completo representa un kilogramo">
    <line x1={compact ? 35 : 72} y1="307" x2={compact ? 325 : 568} y2="241" stroke="#2d2930" strokeDasharray="2 4" />
    {ranked.map((part, i) => {
      const x = compact ? 45 + i * 90 : 88 + i * 154, base = 300 - i * 20, n = Math.ceil(part.mass), remainder = part.mass % 1
      return <g key={part.key}>
        {Array.from({ length: n }, (_, k) => {
          const y = base - 12 - k * 5.1, fractional = k === n - 1 && remainder > .001
          // sqrt(fraction) gives proportional area to a partial kilogram.
          return <g key={k} className="lieflat-pop" style={{ animationDelay: `${i * .05 + k * .03}s` }}>
            {fractional && <circle cx={x} cy={y} r="2.2" fill="white" stroke="#2d2930" strokeWidth=".4" />}
            <circle cx={x} cy={y} r={fractional ? 2.2 * Math.sqrt(remainder) : 2.2} fill={part.color} stroke="#2d2930" strokeWidth=".25"><title>{reading(part)}</title></circle>
          </g>
        })}
        <text x={x} y={base - 23 - (n - 1) * 5.1} textAnchor="middle" fontSize={compact ? 16 : 20}>{formatWeight(part.mass)} kg</text>
        <text x={x} y="335" textAnchor="middle" fontSize={compact ? 13 : 15}>{compact ? part.label.split(' ').map((word,j) => <tspan key={j} x={x} dy={j ? 16 : 0}>{word}</tspan>) : part.label}</text>
      </g>
    })}
  </svg>
}

export function NestedTreemap({ parts, total }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (!host.current) return
    const chart = echarts.init(host.current, undefined, { renderer: 'svg' })
    const leaf = (p: CompositionPart) => ({ name: p.label, value: p.mass, itemStyle: { color: p.color }, label: { show: p.key === 'water' || p.key === 'fat', color: '#2d2930' } })
    const fat = parts.find(p => p.key === 'fat')!
    chart.setOption({
      animation: !reduceMotion, animationDuration: 900, animationEasing: 'quarticOut', aria: { enabled: true, label: { description: parts.map(reading).join('. ') } },
      textStyle: { fontFamily: 'Albert Sans Variable', color: '#2d2930' },
      tooltip: { confine: true, backgroundColor: '#fff', borderColor: '#2d2930', borderWidth: 1, extraCssText: 'box-shadow:none', textStyle: { color: '#2d2930', fontSize: 13, fontFamily: 'Albert Sans Variable' }, formatter: (p: any) => `${p.name}: ${formatWeight(Number(p.value))} kg` },
      series: [{ type: 'treemap', data: [
        { name: `Masa libre de grasa · ${formatWeight(total - fat.mass)} kg`, children: parts.filter(p => p.key !== 'fat').map(leaf) },
        { name: 'Grasa', children: [leaf(fat)] },
      ], top: 0, right: 0, bottom: 0, left: 0, roam: false, nodeClick: false, breadcrumb: { show: false }, leafDepth: 2, squareRatio: 1.2,
        label: { show: true, position: 'insideTopLeft', padding: [10, 8], color: '#2d2930', fontSize: 14, fontWeight: 400, lineHeight: 21, formatter: (p: any) => p.treePathInfo.length <= 1 ? '' : p.treePathInfo.length === 2 ? p.name : `${p.name === 'Agua corporal' ? 'Agua\n' : ''}${formatWeight(Number(p.value))} kg` },
        upperLabel: { show: true, height: 32, padding: [0, 10], color: '#2d2930', fontSize: 13, fontWeight: 400, backgroundColor: '#fff' },
        itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 }, emphasis: { disabled: true },
        levels: [{ itemStyle: { borderWidth: 0, gapWidth: 5 } }, { upperLabel: { show: true, height: 32 }, itemStyle: { borderColor: '#fff', borderWidth: 3, gapWidth: 3 } }, { upperLabel: { show: false }, itemStyle: { borderColor: '#2d2930', borderWidth: .5, gapWidth: 2 } }],
      }],
    })
    const resize = new ResizeObserver(() => chart.resize())
    resize.observe(host.current)
    return () => { resize.disconnect(); chart.dispose() }
  }, [parts, total, reduceMotion])
  return <div ref={host} className="composition-treemap" role="img" aria-label="Treemap de masa corporal. Valores exactos en la tabla contigua." />
}

const polar = (r: number, angle: number) => [150 + Math.cos(angle * Math.PI / 180) * r, 151 + Math.sin(angle * Math.PI / 180) * r]
export function TickGauges({ parts }: Props) {
  return <div className="composition-gauges">{parts.filter(p => p.percentage != null).map(part => {
    const pct = part.percentage!, end = polar(124, -195 + pct / 100 * 210)
    return <figure key={part.key}><svg viewBox="0 0 300 218" role="img" aria-label={reading(part)}>
      {Array.from({ length: 100 }, (_, k) => {
        const filled = k < Math.floor(pct), a = -195 + k / 100 * 210, inner = polar(104, a), outer = polar(filled ? 121 : 109, a)
        return <line key={k} x1={inner[0]} y1={inner[1]} x2={outer[0]} y2={outer[1]} stroke={filled ? part.color : '#2d2930'} strokeWidth={filled ? 2.5 : .7} className="lieflat-fade" style={{ animationDelay: `${k * .012}s` }} />
      })}
      {[0, 25, 50, 75, 100].map(v => { const p = polar(86, -195 + v / 100 * 210); return <text key={v} x={p[0]} y={p[1] + 4} textAnchor="middle" fontSize="11">{v}</text> })}
      <circle cx={end[0]} cy={end[1]} r="3" fill={part.color} stroke="#2d2930" strokeWidth=".5" className="lieflat-pop" style={{ animationDelay: '1.1s' }} />
      <text x="150" y="151" textAnchor="middle" fontSize="29">{formatWeight(pct)} %</text>
      <text x="150" y="176" textAnchor="middle" fontSize="14">{formatWeight(part.mass)} kg</text>
    </svg><figcaption>{part.label}</figcaption></figure>
  })}</div>
}

export function AggregateSankey({ parts, total }: Props) {
  const compact = useCompactChart(), xl = compact ? 50 : 94, xr = compact ? 206 : 415, mid = (xl + xr) / 2
  const scale = 250 / total, gap = 25, y0 = 35, sourceY = y0 + gap * (parts.length - 1) / 2
  let massBefore = 0
  return <svg viewBox={`0 0 ${compact ? 360 : 640} 445`} role="img" aria-label="Descomposición del peso. El ancho de cada banda representa kilogramos, no transferencias entre fechas.">
    <text x="20" y="28" fontSize="16">Peso total</text><text x="20" y="51" fontSize="22">{formatWeight(total)} kg</text>
    <rect x={xl - 9} y={sourceY} width="9" height={250} fill="#2d2930" className="lieflat-fade" />
    {parts.map((p, i) => {
      const h = p.mass * scale, sa = sourceY + massBefore * scale, da = y0 + massBefore * scale + i * gap
      massBefore += p.mass
      return <g key={p.key}>
        <path d={`M${xl} ${sa} C${mid} ${sa} ${mid} ${da} ${xr} ${da} L${xr} ${da + h} C${mid} ${da + h} ${mid} ${sa + h} ${xl} ${sa + h} Z`} fill={p.color} stroke="#2d2930" strokeWidth=".5" className="lieflat-fade" style={{ animationDelay: `${.2 + i * .06}s` }}><title>{reading(p)}</title></path>
        <rect x={xr} y={da} width="7" height={h} fill={p.color} stroke="#2d2930" strokeWidth=".5" className="lieflat-fade" style={{ animationDelay: `${.1 + i * .06}s` }} />
        <text x={xr + 20} y={da + h / 2 - 4} fontSize={compact ? 13 : 15}>{p.label}</text>
        <text x={xr + 20} y={da + h / 2 + 16} fontSize="16">{formatWeight(p.mass)} kg</text>
      </g>
    })}
  </svg>
}
