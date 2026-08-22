import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent, ReactNode } from 'react'
import labDataJson from '../data/lab-data.json'
import parameterLayoutJson from '../data/parameter-layout.json'
import type { LabData, Parameter } from '../lib/types'

const labData = labDataJson as unknown as LabData
const STORAGE_KEY = 'health-parameter-layout-v1'
const CATEGORIES = ['Hematología', 'Química', 'Lípidos', 'Hepática', 'Electrolitos', 'Endocrinología', 'Serología', 'Orina', 'LCR']
const ACCENTS: Record<string, string> = {
  Hematología: '#3f6f8f', Química: '#2d694c', Lípidos: '#714fac', Hepática: '#009766',
  Electrolitos: '#2f7c86', Endocrinología: '#52659a', Serología: '#86586f', Orina: '#69a96f', LCR: '#40302f',
}

const DEFAULT_VISIBLE_IDS = new Set([
  'leucocitos', 'eritrocitos', 'hemoglobina', 'hematocrito', 'vcm', 'hcm', 'chcm', 'rdw_cv', 'plaquetas', 'vpm', 'linfocitos_pct', 'neutrofilos_pct',
  'glucosa', 'urea', 'bun', 'creatinina', 'acido_urico', 'amilasa', 'lipasa',
  'colesterol_total', 'trigliceridos', 'colesterol_hdl', 'colesterol_ldl', 'colesterol_no_hdl', 'apo_b', 'lipoproteina_a',
  'bilirrubina_total', 'bilirrubina_directa', 'ast', 'alt', 'ggt', 'fosfatasa_alcalina', 'proteinas_totales', 'albumina',
  'sodio', 'potasio', 'cloruro', 'co2', 'calcio', 'fosforo', 'magnesio',
  'hba1c', 'tsh', 't4_libre', 't3_libre', 'insulina', 'cortisol', 'testosterona_total',
  'vdrl', 'sifilis_total', 'h_pylori_aliento', 'hla_b27', 'hiv_1_2',
])

type RowConfig = { id: string; name: string; unit: string; visible: boolean }
type Layout = Record<string, RowConfig[]>
type SavedLayout = { categories: Array<{ category: string; categoryOrder: number; items: Array<{ parameterId: string; order: number; visible: boolean }> }> }
type DragState = { category: string; id: string; visible: boolean } | null
type Variant = { name: string; axis: string }

const variants: Variant[] = [
  { name: 'Ledger directo', axis: 'contexto completo' },
  { name: 'Cola compacta', axis: 'máxima densidad' },
  { name: 'Visible / oculto', axis: 'prioridad explícita' },
]
const canonicalLayout = parameterLayoutJson as SavedLayout
const canonicalItems = new Map(canonicalLayout.categories.flatMap((category) => category.items.map((item) => [item.parameterId, { ...item, category: category.category }] as const)))

function lcrParameters(): Parameter[] {
  const byId = new Map<string, Parameter>()
  labData.lcrResults.forEach((row) => {
    if (byId.has(row.parameter_canonical)) return
    byId.set(row.parameter_canonical, {
      canonical_id: row.parameter_canonical,
      display_name_es: row.parameter_raw,
      display_name_en: '', category: 'LCR', unit_mx: row.unit, aliases: '',
      lab_ref_low: row.ref_low, lab_ref_high: row.ref_high, lab_ref_operator: row.ref_operator,
      guideline_target_low: null, guideline_target_high: null, guideline_note: '', guideline_source: '',
      plottable: row.value_numeric != null, notes: row.notes,
    })
  })
  return [...byId.values()]
}

function initialLayout(): Layout {
  const parameters = [...labData.parameters, ...lcrParameters()]
  return Object.fromEntries(CATEGORIES.map((category) => {
    const rows = parameters
      .filter((parameter) => parameter.category === category)
      .sort((a, b) => (canonicalItems.get(a.canonical_id)?.order ?? a.sort_weight ?? 100) - (canonicalItems.get(b.canonical_id)?.order ?? b.sort_weight ?? 100) || a.display_name_es.localeCompare(b.display_name_es))
      .map((parameter) => ({
        id: parameter.canonical_id,
        name: parameter.display_name_es,
        unit: parameter.unit_mx || '',
        visible: canonicalItems.get(parameter.canonical_id)?.visible ?? DEFAULT_VISIBLE_IDS.has(parameter.canonical_id),
      }))
    return [category, rows]
  }))
}

