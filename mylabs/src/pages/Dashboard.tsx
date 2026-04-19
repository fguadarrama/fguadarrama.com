import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  data,
  formatDate,
  formatDateLong,
  formatValue,
  isOutOfRange,
  latestDates,
  abnormalCountOn,
  trendOf,
} from '../lib/data'
import type { Result } from '../lib/types'

/** Staggered entry animation for cards/rows. Subtle, Emil Kowalski-y. */
const fade = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] },
  }),
}

function TrendArrow({ cid }: { cid: string }) {
  const t = trendOf(cid)
  if (!t) return null
  const arrow = t === 'up' ? '↑' : t === 'down' ? '↓' : '→'
  return <span className="muted" style={{ fontFamily: 'var(--font-num)', fontSize: 11 }}>{arrow}</span>
}

function ResultRow({ r }: { r: Result }) {
  const p = data.paramsById[r.parameter_canonical]
  if (!p) return null
  const out = isOutOfRange(r, p)
  const qualitative = r.value_numeric === null && !!r.value_text
  return (
    <Link
      to={`/parameter/${r.parameter_canonical}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 'var(--s-3)',
        alignItems: 'baseline',
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
        textDecoration: 'none',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.display_name_es}
        </div>
        <div className="muted" style={{ fontSize: 11 }}>
          {p.category} {p.unit_mx ? `· ${p.unit_mx}` : ''}
        </div>
      </div>
      <div
        className="num"
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: out ? 'var(--alarm)' : 'var(--ink)',
          textAlign: 'right',
        }}
      >
        {qualitative ? r.value_text : formatValue(r.value_numeric)}
      </div>
      <TrendArrow cid={r.parameter_canonical} />
    </Link>
  )
}

function DateCard({ date, index }: { date: string; index: number }) {
  const rows = [...(data.byDate[date] || [])]
  const abnormal = abnormalCountOn(date)

  // Sort: abnormal first (alphabetical within), then normals alphabetical
  rows.sort((a, b) => {
    const pa = data.paramsById[a.parameter_canonical]
    const pb = data.paramsById[b.parameter_canonical]
    const oa = isOutOfRange(a, pa)
    const ob = isOutOfRange(b, pb)
    if (oa !== ob) return oa ? -1 : 1
    return (pa?.display_name_es || '').localeCompare(pb?.display_name_es || '')
  })

  const lab = rows[0]?.lab || '—'

  return (
    <motion.article
      className="card"
      custom={index}
      initial="hidden"
      animate="show"
      variants={fade}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div className="card__head">
        <div>
          <div className="eyebrow">{lab}</div>
          <h2 style={{ marginTop: 4 }}>{formatDate(date)}</h2>
        </div>
        {abnormal > 0 ? (
          <span className="chip chip--alarm">
            <span className="dot" /> {abnormal} fuera de rango
          </span>
        ) : (
          <span className="chip chip--ok">todo en rango</span>
        )}
      </div>
      <div className="card__body">
        <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
          {rows.map((r) => (
            <ResultRow key={r.result_id} r={r} />
          ))}
        </div>
      </div>
    </motion.article>
  )
}

export default function Dashboard() {
  const dates = latestDates(3)
  const totalResults = data.counts.results
  const totalParams = Object.keys(data.byCanonical).length

  // Headline abnormal summary across the 3 shown dates
  const abnormalTotal = dates.reduce((n, d) => n + abnormalCountOn(d), 0)

  return (
    <div className="stack-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 'var(--s-5)',
          alignItems: 'end',
        }}
      >
        <div>
          <div className="eyebrow">Laboratorios · historial personal</div>
          <h1 style={{ marginTop: 10 }}>
            Resultados recientes
            <span className="muted" style={{ fontStyle: 'italic', marginLeft: 12, fontSize: '0.5em', fontWeight: 400 }}>
              últimas tres visitas
            </span>
          </h1>
        </div>
        <div className="row" style={{ gap: 'var(--s-5)' }}>
          <Stat label="resultados" value={totalResults} />
          <Stat label="parámetros" value={totalParams} />
          <Stat label="alertas" value={abnormalTotal} accent={abnormalTotal > 0} />
        </div>
      </motion.section>

      {/* 3 cards side by side */}
      <section className="grid-3">
        {dates.map((d, i) => (
          <DateCard key={d} date={d} index={i} />
        ))}
      </section>

      {/* Call to action */}
      <section className="row row--spread" style={{ paddingTop: 16 }}>
        <Link to="/browse" className="btn btn--ghost">
          Ver todos los parámetros
        </Link>
        <Link to="/report" className="btn">
          Generar reporte PDF →
        </Link>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div
        className="num"
        style={{
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: accent ? 'var(--alarm)' : 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>
    </div>
  )
}
