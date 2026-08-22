#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const root = process.cwd()
const repo = resolve(root, '..')
const privatePaths = [
  '.env.local', '.release-password.local', 'lab_data.xlsx', 'DATA_RECONCILIATION.md', 'src/data/lab-data.json',
  'src/data/parameter-layout.json', 'src/data/weight-records.local.json', 'src/data/sources/2026-08-07-quest.json',
]
for (const privatePath of privatePaths) {
  if (!existsSync(resolve(root, privatePath))) continue
  try {
    execFileSync('git', ['check-ignore', '--quiet', `health-src/${privatePath}`], { cwd: repo })
  } catch {
    throw new Error(`Private file is not ignored by Git: health-src/${privatePath}`)
  }
}

const candidates = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'health-src', 'health'], { cwd: repo, encoding: 'utf8' })
  .split('\n').filter(Boolean)
const env = loadEnv('production', root, 'VITE_PATIENT_')
const clinical = JSON.parse(readFileSync(resolve(root, 'src/data/lab-data.json'), 'utf8'))
const needles = [env.VITE_PATIENT_CURP, env.VITE_PATIENT_FULL_NAME, clinical.results?.[0]?.result_id].filter(Boolean)
for (const candidate of candidates) {
  if (/\.(?:png|jpe?g|webp|woff2?|xlsx|pdf)$/i.test(candidate)) continue
  const text = readFileSync(resolve(repo, candidate), 'utf8')
  for (const needle of needles) if (text.includes(needle)) throw new Error(`Plaintext private value found in Git candidate: ${candidate}`)
}
console.log(`[audit-git-privacy] passed: ${privatePaths.length} private paths ignored; ${candidates.length} Git candidates scanned`)
