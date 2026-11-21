import React from 'react'
import {View,Svg,Line,Circle,Text} from '../../health-src/src/lib/pdf-primitives'
import {dateMarks} from './dates'
export function DateSignal({dates,width=310}:{dates:string[];width?:number}) {
  const marks=dateMarks(dates)
  if(!marks.length) return null
  return <View wrap={false} style={{width,marginBottom:5}}><Text style={{fontSize:8,fontFamily:'AlbertSans'}}>Fechas de medición · {marks.length}</Text>
    <Svg width={width} height={15}><Line x1={3} x2={width-3} y1={8} y2={8} stroke="#858580" strokeWidth={.4}/>
    {marks.map(({date,position},index)=>{const x=3+position*(width-6);return index===marks.length-1
      ? <Circle key={date} cx={x} cy={8} r={2.5} fill="#4392ba"/>
      : <Line key={date} x1={x} x2={x} y1={4} y2={12} stroke="#1c1e1e" strokeWidth={.6}/>})}</Svg>
    <View style={{flexDirection:'row',justifyContent:'space-between',fontFamily:'AlbertSans',fontSize:7}}><Text>{marks[0].date}</Text><Text>{marks.length>1?marks.at(-1)?.date:''}</Text></View></View>
}
