import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import NumberFlow from '@number-flow/react'
import ParameterDrawer from '../components/ParameterDrawer'
import { data, displayResultValue, formatUnit, isOutOfRange, shortDate3Letter } from '../lib/data'
import { formatWeight } from '../data/weight-data'
import { useWeightStore } from '../stores/weightStore'
import '../styles/integrated-pages.css'

type Filter = 'Todo' | 'Laboratorios' | 'Peso'
type TimelineEvent = {
  key: string
  date: string
  type: 'lab' | 'weight'
}

function longDate(date: string) {
  return shortDate3Letter(date)
}

export default function Timeline() {
  const weights = useWeightStore((state) => state.records)
  const [filter, setFilter] = useState<Filter>('Todo')
  const [openCid, setOpenCid] = useState<string | null>(null)

  const events = useMemo(() => {
    const labEvents: TimelineEvent[] = data.dates.map((date) => ({ key: `lab-${date}`, date, type: 'lab' }))
    const weightEvents: TimelineEvent[] = weights.map((record) => ({ key: `weight-${record.id}`, date: record.date, type: 'weight' }))
    return [...labEvents, ...weightEvents]
      .filter((event) => filter === 'Todo' || (filter === 'Laboratorios' ? event.type === 'lab' : event.type === 'weight'))
      .sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type))
  }, [filter, weights])

  return (
    <div className="integrated-timeline">
      <header className="page-heading timeline-heading">
        <div><span className="eyebrow">Historial</span><h1>Cronología</h1></div>
        <div className="segmented-control" aria-label="Filtrar cronología">
          {(['Todo', 'Laboratorios', 'Peso'] as const).map((option) => (
            <button key={option} data-active={filter === option ? '' : undefined} onClick={() => setFilter(option)}>{option}</button>
          ))}
        </div>
      </header>

      <section className="real-timeline">
        {events.map((event, index) => {
          if (event.type === 'weight') {
            const record = weights.find((item) => `weight-${item.id}` === event.key)!
            return (
              <motion.article className="real-timeline-event weight-event" key={event.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.16), ease: [0.23, 1, 0.32, 1] }}>
                <time>{longDate(record.date)}</time>
                <i aria-hidden="true" />
                <div className="timeline-event-card">
                  <header><span className="eyebrow section-accent-weight">Peso</span></header>
                  <div className="timeline-weight-values"><p><NumberFlow value={record.weight} /> <small>kg</small></p><p>{record.bodyFat != null ? <><NumberFlow value={record.bodyFat} /> <small>% grasa</small></> : 'Sin grasa corporal'}</p></div>
                  <footer>{record.source}</footer>
                </div>
              </motion.article>
            )
          }

          const rows = data.byDate[event.date] ?? []
          const abnormal = rows.filter((row) => isOutOfRange(row, data.paramsById[row.parameter_canonical]))
          const shown = (abnormal.length ? abnormal : rows).slice(0, 5)
          const labs = [...new Set(rows.map((row) => row.lab).filter(Boolean))]
          return (
            <motion.article className="real-timeline-event lab-event" key={event.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.16), ease: [0.23, 1, 0.32, 1] }}>
              <time>{longDate(event.date)}</time>
              <i aria-hidden="true" />
              <div className="timeline-event-card">
                <header><span className="eyebrow">Laboratorios</span><strong>{labs.join(' · ') || 'Laboratorio no especificado'}</strong></header>
                <div className="timeline-result-grid">
                  {shown.map((row) => {
                    const parameter = data.paramsById[row.parameter_canonical]
                    const out = isOutOfRange(row, parameter)
                    return <button key={row.result_id} onClick={() => setOpenCid(row.parameter_canonical)}><span>{parameter.display_name_es}</span><strong className={out ? 'is-abnormal' : undefined}>{displayResultValue(row, parameter)} <small>{formatUnit(row.unit || parameter.unit_mx)}</small></strong></button>
                  })}
                </div>
                <footer>{rows.length} resultados{abnormal.length ? ` · ${abnormal.length} fuera de rango` : ''}</footer>
              </div>
            </motion.article>
          )
        })}
      </section>

      <ParameterDrawer cid={openCid} onClose={() => setOpenCid(null)} />
    </div>
  )
}
