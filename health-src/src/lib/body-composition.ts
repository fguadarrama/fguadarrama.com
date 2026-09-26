import type { WeightRecord } from '../data/weight-data'

export type CompositionPart = { key: string; label: string; mass: number; percentage?: number; color: string }
export const COMPOSITION_COLORS = { water: '#b9d6e5', fat: '#ffda8f', bone: '#03694c', protein: '#eb155c' } as const

export function compositionParts(record: WeightRecord): CompositionPart[] {
  const c = record.composition
  if (!c) return []
  return [
    { key: 'water', label: 'Agua corporal', mass: c.waterMass, percentage: c.waterPercent, color: COMPOSITION_COLORS.water },
    { key: 'fat', label: 'Masa grasa', mass: c.fatMass, percentage: record.bodyFat, color: COMPOSITION_COLORS.fat },
    { key: 'bone', label: 'Mineral óseo', mass: c.boneMass, percentage: c.bonePercent, color: COMPOSITION_COLORS.bone },
    { key: 'protein', label: 'Proteínas', mass: c.proteinMass, percentage: c.proteinPercent, color: COMPOSITION_COLORS.protein },
  ]
}

export function unassignedMass(record: WeightRecord) {
  if (!record.composition) return undefined
  return Number((record.weight - compositionParts(record).reduce((sum, part) => sum + part.mass, 0)).toFixed(2))
}

export function massParts(record: WeightRecord): CompositionPart[] {
  const parts = compositionParts(record)
  const remainder = unassignedMass(record)
  if (remainder != null && remainder > 0) parts.push({ key: 'unassigned', label: 'Sin desglosar', mass: remainder, color: '#ffffff' })
  return parts
}
