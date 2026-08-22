import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  data,
  useLiveData,
  displayResultValue,
  formatUnit,
  isOutOfRange,
  shortDate3Letter,
  categorySlug,
  parametersInCategory,
  datesForCategory,
  findResult,
  sortCategories,
  isCollapsibleCategory,
  seriesFor,
} from '../lib/data'
import ParameterDrawer from '../components/ParameterDrawer'
import ElectrophoresisChart from '../components/ElectrophoresisChart'
import type { Parameter } from '../lib/types'
import parameterLayoutJson from '../data/parameter-layout.json'

type ParameterLayout = { categories: Array<{ category: string; categoryOrder: number; items: Array<{ parameterId: string; order: number; visible: boolean }> }> }
const parameterLayout = parameterLayoutJson as ParameterLayout
const LAYOUT_ITEMS = new Map(parameterLayout.categories.flatMap((category) => category.items.map((item) => [item.parameterId, item] as const)))
const CATEGORY_ORDER = new Map(parameterLayout.categories.map((category) => [category.category, category.categoryOrder]))

function CalendarDatesIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-96-88v64a8,8,0,0,1-16,0V132.94l-4.42,2.22a8,8,0,0,1-7.16-14.32l16-8A8,8,0,0,1,112,120Zm59.16,30.45L152,176h16a8,8,0,0,1,0,16H136a8,8,0,0,1-6.4-12.8l28.78-38.37A8,8,0,1,0,145.07,132a8,8,0,1,1-13.85-8A24,24,0,0,1,176,136,23.76,23.76,0,0,1,171.16,150.45Z" /></svg>
}

function MoreAnalytesIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64Zm8,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm104,48H40a8,8,0,0,0,0,16H144a8,8,0,0,0,0-16Zm88,0H216V168a8,8,0,0,0-16,0v16H184a8,8,0,0,0,0,16h16v16a8,8,0,0,0,16,0V200h16a8,8,0,0,0,0-16Z" /></svg>
}

function TableControls({ showDates, showRows, showAll, showEveryRow, hiddenCount, onToggleDates, onToggleRows }: { showDates: boolean; showRows: boolean; showAll: boolean; showEveryRow: boolean; hiddenCount: number; onToggleDates: () => void; onToggleRows: () => void }) {
  const datesLabel = showAll ? 'Mostrar las últimas 5 fechas' : 'Mostrar todas las fechas'
  const rowsLabel = showEveryRow ? 'Mostrar la selección de analitos' : `Mostrar ${hiddenCount} analitos restantes`
  return <div className="ctable__controls">
    {showDates && <button className="ctable__icon-btn" type="button" data-cuelume-toggle="toggle" onClick={onToggleDates} aria-label={datesLabel} title={datesLabel} aria-pressed={showAll}><CalendarDatesIcon /></button>}
    {showRows && <button className="ctable__icon-btn" type="button" data-cuelume-toggle="toggle" onClick={onToggleRows} aria-label={rowsLabel} title={rowsLabel} aria-pressed={showEveryRow}><MoreAnalytesIcon /></button>}
  </div>
}

function CategoryPanel({
  cat,
  onPick,
  collapsible = false,
}: {
  cat: string
  onPick: (cid: string) => void
  collapsible?: boolean
}) {
  const allParams = useMemo(() => parametersInCategory(cat).sort((a, b) => (LAYOUT_ITEMS.get(a.canonical_id)?.order ?? 10000) - (LAYOUT_ITEMS.get(b.canonical_id)?.order ?? 10000)), [cat])
  const allDates = useMemo(() => datesForCategory(cat), [cat])
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showEveryRow, setShowEveryRow] = useState(false)
  const selectedParams = allParams.filter((parameter) => LAYOUT_ITEMS.get(parameter.canonical_id)?.visible)
  const params = showEveryRow ? allParams : selectedParams
  const hiddenCount = allParams.length - selectedParams.length
  const dates = showAll ? allDates : allDates.slice(0, 5)

  if (allParams.length === 0) return null

  const slug = categorySlug(cat)
  const shouldShowMoreButton = allDates.length > 5

  const body = (
    <>
      <div className="cat-panel__header">
        <div className="cat-panel__heading"><div className="cat-panel__title">{catHeading(cat)}</div></div>
        <div className="cat-panel__actions">
          {(!collapsible || expanded) && <TableControls showDates={shouldShowMoreButton} showRows={hiddenCount > 0} showAll={showAll} showEveryRow={showEveryRow} hiddenCount={hiddenCount} onToggleDates={() => setShowAll((value) => !value)} onToggleRows={() => setShowEveryRow((value) => !value)} />}
          {collapsible && (
            <button className="ctable__expand-btn" data-cuelume-toggle="toggle" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? 'Ocultar ↑' : 'Mostrar ↓'}
            </button>
          )}
        </div>
      </div>

      {(!collapsible || expanded) && (
        <div className="cat-panel__body" role="region" aria-label={`${catHeading(cat)}: resultados por fecha`} tabIndex={0}>
          <table className="ctable" style={{ minWidth: 228 + dates.length * 96 }}>
            <colgroup>
              <col className="ctable__col-name" />
              <col className="ctable__col-unit" />
              {dates.map((date) => <col key={date} className="ctable__col-date" />)}
            </colgroup>
            <thead>
              <tr>
                <th className="ctable__name">Analito</th>
                <th className="ctable__unit">Unidad</th>
                {dates.map((d) => (
                  <th key={d} className="ctable__date">{shortDate3Letter(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <ParamRow key={p.canonical_id} p={p} dates={dates} onPick={onPick} />
              ))}
            </tbody>
          </table>
          {/* Electrophoresis chart — only shown for Lípidos panel when data exists */}
          {cat === 'Lípidos' && seriesFor('electroforesis_alfa').length > 0 && (
            <ElectrophoresisToggle />
          )}
        </div>
      )}
    </>
  )

  return <section className={`cat-panel cat-${slug}${collapsible && !expanded ? ' cat-panel--collapsed' : ''}`}>{body}</section>
}

