'use client'

import { BatteryLow, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Props {
  geoMode: 'precise' | 'battery'
  geoZoneRadiusM: number
  onGeoModeChange: (mode: 'precise' | 'battery') => void
  onRadiusChange: (m: number) => void
}

/**
 * Battery-saving geo mode card. Two modes:
 *   - precise: GPS every 10s (default)
 *   - battery: circular zone, server only updates on boundary cross
 *
 * The radius slider only renders in 'battery' mode. Values 100–5000m.
 *
 * UX note: the actual "center" anchor happens at save time (see
 * useEditProfile → handleSave), not here. This section only edits state.
 */
export function GeoModeSection({
  geoMode,
  geoZoneRadiusM,
  onGeoModeChange,
  onRadiusChange,
}: Props) {
  return (
    <Card variant="outlined" className="p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <BatteryLow size={16} aria-hidden="true" />
          Modo de ubicación
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Si tienes datos limitados o batería baja, elige &ldquo;Ahorro de batería&rdquo;.
          Tu pin solo se actualizará cuando salgas del círculo que definas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant={geoMode === 'precise' ? 'primary' : 'outline'}
          className="cursor-pointer flex items-center gap-1"
          onClick={() => onGeoModeChange('precise')}
          aria-pressed={geoMode === 'precise'}
        >
          <Zap size={14} aria-hidden="true" />
          Preciso (cada 10 s)
        </Badge>
        <Badge
          variant={geoMode === 'battery' ? 'primary' : 'outline'}
          className="cursor-pointer flex items-center gap-1"
          onClick={() => onGeoModeChange('battery')}
          aria-pressed={geoMode === 'battery'}
        >
          <BatteryLow size={14} aria-hidden="true" />
          Ahorro de batería
        </Badge>
      </div>

      {geoMode === 'battery' && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label htmlFor="geo-radius" className="text-sm font-medium text-gray-700 block">
            Radio de actualización: <span className="text-primary font-bold">{geoZoneRadiusM} m</span>
          </label>
          <input
            id="geo-radius"
            type="range"
            min={100}
            max={5000}
            step={100}
            value={geoZoneRadiusM}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Radio de la zona en metros"
          />
          <div className="flex justify-between text-xs text-gray-400" aria-hidden="true">
            <span>100 m</span>
            <span>1 km</span>
            <span>2 km</span>
            <span>5 km</span>
          </div>
          <p className="text-xs text-gray-500 pt-1">
            Al guardar, anclamos el círculo a tu ubicación actual. Cuando salgas del
            círculo, mandaremos tu nueva posición y volveremos a anclar.
          </p>
        </div>
      )}
    </Card>
  )
}