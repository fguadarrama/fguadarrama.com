import { descendingWeights, formatWeightDate, type WeightRecord } from '../data/weight-data'

export default function InBodyReadings({ records }: { records: WeightRecord[] }) {
  const rows = descendingWeights(records.filter(r => r.inBody))
  if (!rows.length) return null
  return <section className="integrated-panel inbody-readings" aria-labelledby="inbody-title">
    <header><h2 id="inbody-title">Composición corporal · InBody</h2><span>Datos del documento</span></header>
    <div className="integrated-table-scroll" tabIndex={0} role="region" aria-label="Resultados de InBody"><table>
      <thead><tr><th>Fecha</th><th>Peso · kg</th><th>Grasa · kg</th><th>Grasa · %</th><th>Masa muscular · kg</th><th>IMC reportado</th><th>Agua extracelular / total</th><th>Nivel visceral</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}><td>{formatWeightDate(r.date)}</td><td>{r.weight}</td><td>{r.inBody!.fatMass}</td><td>{r.bodyFat}</td><td>{r.inBody!.muscleMass}</td><td>{r.inBody!.bmi}</td><td>{r.inBody!.extracellularWaterRatio.toFixed(3)}</td><td>{r.inBody!.visceralFatLevel}</td></tr>)}</tbody>
    </table></div>
  </section>
}
