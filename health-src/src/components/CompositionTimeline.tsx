import { webColor } from "../lib/palette"
import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { compositionChange, compositionParts, compositionSnapshots, massParts } from '../lib/body-composition'
import { formatWeight, formatWeightDate, type WeightRecord } from '../data/weight-data'

const calendarDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

export function TemporalSankey({ first, last }: { first: WeightRecord; last: WeightRecord }) {
  const changes = compositionChange(first, last)
  const scale = 200 / Math.max(first.weight, last.weight), gap = 32
  let leftY = 65, rightY = 65
  return <svg viewBox="0 0 700 440" role="img" aria-label={`Comparación de masas: ${formatWeightDate(first.date)} a ${formatWeightDate(last.date)}`}>
    <text x="18" y="22" fontSize="15">{formatWeightDate(first.date)}</text><text x="682" y="22" fontSize="15" textAnchor="end">{formatWeightDate(last.date)}</text>
    <text x="18" y="46" fontSize="20">{formatWeight(first.weight)} kg</text><text x="682" y="46" fontSize="20" textAnchor="end">{formatWeight(last.weight)} kg</text>
    {changes.map((p, i) => {
      const ly = leftY, ry = rightY, lh = p.initial * scale, rh = p.final * scale
      leftY += lh + gap; rightY += rh + gap
      return <g key={p.key}>
        <path className="lieflat-fade" style={{ animationDelay: `${.2 + i * .06}s` }} d={`M148 ${ly} C340 ${ly} 360 ${ry} 552 ${ry} L552 ${ry + rh} C360 ${ry + rh} 340 ${ly + lh} 148 ${ly + lh} Z`} fill={webColor(p.color)} stroke="#2d2930" strokeWidth=".6"><title>{p.label}: {formatWeight(p.initial)} → {formatWeight(p.final)} kg; cambio {formatWeight(p.delta)} kg</title></path>
        <text x="138" y={ly + lh / 2 - 3} textAnchor="end" fontSize="13">{p.label}</text><text x="138" y={ly + lh / 2 + 15} textAnchor="end" fontSize="14">{formatWeight(p.initial)} kg</text>
        <text x="562" y={ry + rh / 2 - 3} fontSize="14">{formatWeight(p.final)} kg</text><text x="562" y={ry + rh / 2 + 15} fontSize="13">{p.delta > 0 ? '+' : ''}{formatWeight(p.delta)} kg</text>
      </g>
    })}
  </svg>
}

export function CompositionSeries({ records, percent = false }: { records: WeightRecord[]; percent?: boolean }) {
  const reducedMotion = useReducedMotion()
  const snapshots = compositionSnapshots(records), parts = compositionParts(snapshots[0])
  const points = snapshots.map(r => ({ date: new Date(`${r.date}T${r.time || '12:00'}`).getTime(), ...Object.fromEntries(compositionParts(r).map(p => [p.key, percent ? p.percentage : p.mass])) }))
  return <div className="composition-series" aria-label={percent ? 'Evolución de porcentajes reportados' : 'Evolución de masas en kilogramos'}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 15, right: 30, left: 0, bottom: 15 }}>
      <CartesianGrid vertical={false} stroke="#2d2930" strokeWidth={.35} />
      <XAxis dataKey="date" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={points.map(p => p.date)} tickFormatter={t => formatWeightDate(calendarDate(t))} tick={{ fill: '#2d2930', fontSize: 12 }} minTickGap={12} />
      <YAxis domain={[0, 'auto']} tick={{ fill: '#2d2930', fontSize: 12 }} width={42} unit={percent ? '%' : ''} />
      <Tooltip labelFormatter={t => formatWeightDate(calendarDate(Number(t)))} formatter={(v: any, name: any) => [`${formatWeight(Number(v))} ${percent ? '%' : 'kg'}`, parts.find(p => p.key === name)?.label ?? name]} contentStyle={{ color: '#2d2930', border: '1px solid #2d2930', borderRadius: 7, boxShadow: 'none', fontSize: 13 }} itemStyle={{ color: '#2d2930' }} />
      {parts.map((p, i) => <Line key={p.key} type="linear" dataKey={p.key} stroke={webColor(p.color)} strokeWidth={3} dot={{ r: 4, fill: webColor(p.color), stroke: '#2d2930', strokeWidth: .7 }} activeDot={{ r: 6 }} isAnimationActive={!reducedMotion} animationDuration={900} animationBegin={i * 60} />)}
    </LineChart></ResponsiveContainer>
  </div>
}

