'use client'

import { useState, useEffect, useRef } from 'react'
import { Power, MapPin, Bike } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
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
 *   - When isActive=true, polls geolocation. Behavior depends on geoMode:
 *     * 'precise': every 10s, push {isActive, lat, lng} to
 *       /api/vendors/{id}/location (legacy ActiveToggle path).
 *     * 'battery': every 60s while the vendor stays inside their saved zone
 *       (center + radius), only push {isActive} (skip coords entirely). If
 *       the new position is OUTSIDE the zone, push coords + re-anchor the
 *       zone to the new center by also PATCHing /api/vendors/me with the new
 *       geoZoneLat/Lng. This trades some precision for ~6x fewer network
 *       pings in the common case (vendor stays near their usual spot).
 *   - When isActive=false, stops polling and clears the watcher.
 *
 * Why /api/vendors/[id]/location for periodic GPS: that route accepts
 * camelCase {isActive, latitude, longitude} and persists them in one go.
 * /api/vendors/me/settings is used by toggleActive/setType (snake_case
 * settings: is_active + station_type + business_hours). Mixing the two
 * endpoints by purpose keeps the field conventions of each intact.
 */

interface VendorVisibilityProps {
  vendorId: string
  initialIsActive: boolean
  initialStationType: 'fixed' | 'mobile' | null
  // Geo mode (configured by the seller in /profile/edit).
  // 'precise' = send GPS every 10s.
  // 'battery' = send GPS only when the seller leaves a saved circular zone.
  geoMode: 'precise' | 'battery'
  geoZoneLat: number | null
  geoZoneLng: number | null
  geoZoneRadiusM: number
}

export function VendorVisibility({
  vendorId,
  initialIsActive,
  initialStationType,
  geoMode = 'precise',
  geoZoneLat = null,
  geoZoneLng = null,
  geoZoneRadiusM = 500,
}: VendorVisibilityProps) {
  const [isActive, setIsActive] = useState(initialIsActive)
  const [stationType, setStationType] = useState<'fixed' | 'mobile' | null>(
    initialStationType ?? 'mobile'
  )
  const [saving, setSaving] = useState(false)
  
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
        toast({ title: 'Guardado ✓', kind: 'success' })
        return true
      }
      const err = await res.json().catch(() => ({}))
      toast({ title: err.error || 'Error al guardar', kind: 'error' })
      return false
    } catch {
      toast({ title: 'Error de conexión', kind: 'error' })
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

  // Migrated from ActiveToggle: when isActive, poll geolocation. Polling
  // interval and payload depend on geoMode (see component header).
  const watcherRef = useRef<number | null>(null)
  // In battery mode, the zone center moves as the vendor moves. We track
  // the live center here so the "are we still inside?" check uses the
  // latest anchor, not the one originally saved in /profile/edit.
  //
  // The ref initializer only fires once. We also keep zoneCenterRef in sync
  // with the props in a separate effect so /profile/edit changes (which
  // re-mount the dashboard with new coords) are picked up without a stale
  // "no zone saved yet" tick.
  const zoneCenterRef = useRef<{ lat: number; lng: number } | null>(
    geoZoneLat != null && geoZoneLng != null
      ? { lat: geoZoneLat, lng: geoZoneLng }
      : null
  )
  useEffect(() => {
    zoneCenterRef.current =
      geoZoneLat != null && geoZoneLng != null
        ? { lat: geoZoneLat, lng: geoZoneLng }
        : null
  }, [geoZoneLat, geoZoneLng])

  useEffect(() => {
    if (!isActive || !navigator.geolocation) return

    let inFlight = false

    const pushLocation = async (lat: number, lng: number) => {
      // Fire-and-forget. Errors are intentionally swallowed: this is a
      // background best-effort pinger, the toggle above already wrote the
      // visible state.
      try {
        await fetch(
          `/api/vendors/${encodeURIComponent(vendorId)}/location`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              isActive: true,
              latitude: lat,
              longitude: lng,
            }),
          }
        )
      } catch {
        /* best-effort */
      }
    }

    // In battery mode, when the vendor crosses the zone boundary we re-anchor
    // the zone center to the new position. This is a separate PATCH from the
    // location update because /vendors/[id]/location only handles lat/lng,
    // not the geo_zone_* columns.
    const reanchorZone = async (lat: number, lng: number) => {
      try {
        await fetch('/api/vendors/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ geoZoneLat: lat, geoZoneLng: lng }),
        })
      } catch {
        /* best-effort */
      }
    }

    const tick = () => {
      if (inFlight) return
      inFlight = true
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          inFlight = false
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setUserLocation({ lat, lng })

          if (geoMode === 'precise') {
            await pushLocation(lat, lng)
            return
          }

          // Battery mode: send only when crossing the zone boundary.
          const center = zoneCenterRef.current
          if (!center) {
            // No zone saved yet (vendor never configured one or geoZoneLat
            // was null). Fall back to precise behavior for this tick so we
            // don't silently drop updates. Also seed the zone so future
            // ticks can be lazy.
            zoneCenterRef.current = { lat, lng }
            await pushLocation(lat, lng)
            await reanchorZone(lat, lng)
            return
          }

          const distanceM = haversineMeters(center.lat, center.lng, lat, lng)
          if (distanceM > geoZoneRadiusM) {
            // Crossed the boundary → push new coords AND re-anchor.
            await pushLocation(lat, lng)
            await reanchorZone(lat, lng)
            zoneCenterRef.current = { lat, lng }
          }
          // Inside the zone: do nothing. The next tick (60s) will check
          // again. We deliberately skip the network round-trip entirely
          // here — no isActive ping, nothing.
        },
        () => {
          inFlight = false
        },
        // enableHighAccuracy=false saves battery; in battery mode this is
        // exactly what we want. Precise mode also uses false because the
        // iOS Safari `watchPosition` continuous-accuracy prompt is hostile
        // to non-tech sellers.
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5000 }
      )
    }

    // Prime one immediate sample so the marker moves instantly on toggle.
    tick()
    // Precise: 10s (legacy ActiveToggle cadence). Battery: 60s — gives the
    // seller ~1 boundary check per minute, which is enough to detect
    // a significant move without hammering the radio.
    const intervalMs = geoMode === 'battery' ? 60_000 : 10_000
    watcherRef.current = window.setInterval(tick, intervalMs)

    return () => {
      if (watcherRef.current) {
        window.clearInterval(watcherRef.current)
        watcherRef.current = null
      }
    }
  }, [isActive, vendorId, setUserLocation, geoMode, geoZoneRadiusM, geoZoneLat, geoZoneLng])

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

// Great-circle distance in meters between two lat/lng points. Inline
// implementation to avoid pulling in a geo library for one call site.
// Inputs are degrees; R is the mean Earth radius.
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
