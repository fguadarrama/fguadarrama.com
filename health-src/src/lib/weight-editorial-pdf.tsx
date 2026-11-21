import React from 'react'
import {Svg,Path,Line,Circle,Text}from'./pdf-primitives'
import{weightDays}from'./weight-editorial'
import{weightScene,bmiScene,type ChartScene}from'./weight-editorial-geometry'
import type{WeightRecord}from'../data/weight-data'
function PdfScene({scene,width,height}:{scene:ChartScene;width:number;height:number}){return <Svg width={width} height={height} viewBox={`0 0 ${scene.width} ${scene.height}`}>{scene.nodes.map((node,i)=>{const a=node.attrs as any;if(node.tag==='text')return <Text key={i} x={a.x} y={a.y} fill={a.fill} textAnchor={a.textAnchor} style={{fontFamily:'AlbertSans',fontSize:a.fontSize,fontWeight:a.fontWeight>=600?600:400}}>{node.text}</Text>;if(node.tag==='path')return <Path key={i} {...a}/>;if(node.tag==='line')return <Line key={i} {...a}/>;return <Circle key={i} {...a}/>})}</Svg>}
export function PdfEditorialWeight({records,referenceWeight,width=510}:{records:WeightRecord[];referenceWeight:number;width?:number}){return <PdfScene scene={weightScene(weightDays(records),900,400,referenceWeight)} width={width} height={width/900*400}/>}
export function PdfEditorialBmi({records,heightCm,referenceWeight,width=260}:{records:WeightRecord[];heightCm:number;referenceWeight:number;width?:number}){return <PdfScene scene={bmiScene(weightDays(records),heightCm,referenceWeight)} width={width} height={width/600*500}/>}
