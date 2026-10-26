import assert from 'node:assert/strict'
import { build } from 'esbuild'
const listeners = new Map(), notes = [], filters = []
let contexts = 0
const param = () => ({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}})
function node(){let frequency;return {connect(to){return to},frequency:{...param(),setValueAtTime(v){frequency=v}},gain:param(),Q:param(),start(){notes.push(frequency)},stop(){}}}
globalThis.window={}
globalThis.document={hidden:false,addEventListener(name,fn){listeners.set(name,[...(listeners.get(name)||[]),fn])}}
globalThis.matchMedia=()=>({matches:true})
globalThis.Element=class{constructor(row=null,chart=null,control=null){this.row=row;this.chart=chart;this.control=control}closest(selector){if(selector.startsWith('tbody'))return this.row;if(selector.includes('recharts'))return this.chart;return this.control}}
globalThis.AudioContext=class{state='running';currentTime=0;destination={};constructor(){contexts++}createOscillator(){return node()}createGain(){return node()}createBiquadFilter(){const f=node();filters.push(f);return f}}
const load=async entry=>{const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))}
const ui=await load('src/lib/hover-audio.ts')
ui.bindHoverRouting()
const emit=(name,target,relatedTarget=null)=>listeners.get(name)?.forEach(fn=>fn({target,relatedTarget,pointerType:'mouse'}))
const rowA=new Element(),rowB=new Element(),name=new Element(rowA),value=new Element(rowA),letter=new Element(rowA),other=new Element(rowB)
emit('pointerover',name);emit('pointerout',name,value);emit('pointerover',value,name);emit('pointerout',value,letter);emit('pointerover',letter,value)
assert.equal(notes.length,0,'All general hover audio must remain disabled')
emit('pointerout',letter,other);emit('pointerover',other,letter);assert.equal(notes.length,0,'Entering another row must remain silent')
const svg=new Element(),shape=new Element(null,svg);emit('pointerover',shape,other);assert.equal(notes.length,0,'Charts never get the UI sound')
window.__healthUiHover();assert.equal(notes.length,0,'Legacy hover dispatch must remain silent')
assert.equal(contexts,1,'UI audio is prewarmed and reused')
assert.deepEqual(ui.hoverKps7g,{source:{type:'sine',frequency:1597.026},envelope:{attack:0,decay:.015,sustain:0,release:.005},gain:1.585,filter:{type:'bandpass',frequency:3960,Q:20}})
const chart=await load('src/lib/chart-hover.ts'),gate=chart.createPointGate(),a={},b={}
assert(gate.accept(a,0));assert(!gate.accept(a,'0'));assert(gate.accept(b,0));assert(!gate.accept(a,0),'Tooltip/other-chart excursions must not replay the same datum');assert(gate.accept(a,1));assert(!gate.accept(a,1))
console.log('PASS: general hover muted; chart point deduplication remains active.')
