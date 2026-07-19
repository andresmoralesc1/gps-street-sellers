'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

interface Props {
  center: [number, number]
  pin: { lat: number; lng: number } | null
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  onPinChange: (lat: number, lng: number) => void
}

/**
 * Inner Leaflet map for the seller's manual location picker.
 *
 * - Single draggable pin that the user can drag or tap-to-place.
 * - `useMapEvents` listens to clicks anywhere on the map so the seller can
 *   tap a street corner instead of trying to drag a tiny pin (mobile UX).
 * - The map re-centers when the `center` prop changes (e.g. when the user
 *   clicks "Usar GPS actual" and we receive new coords).
 *
 * Why we don't reuse `DraggableUserMarker`: that component is for the
 * buyer's "your location" dot in blue. Here we want a vendor pin (different
 * icon) that always reflects the *vendor's* claimed position, not the
 * buyer's. Different semantics, different color.
 */
export default function ManualLocationPickerInner({ center, pin, bounds, onPinChange }: Props) {
  const icon = useMemo(
    () =>
      new L.DivIcon({
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50% 50% 50% 0;
              background: #16a34a;
              transform: rotate(-45deg);
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            "></div>
            <div style="
              position: relative;
              color: white;
              font-size: 16px;
              transform: rotate(45deg);
            ">📍</div>
          </div>
        `,
        className: 'vendor-manual-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    []
  )

  return (
    <div className="h-56 rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={pin ? 15 : 12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* useMapEvents MUST be inside <MapContainer> so the Leaflet context
            is available. This is the fix for the
            "useLeafletContext() can only be used in a descendant of <MapContainer>"
            crash that took down the whole dashboard. */}
        <TapToPlace bounds={bounds} onPlace={onPinChange} />
        {pin && (
          <Marker
            position={[pin.lat, pin.lng]}
            icon={icon}
            draggable={true}
            eventHandlers={{
              drag: (e) => {
                const { lat, lng } = e.target.getLatLng()
                onPinChange(lat, lng)
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}

// Tap-anywhere-to-place: must live INSIDE <MapContainer> so it has access
// to the Leaflet context. Returns null because it's a side-effect-only hook.
function TapToPlace({
  bounds,
  onPlace,
}: {
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  onPlace: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      // Clamp to Colombia bounding box so users can't accidentally pin
      // somewhere the API will reject.
      const clampedLat = Math.min(Math.max(lat, bounds.minLat), bounds.maxLat)
      const clampedLng = Math.min(Math.max(lng, bounds.minLng), bounds.maxLng)
      onPlace(clampedLat, clampedLng)
    },
  })
  return null
}
