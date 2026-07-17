'use client'

import { useState, useEffect } from 'react'
import { Power, MapPin, Bike } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useToast } from './Toast'

/**
 * VendorVisibility — control panel for the two ways a vendor goes off the map.
 *
 * is_active (manual toggle):
 *   - Vendor flips this when they want to hide themselves for the day
 *     (vacation, sick day, going to a private event).
 *   - Independent from business hours: a vendor with auto schedule set
 *     to "8–18 Mon–Fri" can still flip this off on a public holiday.
 *
 * station_type (fixed | mobile):
 *   - fixed: stays in the same spot. Buyers navigate to them. Auto-hide
 *     outside business hours makes sense.
 *   - mobile: moves around the city. Showing them as "closed outside
 *     hours" is misleading — they're open whenever they're rolling.
 *     Marking them mobile keeps them visible 24/7 unless the vendor
 *     manually toggles is_active off.
 *
 * Why a separate endpoint (/api/vendors/me/settings) instead of patching
 * the legacy /business-hours one: the new endpoint covers all the toggles
 * in one place so we don't grow two parallel APIs forever.
 */

interface VendorVisibilityProps {
  vendorId: string
  initialIsActive: boolean
  initialStationType: 'fixed' | 'mobile' | null
}

export function VendorVisibility({
  vendorId,
  initialIsActive,
  initialStationType,
}: VendorVisibilityProps) {
  const [isActive, setIsActive] = useState(initialIsActive)
  const [stationType, setStationType] = useState<'fixed' | 'mobile'>(
    initialStationType ?? 'mobile'
  )
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const sendUpdate = async (patch: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(
        `/api/vendors/me/settings?vendorId=${encodeURIComponent(vendorId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(patch),
        }
      )
      if (res.ok) {
        showToast('Guardado ✓', 'success')
        return true
      }
      const err = await res.json().catch(() => ({}))
      showToast(err.error || 'Error al guardar', 'error')
      return false
    } catch {
      showToast('Error de conexión', 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    const next = !isActive
    // Optimistic update — if the network fails the toast alerts and we revert
    setIsActive(next)
    const ok = await sendUpdate({ is_active: next })
    if (!ok) setIsActive(!next)
  }

  const setType = async (type: 'fixed' | 'mobile') => {
    if (type === stationType) return
    setStationType(type)
    const ok = await sendUpdate({ station_type: type })
    if (!ok) setStationType(stationType)
  }

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
          aria-hidden="true"
        >
          <Power size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-800 text-sm">Visibilidad</h3>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isActive}
                onChange={toggleActive}
                disabled={saving}
                aria-label={isActive ? 'Estoy abierto — ocultar' : 'Estoy cerrado — mostrar'}
              />
              <div className="relative w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors peer-disabled:opacity-50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isActive
              ? 'Tu puesto aparece en el mapa'
              : 'Oculto del mapa (vacaciones, día libre, etc.)'}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('fixed')}
              disabled={saving}
              aria-pressed={stationType === 'fixed'}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                stationType === 'fixed'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              <MapPin size={14} aria-hidden="true" />
              Puesto fijo
            </button>
            <button
              type="button"
              onClick={() => setType('mobile')}
              disabled={saving}
              aria-pressed={stationType === 'mobile'}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                stationType === 'mobile'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              <Bike size={14} aria-hidden="true" />
              Me muevo
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}