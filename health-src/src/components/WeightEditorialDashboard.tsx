import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { WeightRecord } from '../data/weight-data'
import { weightDays, type WeightDay } from '../lib/weight-editorial'
import { weightScene, bmiScene, chartDate, dailyWeightLabel, type ChartScene, type SceneNode } from '../lib/weight-editorial-geometry'
import '../styles/weight-editorial.css'

export type WeightEditorialProps = { records: WeightRecord[]; heightCm: number; referenceWeight?: number; referenceLabel?: string }
declare global { interface Window { __healthChartTone?: (at: number) => boolean; __healthChartToneCancel?: () => void } }

function Readout({ node, ready }: { node: SceneNode; ready: boolean }) {
  const { x, y, fontSize, fontWeight } = node.attrs
  const chars = Array.from(node.text ?? '')
  const digits = chars.map((ch, i) => /\d/.test(ch) ? i : -1).filter(i => i >= 0)
  const stagger = digits.length ? digits.slice(-2) : [chars.length - 2, chars.length - 1]
  return <foreignObject className="wed-readout" x={Number(x)-130} y={Number(y)-Number(fontSize)}
    width={260} height={Number(fontSize)*1.65} pointerEvents="none">
    <div className={'t-digit-group' + (ready ? ' is-animating' : '')} aria-label={node.text}
      style={{fontSize: Number(fontSize), fontWeight}}>
      {chars.map((ch,i) => <span key={i} aria-hidden="true" className="t-digit" data-stagger={stagger.includes(i) ? stagger.indexOf(i)+1 : undefined}>{ch === ' ' ? '\u00a0' : ch}</span>)}
    </div>
  </foreignObject>
}

type ChartKind = 'weight' | 'bmi'
type Tip = { index: number; x: number; y: number; above: boolean }

function ChartPanel({kind,days,scene,visible,expanded,onExpand,measure}:{
  kind: ChartKind; days: WeightDay[]; scene: ChartScene; visible: boolean; expanded: boolean
  onExpand: () => void; measure?: (width: number) => void
}) {
  const section=useRef<HTMLElement>(null), svg=useRef<SVGSVGElement>(null), drawing=useRef<SVGGElement>(null)
  const selected=useRef<number|null>(null), [tip,setTip]=useState<Tip|null>(null), [open,setOpen]=useState(false)
  const [ready,setReady]=useState(false)
  const isWeight=kind==='weight'
  const label=isWeight?'Peso a través del tiempo':'Abanico de índice de masa corporal'
  const close=useCallback(()=>{
    if(selected.current!==null) window.__healthChartToneCancel?.()
    selected.current=null
    setOpen(false)
  },[])
  useEffect(()=>{
    const el=svg.current
    if(!el)return
    const resize=new ResizeObserver(()=>{close(); if(measure && el.clientWidth)measure(Math.max(680,el.clientWidth))})
    resize.observe(el)
    window.addEventListener('blur',close)
    document.addEventListener('visibilitychange',close)
    return ()=>{resize.disconnect();window.removeEventListener('blur',close);document.removeEventListener('visibilitychange',close)}
  },[measure,close])
  useLayoutEffect(()=>{
    if(!visible || !drawing.current)return
    let current=true
    // This includes the last staggered spoke, point and annotation in each chart.
    const animations=drawing.current.getAnimations({subtree:true})
    Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(current)setReady(true)})
    return ()=>{current=false}
  },[visible])
  function choose(index:number){
    if(selected.current===index || !section.current || !svg.current)return
    const matrix=svg.current.getScreenCTM()
    if(!matrix)return
    const p=scene.points[index], location=new DOMPoint(p.x,p.y).matrixTransform(matrix)
    const box=section.current.getBoundingClientRect(), x=location.x-box.left,y=location.y-box.top
    const above=y>=70, tipWidth=Math.min(200,box.width-12)
    setTip({index,x:Math.max(6, Math.min(box.width-tipWidth-6,x-tipWidth/2)),y:above?y-10:y+10,above})
    setOpen(true)
    selected.current=index
    const weights=days.map(d=>d.weight), low=Math.min(...weights), high=Math.max(...weights)
    window.__healthChartTone?.((p.weight-low)/(high-low||1))
  }
  function track(e:PointerEvent<SVGSVGElement>){
    if(e.pointerType==='touch' && e.type==='pointermove')return
    const matrix=e.currentTarget.getScreenCTM()
    if(!matrix)return
    let nearest=-1, distance=e.pointerType==='touch'?24:15
    scene.points.forEach((p,i)=>{
      const pt=new DOMPoint(p.x,p.y).matrixTransform(matrix)
      const d=Math.hypot(pt.x-e.clientX,pt.y-e.clientY)
      if(d<distance){nearest=i;distance=d}
    })
    if(nearest<0)close();else choose(nearest)
  }
  const plot=<svg ref={svg} role="group" aria-label={label} data-chart-audio-owner="point"
    className={isWeight?'wed-main-svg':'wed-fan-svg'} viewBox={isWeight?`0 0 ${scene.width} ${scene.height}`:'0 35 600 450'}
    onPointerMove={track} onPointerDown={track} onPointerLeave={close} onPointerCancel={close}
    onPointerUp={e=>{if(e.pointerType==='touch')close()}}
    onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))close()}}
    onKeyDown={e=>{
      if(e.key==='Escape'){close();return}
      if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return
      e.preventDefault()
      const i=Math.min(days.length-1,Math.max(0,(selected.current??0)+(e.key==='ArrowRight'?1:-1)))
      e.currentTarget.querySelector<SVGElement>(`[data-reading="${i}"]`)?.focus()
    }}>
    <g ref={drawing} pointerEvents="none">{scene.nodes.map((n,i)=>n.readout?null:createElement(n.tag,{
      ...n.attrs,key:i,className:[n.motion?'wed-'+n.motion:'',n.halo?'wed-halo':''].join(' '),
      ...(n.motion==='draw'?{pathLength:1}:{}),style:{animationDelay:(n.delay??0)+'ms'}
    },n.text))}</g>
    {scene.nodes.filter(n=>n.readout).map((n,i)=><Readout key={i} node={n} ready={ready}/>)}
    {scene.points.map((p,i)=><circle key={p.date} data-reading={i} cx={p.x} cy={p.y} r={5} fill="transparent" pointerEvents="none"
      role="graphics-symbol" tabIndex={0} aria-label={dailyWeightLabel(days[i])+' kg · '+chartDate(p.date,true)}
      onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))choose(i)}}/>)}
    {open&&tip&&<circle className="wed-active" cx={scene.points[tip.index].x} cy={scene.points[tip.index].y} r={7}/>}
  </svg>
  return <section ref={section} className={isWeight?'wed-weight':'wed-bmi'} aria-label={label}>
    <button type="button" className="wed-expand" aria-label={(expanded?'Reducir ':'Ampliar ')+label} aria-expanded={expanded} onClick={()=>{close();onExpand()}}>
      {expanded?<Minus size={15}/>:<Plus size={15}/>}
    </button>
    {isWeight?<div className="wed-scroll" onScroll={close}>{plot}</div>:plot}
    {tip&&<div className={'wed-tip-anchor'+(tip.above?' above':'')} style={{left:tip.x,top:tip.y}}>
      <div className={'wed-tip-content'+(open?' is-open':'')} aria-hidden={!open} role="status">
        <strong>{dailyWeightLabel(days[tip.index])} kg</strong><span>{chartDate(days[tip.index].date,true)}</span>
      </div>
    </div>}
  </section>
}

