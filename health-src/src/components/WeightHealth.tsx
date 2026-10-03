import { useState } from 'react'
import { type WeightRecord, formatWeightDate } from '../data/weight-data'
import profile from '../data/body-profile.local.json'
import { patientAge } from '../lib/patient'
import { energyEstimates, weightHealth } from '../lib/weight-health'
import { weightTrend } from '../lib/weight-trend'
import '../styles/weight-health.css'

const number = (v: number, digits = 0) => v.toLocaleString('es-MX', { minimumFractionDigits: digits, maximumFractionDigits: digits })
export default function WeightHealth({ latest }: { latest: WeightRecord }) {
  const age = patientAge()
  const health = weightHealth(latest.weight, profile.heightCm, age, profile.sex)
  const [method, setMethod] = useState('mifflin')
  const [activity, setActivity] = useState(1.4)
  const point = weightTrend([latest])[0]
  const methods = energyEstimates(latest.weight, profile.heightCm, age, profile.sex, point.lean)
  const selected = methods.find(m => m.id === method)!
  return <section className="weight-health" aria-labelledby="weight-health-title">
    <header><h2 id="weight-health-title">IMC y energía</h2><span>Con el peso del {formatWeightDate(latest.date)}</span></header>
    <div className="weight-health__grid">
      <article><h3>Índice de masa corporal</h3><p className="health-value">{number(health.bmi, 1)} <small>kg/m²</small></p><p>{health.bmiCategory}</p><p>Estatura fija · {profile.heightCm} cm</p></article>
      <article><h3>Metabolismo en reposo</h3><p className="health-value">{selected.value == null ? '—' : number(selected.value)} <small>kcal/día</small></p><p>Estimado · {selected.name}</p><p>No incluye actividad física.</p></article>
      <article><h3>Mantenimiento estimado</h3><p className="health-value">{selected.value == null ? '—' : number(Math.round(selected.value * activity / 10) * 10)} <small>kcal/día</small></p><p>{number(profile.dailySteps)} pasos/día · sin otro ejercicio</p><p>Factor asumido × {activity.toFixed(2)} · no es una meta de ingesta.</p></article>
    </div>
    <div className="energy-controls"><label>Ecuación de reposo<select value={method} onChange={e => setMethod(e.target.value)}>{methods.map(m => <option key={m.id} value={m.id} disabled={m.value == null}>{m.name}{m.value == null ? ' · sin datos aplicables' : ''}</option>)}</select></label><label>Factor de actividad · supuesto<select value={activity} onChange={e => setActivity(Number(e.target.value))}>{[1.2,1.3,1.4,1.5,1.6,1.7,1.8].map(v => <option key={v} value={v}>{v.toFixed(2)}{v === 1.4 ? ' · escenario inicial' : ''}</option>)}</select></label></div>
    <p className="energy-caption">{selected.equation}. Peso en kg, talla en cm y edad en años. {selected.note}{method === 'cunningham' && point.lean != null && <> Masa libre de grasa: {number(point.lean, 1)} kg ({point.leanCalculated ? 'calculada' : 'reportada'}) del {formatWeightDate(latest.date)}.</>}</p>
    <details className="weight-health__method"><summary>Cálculos y referencias</summary>
      <div><p><strong>IMC:</strong> peso ÷ {profile.heightCm / 100}². El intervalo adulto de 18.5 a menos de 25 equivale a {number(health.lowerWeight, 1)} a menos de {number(health.upperWeightExclusive, 1)} kg. En adultos, estos límites no cambian por sexo o edad. <a href="https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html" target="_blank" rel="noreferrer">CDC</a>.</p>
      <p><strong>Perfil:</strong> {latest.weight} kg, {profile.heightCm} cm, {age ?? '—'} años, {profile.sex === 'male' ? 'masculino' : 'femenino'}. Se usa la edad actual; el resultado se actualiza al registrar otro peso. Estas ecuaciones estiman el gasto, no lo miden.</p>
      <p><strong>Mantenimiento:</strong> reposo × factor de actividad. Los 6000 pasos no fijan un factor validado: faltan ritmo, duración y actividad del resto del día. El valor inicial 1.4 es un supuesto conservador de actividad baja, ajustable; no se suman las calorías de caminar otra vez. Con factores 1.4–1.6, {selected.name} da {selected.value == null ? '—' : [1.4,1.6].map(v => number(Math.round(v * selected.value! / 10) * 10)).join('–')} kcal/día. Es un análisis de sensibilidad, no un margen estadístico de error ni una recomendación de déficit. <a href="https://www.niddk.nih.gov/bwp" target="_blank" rel="noreferrer">NIDDK</a>.</p>
      <table className="energy-comparison"><thead><tr><th>Ecuación</th><th>kcal/día</th><th>Consideraciones</th></tr></thead><tbody>{methods.map(m => <tr key={m.id}><td><a href={m.source} target="_blank" rel="noreferrer">{m.name}</a></td><td>{m.value == null ? '—' : number(m.value)}</td><td>{m.note}</td></tr>)}</tbody></table></div>
    </details>
  </section>
}
