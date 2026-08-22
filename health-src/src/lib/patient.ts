import { shortDate3Letter } from './data'

const required = (name: string, value: string | undefined) => {
  const normalized = value?.trim()
  if (normalized) return normalized
  if (import.meta.env.PROD) throw new Error(`Missing private build variable: ${name}`)
  return 'Perfil privado'
}

export const PATIENT = {
  fullName: required('VITE_PATIENT_FULL_NAME', import.meta.env.VITE_PATIENT_FULL_NAME),
  dobIso: required('VITE_PATIENT_DOB', import.meta.env.VITE_PATIENT_DOB),
  curp: required('VITE_PATIENT_CURP', import.meta.env.VITE_PATIENT_CURP),
}

export function patientDobShort() {
  return /^\d{4}-\d{2}-\d{2}$/.test(PATIENT.dobIso) ? shortDate3Letter(PATIENT.dobIso) : PATIENT.dobIso
}

export function patientAge(today: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(PATIENT.dobIso)) return null
  const dob = new Date(`${PATIENT.dobIso}T12:00:00`)
  let age = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age--
  return age
}
