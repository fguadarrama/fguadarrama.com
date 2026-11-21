import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import {HashRouter,Routes,Route,Link,NavLink,useLocation,useSearchParams} from 'react-router-dom'
import {AnimatePresence,motion,useReducedMotion} from 'framer-motion'
import {GoeyToaster} from 'goey-toast'
import 'goey-toast/styles.css'
import '@fontsource-variable/albert-sans'
import '../../health-src/src/styles/tokens.css'
import '../../health-src/src/styles/theme.css'
import {CategoryPanel} from '../../health-src/src/pages/Dashboard'
import Browse from '../../health-src/src/pages/Browse'
import Timeline from '../../health-src/src/pages/Timeline'
import Weight from '../../health-src/src/pages/Weight'
import Reports from '../../health-src/src/pages/ReportBuilder'
import DataEntry from '../../health-src/src/pages/JsonBuilder'
import ThemeControl from '../../health-src/src/components/ThemeControl'
import ParameterDrawer from '../../health-src/src/components/ParameterDrawer'
import {data,useLiveData,shortDate3Letter,displayResultValue,formatUnit,isOutOfRange,parametersInCategory,sortCategories} from '../../health-src/src/lib/data'
import {PATIENT,patientDobShort,patientAge} from '../../health-src/src/lib/patient'
import {bind} from '../../health-src/src/lib/sounds'
import {startChartHover} from '../../health-src/src/lib/chart-hover'
import {useTheme} from '../../health-src/src/lib/useTheme'
import {useWeightStore} from '../../health-src/src/stores/weightStore'
import {dateMarks} from './dates'

