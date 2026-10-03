import React from 'react'
import { Document, Page, Text as PdfText, View, Svg, Path, Line, Circle, Rect, pdf, StyleSheet } from '@react-pdf/renderer'
import { PdfUnit } from './pdf'
import { PATIENT } from './patient'
import { compositionParts, compositionSnapshots, massParts, bigSliceSegments, unassignedMass, WEIGHT_ACCENT } from './body-composition'
import { ascendingWeights, descendingWeights, formatWeight, formatWeightDate, type WeightRecord } from '../data/weight-data'
import { compositionMetrics } from '../components/BodyComposition'
import { LEAN_ACCENT, pdfColor, WATERMELON_SRGB } from './palette'
import { weightTrend } from './weight-trend'

const ink = '#2d2930'
// React PDF's SVG text and fragment boundaries do not consistently inherit page fonts.
function Text({ style, ...props }: React.ComponentProps<typeof PdfText>) {
  const ownStyle = Object.assign({}, ...(Array.isArray(style) ? style : style ? [style] : []))
  return <PdfText {...props} style={{ fontFamily: 'AlbertSans', color: ink, ...ownStyle }} />
}
const s = StyleSheet.create({
  page: { padding: 32, paddingBottom: 40, color: ink, fontFamily: 'AlbertSans', fontSize: 10, backgroundColor: '#fff' },
  title: { fontSize: 22, marginBottom: 7, fontWeight: 400 },
  subtitle: { fontSize: 10, marginBottom: 6 },
  heading: { color: WATERMELON_SRGB, fontSize: 14, marginTop: 16, marginBottom: 10 },
  summary: { flexDirection: 'row', borderTopWidth: .7, borderBottomWidth: .7, borderColor: ink, paddingVertical: 10, marginTop: 10, marginBottom: 8 },
  fact: { width: '33.33%' },
  number: { fontSize: 21, marginTop: 5 },
  row: { flexDirection: 'row', borderBottomWidth: .35, borderColor: ink, minHeight: 18, alignItems: 'center' },
  cell: { paddingVertical: 3.5, paddingHorizontal: 5, fontSize: 9, textAlign: 'center' },
  note: { fontSize: 8.5, lineHeight: 1.4, marginTop: 8 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 8, textAlign: 'right' },
})

function PdfTrend({ records, composition = false, width = 320, height = 175 }: { records: WeightRecord[]; composition?: boolean; width?: number; height?: number }) {
  const sorted = weightTrend(records), timestamps = sorted.map(r => r.timestamp)
  const minT = Math.min(...timestamps), maxT = Math.max(...timestamps)
  const series = composition ? compositionParts(sorted[0]).map(p => ({ color: p.color, values: sorted.map(r => compositionParts(r).find(q => q.key === p.key)!.mass) })) : [{ color: WEIGHT_ACCENT, values: sorted.map(r => r.weight) }, { color: LEAN_ACCENT, values: sorted.map(r => r.lean) }]
  const all = series.flatMap(p => p.values).filter((v): v is number => v != null), min = composition ? 0 : Math.floor((Math.min(...all)-2)/5)*5, max = Math.ceil((Math.max(...all)+1)/5)*5
  const bottom = composition ? 34 : 58
  const x = (i: number) => 30 + (timestamps[i]-minT)/(maxT-minT || 1)*(width-44), y = (v: number) => height-bottom-(v-min)/(max-min)*(height-bottom-14)
  const midpoint = timestamps.reduce((best,t,i) => Math.abs(t-(minT+maxT)/2) < Math.abs(timestamps[best]-(minT+maxT)/2) ? i : best, 0)
  const labels = [...new Set([0, ...(x(midpoint)-x(0) > 65 && x(sorted.length-1)-x(midpoint) > 65 ? [midpoint] : []), sorted.length-1])]
  return <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    {Array.from({ length: composition ? 4 : 8 }, (_, i) => min + i*(max-min)/(composition ? 3 : 7)).map(v => <React.Fragment key={v}><Line x1={30} x2={width-14} y1={y(v)} y2={y(v)} stroke={ink} strokeWidth={.3} /><Text x={24} y={y(v)+3} textAnchor="end" fill={ink} style={{ fontSize: 8 }}>{v.toFixed(1)}</Text></React.Fragment>)}
    {!composition && sorted.slice(1).map((r,j) => r.lean == null || sorted[j].lean == null ? null : <Path key={r.id} d={`M${x(j)} ${y(sorted[j].weight)} L${x(j+1)} ${y(r.weight)} L${x(j+1)} ${y(r.lean)} L${x(j)} ${y(sorted[j].lean!)} Z`} fill={WATERMELON_SRGB} fillOpacity={.13} />)}
    {series.map((p,i) => <React.Fragment key={i}><Path d={p.values.map((v,j) => v == null ? '' : `${j && p.values[j-1] != null ? 'L' : 'M'}${x(j)} ${y(v)}`).join(' ')} fill="none" stroke={pdfColor(p.color)} strokeWidth={2} />{p.values.map((v,j) => v == null ? null : !composition && i === 1 ? <Rect key={j} x={x(j)-2} y={y(v)-2} width={4} height={4} fill={LEAN_ACCENT} /> : <Circle key={j} cx={x(j)} cy={y(v)} r={2.4} fill={pdfColor(p.color)} />)}</React.Fragment>)}
    {labels.map(i => <Text key={i} x={x(i)} y={height-bottom+16} textAnchor={i === 0 ? 'start' : i === sorted.length-1 ? 'end' : 'middle'} fill={ink} style={{ fontSize: 8 }}>{formatWeightDate(sorted[i].date)}</Text>)}
    {!composition && <><Circle cx={33} cy={height-25} r={2.5} fill={WATERMELON_SRGB} /><Text x={40} y={height-22} style={{ fontSize: 7 }}>Peso total</Text><Rect x={103} y={height-28} width={5} height={5} fill={LEAN_ACCENT} /><Text x={114} y={height-22} style={{ fontSize: 7 }}>Masa libre de grasa</Text><Rect x={210} y={height-28} width={6} height={6} fill={WATERMELON_SRGB} fillOpacity={.13} /><Text x={222} y={height-22} style={{ fontSize: 7 }}>Masa grasa</Text><Text x={30} y={height-7} style={{ fontSize: 7 }}>Masa libre de grasa: reportada o calculada con peso y % de grasa.</Text></>}
  </Svg>
}

