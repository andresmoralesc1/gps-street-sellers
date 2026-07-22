'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Navigation, MapPin, Map as MapIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

/**
 * Location section for /profile/edit.
 *
 * Lets the seller place their pin on a draggable map (or use the live GPS
 * once). Same Leaflet setup as the dashboard's ManualLocationPicker — both
 * load their own internal picker (ssr:false, separate bundle). The internal
 * picker imports `leaflet/dist/leaflet.css` so the map renders even when the
 * seller lands on /profile/edit without first visiting /map.
 *
 * Validation: clamps to Colombia bounds before exposing lat/lng to the
 * parent. Mirrors the bound check in /api/vendors/me/location.
 */

// react-leaflet must be client-only — Next can't SSR Leaflet.
const PickerInner = dynamic(
  () => import('./ManualLocationPickerInner').then((m) => m.default),
  { ssr: false }
)

const COLOMBIA_BOUNDS = {
  minLat: -4.2, maxLat: 13.5,
  minLng: -79.1, maxLng: -66.9,
} as const

interface Props {
  initialLat: number | null
  initialLng: number | null
  /** Called when the seller places the pin (drag, tap or GPS). The parent
   *  should persist to the vendor record on save. */
  onLocationChange: (lat: number, lng: number) => void
}

export function LocationSection({ initialLat, initialLng, onLocationChange }: Props) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  )
  const [sharingGPS, setSharingGPS] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mirror initialLat/initialLng into local pin when the parent re-hydrates
  // (e.g. after the hook loads the vendor on first paint).
  useEffect(() => {
    if (initialLat == null || initialLng == null) return
    setPin((cur) => {
      if (!cur) return { lat: initialLat, lng: initialLng }
      const dLat = Math.abs(cur.lat - initialLat)
      const dLng = Math.abs(cur.lng - initialLng)
      // If the user already moved the pin, don't snap back — only re-hydrate
      // when the local pin is null or coincident.
      if (dLat < 0.00001 && dLng < 0.00001) return { lat: initialLat, lng: initialLng }
      return cur
    })
  }, [initialLat, initialLng])

  const center: [number, number] = pin ? [pin.lat, pin.lng] : [3.4516, -76.532]

  function handlePinChange(lat: number, lng: number) {
    setError(null)
    // Clamp before exposing — keeps the server-side validation from 400ing.
    const clampedLat = Math.min(Math.max(lat, COLOMBIA_BOUNDS.minLat), COLOMBIA_BOUNDS.maxLat)
    const clampedLng = Math.min(Math.max(lng, COLOMBIA_BOUNDS.minLng), COLOMBIA_BOUNDS.maxLng)
    const next = { lat: clampedLat, lng: clampedLng }
    setPin(next)
    onLocationChange(next.lat, next.lng)
  }

  function handleUseGPS() {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      return
    }
    setSharingGPS(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePinChange(pos.coords.latitude, pos.coords.longitude)
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

  return (
    <Card variant="outlined" className="p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <MapIcon size={16} aria-hidden="true" />
          Ubicación en el mapa
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Coloca el pin donde vendes o usa tu GPS. Lo ven los compradores en el mapa público.
        </p>
      </div>

      <PickerInner
        center={center}
        pin={pin}
        bounds={COLOMBIA_BOUNDS}
        onPinChange={handlePinChange}
      />

      <div className="text-xs text-gray-600">
        {pin ? (
          <>
            <MapPin size={12} className="inline mr-1" aria-hidden="true" />
            Pin actual:{' '}
            <span className="font-mono">
              {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
            </span>
          </>
        ) : (
          'Arrastra el pin o toca el mapa para fijar tu ubicación.'
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleUseGPS}
        disabled={sharingGPS}
      >
        <Navigation size={14} className="mr-1" aria-hidden="true" />
        {sharingGPS ? 'Obteniendo GPS...' : 'Usar GPS actual'}
      </Button>

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </Card>
  )
}
