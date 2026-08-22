// src/pages/JsonBuilder.tsx
// Creates lab result JSON files for dynamic dashboard updates.
// Output schema is identical to the 'results' sheet in lab_data.xlsx.

import { useMemo, useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { goeyToast } from 'goey-toast'
import { data, categorySlug, sortCategories } from '../lib/data'
import type { Parameter } from '../lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EntryRow {
  id: string
  date: string
  lab: string
  parameter_canonical: string
  parameter_raw: string
  value_numeric: string
  value_text: string
  unit: string
  ref_low: string
  ref_high: string
  ref_operator: string
  flag: '' | 'up' | 'down'
}

// Date formatter: iso → dd.Mmm.aa  (e.g. 2026-05-01 → 01.May.26)
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function fmtDate(iso: string): string {
  if (!iso || iso.length < 10) return iso || ''
  const [y, m, d] = iso.split('-')
  const mo = MONTHS_SHORT[Number(m) - 1] || m
  return `${d}.${mo}.${y.slice(-2)}`
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
const TEMPLATES: { key: string; label: string; category: string; canonicals: string[] }[] = [
  {
    key: 'cbc', label: 'Biometría hemática', category: 'Hematología',
    canonicals: ['leucocitos','eritrocitos','hemoglobina','hematocrito','vcm','hcm','chcm',
      'rdw_cv','rdw_sd','plaquetas','vpm',
      'neutrofilos_pct','linfocitos_pct','monocitos_pct','eosinofilos_pct','basofilos_pct',
      'neutrofilos_abs','linfocitos_abs','monocitos_abs','eosinofilos_abs','basofilos_abs'],
  },
  {
    key: 'lfts', label: 'PFH', category: 'Hepática',
    canonicals: ['bilirrubina_total','bilirrubina_directa','bilirrubina_indirecta',
      'ast','alt','ast_alt_ratio','ggt','alp','ldh',
      'proteinas_totales','albumina','globulina','albumina_globulina_ratio'],
  },
  {
    key: 'lipids', label: 'Perfil de lípidos', category: 'Lípidos',
    canonicals: ['colesterol_total','colesterol_hdl','colesterol_ldl','colesterol_vldl',
      'colesterol_no_hdl','trigliceridos','apo_a1','apo_b','apo_b_a1_ratio',
      'ldl_hdl_ratio','riesgo_aterogenico'],
  },
  {
    key: 'thyroid', label: 'Perfil tiroideo', category: 'Endocrinología',
    canonicals: ['tsh','t4_libre','t4_total','t3_libre','t3_total',
      't3_captacion','captacion_t3','tiroglobulina','yodo_proteico','itl_fti',
      'ac_anti_tpo','ac_anti_tiroglobulina'],
  },
  {
    key: 'hormones', label: 'Hormonas', category: 'Endocrinología',
    canonicals: ['lh','fsh','prolactina','testosterona_total','cortisol'],
  },
  {
    key: 'electrolytes', label: 'Electrolitos', category: 'Electrolitos',
    canonicals: ['sodio','potasio','cloro','calcio','fosforo','magnesio','bicarbonato'],
  },
  {
    key: 'metabolic', label: 'Química sanguínea', category: 'Química',
    canonicals: ['glucosa','hba1c','insulina','urea','bun','creatinina','bun_creat_ratio',
      'acido_urico','amilasa','lipasa'],
  },
  {
    key: 'ua', label: 'EGO', category: 'Orina',
    canonicals: ['orina_color','orina_aspecto','orina_densidad','orina_ph',
      'orina_proteinas','orina_glucosa','orina_cetonas','orina_bilirrubina',
      'orina_urobilinogeno','orina_nitritos','orina_leucocitos_tira',
      'orina_hemoglobina_tira','orina_leucocitos_micro','orina_eritrocitos_micro'],
  },
]

// Known labs from data
const KNOWN_LABS = [...new Set(data.results.map(r => r.lab).filter(Boolean))].sort()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function genId() { return Math.random().toString(36).slice(2, 10) }
function todayIso() { return new Date().toISOString().slice(0, 10) }

function parseNumberOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function autoFlag(v: string, lo: string, hi: string): '' | 'up' | 'down' {
  const n = parseNumberOrNull(v)
  if (n === null) return ''
  const high = parseNumberOrNull(hi)
  const low = parseNumberOrNull(lo)
  if (high !== null && n > high) return 'up'
  if (low !== null && n < low) return 'down'
  return ''
}

function rowFromParam(p: Parameter | undefined, date: string, lab: string): EntryRow {
  return {
    id: genId(), date, lab,
    parameter_canonical: p?.canonical_id || '',
    parameter_raw: p?.display_name_es || '',
    value_numeric: '', value_text: '',
    unit: p?.unit_mx || '',
    ref_low: p?.lab_ref_low != null ? String(p.lab_ref_low) : '',
    ref_high: p?.lab_ref_high != null ? String(p.lab_ref_high) : '',
    ref_operator: p?.lab_ref_operator || 'range',
    flag: '',
  }
}

function emptyRow(date: string, lab: string): EntryRow {
  return rowFromParam(undefined, date, lab)
}

// ---------------------------------------------------------------------------
// LabCombobox — styled dropdown with free-text entry
// ---------------------------------------------------------------------------
function LabCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return KNOWN_LABS
    return KNOWN_LABS.filter(l => l.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Seleccionar o escribir laboratorio…"
        style={fieldStyle}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-2)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.length === 0 && query && (
            <div
              onMouseDown={() => { onChange(query); setOpen(false) }}
              style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink-50)',
                cursor: 'pointer', fontStyle: 'italic' }}
            >
              Usar "{query}" (nuevo)
            </div>
          )}
          {filtered.map(l => (
            <div
              key={l}
              onMouseDown={() => { setQuery(l); onChange(l); setOpen(false) }}
              style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', borderBottom: '0.5px solid var(--ink-06)',
                background: l === value ? 'var(--ink-06)' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink-06)')}
              onMouseLeave={e => (e.currentTarget.style.background = l === value ? 'var(--ink-06)' : 'transparent')}
            >
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ParamSearch — always-visible autocomplete in the table cell
// ---------------------------------------------------------------------------
function ParamSearch({
  value, onChange,
}: {
  value: string
  onChange: (cid: string, p: Parameter | undefined) => void
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return data.parameters.filter(p =>
      p.display_name_es.toLowerCase().includes(q) ||
      p.canonical_id.includes(q) ||
      (p.aliases || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar parámetro…"
        style={{ ...cellInputStyle, minWidth: 190 }}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-3)',
          maxHeight: 260, overflowY: 'auto', minWidth: 280,
        }}>
          {matches.map(p => (
            <button
              key={p.canonical_id}
              type="button"
              onMouseDown={() => {
                setQuery(p.display_name_es)
                setOpen(false)
                onChange(p.canonical_id, p)
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 12px', borderBottom: '0.5px solid var(--ink-06)',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink-06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.display_name_es}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-50)', marginTop: 1 }}>
                {p.category} · {p.unit_mx || '—'} · <code style={{ fontFamily: 'var(--font-num)' }}>{p.canonical_id}</code>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', fontSize: 14,
  fontFamily: 'var(--font-ui)', color: 'var(--ink)', outline: 'none',
}
const cellInputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px',
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', fontSize: 13,
  fontFamily: 'var(--font-num)', color: 'var(--ink)', outline: 'none',
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function JsonBuilder() {
  const [globalDate, setGlobalDate] = useState(todayIso)
  const [globalLab, setGlobalLab] = useState('')
  const [rows, setRows] = useState<EntryRow[]>(() => [emptyRow(todayIso(), '')])

  function applyGlobal() {
    setRows(prev => prev.map(r => ({ ...r, date: globalDate, lab: globalLab })))
  }

  function addRow() {
    setRows(prev => [...prev, emptyRow(globalDate, globalLab)])
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id: string, patch: Partial<EntryRow>) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const u = { ...r, ...patch }
      if (patch.value_numeric !== undefined || patch.ref_low !== undefined || patch.ref_high !== undefined) {
        u.flag = autoFlag(u.value_numeric, u.ref_low, u.ref_high)
      }
      return u
    }))
  }

  function applyTemplate(tmpl: typeof TEMPLATES[0]) {
    const newRows = tmpl.canonicals
      .map(cid => rowFromParam(data.paramsById[cid], globalDate, globalLab))
      .filter(r => r.parameter_canonical)
    setRows(newRows)
    goeyToast(`Plantilla: ${tmpl.label}`)
  }

  function downloadJson() {
    const valid = rows.filter(r => r.parameter_canonical)
    if (!valid.length) {
      goeyToast.warning('Agrega al menos un parámetro con valor.')
      return
    }
    const out = valid.map(r => ({
      result_id: `${r.date}_${r.lab.toLowerCase().replace(/[^a-z0-9]/g, '-')}_${r.parameter_canonical}`,
      date: r.date,
      lab: r.lab,
      parameter_canonical: r.parameter_canonical,
      parameter_raw: r.parameter_raw || r.parameter_canonical,
      value_numeric: parseNumberOrNull(r.value_numeric),
      value_text: r.value_text || null,
      unit: r.unit,
      ref_low: parseNumberOrNull(r.ref_low),
      ref_high: parseNumberOrNull(r.ref_high),
      ref_operator: r.ref_operator || 'range',
      abnormal_flag: r.flag !== '',
      source_pdf: '',
      notes: '',
    }))
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = globalLab.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20) || 'laboratorio'
    a.download = `${globalDate.replace(/-/g, '')}-${slug}.json`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    goeyToast(`Archivo listo: ${a.download}`)
  }

  const readyCount = rows.filter(r => r.parameter_canonical).length

  return (
    <div className="stack-5">
      {/* Header */}
      <section>
        <div className="eyebrow">Herramienta</div>
        <h1 style={{ marginTop: 10 }}>Crear JSON de laboratorios</h1>
      </section>

      {/* Global date + lab */}
      <motion.section
        className="card"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="card__head"><div className="card__title">Fecha y laboratorio</div></div>
        <div className="card__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={globalDate}
                onChange={e => setGlobalDate(e.target.value)} style={fieldStyle} />
              {globalDate && (
                <div style={{ fontSize: 11, color: 'var(--ink-50)', marginTop: 3,
                  fontFamily: 'var(--font-num)', letterSpacing: '0.02em' }}>
                  → {fmtDate(globalDate)}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Laboratorio</label>
              <LabCombobox value={globalLab} onChange={setGlobalLab} />
            </div>
            <button onClick={applyGlobal} className="btn btn--ghost" style={{ fontSize: 13, padding: '9px 14px', whiteSpace: 'nowrap' }}>
              Aplicar a todas las filas
            </button>
          </div>
        </div>
      </motion.section>

      {/* Templates */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink-70)' }}>
          Cargar plantilla:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TEMPLATES.map(t => {
            const slug = categorySlug(t.category)
            return (
              <button
                key={t.key}
                onClick={() => applyTemplate(t)}
                className={`cat-${slug}`}
                style={{
                  padding: '7px 14px',
                  border: '1.5px solid var(--cat-accent, var(--border-strong))',
                  borderRadius: 'var(--r-pill)',
                  background: 'transparent',
                  color: 'var(--cat-accent, var(--ink))',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background var(--dur-sm)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cat-accent-soft, var(--ink-06))')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </motion.section>

      {/* Entry table */}
      <motion.section
        className="card"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="card__head">
          <div className="card__title">Resultados</div>
          <span className="chip">{readyCount} parámetros</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--ink)' }}>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Laboratorio</th>
                <th style={thStyle}>Parámetro</th>
                <th style={thStyle}>Categoría</th>
                <th style={thStyle}>Valor</th>
                <th style={thStyle}>Ref Inf</th>
                <th style={thStyle}>Ref Sup</th>
                <th style={thStyle}>Flag</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((row, idx) => {
                  const paramDef = data.paramsById[row.parameter_canonical]
                  const cat = paramDef?.category || ''
                  const slug = cat ? categorySlug(cat) : ''
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ borderBottom: '0.5px solid var(--ink-12)',
                        background: idx % 2 ? 'var(--ink-06)' : 'transparent' }}
                    >
                      {/* Date */}
                      <td style={{ padding: '6px 8px', minWidth: 130 }}>
                        <input type="date" value={row.date}
                          onChange={e => updateRow(row.id, { date: e.target.value })}
                          style={cellInputStyle} />
                        {row.date && (
                          <div style={{ fontSize: 10, color: 'var(--ink-50)', marginTop: 2,
                            fontFamily: 'var(--font-num)' }}>
                            {fmtDate(row.date)}
                          </div>
                        )}
                      </td>
                      {/* Lab */}
                      <td style={{ padding: '6px 8px', minWidth: 160 }}>
                        <input type="text" value={row.lab}
                          onChange={e => updateRow(row.id, { lab: e.target.value })}
                          placeholder="Laboratorio"
                          list="lab-list"
                          style={cellInputStyle} />
                        <datalist id="lab-list">
                          {KNOWN_LABS.map(l => <option key={l} value={l} />)}
                        </datalist>
                      </td>
                      {/* Parameter */}
                      <td style={{ padding: '6px 8px', minWidth: 210 }}>
                        <ParamSearch
                          value={row.parameter_raw || row.parameter_canonical}
                          onChange={(cid, p) => updateRow(row.id, {
                            parameter_canonical: cid,
                            parameter_raw: p?.display_name_es || cid,
                            unit: p?.unit_mx || '',
                            ref_low: p?.lab_ref_low != null ? String(p.lab_ref_low) : '',
                            ref_high: p?.lab_ref_high != null ? String(p.lab_ref_high) : '',
                            ref_operator: p?.lab_ref_operator || 'range',
                          })}
                        />
                      </td>
                      {/* Category badge */}
                      <td style={{ padding: '6px 8px', minWidth: 110 }}>
                        {cat && (
                          <span className={`chip cat-${slug}`}
                            style={{ fontSize: 11, color: `var(--cat-accent, var(--ink-50))`,
                              borderColor: `var(--cat-accent, var(--border))` }}>
                            {cat}
                          </span>
                        )}
                      </td>
                      {/* Value */}
                      <td style={{ padding: '6px 8px', minWidth: 90 }}>
                        <input type="text" value={row.value_numeric}
                          onChange={e => updateRow(row.id, { value_numeric: e.target.value })}
                          placeholder="Valor"
                          style={{ ...cellInputStyle,
                            fontWeight: row.flag ? 700 : 400,
                            color: row.flag ? 'var(--alarm)' : 'var(--ink)' }} />
                      </td>
                      {/* Ref Inf */}
                      <td style={{ padding: '6px 8px', minWidth: 72 }}>
                        <input type="text" value={row.ref_low}
                          onChange={e => updateRow(row.id, { ref_low: e.target.value })}
                          style={{ ...cellInputStyle, color: 'var(--ink-50)' }} />
                      </td>
                      {/* Ref Sup */}
                      <td style={{ padding: '6px 8px', minWidth: 72 }}>
                        <input type="text" value={row.ref_high}
                          onChange={e => updateRow(row.id, { ref_high: e.target.value })}
                          style={{ ...cellInputStyle, color: 'var(--ink-50)' }} />
                      </td>
                      {/* Flag */}
                      <td style={{ padding: '6px 8px', minWidth: 80 }}>
                        <select value={row.flag}
                          onChange={e => updateRow(row.id, { flag: e.target.value as EntryRow['flag'] })}
                          style={{ ...cellInputStyle,
                            color: row.flag ? 'var(--alarm)' : 'var(--ink-50)',
                            fontWeight: row.flag ? 700 : 400 }}>
                          <option value="">—</option>
                          <option value="up">↑ Alto</option>
                          <option value="down">↓ Bajo</option>
                        </select>
                      </td>
                      {/* Delete */}
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button onClick={() => removeRow(row.id)}
                          style={{ color: 'var(--ink-30)', fontSize: 18, lineHeight: 1,
                            padding: '0 6px', transition: 'color var(--dur-sm)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--alarm)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-30)')}
                          title="Eliminar">
                          ×
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={addRow} className="btn btn--ghost" style={{ fontSize: 13 }}>
            + Agregar fila
          </button>
        </div>
      </motion.section>

      {/* Download bar */}
      <section className="row row--spread">
        <div className="muted" style={{ fontSize: 13 }}>
          {readyCount} parámetro{readyCount !== 1 ? 's' : ''} listo{readyCount !== 1 ? 's' : ''} para exportar
        </div>
        <button onClick={downloadJson} className="btn"
          style={{ opacity: readyCount === 0 ? 0.5 : 1 }}>
          Descargar JSON →
        </button>
      </section>

      {/* Instructions */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="card"
      >
        <div className="card__head">
          <div className="card__title" style={{ fontSize: 16 }}>¿Cómo agregar estos datos al sitio?</div>
        </div>
        <div className="card__body">
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2.2, fontSize: 14,
            fontFamily: 'var(--font-ui)', color: 'var(--ink-70)' }}>
            <li>Descarga el JSON con el botón de arriba.</li>
            <li>
              Colócalo en{' '}
              <code style={{ fontFamily: 'var(--font-num)', fontSize: 12,
                background: 'var(--ink-06)', padding: '1px 6px', borderRadius: 4 }}>
                mylabs/data/
              </code>
              {' '}(e.g.{' '}
              <code style={{ fontFamily: 'var(--font-num)', fontSize: 12,
                background: 'var(--ink-06)', padding: '1px 6px', borderRadius: 4 }}>
                20260501-salud-digna.json
              </code>)
            </li>
            <li>
              Agrega el nombre del archivo a{' '}
              <code style={{ fontFamily: 'var(--font-num)', fontSize: 12,
                background: 'var(--ink-06)', padding: '1px 6px', borderRadius: 4 }}>
                mylabs/data/manifest.json
              </code>
              {' '}en el array{' '}
              <code style={{ fontFamily: 'var(--font-num)', fontSize: 12,
                background: 'var(--ink-06)', padding: '1px 6px', borderRadius: 4 }}>
                "files"
              </code>
            </li>
            <li>
              Haz{' '}
              <code style={{ fontFamily: 'var(--font-num)', fontSize: 12,
                background: 'var(--ink-06)', padding: '1px 6px', borderRadius: 4 }}>
                git add · commit · push
              </code>
            </li>
          </ol>

          <div style={{
            marginTop: 20, padding: '14px 16px',
            background: 'var(--surface)',
            border: '1.5px solid var(--ink)',
            borderRadius: 'var(--r-md)',
            fontSize: 13, lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
              ✓ Carga dinámica activada
            </div>
            <div style={{ color: 'var(--ink-70)' }}>
              El sitio lee automáticamente todos los archivos en{' '}
              <code style={{ fontFamily: 'var(--font-num)', fontSize: 12 }}>mylabs/data/</code>{' '}
              al cargar la página. Los nuevos resultados se fusionan con los datos compilados sin
              necesidad de reconstruir el sitio. Solo necesitas actualizar <code style={{ fontFamily: 'var(--font-num)', fontSize: 12 }}>manifest.json</code>{' '}
              con cada nuevo archivo que agregues.
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable mini styles
// ---------------------------------------------------------------------------
const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--ink-50)', display: 'block', marginBottom: 5,
  fontFamily: 'var(--font-ui)', fontWeight: 500, letterSpacing: '0.02em',
}
const thStyle: React.CSSProperties = {
  padding: '10px 8px', textAlign: 'left',
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--ink-50)',
  fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
}
