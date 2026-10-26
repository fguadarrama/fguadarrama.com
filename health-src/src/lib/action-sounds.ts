import { getHoverAudio, primeUiHover } from './hover-audio'
type Layer = { source:{type:OscillatorType;frequency:number|{start:number;end:number};fm?:{ratio:number;depth:number}};envelope:{attack:number;decay:number;sustain:number;release:number};gain:number;delay?:number;filter:{type:BiquadFilterType;frequency:number;Q:number;envelope?:{attack:number;peak:number;decay:number}};effects?:{type:'delay';delay:number;feedback:number;wet:number;lowpass:number}[] }
export const successNf0fw:{layers:Layer[]}={layers:[
{source:{type:'sine',frequency:448.69467717933264},envelope:{attack:.001,decay:.05589620288754548,sustain:0,release:.012774067104794212},gain:.279,filter:{type:'bandpass',frequency:544.7832895465953,Q:1.374,envelope:{attack:.024,peak:1414.7387835669997,decay:.086}},effects:[{type:'delay',delay:.135,feedback:.233,wet:.109,lowpass:3675}]},
{source:{type:'sine',frequency:897.3903824020539},envelope:{attack:.001,decay:.04365821846142407,sustain:0,release:.014062105690947438},gain:.145,filter:{type:'bandpass',frequency:771.5530913767725,Q:1.374,envelope:{attack:.024,peak:1419.8638738874176,decay:.086}},effects:[{type:'delay',delay:.135,feedback:.233,wet:.109,lowpass:3675}],delay:.06155623729071858},
{source:{type:'sine',frequency:565.3200313577296},envelope:{attack:.001,decay:.04527774877659002,sustain:0,release:.017029572081151443},gain:.148,filter:{type:'bandpass',frequency:404.7322210756787,Q:1.374,envelope:{attack:.024,peak:1485.6534920398549,decay:.086}},effects:[{type:'delay',delay:.135,feedback:.233,wet:.109,lowpass:3675}],delay:0}]}
export const tap2wkhm:{layers:Layer[]}={layers:[
{source:{type:'sine',frequency:{start:350,end:1100},fm:{ratio:.5,depth:50}},envelope:{attack:0,decay:.08,sustain:0,release:.025},gain:.129,filter:{type:'lowpass',frequency:662.8619058974164,Q:2.2998553346403314}},
{source:{type:'sine',frequency:{start:175,end:550},fm:{ratio:.5,depth:50}},envelope:{attack:0,decay:.08,sustain:0,release:.025},gain:.071,delay:.030109162949378543,filter:{type:'lowpass',frequency:378.593835859675,Q:5.603533913811791}}]}
export function playSound(preset:{layers:Layer[]}) {
  if(document.hidden)return
  const audio=getHoverAudio();if(!audio)return
  const now=audio.currentTime
  for(const layer of preset.layers){
    const t=now+(layer.delay??0),e=layer.envelope,end=t+e.attack+e.decay+e.release
    const nodes:AudioNode[]=[],osc=audio.createOscillator(),amp=audio.createGain(),filter=audio.createBiquadFilter()
    nodes.push(osc,amp,filter);osc.type=layer.source.type
    const frequency=layer.source.frequency,start=typeof frequency==='number'?frequency:frequency.start,finish=typeof frequency==='number'?frequency:frequency.end
    osc.frequency.setValueAtTime(start,t);if(start!==finish)osc.frequency.exponentialRampToValueAtTime(finish,end)
    if(layer.source.fm){const mod=audio.createOscillator(),depth=audio.createGain();nodes.push(mod,depth);mod.frequency.setValueAtTime(start*layer.source.fm.ratio,t);if(start!==finish)mod.frequency.exponentialRampToValueAtTime(finish*layer.source.fm.ratio,end);depth.gain.value=layer.source.fm.depth;mod.connect(depth).connect(osc.frequency);mod.start(t);mod.stop(end)}
    filter.type=layer.filter.type;filter.frequency.setValueAtTime(layer.filter.frequency,t);filter.Q.value=layer.filter.Q
    const fe=layer.filter.envelope;if(fe){filter.frequency.linearRampToValueAtTime(fe.peak,t+fe.attack);filter.frequency.exponentialRampToValueAtTime(layer.filter.frequency,t+fe.attack+fe.decay)}
    amp.gain.setValueAtTime(e.attack?0:layer.gain,t);if(e.attack)amp.gain.linearRampToValueAtTime(layer.gain,t+e.attack);amp.gain.linearRampToValueAtTime(layer.gain*e.sustain,t+e.attack+e.decay);amp.gain.linearRampToValueAtTime(0,end)
    osc.connect(filter).connect(amp);amp.connect(audio.destination)
    let tail=0
    for(const effect of layer.effects??[]){const delay=audio.createDelay(),feedback=audio.createGain(),wet=audio.createGain(),lowpass=audio.createBiquadFilter();nodes.push(delay,feedback,wet,lowpass);delay.delayTime.value=effect.delay;feedback.gain.value=effect.feedback;wet.gain.value=effect.wet;lowpass.type='lowpass';lowpass.frequency.value=effect.lowpass;amp.connect(delay);delay.connect(lowpass);lowpass.connect(feedback).connect(delay);lowpass.connect(wet).connect(audio.destination);tail=Math.max(tail,effect.delay*8)}
    osc.start(t);osc.stop(end);setTimeout(()=>nodes.forEach(node=>node.disconnect()),(end-now+tail+.05)*1000)
  }
}
export function playPdfSuccess(){playSound(successNf0fw)}
declare global {interface Window {__healthPdfSuccess?:()=>void}}
const clickable='button,a[href],input,select,textarea,summary,[role="button"],[role="tab"],[role="checkbox"],[role="switch"],[data-cuelume-press],[data-cuelume-toggle]'
function targetFor(event:Event){const target=event.target instanceof Element?event.target.closest(clickable):null;return target&&!target.closest('[disabled],[aria-disabled="true"],[inert],[data-sound="silent"]')?target:null}
export function bindActionSounds(){
  window.__healthPdfSuccess=playPdfSuccess
  if(document.documentElement.dataset.actionSounds)return
  document.documentElement.dataset.actionSounds='true'
  document.addEventListener('pointerdown',primeUiHover,{capture:true,passive:true})
  document.addEventListener('click',event=>{if(event.isTrusted&&targetFor(event))playSound(tap2wkhm)},{capture:true,passive:true})
  document.addEventListener('keydown',event=>{if(!event.isTrusted||event.repeat||!['Enter',' '].includes(event.key))return;const target=targetFor(event);if(target&&!target.matches('button,a,input,select,textarea,summary'))playSound(tap2wkhm)},{capture:true,passive:true})
}
