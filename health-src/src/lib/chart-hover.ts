import { bindHoverRouting, CHART_SURFACE, getHoverAudio } from './hover-audio'
/** Bencho Pull: one note when the actual tooltip data index changes.
 * Never treat interpolation samples or mouse pixels as clinical readings. */
type ChartState={activeTooltipIndex?:string|number|null;isTooltipActive?:boolean}
declare global{interface Window{__healthChartPoint?:(state:ChartState)=>void;__healthChartLeave?:()=>void}}
const clamp=(v:number)=>Math.max(0,Math.min(1,v))
let voice:{osc:OscillatorNode;gain:GainNode}|null=null
export function chartHoverTone(at:number){
  if(document.hidden)return
  const audio=getHoverAudio();if(!audio||audio.state!=='running')return
  const t=audio.currentTime,pitch=.75+clamp(at)*.75
  // One voice. Crossing quickly to another reading cuts the previous tail.
  if(voice){voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(.0001,t,.002);try{voice.osc.stop(t+.008)}catch{}}
  const osc=audio.createOscillator(),filter=audio.createBiquadFilter(),gain=audio.createGain()
  osc.type='sine';osc.frequency.setValueAtTime(174*pitch,t);osc.frequency.exponentialRampToValueAtTime(155*pitch,t+.25)
  filter.type='lowpass';filter.frequency.value=640
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.034,t+.028);gain.gain.exponentialRampToValueAtTime(.0001,t+.25)
  osc.connect(filter).connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.27);voice={osc,gain}
}
/** Shared by the tooltip hook and the DOM fallback. No timers or queued notes. */
export function createPointGate(){
  let points=new WeakMap<object,string>()
  return {accept(chart:object,value:string|number){const key=String(value);if(points.get(chart)===key)return false;points.set(chart,key);return true},clear(){points=new WeakMap()}}
}
function dots(svg:SVGSVGElement){
  const groups=svg.querySelectorAll('.recharts-line-dots')
  const group=groups[groups.length-1];if(!group)return []
  return [...group.querySelectorAll('circle[cx][cy],rect[x][y]')].map(node=>({
    x:Number(node.getAttribute(node.tagName==='circle'?'cx':'x'))+(node.tagName==='rect'?Number(node.getAttribute('width'))/2:0),
    y:Number(node.getAttribute(node.tagName==='circle'?'cy':'y'))+(node.tagName==='rect'?Number(node.getAttribute('height'))/2:0)
  })).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).sort((a,b)=>a.x-b.x)
}
export function startChartHover(){
  if(document.documentElement.dataset.chartHover)return
  document.documentElement.dataset.chartHover='true';bindHoverRouting()
  let current:SVGSVGElement|null=null
  const gate=createPointGate()
  const point=(state:ChartState)=>{
    if(!current||state.activeTooltipIndex==null||state.isTooltipActive===false)return
    const points=dots(current),index=Number(state.activeTooltipIndex),p=points[index]
    if(!p||!gate.accept(current,index))return
    const ys=points.map(p=>p.y),lo=Math.min(...ys),hi=Math.max(...ys)
    chartHoverTone((hi-p.y)/(hi-lo||1))
  }
  window.__healthChartPoint=state=>{if(current)current.dataset.chartPointHook='true';point(state)}
  window.__healthChartLeave=()=>{} // Leaving a tooltip layer must not replay its current datum.
  document.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!matchMedia('(hover:hover) and (pointer:fine)').matches)return
    const target=event.target instanceof Element?event.target:null
    const wrapper=target?.closest('.recharts-wrapper')
    const svg=wrapper?.querySelector<SVGSVGElement>('svg.recharts-surface')||target?.closest<SVGSVGElement>(CHART_SURFACE)||null
    if(!svg){current=null;return}
    current=svg
    if(wrapper)return // Recharts tooltip index, not the raw pointer, owns playback.
    const shape=target?.closest('rect,circle,path')
    if(!shape||shape.closest('defs')||!(shape instanceof SVGGraphicsElement))return
    const box=svg.getBoundingClientRect(),r=shape.getBoundingClientRect()
    if(r.width<3||r.height<3)return
    const index=[...svg.querySelectorAll('rect,circle,path')].indexOf(shape)
    if(gate.accept(svg,index))chartHoverTone(r.height/box.height)
  },{capture:true,passive:true})
  // Other Recharts plots need no bespoke component hook: their active dot is
  // moved by the same tooltip selection. Repeated DOM updates share the gate.
  const changes=new MutationObserver(()=>{
    if(!current||current.dataset.chartPointHook==='true'||!current.closest('.recharts-wrapper'))return
    const active=[...current.querySelectorAll('.recharts-active-dot circle[cx]')].pop()
    if(!active)return
    const x=Number(active.getAttribute('cx')),points=dots(current)
    if(!points.length)return
    let index=0;points.forEach((p,i)=>{if(Math.abs(p.x-x)<Math.abs(points[index].x-x))index=i})
    point({activeTooltipIndex:index})
  })
  changes.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['cx','cy']})
}
