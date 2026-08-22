#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const releaseDir = resolve(process.cwd(), '../health')
const files = readdirSync(releaseDir)
if (files.length !== 1 || files[0] !== 'index.html') throw new Error(`Release must contain only health/index.html; found: ${files.join(', ')}`)
const file = resolve(releaseDir, 'index.html')
if (!statSync(file).isFile()) throw new Error('Encrypted release index is missing.')
const html = readFileSync(file, 'utf8')
const env = loadEnv('production', process.cwd(), 'VITE_PATIENT_')
const clinical = JSON.parse(readFileSync(resolve(process.cwd(), 'src/data/lab-data.json'), 'utf8'))
const firstResult = clinical.results?.[0] || {}
const forbidden = [env.VITE_PATIENT_CURP, env.VITE_PATIENT_FULL_NAME, firstResult.result_id, firstResult.parameter_raw, 'Quest Diagnostics', 'lab-data.json', 'lab_data.xlsx', 'weight-records.local.json'].filter(Boolean)
for (const value of forbidden) if (html.includes(value)) throw new Error(`Plaintext privacy leak detected: ${value}`)
if (!html.includes('AES-256-GCM') || !html.includes('PBKDF2-SHA256')) throw new Error('Expected encryption metadata is missing.')
console.log(`[audit-release] passed: one encrypted file, ${statSync(file).size} bytes, no known plaintext PII`)
