'use client'

import { useState, useEffect, useRef } from 'react'
import { Power, MapPin, Bike } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useToast } from './Toast'
import { useStore } from '@/store/useStore'

/**
 * VendorVisibility — unified visibility + station-type control for a vendor.
 *
 * This used to be split across two components:
 *   1. ActiveToggle (legacy): dedicated switch for "I'm open / I'm closed"
 *      with a 10-second GPS polling interval that wrote the position back to
 *      /api/vendors/{id}/location.
 *   2. VendorVisibility (N11): isActive + station_type (fixed vs mobile)
 *      persisted via /api/vendors/me/settings.
 *
 * Both wrote the same `is_active` column. Toggling one and then the other
 * was a last-write-wins race that confused sellers — flipping the bottom
 * switch off would not stick if ActiveToggle's 10s PUT timer fired
 * afterwards. Sprint 2 consolidates them here.
 *
 * What this component now does:
 *   - Renders the "Estoy abierto/cerrado" switch (isActive).
 *   - Renders the "Puesto fijo / Me muevo" pair (stationType).
 *   - When isActive=true, polls geolocation every 10s and writes
 *     {isActive, lat, lng} to /api/vendors/me/settings in one roundtrip
 *     so backend state stays in sync with the visible toggle.
 *   - When isActive=false, stops polling and clears the watcher.
 *
 * Why /api/vendors/me/settings (not /api/vendors/{id}/location): the settings
 * endpoint already accepts is_active + lat + lng + station_type in one
 * payload; the legacy /location route stays for backwards compatibility with
 * older clients but new code should prefer this one.
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
  const [stationType, setStationType] = useState<'fixed' | 'mobile' | null>(
    initialStationType ?? 'mobile'
  )
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const setUserLocation = useStore((s) => s.setUserLocation)
  const setSellerActive = useStore((s) => s.setSellerActive)

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
    setSellerActive(next) // mirror into store so other components stay in sync
    const ok = await sendUpdate({ is_active: next })
    if (!ok) {
      setIsActive(!next)
      setSellerActive(!next)
    }
  }

  const setType = async (type: 'fixed' | 'mobile') => {
    if (type === stationType) return
    const prev = stationType
    setStationType(type)
    const ok = await sendUpdate({ station_type: type })
    if (!ok) setStationType(prev)
  }

  // Migrated from ActiveToggle: when isActive, poll geolocation every 10s
  // and push the new coords to /api/vendors/me/settings. Keeps the dashboard
  // marker moving and the vendor's published position fresh.
  const watcherRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isActive || !navigator.geolocation) return

    let inFlight = false

    const tick = () => {
      if (inFlight) return
      inFlight = true
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          inFlight = false
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setUserLocation({ lat, lng })
          // Fire-and-forget: don't block UI on the periodic save.
          // The optimistic toggle above already wrote the is_active.
          fetch(
            `/api/vendors/me/settings?vendorId=${encodeURIComponent(vendorId)}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                is_active: true,
                latitude: lat,
                longitude: lng,
              }),
            }
          ).catch(() => {/* periodic best-effort, ignore */})
        },
        () => {
          inFlight = false
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5000 }
      )
    }

    // Prime one immediate sample so the marker moves instantly on toggle.
    tick()
    watcherRef.current = window.setInterval(tick, 10000)

    return () => {
      if (watcherRef.current) {
        window.clearInterval(watcherRef.current)
        watcherRef.current = null
      }
    }
  }, [isActive, vendorId, setUserLocation])

  // If the parent changes the initial values (after a re-fetch), mirror them.
  useEffect(() => {
    setIsActive(initialIsActive)
  }, [initialIsActive])
  useEffect(() => {
    if (initialStationType) setStationType(initialStationType)
  }, [initialStationType])

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
          {/* h2 to maintain heading-order under the page's <h1>. */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-800 text-sm">Visibilidad</h2>
            {/* role=switch + aria-checked for proper a11y semantics */}
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-label={isActive ? 'Estoy abierto — ocultar' : 'Estoy cerrado — mostrar'}
              onClick={toggleActive}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
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
