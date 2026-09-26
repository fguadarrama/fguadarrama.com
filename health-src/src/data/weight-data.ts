export type BodyComposition = {
  waterMass: number
  waterPercent: number
  fatMass: number
  boneMass: number
  bonePercent: number
  proteinMass: number
  proteinPercent: number
  muscleMass: number
  musclePercent: number
  skeletalMuscleMass: number
  fatFreeMass: number
  bmi: number
  bodyScore: number
  visceralFatRating: number
  basalMetabolicRate: number
  waistHipRatio: number
  bodyAge: number
  heartRate?: number
  sourceImage: string
}

export type WeightRecord = {
  id: string
  date: string
  time: string
  weight: number
  bodyFat?: number
  source: string
  composition?: BodyComposition
}

export const WEIGHT_RECORDS = privateWeightRecords as WeightRecord[]

export const descendingWeights = (records: WeightRecord[]) => [...records].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
export const ascendingWeights = (records: WeightRecord[]) => [...records].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))

// Source corrections win over an old cached baseline; manual measurements survive.
export function mergeWeightRecords(saved: WeightRecord[] = [], baseline = WEIGHT_RECORDS) {
  const merged = new Map(saved.map((record) => [record.id, record]))
  for (const record of baseline) merged.set(record.id, record)
  return descendingWeights([...merged.values()])
}

export function formatWeight(value: number) {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value)
}

export function formatWeightDate(date: string, long = false) {
  void long
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const [year, month, day] = date.slice(0, 10).split('-')
  return `${day.padStart(2, '0')} ${months[Number(month) - 1] ?? month} ${year.slice(-2)}`
}
import privateWeightRecords from './weight-records.local.json'