function reconcileLayout(saved: Layout | null): Layout {
  const fresh = initialLayout()
  if (!saved) return fresh
  return Object.fromEntries(CATEGORIES.map((category) => {
    const current = fresh[category]
    const currentById = new Map(current.map((row) => [row.id, row]))
    const restored = (saved[category] ?? [])
      .filter((row) => currentById.has(row.id))
      .map((row) => ({ ...currentById.get(row.id)!, visible: Boolean(row.visible) }))
    const restoredIds = new Set(restored.map((row) => row.id))
    return [category, [...restored, ...current.filter((row) => !restoredIds.has(row.id))]]
  }))
}

function useLayoutConfig() {
  const [layout, setLayout] = useState<Layout>(() => {
    try { return reconcileLayout(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Layout | null) }
    catch { return initialLayout() }
  })
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)) }, [layout])

  const toggle = useCallback((category: string, id: string) => {
    setLayout((current) => ({
      ...current,
      [category]: current[category].map((row) => row.id === id ? { ...row, visible: !row.visible } : row),
    }))
  }, [])

  const reorder = useCallback((category: string, sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    setLayout((current) => {
      const rows = [...current[category]]
      const from = rows.findIndex((row) => row.id === sourceId)
      const to = rows.findIndex((row) => row.id === targetId)
      if (from < 0 || to < 0) return current
      const [moved] = rows.splice(from, 1)
      rows.splice(to, 0, moved)
      return { ...current, [category]: rows }
    })
  }, [])

  const move = useCallback((category: string, id: string, direction: -1 | 1) => {
    setLayout((current) => {
      const rows = [...current[category]]
      const from = rows.findIndex((row) => row.id === id)
      const to = Math.max(0, Math.min(rows.length - 1, from + direction))
      if (from < 0 || from === to) return current
      const [moved] = rows.splice(from, 1)
      rows.splice(to, 0, moved)
      return { ...current, [category]: rows }
    })
  }, [])

  return { layout, setLayout, toggle, reorder, move }
}

function exportPayload(layout: Layout) {
  return {
    schema: 'health-parameter-layout/v1',
    generatedAt: new Date().toISOString(),
    instructions: 'El orden de items determina el orden visual. visible=false significa mostrar sólo bajo petición explícita.',
    categories: CATEGORIES.map((category, categoryIndex) => ({
      category,
      categoryOrder: categoryIndex + 1,
      items: layout[category].map((row, index) => ({
        parameterId: row.id,
        label: row.name,
        order: index + 1,
        visible: row.visible,
      })),
    })),
  }
}

function ExportControls({ layout }: { layout: Layout }) {
  const [message, setMessage] = useState('')
  const [showJson, setShowJson] = useState(false)
  const json = JSON.stringify(exportPayload(layout), null, 2)
  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(''), 1800) }
  const copy = async () => { await navigator.clipboard.writeText(json); notify('JSON copiado') }
  const download = () => {
    const href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = 'health-parameter-layout.json'
    anchor.click()
    URL.revokeObjectURL(href)
    notify('Archivo exportado')
  }
  return (
    <div className="export-controls">
      <button onClick={() => setShowJson((current) => !current)}>{showJson ? 'Ocultar JSON' : 'Ver JSON'}</button>
      <button onClick={copy}>Copiar JSON</button>
      <button className="export-primary" onClick={download}>Exportar archivo</button>
      <span role="status">{message}</span>
      {showJson && <textarea aria-label="Configuración JSON" readOnly value={json} />}
    </div>
  )
}

function ConfiguratorFrame({ layout, title, description, children }: { layout: Layout; title: string; description: string; children: ReactNode }) {
  const total = Object.values(layout).flat().length
  const visible = Object.values(layout).flat().filter((row) => row.visible).length
  return (
    <div className="organizer-shell">
      <header className="organizer-header">
        <div className="organizer-brand"><span>FGC</span><div><strong>Historial de salud</strong><small>Configuración de analitos</small></div></div>
        <div className="organizer-count"><strong>{visible}</strong><span>visibles de {total}</span></div>
      </header>
      <main className="organizer-main">
        <div className="organizer-intro">
          <div><span className="organizer-eyebrow">Prototipo interactivo</span><h1>{title}</h1><p>{description}</p></div>
          <ExportControls layout={layout} />
        </div>
        {children}
      </main>
    </div>
  )
}

