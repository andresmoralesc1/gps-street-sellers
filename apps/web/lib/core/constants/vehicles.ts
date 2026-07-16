import type { VehicleType } from '../types'

export interface VehicleInfo {
  id: VehicleType
  label: string
  emoji: string
}

export const VEHICLE_TYPES: VehicleInfo[] = [
  { id: 'bicicleta', label: 'Bicicleta', emoji: '🚲' },
  { id: 'moto', label: 'Moto', emoji: '🏍️' },
  { id: 'carro', label: 'Carro', emoji: '🚗' },
  { id: 'triciclo', label: 'Triciclo', emoji: '🛺' },
  { id: 'pie', label: 'A pie', emoji: '🚶' },
  { id: 'otro', label: 'Otro', emoji: '📦' },
]

export const getVehicleInfo = (id: VehicleType | null | undefined): VehicleInfo | null => {
  if (!id) return null
  return VEHICLE_TYPES.find((v) => v.id === id) ?? null
}