const views=[
  ['/','Resumen','M3 19H29M5 14H11L14 7L18 18L21 11H28'],
  ['/labs','Laboratorios','M4 6H28M4 12H28M4 18H28M10 4V21'],
  ['/timeline','Cronología','M3 13H29M8 7V17M16 4V18M24 9V20'],
  ['/weight','Peso','M3 19H29M4 6L10 9L16 7L22 14L28 12'],
  ['/report','Reportes','M6 3H21L26 8V21H6ZM20 3V9H26M10 13H21M10 17H18'],
  ['/crear','Capturar datos','M4 6H17M4 12H15M4 18H17M23 9V19M18 14H28']
]
function Glyph({path}:{path:string}){return <svg aria-hidden="true" viewBox="0 0 32 24" width="30" height="24"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.1"/></svg>}
function Segments({labels,value,change}:{labels:string[],value:string,change:(s:string)=>void}){
  return <div className="atlas-segments">{labels.map(l=><button key={l} aria-pressed={l===value} onClick={()=>change(l)}>{l}</button>)}</div>
}
function Modes({labels,children}:{labels:string[],children:React.ReactNode}){
  const [params,set]=useSearchParams(), active=labels.find(l=>l===params.get('vista'))??labels[0]
  return <section data-mode={labels.indexOf(active)} className="atlas-modes"><Segments labels={labels} value={active} change={l=>set({vista:l})}/>{children}</section>
}
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
function Finder({onPick}:{onPick:(cid:string)=>void}){
  const [q,set]=useState('');useLiveData()
  const matches=q.trim()?data.parameters.filter(p=>fold(p.display_name_es+' '+p.aliases+' '+p.canonical_id).includes(fold(q.trim()))):[]
  return <div className="atlas-finder"><label htmlFor="atlas-query">Buscar un analito</label><div><input type="search" id="atlas-query" value={q} placeholder="Nombre o abreviatura" onChange={e=>set(e.target.value)}/></div>
    {q.trim()&&<ul aria-label="Resultados de búsqueda">{matches.map(p=><li key={p.canonical_id}><button onClick={()=>onPick(p.canonical_id)}>{p.display_name_es}<small>{p.category}</small></button></li>)}{!matches.length&&<li>Sin coincidencias</li>}</ul>}</div>
}
function Visits(){
  useLiveData();const days=dateMarks(data.dates), [choice,set]=useState(data.dates[0]), [cid,pick]=useState<string|null>(null)
  const rows = data.byDate[choice] ?? []
  const groups = new Map<string, typeof rows>()
  for (const row of rows) {
    const name = data.paramsById[row.parameter_canonical]?.category || 'Otros resultados'
    groups.set(name, [...(groups.get(name) || []), row])
  }
  const selectedIndex = data.dates.indexOf(choice)
  const previous = data.dates[selectedIndex + 1], next = data.dates[selectedIndex - 1]
  return <>
    <Finder onPick={pick}/>
    <section className="atlas-visits">
      <div className="atlas-section-head"><h2>Estudios por fecha</h2>
        <div className="atlas-date-controls">
          <button aria-label="Estudio anterior" disabled={!previous} onClick={()=>set(previous)}>←</button>
          <select aria-label="Fecha del estudio" value={choice} onChange={e=>set(e.target.value)}>{data.dates.map(d=><option key={d} value={d}>{shortDate3Letter(d)}</option>)}</select>
          <button aria-label="Estudio siguiente" disabled={!next} onClick={()=>set(next)}>→</button>
        </div>
      </div>
      <div className="atlas-strip"><svg viewBox="0 0 1000 78" preserveAspectRatio="none" role="img" aria-label="Fechas de laboratorio, espaciadas según el tiempo transcurrido">
        <path d="M10 58H990" stroke="currentColor" strokeWidth=".65"/>
        {days.map(({date,position})=>{
          const x=10+980*position, selected=date===choice
          return <g key={date} onClick={()=>set(date)} style={{cursor:'pointer'}}>
            <title>{shortDate3Letter(date)}</title>
            <path d={`M${x} 20V72`} stroke="transparent" strokeWidth="12"/>
            <path d={`M${x} ${selected?10:38}V64`} stroke={selected?'var(--blue)':'currentColor'} strokeWidth={selected?1.8:.85}/>
            {selected&&<circle cx={x} cy="10" r="4" fill="var(--blue)"/>}
          </g>})}</svg><div><span>{shortDate3Letter(data.dates.at(-1))}</span><span>{shortDate3Letter(data.dates[0])}</span></div>
      </div>
      <div className="atlas-section-head"><h3>{shortDate3Letter(choice)}</h3><span>{rows.length} resultados</span></div>
      {[...groups].map(([group,items])=><details className="atlas-group" key={choice+group}>
        <summary><span>{group}</span><small>{items.length}</small></summary>
        <div className="atlas-results">{items.map(row=>{
          const p=data.paramsById[row.parameter_canonical]
          return <button key={row.result_id} onClick={()=>pick(row.parameter_canonical)}>
            <span>{p?.display_name_es || row.parameter_raw}</span>
            <b className={p&&isOutOfRange(row,p)?'is-abnormal':''}>{displayResultValue(row,p)} <small>{formatUnit(row.unit||p?.unit_mx||'')}</small></b>
          </button>})}</div>
      </details>)}
    </section>
    <ParameterDrawer cid={cid} onClose={()=>pick(null)}/>
  </>
}
function Labs(){
  useLiveData();const groups=sortCategories(data.categories).filter(c=>parametersInCategory(c).length),[params,set]=useSearchParams(),cat=groups.find(c=>c===params.get('grupo'))??groups[0],[cid,pick]=useState<string|null>(null)
  return <><div className="atlas-section-head"><label htmlFor="lab-group">Grupo de laboratorio</label><select id="lab-group" value={cat} onChange={e=>set({grupo:e.target.value})}>{groups.map(c=><option key={c}>{c}</option>)}</select></div><CategoryPanel key={cat} cat={cat} onPick={pick}/><Link to="/browse">Explorar todos los analitos →</Link><ParameterDrawer cid={cid} onClose={()=>pick(null)}/></>
}
function TimelinePage(){
  useLiveData()
  const weights=useWeightStore(s=>s.records)
  const [year,setYear]=useState('')
  const counts=new Map<string,{labs:number,weights:number}>()
  function count(date:string,type:'labs'|'weights'){
    const y=date.slice(0,4), entry=counts.get(y)??{labs:0,weights:0}
    entry[type]++
    counts.set(y,entry)
  }
  data.dates.forEach(date=>count(date,'labs'))
  weights.forEach(record=>count(record.date,'weights'))
  const years=[...counts.keys()].sort()
  const max=Math.max(1,...[...counts.values()].flatMap(value=>[value.labs,value.weights]))
  return <><div className="atlas-section-head"><label className="atlas-year">Año <select value={year} onChange={e=>setYear(e.target.value)}><option value="">Todos</option>{years.map(y=><option key={y}>{y}</option>)}</select></label>
    <div className="atlas-key"><span>Fechas de laboratorio</span><span>Mediciones de peso</span></div></div>
    <div className="atlas-years" aria-label="Actividad por año">{years.map(y=>{
      const {labs,weights}=counts.get(y)!
      const description=y+' · '+labs+' fechas de laboratorio · '+weights+' mediciones de peso'
      return <button key={y} aria-label={description} title={description} aria-pressed={year===y} onClick={()=>setYear(year===y?'':y)}>
        <svg viewBox="0 0 26 40" aria-hidden="true">
          <path d="M1 38H25" stroke="currentColor" strokeWidth=".6"/>
          {labs>0&&<path d={`M10 38v-${35*labs/max}`} stroke="currentColor" strokeWidth="2"/>}
          {weights>0&&<path d={`M16 38v-${35*weights/max}`} stroke="var(--blue)" strokeWidth="2"/>}
        </svg>{y}</button>
    })}</div><Timeline year={year}/></>
}
function Workspace(){
  const reduceMotion=useReducedMotion()
  const location=useLocation(),theme=useTheme(),current=views.find(v=>v[0]===location.pathname)??views[1],title=location.pathname==='/browse'?'Explorar analitos':current[1]
  return <div className="atlas shell"><header className="atlas-top"><Link to="/">Historial médico</Link><details><summary>Ficha personal</summary><p>{PATIENT.fullName}<br/>{patientDobShort()} · {patientAge()} años<br/>CURP: {PATIENT.curp}</p></details><ThemeControl/></header>
    <div className="atlas-layout"><nav aria-label="Navegación principal" className="atlas-nav">{views.map(([path,label,glyph])=><NavLink end key={path} to={path}><Glyph path={glyph}/>{label}</NavLink>)}</nav>
    <main><AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} initial={{opacity:0,y:reduceMotion?0:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduceMotion?0:-4}} transition={{duration:reduceMotion?0:.26,ease:[.16,1,.3,1]}}><h1 className="atlas-title">{title}</h1>
    <Routes location={location}><Route path="/" element={<Visits/>}/><Route path="/labs" element={<Labs/>}/><Route path="/browse" element={<Browse/>}/><Route path="/timeline" element={<TimelinePage/>}/><Route path="/weight" element={<Modes labels={['Tendencia','Composición','Mediciones','Referencias']}><Weight/></Modes>}/><Route path="/report" element={<Modes labels={['Seleccionar','Revisar y exportar']}><Reports/></Modes>}/><Route path="/crear" element={<Modes labels={['Preparar y capturar','Revisar y guardar']}><DataEntry/></Modes>}/><Route path="*" element={<Visits/>}/></Routes></motion.div></AnimatePresence></main></div>
    <footer>Laboratorios actualizados · {shortDate3Letter(data.generatedAt)}</footer><GoeyToaster theme={theme==='dark'?'dark':'light'}/></div>
}
// Seed only on the first visit; later edits belong to this version.
try {
  const original=localStorage.getItem('health-weight-records-v1')
  if(original && !localStorage.getItem('newhealth-weight-records-v1')) {
    localStorage.setItem('newhealth-weight-records-v1',original)
    useWeightStore.persist.rehydrate()
  }
} catch {}
bind();startChartHover()
createRoot(document.getElementById('root')!).render(<HashRouter><Workspace/></HashRouter>)
