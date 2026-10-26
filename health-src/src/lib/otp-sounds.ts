/** Bencho One-time code sound cues, MIT — https://bencho.dev/licence.
 * Exact published deny/perk oscillator, filter, gain and envelope values.
 * Digit feedback uses Wake slider notch with its position-to-pitch mapping. */
let audio: AudioContext | null = null
export function primeOtpAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume().catch(() => {})
  } catch { /* The field works when audio is unavailable. */ }
}
export function otpSound(cue: 'deny' | 'perk' | 'digit', position = 0, count = 7) {
  if (!audio || document.hidden) return
  const a = cue === 'digit'
    ? {hz:230,to:230,ms:49,gain:0.096,cut:820,atk:6,wave:'sine' as OscillatorType}
    : cue === 'deny'
    ? {hz:208,to:165,ms:120,gain:0.03,cut:520,atk:10}
    : {hz:330,to:330,ms:360,gain:0.053,cut:560,atk:90}
  // Wake slider notch: pitch = 0.75 + normalized position * 0.75.
  const pitch = cue === 'digit' ? 0.75 + Math.min(1, Math.max(0, position / Math.max(1,count-1))) * 0.75 : 1
  const t=audio.currentTime, end=t+a.ms/1000
  const osc=audio.createOscillator(), filter=audio.createBiquadFilter(), gain=audio.createGain()
  osc.type=('wave' in a ? a.wave : 'sine') as OscillatorType; osc.frequency.setValueAtTime(a.hz*pitch,t)
  if (a.to!==a.hz) osc.frequency.exponentialRampToValueAtTime(a.to*pitch,end)
  filter.type='lowpass'; filter.frequency.value=a.cut
  gain.gain.setValueAtTime(0.0001,t)
  gain.gain.exponentialRampToValueAtTime(a.gain,t+Math.min(a.atk/1000,a.ms/1000*0.6))
  gain.gain.exponentialRampToValueAtTime(0.0001,end)
  osc.connect(filter).connect(gain).connect(audio.destination)
  osc.start(t);osc.stop(end+0.02)
}
