'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { VEHICLE_TYPES } from '@/lib/core/constants/vehicles'
import type { VehicleType } from '@/lib/core/types'

interface Props {
  vehicleType: VehicleType | ''
  vehiclePhotoUrl: string
  onVehicleTypeChange: (v: VehicleType | '') => void
  onVehiclePhotoChange: (url: string) => void
}

/**
 * "Tu vehículo o puesto" card. Optional — buyers see the photo + emoji to
 * recognize the vendor in the street. Clicking an already-selected badge
 * deselects it (toggles to ''), per the original UX.
 */
export function VehicleSection({
  vehicleType,
  vehiclePhotoUrl,
  onVehicleTypeChange,
  onVehiclePhotoChange,
}: Props) {
  return (
    <Card variant="outlined" className="p-4 space-y-4">
      <p className="text-sm font-medium text-gray-700">Tu vehículo o puesto</p>
      <p className="text-xs text-gray-500 -mt-2">
        Opcional. Mostramos esto a los clientes para que te reconozcan en la calle.
      </p>

      <div className="flex flex-wrap gap-2">
        {VEHICLE_TYPES.map((v) => (
          <Badge
            key={v.id}
            variant={vehicleType === v.id ? 'primary' : 'outline'}
            className="cursor-pointer flex items-center gap-1"
            onClick={() => onVehicleTypeChange(vehicleType === v.id ? '' : v.id)}
          >
            <span aria-hidden="true">{v.emoji}</span>
            {v.label}
          </Badge>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Foto del carrito / vehículo <span className="text-gray-400">(opcional)</span>
        </label>
        <ImageUpload
          value={vehiclePhotoUrl}
          onChange={onVehiclePhotoChange}
          folder="vendors/vehicles"
        />
      </div>
    </Card>
  )
}