/** User-provided hoverKps7g. One sound per row/control boundary. */
export const hoverKps7g={source:{type:'sine' as OscillatorType,frequency:1597.026},envelope:{attack:0,decay:.015,sustain:0,release:.005},gain:1.585,filter:{type:'bandpass' as BiquadFilterType,frequency:3960,Q:20}}
declare global { interface Window { __healthUiHover?:()=>void; __healthChartPointer?:boolean } }
export const CHART_SURFACE='svg.recharts-surface,svg[role="img"],svg[aria-label="Electroforesis de lipoproteínas"],.composition-stage>svg,.composition-gauges svg,.temporal-chart>svg,[_echarts_instance_] svg'
export function isChartTarget(target:EventTarget|null){
  return target instanceof Element && !!target.closest(`${CHART_SURFACE},.recharts-wrapper,.weight-chart,.drawer-chart,.composition-stage,.composition-gauges,.temporal-chart,[_echarts_instance_]`)
}
let audio:AudioContext|null=null
export function primeUiHover(){try{audio??=new AudioContext({latencyHint:'interactive'});if(audio.state==='suspended')void audio.resume().catch(()=>{})}catch{}}
export function getHoverAudio(){primeUiHover();return audio}
export function playUiHover(){
  if(document.hidden||window.__healthChartPointer)return
  primeUiHover();if(!audio||audio.state!=='running')return
  const t=audio.currentTime,osc=audio.createOscillator(),filter=audio.createBiquadFilter(),amp=audio.createGain()
  osc.type=hoverKps7g.source.type;osc.frequency.setValueAtTime(hoverKps7g.source.frequency,t)
  filter.type=hoverKps7g.filter.type;filter.frequency.setValueAtTime(hoverKps7g.filter.frequency,t);filter.Q.setValueAtTime(hoverKps7g.filter.Q,t)
  // attack 0, decay .015, sustain 0, release .005, gain 1.585.
  amp.gain.setValueAtTime(hoverKps7g.gain,t);amp.gain.linearRampToValueAtTime(hoverKps7g.envelope.sustain,t+hoverKps7g.envelope.decay);amp.gain.setValueAtTime(0,t+hoverKps7g.envelope.decay+hoverKps7g.envelope.release)
  osc.connect(filter).connect(amp).connect(audio.destination);osc.start(t);osc.stop(t+.020)
}
export function logicalHoverTarget(target:EventTarget|null):Element|null{
  if(!(target instanceof Element)||isChartTarget(target))return null
  return target.closest('tbody tr,[role="row"]')||target.closest('.gdock-item,[data-cuelume-hover],button,a[href],summary,[role="button"]')
}
export function bindHoverRouting(){
  // Legacy tick dispatchers must not synthesize a second hover voice.
  // The one delegated boundary listener below owns all UI hover audio.
  window.__healthUiHover=()=>{}
  // General UI hover audio disabled by the owner; charts keep their own tones.
  const mark=(event:Event)=>{window.__healthChartPointer=isChartTarget(event.target)}
  document.addEventListener('pointermove',mark,{capture:true,passive:true})
  document.addEventListener('pointerover',mark,{capture:true,passive:true})
  document.addEventListener('pointerout',event=>{if(!(event as PointerEvent).relatedTarget)window.__healthChartPointer=false},{capture:true,passive:true})
  primeUiHover()
  document.addEventListener('pointerdown',primeUiHover,{capture:true,passive:true})
  document.addEventListener('keydown',primeUiHover,{capture:true,passive:true})
  document.addEventListener('focusin',primeUiHover,{passive:true})
}
