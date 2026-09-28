import { ascendingWeights, type WeightRecord } from '../data/weight-data'

// Presentation-only derivation. Never replace a reported value or persist this
// estimate into the source records. Missing percentages remain missing.
export function weightTrend(records: WeightRecord[]) {
  return ascendingWeights(records).map(record => {
    const reported = record.composition?.fatFreeMass
    const lean = reported ?? (record.bodyFat == null ? null : record.weight * (1 - record.bodyFat / 100))
    return {
      ...record,
      timestamp: new Date(`${record.date}T${record.time || '00:00'}:00`).getTime(),
      lean,
      leanCalculated: reported == null && lean != null,
      fat: lean == null ? null : record.weight - lean,
      fatBand: lean == null ? null : [lean, record.weight],
    }
  })
}
