import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ClinicalWeight from './ClinicalWeight'
import ProgressWeight from './ProgressWeight'
import WeightJournal from './WeightJournal'

const variants = [
  { name: 'Registro clínico', axis: 'gráfica y tabla simultáneas' },
  { name: 'Progreso', axis: 'cambio y tendencia dominantes' },
  { name: 'Diario', axis: 'cronología y captura rápida' },
]

function Picker({ current, setCurrent, replay }: { current: number; setCurrent: (index: number) => void; replay: () => void }) {
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
  return <nav ref={pickerRef} className="proto-picker" aria-label="Variantes del prototipo">
    <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
    {variants.map((variant, index) => <button key={variant.name} title={variant.axis} ref={(node) => { itemRefs.current[index] = node }} className="proto-picker-item" data-active={current === index ? '' : undefined} aria-current={current === index ? 'true' : undefined} onClick={() => setCurrent(index)}>{variant.name}</button>)}
    <span className="proto-picker-divider" aria-hidden="true" />
    <button className="proto-picker-item proto-picker-replay" aria-label="Repetir animación (R)" onClick={replay}>↻</button>
  </nav>
}

export default function WeightPrototype() {
  const initial = Math.max(0, Math.min(variants.length - 1, (Number.parseInt(new URLSearchParams(location.search).get('v') ?? '1', 10) || 1) - 1))
  const [current, setCurrentState] = useState(initial)
  const [replayKey, setReplayKey] = useState(0)
  const setCurrent = useCallback((index: number) => {
    setCurrentState(index)
    const url = new URL(location.href); url.searchParams.set('v', String(index + 1)); history.replaceState(null, '', url)
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey) return
      const number = Number.parseInt(event.key, 10)
      if (number >= 1 && number <= variants.length) setCurrent(number - 1)
      else if (event.key === 'ArrowRight') setCurrent((current + 1) % variants.length)
      else if (event.key === 'ArrowLeft') setCurrent((current - 1 + variants.length) % variants.length)
      else if (event.key.toLowerCase() === 'r') setReplayKey((key) => key + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, setCurrent])
  const surface = useMemo(() => current === 0 ? <ClinicalWeight /> : current === 1 ? <ProgressWeight /> : <WeightJournal />, [current, replayKey])
  return <><div id="stage" key={`${current}-${replayKey}`}>{surface}</div><Picker current={current} setCurrent={setCurrent} replay={() => setReplayKey((key) => key + 1)} /></>
}
