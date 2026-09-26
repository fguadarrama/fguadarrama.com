import { useMemo, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { descendingWeights, formatWeight, formatWeightDate, type BodyComposition as Composition, type WeightRecord } from '../data/weight-data'
import { compositionParts, massParts, unassignedMass } from '../lib/body-composition'
import { AggregateSankey, DotCascade, NestedTreemap, TickGauges } from './CompositionCharts'
import '../styles/body-composition.css'

const chartOptions = [
  { id: 'cascade', name: 'Dot Cascade', description: 'Cada punto completo equivale a 1 kg. El área del último punto representa la fracción restante.' },
  { id: 'treemap', name: 'Nested Treemap', description: 'El área representa masa. Agua, proteínas, mineral óseo y masa sin desglosar se agrupan dentro de la masa libre de grasa.' },
  { id: 'gauge', name: 'Tick Gauge', description: 'Porcentajes reportados por la báscula, en una escala común de 0 a 100 %. No son objetivos ni rangos de referencia.' },
  { id: 'sankey', name: 'Aggregate Sankey', description: 'El ancho de cada banda representa masa en una misma medición. No representa transferencias entre fechas.' },
] as const
type ChartId = typeof chartOptions[number]['id']
const metrics: { key: keyof Composition; label: string; unit: string }[] = [
  { key: 'waterMass', label: 'Agua corporal', unit: 'kg' }, { key: 'waterPercent', label: 'Agua corporal', unit: '%' },
  { key: 'fatMass', label: 'Masa grasa', unit: 'kg' },
  { key: 'boneMass', label: 'Mineral óseo', unit: 'kg' }, { key: 'bonePercent', label: 'Mineral óseo', unit: '%' },
  { key: 'proteinMass', label: 'Proteínas', unit: 'kg' }, { key: 'proteinPercent', label: 'Proteínas', unit: '%' },
  { key: 'muscleMass', label: 'Masa muscular', unit: 'kg' }, { key: 'musclePercent', label: 'Masa muscular', unit: '%' },
  { key: 'skeletalMuscleMass', label: 'Músculo esquelético', unit: 'kg' }, { key: 'fatFreeMass', label: 'Masa libre de grasa', unit: 'kg' },
  { key: 'bmi', label: 'IMC', unit: 'kg/m²' }, { key: 'visceralFatRating', label: 'Índice de grasa visceral', unit: '' },
  { key: 'basalMetabolicRate', label: 'Metabolismo basal', unit: 'kcal' }, { key: 'waistHipRatio', label: 'Relación cintura/cadera estimada', unit: '' },
  { key: 'bodyAge', label: 'Edad corporal estimada', unit: 'años' }, { key: 'heartRate', label: 'Frecuencia cardiaca', unit: 'lpm' },
  { key: 'bodyScore', label: 'Puntuación de la báscula', unit: 'puntos' },
]

export default function BodyComposition({ records }: { records: WeightRecord[] }) {
  const snapshots = useMemo(() => descendingWeights(records.filter(r => r.composition)), [records])
  const [selectedId, setSelectedId] = useState('')
  const [chart, setChart] = useState<ChartId>('cascade')
  const [replay, setReplay] = useState(0)
  const host = useRef<HTMLDivElement>(null)
  const inView = useInView(host, { once: true, amount: .2 })
  const record = snapshots.find(r => r.id === selectedId) ?? snapshots[0]
  const parts = useMemo(() => record ? massParts(record) : [], [record])
  if (!record) return null
  const reported = compositionParts(record), missing = unassignedMass(record)!
  const option = chartOptions.find(c => c.id === chart)!
  const Chart = { cascade: DotCascade, treemap: NestedTreemap, gauge: TickGauges, sankey: AggregateSankey }[chart]
  return <section className="composition" aria-labelledby="composition-title">
    <header className="composition-heading"><div><h2 id="composition-title">Composición corporal</h2><p>{snapshots.length} mediciones con desglose · báscula Xiaomi</p></div>
      <label>Fecha<select value={record.id} onChange={e => setSelectedId(e.target.value)}>{snapshots.map(r => <option key={r.id} value={r.id}>{formatWeightDate(r.date)}</option>)}</select></label>
    </header>
    <div className="composition-controls"><div role="group" aria-label="Tipo de gráfica de composición">{chartOptions.map(c => <button key={c.id} aria-pressed={chart === c.id} onClick={() => setChart(c.id)}>{c.name}</button>)}</div><button onClick={() => setReplay(v => v + 1)} aria-label="Repetir animación de composición">↻ Repetir</button></div>
    <div className="composition-grid">
      <figure className="composition-figure"><div ref={host} className="composition-stage">{inView && <Chart key={`${record.id}-${chart}-${replay}`} parts={parts} total={record.weight} />}</div><figcaption>{option.description}</figcaption></figure>
      <div className="composition-readings">
        <div className="composition-total"><span>{formatWeightDate(record.date)}</span><strong>{formatWeight(record.weight)} <small>kg</small></strong></div>
        <table aria-label="Fracciones de composición corporal"><thead><tr><th>Componente</th><th>kg</th><th>%</th></tr></thead><tbody>{reported.map(p => <tr key={p.key}><th scope="row"><i style={{ backgroundColor: p.color }} aria-hidden="true" />{p.label}</th><td>{formatWeight(p.mass)}</td><td>{p.percentage == null ? '—' : formatWeight(p.percentage)}</td></tr>)}<tr><th scope="row"><i className="composition-unassigned" aria-hidden="true" />Sin desglosar</th><td>{formatWeight(missing)}</td><td>—</td></tr></tbody></table>
        <p className="composition-note">Las cuatro masas reportadas suman {formatWeight(record.weight - missing)} kg. La diferencia de {formatWeight(missing)} kg con el peso total se muestra sin asignarla a ningún tejido. Los porcentajes se conservan tal como aparecen en la captura.</p>
      </div>
    </div>
    <details className="composition-all"><summary>Comparar todas las lecturas de composición</summary><p>Músculo y masa libre de grasa se superponen con otras fracciones; no se suman al desglose. «—» indica un dato no reportado.</p><div className="composition-table-scroll" tabIndex={0} role="region" aria-label="Comparativa desplazable de composición"><table><thead><tr><th>Parámetro</th><th>Unidad</th>{snapshots.map(r => <th key={r.id}>{formatWeightDate(r.date)}</th>)}</tr></thead><tbody>{metrics.map(m => <tr key={m.key}><th scope="row">{m.label}</th><td>{m.unit || '—'}</td>{snapshots.map(r => { const v = r.composition?.[m.key]; return <td key={r.id}>{typeof v === 'number' ? new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(v) : '—'}</td> })}</tr>)}</tbody></table></div></details>
    <footer className="composition-credit">Adaptado de <a href="https://github.com/larashero3-dotcom/lieflat-charts" target="_blank" rel="noreferrer">Lieflat Charts</a> · <a href="https://polyformproject.org/licenses/noncommercial/1.0.0/" target="_blank" rel="noreferrer">PolyForm Noncommercial 1.0.0</a></footer>
  </section>
}