export function CompositionStacks({ records }: { records: WeightRecord[] }) {
  const snapshots = compositionSnapshots(records), max = Math.max(...snapshots.map(r => r.weight))
  return <svg viewBox="0 0 700 330" role="img" aria-label="Masas apiladas por fecha; altura proporcional a kilogramos">
    {[0,20,40,60,80].filter(v => v <= Math.ceil(max / 20) * 20).map(v => <g key={v}><line x1="48" x2="675" y1={270-v/max*225} y2={270-v/max*225} stroke="#2d2930" strokeWidth=".35" /><text x="37" y={274-v/max*225} textAnchor="end" fontSize="12">{v}</text></g>)}
    <text x="18" y="18" fontSize="13">kg</text>
    {snapshots.map((r, i) => {
      const x = 84 + i * (540 / Math.max(1, snapshots.length - 1)); let y = 270
      return <g key={r.id} className="lieflat-fade" style={{ animationDelay: `${i * .1}s` }}>
        {massParts(r).map(p => { const h = p.mass / max * 225; y -= h; return <rect key={p.key} x={x - 28} y={y} width="56" height={h} fill={webColor(p.color)} stroke="#2d2930" strokeWidth=".5"><title>{p.label}: {formatWeight(p.mass)} kg</title></rect> })}
        <text x={x} y={y-10} textAnchor="middle" fontSize="14">{formatWeight(r.weight)}</text><text x={x} y="298" textAnchor="middle" fontSize="13">{formatWeightDate(r.date)}</text>
      </g>
    })}
  </svg>
}

export default function CompositionTimeline({ records }: { records: WeightRecord[] }) {
  const snapshots = compositionSnapshots(records)
  const [view, setView] = useState('sankey'), [start, setStart] = useState(''), [end, setEnd] = useState('')
  if (snapshots.length < 2) return null
  const first = snapshots.find(r => r.id === start) ?? snapshots[0]
  const last = snapshots.find(r => r.id === end && r.date >= first.date) ?? snapshots[snapshots.length - 1]
  const parts = compositionParts(last)
  return <section className="composition composition-temporal">
    <header className="composition-heading"><h2>Composición a través del tiempo</h2></header>
    <div className="composition-controls"><div role="group" aria-label="Comparaciones temporales">{[['sankey','Sankey temporal'],['mass','Masas · kg'],['percent','Proporciones · %'],['stack','Barras apiladas']].map(([id,label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</div></div>
    {view === 'sankey' && <div className="composition-date-range"><label>Inicial<select value={first.id} onChange={e => { setStart(e.target.value); setEnd('') }}>{snapshots.slice(0,-1).map(r => <option key={r.id} value={r.id}>{formatWeightDate(r.date)}</option>)}</select></label><label>Final<select value={last.id} onChange={e => setEnd(e.target.value)}>{snapshots.filter(r => r.date > first.date).map(r => <option key={r.id} value={r.id}>{formatWeightDate(r.date)}</option>)}</select></label></div>}
    <p className="temporal-scroll-hint">Desliza la gráfica horizontalmente para ver todas las fechas.</p>
    <figure className="composition-figure"><div className="temporal-chart" tabIndex={0} role="region" aria-label="Gráfica temporal desplazable" key={`${view}-${first.id}-${last.id}`}>
      {view === 'sankey' ? <TemporalSankey first={first} last={last} /> : view === 'stack' ? <CompositionStacks records={snapshots} /> : <CompositionSeries records={snapshots} percent={view === 'percent'} />}
    </div><figcaption>{view === 'sankey' ? 'El grosor en cada extremo representa la masa de esa fecha. Las bandas comparan el mismo componente: no representan transferencia entre tejidos. El ancho cambia cuando cambia la masa.' : view === 'percent' ? 'Porcentajes originales de la báscula. Una proporción puede aumentar aunque su masa en kg disminuya.' : view === 'stack' ? 'Cada barra suma el peso registrado. La franja blanca conserva la masa sin desglosar.' : 'Escala común en kg. Los puntos son mediciones reales; las líneas sólo conectan las fechas disponibles.'}</figcaption></figure>
    <div className="composition-legend">{parts.map(p => <span key={p.key}><i style={{ background: webColor(p.color) }} />{p.label}</span>)}{view === 'stack' && <span><i style={{ background: '#fff' }} />Sin desglosar</span>}</div>
  </section>
}
