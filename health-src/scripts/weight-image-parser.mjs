// Xiaomi English full body-composition screenshots. No cloud/OCR API needed.
export const fields = [
  ['bodyScore', /body score/i, .145, 0], ['bmi', /^BMI$/i, .18, 0],
  ['bodyFat', /body fat percentage/i, .18, 1],
  ['waterMass', /body water mass/i, .257, 1], ['fatMass', /^fat mass$/i, .279, 1],
  ['boneMass', /bone mineral content/i, .301, 1], ['proteinMass', /^protein mass$/i, .323, 1],
  ['muscleMass', /^muscle mass$/i, .372, 0], ['musclePercent', /muscle percentage/i, .372, 1],
  ['waterPercent', /^body water$/i, .418, 0], ['proteinPercent', /protein percentage/i, .418, 1],
  ['bonePercent', /bone mineral percentage/i, .463, 0], ['skeletalMuscleMass', /skeletal muscle mass/i, .463, 1],
  ['visceralFatRating', /visceral fat rating/i, .508, 0], ['basalMetabolicRate', /basal metabolic rate/i, .508, 1],
  ['waistHipRatio', /estimated waist.to.hip ratio/i, .552, 0], ['bodyAge', /^body age$/i, .552, 1],
  ['fatFreeMass', /fat.free body weight/i, .598, 0], ['heartRate', /^heart rate$/i, .598, 1],
]
function number(text) {
  // Do not turn "64.i" into 64, or interpret an arrow/delta as the reading.
  if (/^\s*\d+[.,][a-z]/i.test(text)) return null
  const m = text.trim().match(/^(\d+(?:[.,]\d+)?)(?:\s|%|kg|kcal|years|bpm|[^\w.,]|$)/i)
  return m ? Number(m[1].replace(',', '.')) : null
}
export function extractWeight(ocr, sourceImage) {
  const lines = ocr.lines, warnings = [], evidence = {}
  const record = { date: null, time: null, weight: null, bodyFat: null,
    source: 'Báscula Xiaomi · captura proporcionada', composition: { sourceImage } }
  const header = lines.filter(l => l.y < .05).map(l => l.text).join(' ')
  const stamp = header.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\s+(\d{1,2}):(\d{2})\b/)
  if (stamp) { record.date = `${stamp[3]}-${stamp[1].padStart(2,'0')}-${stamp[2].padStart(2,'0')}`; record.time = `${stamp[4].padStart(2,'0')}:${stamp[5]}` }
  else warnings.push('Fecha/hora no legibles: confirmar con la imagen original.')
  const weightLines = lines.filter(l => l.y > .045 && l.y < .09 && /\d/.test(l.text)).sort((a,b) => a.x-b.x)
  const weightText = weightLines.map(l => l.text.replace(/kg/gi,'').trim()).join('')
  // Strict full-token match: never accept an integer prefix of garbled decimals.
  record.weight = /^\d+(?:[.,]\d+)?$/.test(weightText) ? Number(weightText.replace(',', '.')) : null
  const integer = ocr.weightParts?.integer?.filter(p => /^\d{2,3}$/.test(p.text.trim()))
  const decimal = ocr.weightParts?.decimal?.filter(p => /^[.,]?\d{1,2}$/.test(p.text.trim()))
  if (integer?.length === 1 && decimal?.length === 1) {
    const segmented = Number(`${integer[0].text.trim()}.${decimal[0].text.trim().replace(/^[.,]/,'')}`)
    if (record.weight != null && record.weight !== segmented) warnings.push('El OCR completo y el decimal separado discrepan; revisar el peso.')
    record.weight = segmented
  }
  if (record.weight == null || weightLines.some(l => l.confidence < .8)) warnings.push('Peso: verificar el decimal pequeño contra la imagen.')
  evidence.weight = weightText
  const knownLayout = ocr.height/ocr.width > 4.5 && ocr.height/ocr.width < 6.5 && lines.some(l => /body score/i.test(l.text))
  for (const [key,label,y,column] of fields) {
    const labels = lines.filter(l => l.y < .64 && label.test(l.text))
    let candidate
    for (const anchor of labels) {
      const above = lines.filter(l => number(l.text) != null && Math.abs(l.x-anchor.x) < .13 && anchor.y-l.y > 0 && anchor.y-l.y < .036)
        .sort((a,b) => b.y-a.y)
      if (above.length) { candidate = above[0]; break }
    }
    if (!candidate && knownLayout) {
      candidate = lines.filter(l => (column ? l.x >= .48 : l.x < .48) && Math.abs(l.y-y) < .014 && number(l.text) != null)
        .sort((a,b) => Math.abs(a.y-y)-Math.abs(b.y-y))[0]
      if (candidate) warnings.push(`${key}: identificado por posición; verificar.`)
    }
    const value = candidate ? number(candidate.text) : null
    if (key === 'bodyFat') record.bodyFat = value
    else if (key !== 'heartRate' || value != null) record.composition[key] = value
    evidence[key] = candidate?.text ?? null
    if (candidate?.confidence < .8) warnings.push(`${key}: OCR con baja confianza.`)
  }
  if (ocr.width < 700) warnings.push('Imagen de baja resolución; revisar todas las cifras.')
  return { schema: 'health-weight-image/v1', reviewed: false, record, warnings, evidence, ocr }
}
export function validateRecord(r) {
  const errors = []
  const numeric = (key,v,min,max) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) errors.push(`${key}: falta o fuera de límites (${min}–${max})`) }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? '') || Number.isNaN(Date.parse(r.date)) || new Date(r.date).toISOString().slice(0,10) !== r.date) errors.push('Fecha inválida (AAAA-MM-DD)')
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.time ?? '')) errors.push('Hora inválida (HH:MM)')
  numeric('weight',r.weight,15,350); numeric('bodyFat',r.bodyFat,1,70)
  const c = r.composition ?? {}
  for (const [key] of fields) {
    if (key === 'bodyFat' || key === 'heartRate' && c[key] == null) continue
    const range = key.endsWith('Percent') || key === 'bodyScore' ? [0,100]
      : key === 'basalMetabolicRate' ? [400,5000] : key === 'bmi' ? [5,100]
      : key === 'waistHipRatio' ? [.3,2] : key === 'bodyAge' ? [1,120]
      : key === 'heartRate' ? [20,250] : key === 'visceralFatRating' ? [1,60] : [0,Number.isFinite(r.weight) && r.weight > 0 ? r.weight : 350]
    numeric(key,c[key],...range)
  }
  if (typeof r.weight !== 'number' || !Number.isFinite(r.weight) || r.weight <= 0) return errors
  const sum = c.waterMass+c.fatMass+c.boneMass+c.proteinMass
  if (sum > r.weight + .15 || r.weight-sum > 2) errors.push('Las fracciones no concuerdan con el peso; revisar OCR, sin redistribuir masas.')
  if (Math.abs(c.fatMass+c.fatFreeMass-r.weight) > .16) errors.push('Masa grasa + masa libre de grasa no concuerdan con el peso.')
  for (const [mass,pct] of [['fatMass',r.bodyFat],['waterMass',c.waterPercent],['boneMass',c.bonePercent],['proteinMass',c.proteinPercent],['muscleMass',c.musclePercent]]) {
    if (Math.abs(100*c[mass]/r.weight-pct) > .35) errors.push(`${mass}: masa y porcentaje no concuerdan.`)
  }
  return errors
}
