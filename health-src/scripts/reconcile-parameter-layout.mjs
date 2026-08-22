#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = resolve(root, 'src/data/lab-data.json')
const layoutPath = resolve(root, 'src/data/parameter-layout.json')
const data = JSON.parse(readFileSync(dataPath, 'utf8'))
const layout = JSON.parse(readFileSync(layoutPath, 'utf8'))
const byCategory = new Map(layout.categories.map((category) => [category.category, category]))
const known = new Set(layout.categories.flatMap((category) => category.items.map((item) => item.parameterId)))
let added = 0
let moved = 0

for (const parameter of data.parameters) {
  let category = byCategory.get(parameter.category)
  if (!category) {
    category = { category: parameter.category, categoryOrder: layout.categories.length, items: [] }
    layout.categories.push(category)
    byCategory.set(parameter.category, category)
  }
  const currentCategory = layout.categories.find((candidate) => candidate.items.some((item) => item.parameterId === parameter.canonical_id))
  if (currentCategory && currentCategory.category !== parameter.category) {
    const item = currentCategory.items.find((candidate) => candidate.parameterId === parameter.canonical_id)
    currentCategory.items = currentCategory.items.filter((candidate) => candidate.parameterId !== parameter.canonical_id)
    const maxOrder = category.items.reduce((maximum, candidate) => Math.max(maximum, candidate.order), -1)
    category.items.push({ ...item, label: parameter.display_name_es, order: maxOrder + 1 })
    moved++
    continue
  }
  if (known.has(parameter.canonical_id)) continue
  const maxOrder = category.items.reduce((maximum, item) => Math.max(maximum, item.order), -1)
  category.items.push({ parameterId: parameter.canonical_id, label: parameter.display_name_es, order: maxOrder + 1, visible: false })
  known.add(parameter.canonical_id)
  added++
}

writeFileSync(layoutPath, `${JSON.stringify(layout, null, 2)}\n`)
console.log(`[reconcile-parameter-layout] ${added} hidden parameters added, ${moved} recategorized; visibility preserved`)
