type FranciscoCue = 'press' | 'release' | 'toggle' | 'success' | 'chime' | 'tick' | 'page' | 'scan'

let context: AudioContext | null = null
let master: GainNode | null = null
let primed = false
let bound = false
let lastHoverAt = 0

function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return null
    context = new AudioContextConstructor()
    master = context.createGain()
    master.gain.value = 0.055
    master.connect(context.destination)
  }
  if (context.state === 'suspended') void context.resume().catch(() => {})
  primed = true
  return context
}

function tone(
  frequency: number,
  duration: number,
  start = 0,
  options: { type?: OscillatorType; gain?: number; to?: number; curve?: 'soft' } = {},
) {
  const audio = ensureAudio()
  if (!audio || !master) return
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  const time = audio.currentTime + start
  oscillator.type = options.type ?? 'sine'
  oscillator.frequency.setValueAtTime(frequency, time)
  if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, time + duration)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.8, time + Math.min(0.018, duration * 0.28))
  if (options.curve === 'soft') gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
  else gain.gain.setTargetAtTime(0.0001, time + duration * 0.45, duration * 0.18)
  oscillator.connect(gain)
  gain.connect(master)
  oscillator.start(time)
  oscillator.stop(time + duration + 0.035)
}

/** Exact interaction palette used by fguadarrama.com. */
export function play(cue: FranciscoCue = 'tick') {
  if (typeof document === 'undefined' || document.hidden) return
  const resolved = cue === 'page' ? 'chime' : cue === 'scan' ? 'success' : cue
  if (!primed && resolved === 'tick') return
  switch (resolved) {
    case 'press':
      tone(196, 0.055, 0, { type: 'triangle', gain: 0.52, to: 168 })
      break
    case 'release':
      tone(300, 0.06, 0, { gain: 0.45, to: 365 })
      break
    case 'toggle':
      tone(260, 0.075, 0, { gain: 0.46, to: 390, curve: 'soft' })
      tone(520, 0.09, 0.035, { gain: 0.34, to: 650, curve: 'soft' })
      break
    case 'success':
      tone(440, 0.07, 0, { gain: 0.42, curve: 'soft' })
      tone(660, 0.1, 0.055, { gain: 0.34, curve: 'soft' })
      break
    case 'chime':
      tone(392, 0.09, 0, { gain: 0.34, curve: 'soft' })
      tone(784, 0.12, 0.045, { gain: 0.25, curve: 'soft' })
      break
    default:
      tone(620, 0.032, 0, { gain: 0.22, to: 740 })
  }
}

function soundTarget(event: Event, attribute: string): HTMLElement | null {
  const target = event.target
  return target instanceof Element ? target.closest<HTMLElement>(`[${attribute}]`) : null
}

export function bind() {
  if (bound || typeof document === 'undefined') return
  bound = true
  document.addEventListener('pointerdown', ensureAudio, { once: true, passive: true })
  document.addEventListener('pointerover', (event) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const target = soundTarget(event, 'data-cuelume-hover')
    if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return
    const now = performance.now()
    if (now - lastHoverAt < 150) return
    lastHoverAt = now
    play((target.dataset.cuelumeHover || 'tick') as FranciscoCue)
  }, { passive: true })
  document.addEventListener('pointerdown', (event) => {
    const target = soundTarget(event, 'data-cuelume-press')
    if (target) play((target.dataset.cuelumePress || 'press') as FranciscoCue)
  }, { passive: true })
  document.addEventListener('pointerup', (event) => {
    const target = soundTarget(event, 'data-cuelume-release')
    if (target) play((target.dataset.cuelumeRelease || 'release') as FranciscoCue)
  }, { passive: true })
  document.addEventListener('click', (event) => {
    const target = soundTarget(event, 'data-cuelume-toggle')
    if (target) play((target.dataset.cuelumeToggle || 'toggle') as FranciscoCue)
  })
}
