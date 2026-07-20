'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Navigation, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * ManualLocationPicker — draggable mini-map so the seller can adjust their
 * pin on the dashboard. Replaces/augments the GPS-only "Compartir mi
 * ubicación" button.
 *
 * Behavior:
 *   - Renders a Leaflet map centered on the vendor's current lat/lng (or on
 *     the city center if none is set yet).
 *   - A single draggable pin shows the current location; the seller can
 *     either drag it or tap anywhere on the map to move it.
 *   - "Usar GPS actual" re-centers on navigator.geolocation (the legacy
 *     path that the dashboard's "Compartir" button used to do).
 *   - "Guardar ubicación manual" PATCHes /api/vendors/me/location with the
 *     pin's current lat/lng.
 *   - Mirrors the Colombia bounding box validation done server-side so we
 *     can warn before sending a request that will 400.
 *
 * Colombia bounding box (must match apps/web/app/api/vendors/me/location):
 *   lat: -4.2 to 13.5
 *   lng: -79.1 to -66.9
 */

const COLOMBIA_BOUNDS = {
  minLat: -4.2, maxLat: 13.5,
  minLng: -79.1, maxLng: -66.9,
} as const

// City center fallback when the vendor has no lat/lng yet. Default to Cali
// since that's where the demo data lives; otherwise pick the city from
// COLOMBIA_CITIES matching vendorCityId.
const DEFAULT_CENTER: [number, number] = [3.4516, -76.532] // Cali

// react-leaflet must be client-only — Next can't SSR Leaflet.
const PickerInner = dynamic(() => import('./ManualLocationPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="h-56 rounded-lg bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-sm text-gray-500">Cargando mapa...</span>
    </div>
  ),
})

interface ManualLocationPickerProps {
  initialLat: number | null
  initialLng: number | null
  initialCityId: string | null
  onSaved: (lat: number, lng: number) => void
}

export function ManualLocationPicker({
  initialLat,
  initialLng,
  initialCityId,
  onSaved,
}: ManualLocationPickerProps) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  )
  const [saving, setSaving] = useState(false)
  const [sharingGPS, setSharingGPS] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset success/error when the pin moves so stale messages don't linger.
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(false); setError(null) }, 2500)
      return () => clearTimeout(t)
    }
  }, [pin, success, error])

  // Mirror parent updates to initialLat/initialLng into the local pin when
  // the user hasn't moved it themselves (pin matches prop within ~50m of
  // GPS jitter). Without this, server-side updates from a background GPS
  // poll never show up in the picker until the user saves.
  useEffect(() => {
    if (initialLat == null || initialLng == null) return
    setPin((cur) => {
      if (cur) {
        const dLat = Math.abs(cur.lat - initialLat)
        const dLng = Math.abs(cur.lng - initialLng)
        if (dLat < 0.0005 && dLng < 0.0005) {
          return { lat: initialLat, lng: initialLng }
        }
        return cur
      }
      return { lat: initialLat, lng: initialLng }
    })
  }, [initialLat, initialLng])

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      return
    }
    setSharingGPS(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        if (
          latitude < COLOMBIA_BOUNDS.minLat || latitude > COLOMBIA_BOUNDS.maxLat ||
          longitude < COLOMBIA_BOUNDS.minLng || longitude > COLOMBIA_BOUNDS.maxLng
        ) {
          setError('Tu GPS devolvió coordenadas fuera de Colombia')
          setSharingGPS(false)
          return
        }
        setPin({ lat: latitude, lng: longitude })
        setSharingGPS(false)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setError('Permiso de ubicación denegado')
        else if (err.code === err.TIMEOUT) setError('La solicitud tardó demasiado')
        else setError('No pude obtener tu ubicación')
        setSharingGPS(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleSave = async () => {
    if (!pin) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/vendors/me/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ latitude: pin.lat, longitude: pin.lng }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Error al guardar ubicación')
        return
      }
      setSuccess(true)
      onSaved(pin.lat, pin.lng)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // Determine map center: pin > city center > Cali default.
  const center: [number, number] = pin
    ? [pin.lat, pin.lng]
    : DEFAULT_CENTER

  return (
    <div className="space-y-3">
      <PickerInner
        center={center}
        pin={pin}
        bounds={COLOMBIA_BOUNDS}
        onPinChange={(lat, lng) => setPin({ lat, lng })}
      />

      <div className="text-xs text-gray-600">
        {pin
          ? <>Pin actual: <span className="font-mono">{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span></>
          : 'Arrastra el pin o toca el mapa para fijar tu ubicación manualmente.'}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleUseGPS}
          disabled={sharingGPS}
        >
          <Navigation size={14} className="mr-1" />
          {sharingGPS ? 'Obteniendo GPS...' : 'Usar GPS actual'}
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!pin || saving}
        >
          <MapPin size={14} className="mr-1" />
          {saving ? 'Guardando...' : 'Guardar ubicación manual'}
        </Button>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
      {success && <p className="text-green-600 text-xs">✓ Ubicación guardada</p>}
    </div>
  )
}
