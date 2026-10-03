// Screening reference, not a personalized ideal weight or prescribed target.
export const REFERENCE_BMI = 22
export const ACTIVITY_RANGE = [1.4, 1.6] as const

export type IbwMethod = 'bmi' | 'devine' | 'robinson' | 'miller' | 'hamwi'
export function ibwEstimates(heightCm: number, sex: string, targetBmi = 22.5) {
  if (!Number.isFinite(heightCm) || heightCm <= 0 || !Number.isFinite(targetBmi) || targetBmi < 18.5 || targetBmi > 27.5) throw new Error('Referencia inválida')
  const inches = heightCm / 2.54 - 60
  const applicable = sex === 'male' && inches >= 0
  // The supplied calculator uses these male formulas, including rounded Hamwi.
  // Do not silently clamp short stature or apply the male variant to another sex.
  return [
    { id: 'bmi' as const, name: `IMC ${targetBmi.toFixed(1)}`, value: targetBmi * (heightCm / 100) ** 2, equation: `${targetBmi.toFixed(1)} × (estatura en m)²`, note: 'Referencia seleccionable; no incorpora composición corporal.' },
    { id: 'devine' as const, name: 'Devine', value: applicable ? 50 + 2.3 * inches : null, equation: '50 + 2.3 × pulgadas sobre 5 pies', note: 'Variante masculina. Referencia histórica de dosificación, no una meta individual.' },
    { id: 'robinson' as const, name: 'Robinson', value: applicable ? 52 + 1.9 * inches : null, equation: '52 + 1.9 × pulgadas sobre 5 pies', note: 'Variante masculina; sólo estatura y sexo.' },
    { id: 'miller' as const, name: 'Miller', value: applicable ? 56.2 + 1.41 * inches : null, equation: '56.2 + 1.41 × pulgadas sobre 5 pies', note: 'Variante masculina; no incluye edad ni composición corporal.' },
    { id: 'hamwi' as const, name: 'Hamwi', value: applicable ? 48 + 2.7 * inches : null, equation: '48 + 2.7 × pulgadas sobre 5 pies', note: 'Aproximación métrica del HTML; sin ajuste por complexión.' },
  ]
}

export function energyEstimates(weight: number, heightCm: number, age: number | null, sex: string, lean: number | null) {
  const health = weightHealth(weight, heightCm, age, sex)
  const adultMale = sex === 'male' && age != null && Number.isFinite(age) && age >= 18
  return [
    { id: 'mifflin', name: 'Mifflin–St Jeor', value: health.resting, equation: '10 × peso + 6.25 × talla − 5 × edad + 5 (hombre)', note: 'Peso, talla, edad y sexo; no usa composición corporal.', source: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
    { id: 'harris', name: 'Harris–Benedict revisada', value: adultMale ? 88.362 + 13.397 * weight + 4.799 * heightCm - 5.677 * age! : null, equation: '88.362 + 13.397 × peso + 4.799 × talla − 5.677 × edad', note: 'Roza–Shizgal, 1984; variante masculina.', source: 'https://pubmed.ncbi.nlm.nih.gov/6741850/' },
    { id: 'owen', name: 'Owen', value: adultMale ? 879 + 10.2 * weight : null, equation: '879 + 10.2 × peso', note: 'Variante masculina; no incluye talla ni edad en la ecuación.', source: 'https://pubmed.ncbi.nlm.nih.gov/3687821/' },
    { id: 'schofield', name: 'Schofield', value: adultMale && age! >= 30 && age! < 60 ? 11.472 * weight + 873.1 : null, equation: '11.472 × peso + 873.1', note: 'Sólo hombres de 30 a menos de 60 años en esta variante.', source: 'https://www.fao.org/fileadmin/templates/ess/documents/food_security_statistics/working_paper_series/WP005e.pdf' },
    { id: 'cunningham', name: 'Cunningham', value: adultMale && lean != null && Number.isFinite(lean) && lean > 0 && lean <= weight ? 500 + 22 * lean : null, equation: '500 + 22 × masa libre de grasa', note: 'Usa la composición de la misma medición; hereda el error de bioimpedancia.', source: 'https://pubmed.ncbi.nlm.nih.gov/7435418/' },
  ]
}

export function weightHealth(weight: number, heightCm: number, age: number | null, sex: string) {
  if (![weight, heightCm].every(v => Number.isFinite(v) && v > 0)) throw new Error('Peso o estatura inválidos')
  const heightSquared = (heightCm / 100) ** 2
  const bmi = weight / heightSquared
  const resting = age == null || !Number.isFinite(age) || age < 18 || !['male', 'female'].includes(sex)
    ? null : 10 * weight + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
  return {
    bmi,
    bmiCategory: bmi < 18.5 ? 'Bajo peso' : bmi < 25 ? 'Intervalo saludable' : bmi < 30 ? 'Sobrepeso' : 'Obesidad',
    referenceWeight: REFERENCE_BMI * heightSquared,
    lowerWeight: 18.5 * heightSquared,
    upperWeightExclusive: 25 * heightSquared,
    resting,
    // Scenario bounds, not confidence limits or a steps-to-calories conversion.
    maintenance: resting == null ? null : ACTIVITY_RANGE.map(factor => resting * factor),
  }
}