function PdfBigSlice({ record }: { record: WeightRecord }) {
  const slices = bigSliceSegments(massParts(record), record.weight)
  return <View style={{ width: 225 }}><Svg width={225} height={150} viewBox="88 50 244 250">
    {slices.map(p => <React.Fragment key={p.key}>
      <Path d={p.path} fill={pdfColor(p.color)} stroke={p.key === 'unassigned' ? ink : '#fff'} strokeWidth={p.key === 'unassigned' ? .7 : 2.5} strokeLinejoin="round" />
    </React.Fragment>)}
  </Svg><View style={{ marginTop: 4, paddingHorizontal: 20 }}>{slices.map(p => <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', height: 14 }}>
    <View style={{ width: 7, height: 7, backgroundColor: pdfColor(p.color), borderWidth: .4, borderColor: ink, marginRight: 6 }} />
    <Text style={{ fontSize: 9, flex: 1 }}>{p.label}</Text><Text style={{ fontSize: 9, width: 46, textAlign: 'right' }}>{`${formatWeight(p.mass)} kg`}</Text>
  </View>)}</View></View>
}

function Header({ printed }: { printed: string }) {
  return <><Text style={s.title}>Peso y composición corporal</Text><Text style={s.subtitle}>{PATIENT.fullName}</Text><Text style={s.subtitle}>Generado {formatWeightDate(printed)}</Text></>
}
function Footer() { return <Text fixed style={s.footer} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /> }