function DragRow({ row, category, index, drag, setDrag, reorder, toggle, move, compact = false }: {
  row: RowConfig; category: string; index: number; drag: DragState; setDrag: (drag: DragState) => void;
  reorder: (category: string, sourceId: string, targetId: string) => void; toggle: (category: string, id: string) => void;
  move: (category: string, id: string, direction: -1 | 1) => void; compact?: boolean
}) {
  const isDragging = drag?.category === category && drag.id === row.id
  const start = (event: DragEvent) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', row.id)
    setDrag({ category, id: row.id, visible: row.visible })
  }
  return (
    <div
      className={`organizer-row${row.visible ? '' : ' is-hidden'}${isDragging ? ' is-dragging' : ''}${compact ? ' is-compact' : ''}`}
      draggable
      onDragStart={start}
      onDragEnd={() => setDrag(null)}
      onDragOver={(event) => { if (drag?.category === category && drag.visible === row.visible) event.preventDefault() }}
      onDragEnter={() => { if (drag?.category === category && drag.visible === row.visible) reorder(category, drag.id, row.id) }}
      onDrop={(event) => event.preventDefault()}
    >
      <span className="drag-handle" aria-hidden="true">⠿</span>
      <span className="row-index">{String(index + 1).padStart(2, '0')}</span>
      <label className="row-check"><input type="checkbox" checked={row.visible} onChange={() => toggle(category, row.id)} /><span aria-hidden="true">✓</span><span className="visually-hidden">Mostrar {row.name}</span></label>
      <div className="row-name"><strong>{row.name}</strong><small>{row.id}</small></div>
      <span className="row-unit">{row.unit || '—'}</span>
      <div className="row-keyboard" aria-label={`Mover ${row.name}`}>
        <button aria-label={`Subir ${row.name}`} onClick={() => move(category, row.id, -1)}>↑</button>
        <button aria-label={`Bajar ${row.name}`} onClick={() => move(category, row.id, 1)}>↓</button>
      </div>
    </div>
  )
}

type VariantProps = ReturnType<typeof useLayoutConfig>

function DirectLedger({ layout, toggle, reorder, move }: VariantProps) {
  const [drag, setDrag] = useState<DragState>(null)
  return (
    <ConfiguratorFrame layout={layout} title="Orden directo en el ledger" description="Arrastra cualquier fila dentro de su sección. El check decide si aparece en la vista inicial; las filas desmarcadas permanecen disponibles bajo petición.">
      <div className="direct-stack">
        {CATEGORIES.map((category) => <section className="direct-category" key={category} style={{ '--accent': ACCENTS[category] } as CSSProperties}>
          <div className="direct-category__head"><div><h2>{category}</h2><p>{layout[category].filter((row) => row.visible).length} visibles · {layout[category].length} totales</p></div><span>Arrastrar para ordenar</span></div>
          <div className="row-column">
            {layout[category].map((row, index) => <DragRow key={row.id} {...{ row, category, index, drag, setDrag, reorder, toggle, move }} />)}
          </div>
        </section>)}
      </div>
    </ConfiguratorFrame>
  )
}

function CompactQueue({ layout, toggle, reorder, move }: VariantProps) {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [query, setQuery] = useState('')
  const [drag, setDrag] = useState<DragState>(null)
  const rows = layout[category].filter((row) => row.name.toLocaleLowerCase('es-MX').includes(query.toLocaleLowerCase('es-MX')))
  return (
    <ConfiguratorFrame layout={layout} title="Cola compacta" description="Trabaja una sección a la vez. Está pensada para ordenar listas largas con menos desplazamiento y localizar analitos por nombre.">
      <div className="queue-layout">
        <aside className="queue-sidebar" aria-label="Categorías">
          {CATEGORIES.map((name) => <button key={name} data-active={name === category ? '' : undefined} onClick={() => { setCategory(name); setQuery('') }}><span style={{ background: ACCENTS[name] }} />{name}<small>{layout[name].filter((row) => row.visible).length}/{layout[name].length}</small></button>)}
        </aside>
        <section className="queue-panel" style={{ '--accent': ACCENTS[category] } as CSSProperties}>
          <div className="queue-toolbar"><div><span className="organizer-eyebrow">Sección activa</span><h2>{category}</h2></div><input aria-label="Buscar analito" placeholder="Buscar analito…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          {query && <p className="search-note">Al ordenar durante una búsqueda, la fila conserva su nueva posición en la lista completa.</p>}
          <div className="row-column queue-rows">
            {rows.map((row) => <DragRow key={row.id} row={row} category={category} index={layout[category].findIndex((item) => item.id === row.id)} {...{ drag, setDrag, reorder, toggle, move }} compact />)}
          </div>
        </section>
      </div>
    </ConfiguratorFrame>
  )
}