export default function WeightEditorialDashboard({records,heightCm,referenceWeight}:WeightEditorialProps){
  const days=useMemo(()=>weightDays(records),[records]), outer=useRef<HTMLDivElement>(null)
  const [visible,setVisible]=useState(false),[width,setWidth]=useState(900),[replay,setReplay]=useState(0)
  const [expanded,setExpanded]=useState<ChartKind|null>(null)
  useEffect(()=>{
    if(!outer.current)return
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}})
    observer.observe(outer.current);return ()=>observer.disconnect()
  },[])
  const reference=Number.isFinite(referenceWeight)?Math.round(referenceWeight!*10)/10:64.5
  const main=useMemo(()=>weightScene(days,width,expanded==='weight'?520:480,reference),[days,width,expanded,reference])
  const fan=useMemo(()=>bmiScene(days,heightCm,reference),[days,heightCm,reference])
  const signature=days.map(d=>d.date+d.weight).join('|')
  if(!days.length)return null
  return <div ref={outer} data-weight-editorial-version="7" data-expanded={expanded??undefined}
    className={'weight-editorial-root wed-exact '+(visible?'wed-visible':'')}
    onKeyDown={e=>{if(e.key==='Escape'&&expanded)setExpanded(null)}}>
    <button type="button" className="wed-replay" title="Repetir animación" aria-label="Repetir animación de las gráficas" onClick={()=>setReplay(n=>n+1)}><RotateCcw size={15}/></button>
    <div className="wed-grid">{(['weight','bmi'] as const).map(kind=>expanded&&expanded!==kind?null:
      <ChartPanel key={kind+signature+replay} kind={kind} days={days} scene={kind==='weight'?main:fan} measure={kind==='weight'?setWidth:undefined}
        visible={visible} expanded={expanded===kind} onExpand={()=>setExpanded(old=>old===kind?null:kind)}/>)}</div>
  </div>
}