export function WeightReportDocument({ records, printed = new Date(Date.now()-new Date().getTimezoneOffset()*60_000).toISOString().slice(0,10) }: { records: WeightRecord[]; printed?: string }) {
  const sorted = ascendingWeights(records), latest = sorted[sorted.length-1], snapshots = compositionSnapshots(records), recent = snapshots[snapshots.length-1]
  if (!latest) throw new Error('No hay registros de peso para exportar.')
  const change = latest.weight-Math.max(...sorted.map(r => r.weight))
  // Explicit batches keep reports readable as future measurements are added.
  const batches = Array.from({ length: Math.ceil(records.length/16) }, (_,i) => descendingWeights(records).slice(i*16,(i+1)*16))
  const snapshotBatches = Array.from({ length: Math.ceil(snapshots.length/4) }, (_,i) => snapshots.slice(i*4,(i+1)*4))
  return <Document title="Peso y composición corporal" author={PATIENT.fullName}>
    {batches.map((batch,bi) => <Page key={`weight-${bi}`} size="A4" style={s.page}>
      <Header printed={printed} />
      {bi === 0 && <><View style={s.summary}><View style={s.fact}><Text>Peso actual · {formatWeightDate(latest.date)}</Text><Text style={s.number}>{formatWeight(latest.weight)} kg</Text></View><View style={s.fact}><Text>Cambio desde el máximo</Text><Text style={s.number}>{change > 0 ? '+' : ''}{formatWeight(change)} kg</Text></View><View style={s.fact}><Text>Grasa corporal actual</Text><Text style={s.number}>{latest.bodyFat == null ? '—' : `${formatWeight(latest.bodyFat)} %`}</Text></View></View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}><View style={{ width: 305 }}><Text style={s.heading}>Evolución del peso · kg</Text><PdfTrend records={records} width={295} height={220} /></View>{recent && <View style={{ width: 225 }}><Text style={s.heading}>Composición · {formatWeightDate(recent.date)}</Text><PdfBigSlice record={recent} /></View>}</View>
      </>}
      <Text style={s.heading}>Mediciones de peso{bi ? ' · continuación' : ''}</Text>
      <View style={s.row}>{['Fecha','Peso · kg','Grasa corporal · %'].map(t => <Text key={t} style={[s.cell,{ width: '33.33%' }]}>{t}</Text>)}</View>
      {batch.map(r => <View key={r.id} wrap={false} style={s.row}><Text style={[s.cell,{ width: '33.33%' }]}>{formatWeightDate(r.date)}</Text><Text style={[s.cell,{ width: '33.33%' }]}>{formatWeight(r.weight)}</Text><Text style={[s.cell,{ width: '33.33%' }]}>{r.bodyFat == null ? '—' : formatWeight(r.bodyFat)}</Text></View>)}
      <Footer />
    </Page>)}
    {snapshotBatches.map((batch,bi) => <Page key={`composition-${bi}`} size="A4" style={s.page}>
      <Header printed={printed} /><Text style={s.heading}>Evolución de la composición · kg</Text><PdfTrend records={batch} composition width={530} height={165} />
      <View style={{ flexDirection: 'row', gap: 15, marginTop: 4 }}>{compositionParts(batch[0]).map(p => <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, backgroundColor: pdfColor(p.color), borderWidth: .4, borderColor: ink }} /><Text style={{ fontSize: 8 }}>{p.label}</Text></View>)}</View>
      <Text style={s.heading}>Composición corporal</Text>
      <View style={s.row}><Text style={[s.cell,{ width: 177, textAlign: 'left' }]}>Parámetro</Text><Text style={[s.cell,{ width: 46 }]}>Unidad</Text>{batch.map(r => <Text key={r.id} style={[s.cell,{ width: 308/batch.length }]}>{formatWeightDate(r.date)}</Text>)}</View>
      {[{ key: 'bodyFat', label: 'Grasa corporal', unit: '%' }, ...compositionMetrics, { key: 'unassigned', label: 'Sin desglosar', unit: 'kg' }].map(m => <View key={m.key} wrap={false} style={s.row}><Text style={[s.cell,{ width: 177, textAlign: 'left' }]}>{m.label}</Text><PdfUnit unit={m.unit || '—'} style={[s.cell,{ width: 46 }]} fontSize={8} />{batch.map(r => {
        const value = m.key === 'bodyFat' ? r.bodyFat : m.key === 'unassigned' ? unassignedMass(r) : r.composition?.[m.key as keyof NonNullable<WeightRecord['composition']>]
        return <Text key={r.id} style={[s.cell,{ width: 308/batch.length }]}>{typeof value === 'number' ? new Intl.NumberFormat('es-MX',{ maximumFractionDigits: 2 }).format(value) : '—'}</Text>
      })}</View>)}
      <Footer />
    </Page>)}
    {descendingWeights(records.filter(r => r.inBody)).map(r => <Page key={r.id} size="A4" style={s.page}>
      <Header printed={printed} /><Text style={s.heading}>Composición corporal · InBody · {formatWeightDate(r.date)}</Text>
      <Text style={s.subtitle}>{r.inBody!.sourceDocument}</Text>
      {[
        ['Estatura', r.inBody!.heightCm, 'cm'], ['Sexo', r.inBody!.sex === 'male' ? 'Masculino' : 'Femenino', ''],
        ['Peso', r.weight, 'kg'], ['Grasa corporal', r.bodyFat, '%'], ['Masa grasa', r.inBody!.fatMass, 'kg'],
        ['Masa muscular (Muscle Mass)', r.inBody!.muscleMass, 'kg'], ['IMC reportado', r.inBody!.bmi, 'kg/m²'],
        ['Relación agua extracelular / total', r.inBody!.extracellularWaterRatio, ''], ['Nivel de grasa visceral', r.inBody!.visceralFatLevel, ''],
      ].map(([label,value,unit]) => <View key={String(label)} wrap={false} style={s.row}><Text style={[s.cell,{width:'65%',textAlign:'left'}]}>{label}</Text><Text style={[s.cell,{width:'20%'}]}>{value}</Text><PdfUnit unit={String(unit)} style={[s.cell,{width:'15%'}]} fontSize={9} /></View>)}
      <Footer />
    </Page>)}
  </Document>
}

export async function generateWeightReportBlob(records: WeightRecord[]) {
  return pdf(<WeightReportDocument records={records} />).toBlob()
}
