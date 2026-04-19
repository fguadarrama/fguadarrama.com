import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { goeyToast } from 'goey-toast'
import { data, formatDate, abnormalCountOn } from '../lib/data'

export default function ReportBuilder() {
  const allDates = data.dates
  const [selected, setSelected] = useState<Set<string>>(new Set(allDates))
  const [generating, setGenerating] = useState(false)

  const orderedSelection = useMemo(
    () => [...selected].sort((a, b) => b.localeCompare(a)), // desc by date
    [selected],
  )

  const toggle = (d: string) => {
    const next = new Set(selected)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    setSelected(next)
  }

  const selectAll = () => setSelected(new Set(allDates))
  const selectNone = () => setSelected(new Set())
  const selectLatest3 = () => setSelected(new Set(allDates.slice(0, 3)))

  async function handleGenerate() {
    if (selected.size === 0) {
      goeyToast.warning('Selecciona al menos una fecha', {
        description: 'El reporte necesita al menos una fecha de resultados.',
      })
      return
    }
    setGenerating(true)
    try {
      await goeyToast.promise(
        (async () => {
          // Lazy-load the PDF module; keeps the initial bundle small
          const { generateReportBlob } = await import('../lib/pdf')
          const blob = await generateReportBlob(orderedSelection)
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `reporte-laboratorios-${new Date().toISOString().slice(0, 10)}.pdf`
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(url), 30_000)
          return { url, count: orderedSelection.length }
        })(),
        {
          loading: 'Generando reporte…',
          success: ({ count }) => `Reporte listo (${count} fecha${count === 1 ? '' : 's'})`,
          error: 'No se pudo generar el reporte',
          description: {
            success: 'La descarga debería haber comenzado.',
            error: 'Revisa la consola del navegador o vuelve a intentarlo.',
          },
        },
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="stack-6">
      <section>
        <div className="eyebrow">Reporte PDF</div>
        <h1 style={{ marginTop: 10 }}>
          Generar reporte
          <span className="muted" style={{ fontStyle: 'italic', marginLeft: 12, fontSize: '0.5em', fontWeight: 400 }}>
            una sección por fecha
          </span>
        </h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: 640 }}>
          Elige qué fechas incluir. Los valores fuera de rango aparecen resaltados en rojo y agrupados dentro de cada fecha.
        </p>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="card"
      >
        <div className="card__head">
          <div className="card__title">Fechas disponibles</div>
          <div className="row" style={{ gap: 8 }}>
            <button onClick={selectLatest3} className="chip" style={{ cursor: 'pointer' }}>Últimas 3</button>
            <button onClick={selectAll} className="chip" style={{ cursor: 'pointer' }}>Todas</button>
            <button onClick={selectNone} className="chip" style={{ cursor: 'pointer' }}>Ninguna</button>
          </div>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {allDates.map((d) => {
            const on = selected.has(d)
            const abnormal = abnormalCountOn(d)
            const rows = data.byDate[d] || []
            const lab = rows[0]?.lab || '—'
            return (
              <label
                key={d}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 'var(--s-4)',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: on ? 'var(--ink-06)' : 'transparent',
                  transition: 'background var(--dur-sm)',
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(d)}
                  style={{ width: 18, height: 18, accentColor: 'var(--ink)' }}
                />
                <div>
                  <div style={{ fontSize: 15 }}>{formatDate(d)}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {lab} · {rows.length} parámetro{rows.length === 1 ? '' : 's'}
                  </div>
                </div>
                {abnormal > 0 ? (
                  <span className="chip chip--alarm">{abnormal}</span>
                ) : (
                  <span className="chip chip--ok">ok</span>
                )}
              </label>
            )
          })}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="row row--spread"
      >
        <div className="muted" style={{ fontSize: 13 }}>
          {selected.size} fecha{selected.size === 1 ? '' : 's'} seleccionada{selected.size === 1 ? '' : 's'}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || selected.size === 0}
          className="btn"
          style={{ opacity: generating ? 0.6 : 1, cursor: generating ? 'wait' : 'pointer' }}
        >
          {generating ? 'Generando…' : 'Generar PDF →'}
        </button>
      </motion.section>
    </div>
  )
}