function ElectrophoresisToggle() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: '0.5px solid var(--border)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 20px',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--cat-accent, var(--ink))',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background var(--dur-sm)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--cat-accent-soft, var(--ink-06))')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span>Electroforesis de lipoproteínas</span>
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-50)' }}>
          {open ? 'Ocultar ↑' : 'Ver visualización →'}
        </span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden', padding: '0 16px 20px' }}
        >
          <ElectrophoresisChart />
        </motion.div>
      )}
    </div>
  )
}


function ParamRow({
  p,
  dates,
  onPick,
}: {
  p: Parameter
  dates: string[]
  onPick: (cid: string) => void
}) {
  return (
    <tr
      data-cuelume-hover="tick"
      data-cuelume-toggle="page"
      onClick={() => onPick(p.canonical_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPick(p.canonical_id)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Ver evolución de ${p.display_name_es}`}
    >
      <td className="ctable__name">{p.display_name_es}</td>
      <td className="ctable__unit">{formatUnit(p.unit_mx || '')}</td>
      {dates.map((d) => {
        const r = findResult(p.canonical_id, d)
        if (!r) return <td key={d} className="is-empty">·</td>
        const ab = isOutOfRange(r, p)
        return (
          <td key={d} className={ab ? 'is-abnormal' : ''}>
            {displayResultValue(r, p)}
          </td>
        )
      })}
    </tr>
  )
}

function catHeading(cat: string): string {
  const map: Record<string, string> = {
    'Hematología': 'Biometría hemática',
    'Hepática': 'Pruebas de funcionamiento hepático',
    'Química': 'Química sanguínea',
    'Lípidos': 'Perfil de lípidos',
    'Endocrinología': 'Endocrinología',
    'Electrolitos': 'Electrolitos séricos',
    'Orina': 'Examen general de orina',
    'Serología': 'Serología',
    'LCR': 'Líquido cefalorraquídeo',
    'Infecciosos': 'Infecciosos',
  }
  return map[cat] || cat
}

export default function Dashboard() {
  useLiveData()  // re-render when dynamic JSON files are loaded at runtime
  const [openCid, setOpenCid] = useState<string | null>(null)

  const { mainCats, collapsedCats } = useMemo(() => {
    const all = [...new Set(data.parameters.map((p) => p.category))].filter(Boolean)
    const withData = sortCategories(all).filter((c) => parametersInCategory(c).length > 0).sort((a, b) => (CATEGORY_ORDER.get(a) ?? 10000) - (CATEGORY_ORDER.get(b) ?? 10000))
    return {
      mainCats: withData.filter((c) => !isCollapsibleCategory(c)),
      collapsedCats: withData.filter((c) => isCollapsibleCategory(c)),
    }
  }, [])

  return (
    <>
      <div className="stack-5">
        <section className="stack-5">
          {mainCats.map((cat, i) => (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <CategoryPanel cat={cat} onPick={setOpenCid} />
            </motion.div>
          ))}
        </section>

        {collapsedCats.length > 0 && (
          <section className="stack-3" style={{ marginTop: 'var(--s-7)' }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Secciones secundarias</div>
            {collapsedCats.map((cat, i) => (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: (mainCats.length + i) * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <CategoryPanel cat={cat} onPick={setOpenCid} collapsible />
              </motion.div>
            ))}
          </section>
        )}
      </div>

      <ParameterDrawer cid={openCid} onClose={() => setOpenCid(null)} />
    </>
  )
}
