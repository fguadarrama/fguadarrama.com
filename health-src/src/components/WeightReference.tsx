import { ibwEstimates, type IbwMethod } from '../lib/weight-health'
import profile from '../data/body-profile.local.json'

type Props = { weight: number; method: IbwMethod; targetBmi: number; onMethod: (m: IbwMethod) => void; onBmi: (bmi: number) => void }
export default function WeightReference({ weight, method, targetBmi, onMethod, onBmi }: Props) {
  const methods = ibwEstimates(profile.heightCm, profile.sex, targetBmi)
  const selected = methods.find(m => m.id === method)!
  return <section className="weight-health weight-reference" aria-labelledby="weight-reference-title">
    <header><h2 id="weight-reference-title">Peso de referencia · IBW</h2><span>Elige la línea punteada de la gráfica</span></header>
    <fieldset className="ibw-options"><legend className="sr-only">Ecuación de peso de referencia</legend>{methods.map(m => <label key={m.id} data-selected={method === m.id}><input type="radio" name="ibw-method" value={m.id} checked={method === m.id} disabled={m.value == null} onChange={() => onMethod(m.id)} /><span>{m.name}</span><strong>{m.value == null ? '—' : m.value.toFixed(1)} <small>kg</small></strong></label>)}</fieldset>
    {method === 'bmi' && <label className="ibw-slider">IMC de referencia · {targetBmi.toFixed(1)}<input aria-label="IMC de referencia" type="range" min="18.5" max="27.5" step="0.1" value={targetBmi} onChange={e => onBmi(Number(e.target.value))} /></label>}
    <div className="ibw-equation"><p>{selected.equation} = <strong>{selected.value?.toFixed(1) ?? '—'} kg</strong>{selected.value != null && <> · Diferencia con el peso actual: {(weight - selected.value) > 0 ? '+' : ''}{(weight - selected.value).toFixed(1)} kg</>}</p><p>{selected.note} Ninguna de estas fórmulas clásicas utiliza la edad; no son una indicación de perder peso.</p></div>
    <details className="weight-health__method"><summary>Acerca de las ecuaciones</summary><p>Coeficientes del HTML proporcionado. Estatura fija: {profile.heightCm} cm; pulgadas sobre 5 pies = {profile.heightCm} ÷ 2.54 − 60. Se comparan las estimaciones sin promediarlas ni presentarlas como un ideal fisiológico único. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4841935/" target="_blank" rel="noreferrer">Revisión de las ecuaciones IBW</a>.</p></details>
  </section>
}
