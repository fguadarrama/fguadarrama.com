// Lieflat G13: custom sectors grow radially from the inner ring, cubicOut,
// 900 ms with 130 ms staggering. See THIRD_PARTY_NOTICES.md.
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import * as echarts from 'echarts/core'
import { CustomChart, type CustomSeriesOption } from 'echarts/charts'
import { SVGRenderer } from 'echarts/renderers'
import { bigSliceSegments, type CompositionPart } from '../lib/body-composition'
import { formatWeight } from '../data/weight-data'
import { webColor } from '../lib/palette'

echarts.use([CustomChart, SVGRenderer])
const ink = '#2d2930'

export default function BigSlice({ parts, total }: { parts: CompositionPart[]; total: number }) {
  const host = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  // Values, not array identity: toggling the weight metric must not restart this chart.
  const signature = JSON.stringify(parts)
  useEffect(() => {
    if (!host.current) return
    const slices = bigSliceSegments(JSON.parse(signature), total)
    const chart = echarts.init(host.current, undefined, { renderer: 'svg' })
    const draw = () => {
      const width = chart.getWidth(), height = chart.getHeight()
      const scale = Math.min(width/420, height/340), ox = (width-420*scale)/2, oy = (height-340*scale)/2
      const x = (n: number) => ox+n*scale, y = (n: number) => oy+n*scale
      const series: CustomSeriesOption = {
        type: 'custom', coordinateSystem: 'none', silent: true,
        animationDuration: reduceMotion ? 0 : 900,
        animationEasing: 'cubicOut', animationDelay: i => reduceMotion ? 0 : i*130,
        renderItem: params => {
          const p = slices[params.dataIndex]
          return { type: 'group', children: [
            { type: 'sector', shape: { cx:x(p.cx), cy:y(p.cy), r:p.radius*scale, r0:p.inner*scale, startAngle:p.start, endAngle:p.end, clockwise:true, cornerRadius:4*scale },
              style: { fill:webColor(p.color), stroke: p.key === 'unassigned' ? ink : '#fff', lineWidth: p.key === 'unassigned' ? .7 : 2.5*scale, opacity:1 },
              enterFrom: { shape: { r:p.inner*scale } } },
            { type: 'polyline', shape: { points: [[x(p.tip[0]),y(p.tip[1])],[x(p.right ? 316 : 104),y(p.labelY)]] }, style: { stroke:ink, lineWidth:.65, fill:'none' } },
            { type: 'text', style: { x:x(p.labelX), y:y(p.labelY-8), text:p.label, font:`400 ${14*scale}px "Albert Sans Variable"`, fill:ink, align:p.right ? 'left' : 'right', verticalAlign:'middle' }, enterFrom: { style: { opacity:0 } } },
            { type: 'text', style: { x:x(p.labelX), y:y(p.labelY+12), text:`${formatWeight(p.mass)} kg`, font:`400 ${16*scale}px "Albert Sans Variable"`, fill:ink, align:p.right ? 'left' : 'right', verticalAlign:'middle' }, enterFrom: { style: { opacity:0 } } },
          ] }
        }, data:slices.map(p => p.mass),
      }
      chart.setOption({ series:[series] }, true)
    }
    draw()
    const observer = new ResizeObserver(() => { chart.resize(); draw() })
    observer.observe(host.current)
    return () => { observer.disconnect(); chart.dispose() }
  }, [signature, total, reduceMotion])
  return <div ref={host} className="composition-big-slice" role="img" aria-label={`Big Slice. ${parts.map(p => `${p.label}: ${formatWeight(p.mass)} kg`).join('. ')}`} />
}
