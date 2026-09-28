import { ascendingWeights, type WeightRecord } from '../data/weight-data'

export type CompositionPart = { key: string; label: string; mass: number; percentage?: number; color: string }
export const COMPOSITION_COLORS = { water: '#b9d6e5', fat: '#ffda8f', bone: '#03694c', protein: '#eb155c' } as const
// Canonical source token; webColor/pdfColor map it to the chosen vivid swatch.
export const WEIGHT_ACCENT = '#eb155c'

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

export const compositionSnapshots = (records: WeightRecord[]) => ascendingWeights(records.filter(r => r.composition))
export function compositionChange(first: WeightRecord, last: WeightRecord) {
  const end = massParts(last)
  return massParts(first).map(p => ({ ...p, initial: p.mass, final: end.find(q => q.key === p.key)?.mass ?? 0,
    delta: Number(((end.find(q => q.key === p.key)?.mass ?? 0) - p.mass).toFixed(2)) }))
}

/** Equal-angle annular petals. Visible area, rather than radius, encodes kg.
 * Angular gaps provide separation without changing the common mass scale. */
export function rosePetals(parts: CompositionPart[], cx = 180, cy = 170, outer = 128, inner = 25) {
  const observed = parts.filter(p => p.key !== 'unassigned')
  const max = Math.max(...observed.map(p => p.mass), 1)
  const point = (r: number, angle: number) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  return observed.map((p, i) => {
    const start = -Math.PI / 2 + i * Math.PI / 2 + .035, end = start + Math.PI / 2 - .07
    const radius = Math.sqrt(inner * inner + p.mass / max * (outer * outer - inner * inner))
    const a = point(inner, start), b = point(radius, start), c = point(radius, end), d = point(inner, end)
    const label = point((inner + radius) / 2, (start + end) / 2)
    return { ...p, radius, area: (end - start) * (radius * radius - inner * inner) / 2,
      x: label[0], y: label[1], path: `M${a} L${b} A${radius} ${radius} 0 0 1 ${c} L${d} A${inner} ${inner} 0 0 0 ${a} Z` }
  })
}

/** Big Slice: mass determines angle; a common radius avoids inventing an intensity
 * variable. Include the residual instead of renormalizing the four reported masses.
 * Shared geometry keeps the web chart and PDF quantitatively identical. */
export function bigSliceSegments(parts: CompositionPart[], total: number) {
  if (total <= 0) return []
  const centerX = 210, centerY = 174, radius = 98, inner = 30, separation = 8
  let angle = -Math.PI / 2
  const slices = parts.filter(p => p.mass > 0).map(p => {
    const start = angle, span = p.mass / total * Math.PI * 2, end = start + span
    angle = end
    const mid = (start + end) / 2, right = Math.cos(mid) > .15
    // Explode each sector by an equal distance. Angle and area are unchanged;
    // unlike trimming the angles, this does not erase the small residual.
    const cx = centerX + separation * Math.cos(mid), cy = centerY + separation * Math.sin(mid)
    const point = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    const a = point(inner, start), b = point(radius, start), c = point(radius, end), d = point(inner, end)
    const tip = point(radius + 5, mid)
    return { ...p, start, end, span, radius, inner, cx, cy, tip, right,
      labelX: right ? 324 : 96, labelY: Math.max(35, Math.min(305, tip[1])),
      path: `M${a} L${b} A${radius} ${radius} 0 ${span > Math.PI ? 1 : 0} 1 ${c} L${d} A${inner} ${inner} 0 ${span > Math.PI ? 1 : 0} 0 ${a} Z` }
  })
  // Place small neighboring fractions on separate lines, keeping angular order.
  for (const right of [false, true]) {
    const side = slices.filter(p => p.right === right).sort((a,b) => a.labelY-b.labelY)
    for (let i=1; i<side.length; i++) side[i].labelY = Math.max(side[i].labelY, side[i-1].labelY+45)
  }
  return slices
}
