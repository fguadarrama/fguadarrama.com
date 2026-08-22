import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { descendingWeights, WEIGHT_RECORDS, type WeightRecord } from '../data/weight-data'

type NewWeightRecord = Omit<WeightRecord, 'id' | 'source'>

type WeightState = {
  records: WeightRecord[]
  addRecord: (record: NewWeightRecord) => void
  removeRecord: (id: string) => void
}

export const useWeightStore = create<WeightState>()(
  persist(
    (set) => ({
      records: descendingWeights(WEIGHT_RECORDS),
      addRecord: (record) => set((state) => ({
        records: descendingWeights([
          ...state.records,
          {
            ...record,
            id: `manual-${record.date}-${record.time.replace(':', '')}-${Date.now()}`,
            source: 'Registro manual',
          },
        ]),
      })),
      removeRecord: (id) => set((state) => ({
        records: state.records.filter((record) => record.id !== id),
      })),
    }),
    {
      name: 'health-weight-records-v1',
      version: 1,
    },
  ),
)
