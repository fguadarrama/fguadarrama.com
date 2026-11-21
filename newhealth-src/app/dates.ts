// Equal intervals represent equal elapsed time in the interface and in print.
export function dateMarks(dates: string[]) {
  const sorted = [...new Set(dates.filter(Boolean))].sort()
  const first = Date.parse(sorted[0]), last = Date.parse(sorted[sorted.length - 1])
  return sorted.map(date => ({date, position: first === last ? .5 : (Date.parse(date)-first)/(last-first)}))
}
