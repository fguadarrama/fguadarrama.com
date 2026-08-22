import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  data,
  useLiveData,
  displayResultValue,
  isOutOfRange,
  latestResultFor,
  seriesFor,
  sortCategories,
  categorySlug,
} from '../lib/data'
import ParameterDrawer from '../components/ParameterDrawer'
import type { Parameter } from '../lib/types'

function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  if (values.length < 2) return null
  const w = 80
  const h = 24
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={0.7}
      />
      <circle cx={w} cy={h - ((values[values.length - 1] - min) / range) * h} r={2.5} fill={accent} />
    </svg>
  )
}

function ParamRow({
  p,
  index,
  onPick,
}: {
  p: Parameter
  index: number
  onPick: (cid: string) => void
}) {
  const last = latestResultFor(p.canonical_id)
  const series = seriesFor(p.canonical_id)
  const numericSeries = series.map((r) => r.value_numeric).filter((v): v is number => v !== null)
  const out = last ? isOutOfRange(last, p) : false
  const accent = `var(--cat-${categorySlug(p.category)})`

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.015, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={() => onPick(p.canonical_id)}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 100px auto',
          gap: 'var(--s-4)',
          alignItems: 'center',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          transition: 'background var(--dur-sm)',
          borderRadius: 'var(--r-md)',
          textAlign: 'left',
          width: '100%',
          color: 'inherit',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--ink-06)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        <div>
          <div style={{ fontSize: 13 }}>{p.display_name_es}</div>
          <div className="muted" style={{ fontSize: 11 }}>
            {series.length} medicione{series.length === 1 ? '' : 's'}
            {p.unit_mx ? ` · ${p.unit_mx}` : ''}
          </div>
        </div>
        <div
          className="num"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: out ? 'var(--alarm)' : 'var(--ink)',
            textAlign: 'right',
            minWidth: 72,
          }}
        >
          {last
            ? last.value_numeric !== null
              ? displayResultValue(last, p)
              : last.value_text
            : '—'}
        </div>
        <div>
          <Sparkline values={numericSeries} accent={accent} />
        </div>
        <div className="muted" style={{ fontSize: 12 }}>→</div>
      </button>
    </motion.div>
  )
}

export default function Browse() {
  useLiveData()
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [openCid, setOpenCid] = useState<string | null>(null)

  const categories = useMemo(
    () => sortCategories([...new Set(data.parameters.map((p) => p.category))].filter(Boolean)),
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.parameters.filter((p) => {
      if (activeCat && p.category !== activeCat) return false
      // Include parameters with any measurements (even just 1)
      if (!data.byCanonical[p.canonical_id]) return false
      if (!q) return true
      return (
        p.display_name_es.toLowerCase().includes(q) ||
        p.display_name_en.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.canonical_id.toLowerCase().includes(q) ||
        (p.aliases || '').toLowerCase().includes(q)
      )
    })
  }, [query, activeCat])

  const byCat: Record<string, Parameter[]> = {}
  for (const p of filtered) {
    if (!byCat[p.category]) byCat[p.category] = []
    byCat[p.category].push(p)
  }
  for (const c of Object.keys(byCat)) {
    byCat[c].sort((a, b) => a.display_name_es.localeCompare(b.display_name_es))
  }
  const orderedCats = sortCategories(Object.keys(byCat))

  return (
    <>
      <div className="stack-6">
        <section>
          <div className="eyebrow">Explorar</div>
          <h1 style={{ marginTop: 10 }}>
            Todos los parámetros
            <span
              className="muted"
              style={{ fontStyle: 'italic', marginLeft: 12, fontSize: '0.5em', fontWeight: 400 }}
            >
              {filtered.length} con datos
            </span>
          </h1>
        </section>

        <section className="stack-4">
          <div style={{ position: 'relative' }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar · hemoglobina, LDL, TSH…"
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-pill)',
                fontSize: 16,
                outline: 'none',
                transition: 'border-color var(--dur-sm)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--ink)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)'
              }}
            />
          </div>

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveCat(null)}
              className={'chip' + (activeCat === null ? ' chip--date' : '')}
              style={{ cursor: 'pointer' }}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c === activeCat ? null : c)}
                className={'chip' + (activeCat === c ? ' chip--date' : '')}
                style={{ cursor: 'pointer' }}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="stack-6">
          {orderedCats.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: 48 }}>
              Sin resultados para esta búsqueda.
            </div>
          ) : (
            orderedCats.map((cat) => (
              <div key={cat} className={`card cat-${categorySlug(cat)}`}>
                <div className="card__head">
                  <div className="card__title" style={{ color: `var(--cat-${categorySlug(cat)})` }}>{cat}</div>
                  <span className="chip">{byCat[cat].length}</span>
                </div>
                <div className="card__body" style={{ padding: 0 }}>
                  {byCat[cat].map((p, i) => (
                    <ParamRow key={p.canonical_id} p={p} index={i} onPick={setOpenCid} />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <ParameterDrawer cid={openCid} onClose={() => setOpenCid(null)} />
    </>
  )
}