function VisibilitySplit({ layout, toggle, reorder, move }: VariantProps) {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [drag, setDrag] = useState<DragState>(null)
  const visible = layout[category].filter((row) => row.visible)
  const hidden = layout[category].filter((row) => !row.visible)
  return (
    <ConfiguratorFrame layout={layout} title="Prioridad visible / oculto" description="El check mueve cada analito entre las dos prioridades. Dentro de cada columna puedes arrastrar para decidir el orden en que se presentará.">
      <div className="split-tabs">{CATEGORIES.map((name) => <button key={name} data-active={name === category ? '' : undefined} onClick={() => setCategory(name)}>{name}</button>)}</div>
      <div className="split-grid" style={{ '--accent': ACCENTS[category] } as CSSProperties}>
        {[{ title: 'Se muestran', rows: visible, note: 'Vista inicial' }, { title: 'Ocultos', rows: hidden, note: 'Sólo bajo petición' }].map((group) => <section className="split-column" key={group.title}>
          <div className="split-column__head"><div><span className="organizer-eyebrow">{group.note}</span><h2>{group.title}</h2></div><strong>{group.rows.length}</strong></div>
          <div className="row-column">
            {group.rows.length ? group.rows.map((row) => <DragRow key={row.id} row={row} category={category} index={layout[category].findIndex((item) => item.id === row.id)} {...{ drag, setDrag, reorder, toggle, move }} compact />) : <p className="empty-list">No hay analitos en esta lista.</p>}
          </div>
        </section>)}
      </div>
    </ConfiguratorFrame>
  )
}

function Picker({ current, setCurrent }: { current: number; setCurrent: (index: number) => void }) {
  const pickerRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const highlightRef = useRef<HTMLSpanElement>(null)
  const moveHighlight = useCallback(() => {
    const item = itemRefs.current[current]
    if (!item || !highlightRef.current) return
    highlightRef.current.style.width = `${item.offsetWidth}px`
    highlightRef.current.style.transform = `translateX(${item.offsetLeft}px)`
  }, [current])
  useLayoutEffect(moveHighlight, [moveHighlight])
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => pickerRef.current?.setAttribute('data-ready', '')))
    window.addEventListener('resize', moveHighlight)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', moveHighlight) }
  }, [moveHighlight])
  return (
    <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {variants.map((variant, index) => <button key={variant.name} ref={(node) => { itemRefs.current[index] = node }} className="proto-picker-item" data-active={current === index ? '' : undefined} aria-current={current === index ? 'true' : undefined} onClick={() => setCurrent(index)}>{variant.name}</button>)}
    </nav>
  )
}

export default function ParameterOrganizerPrototype() {
  const config = useLayoutConfig()
  const initial = Math.max(0, Math.min(variants.length - 1, (Number.parseInt(new URLSearchParams(location.search).get('v') ?? '1', 10) || 1) - 1))
  const [current, setCurrentState] = useState(initial)
  const setCurrent = useCallback((index: number) => {
    setCurrentState(index)
    const url = new URL(location.href)
    url.searchParams.set('v', String(index + 1))
    history.replaceState(null, '', url)
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey) return
      const number = Number.parseInt(event.key, 10)
      if (number >= 1 && number <= variants.length) setCurrent(number - 1)
      else if (event.key === 'ArrowRight') setCurrent((current + 1) % variants.length)
      else if (event.key === 'ArrowLeft') setCurrent((current - 1 + variants.length) % variants.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, setCurrent])
  const surface = useMemo(() => {
    if (current === 0) return <DirectLedger {...config} />
    if (current === 1) return <CompactQueue {...config} />
    return <VisibilitySplit {...config} />
  }, [current, config])
  return <><div id="stage" key={current}>{surface}</div><Picker current={current} setCurrent={setCurrent} /></>
}
