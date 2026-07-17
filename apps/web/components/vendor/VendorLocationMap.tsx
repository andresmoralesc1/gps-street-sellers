'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Navigation, MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

/**
 * VendorLocationMap — mini read-only map showing where the vendor is right now.
 *
 * Why this exists:
 *   Buyers land on /vendor/[slug] from search, ads, or word-of-mouth. The
 *   first question they have is "where exactly is this person?". A static
 *   "Cómo llegar → Google Maps" link asks them to leave the app before they
 *   even see the products. A small embedded map answers it inline.
 *
 * UX choices:
 *   - 240px tall, 16:9-ish ratio. Tall enough to see the neighborhood, short
 *     enough not to push the product grid below the fold.
 *   - No zoom controls, no scroll-wheel zoom. Buyers don't need to pan
 *     around — they're here to see one pin. The full map at /map has all
 *     the controls.
 *   - Single pin with the vendor's category emoji as the icon (matches the
 *     main map so it feels consistent).
 *   - Click on the card body opens Google Maps directions in a new tab.
 *   - If the vendor has no lat/lng (e.g. old accounts that never shared
 *     location), we render nothing — the "Cómo llegar" button downstream
 *     also checks for lat/lng and hides itself.
 *
 * station_type hint:
 *   Mobile vendors update their pin every ~10s (ActiveToggle interval), so
 *   this map will visibly jump as they roll around. Fixed vendors sit still.
 *   No special treatment needed — the marker just moves or doesn't.
 */

interface VendorLocationMapProps {
  lat: number
  lng: number
  name: string
  category?: string
  stationType?: 'fixed' | 'mobile'
}

const CATEGORY_EMOJI: Record<string, string> = {
  frutas: '🥑',
  comida: '🍳',
  bebidas: '🧃',
  artesanias: '🎨',
  ropa: '👕',
  otros: '📦',
}

// Mirror MapView's category colors so the pin looks the same here as on /map.
const CATEGORY_COLOR: Record<string, string> = {
  frutas: '#22c55e',
  comida: '#f59e0b',
  bebidas: '#3b82f6',
  artesanias: '#a855f7',
  ropa: '#ec4899',
  otros: '#6b7280',
}

export function VendorLocationMap({
  lat,
  lng,
  name,
  category,
  stationType,
}: VendorLocationMapProps) {
  const emoji = CATEGORY_EMOJI[category ?? ''] ?? '📦'
  const color = CATEGORY_COLOR[category ?? ''] ?? '#6b7280'

  // Build the DivIcon once. Leaflet warns if you re-create icons inside the
  // render path; memoize so re-renders don't churn.
  const icon = useMemo(
    () =>
      L.divIcon({
        html: `<div style="
          background: ${color};
          width: 40px; height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        "><span style="transform: rotate(45deg);">${emoji}</span></div>`,
        className: 'vendor-location-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -42],
      }),
    [color, emoji]
  )

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
        aria-label={`Abrir Google Maps con direcciones hacia ${name}`}
      >
        <div className="relative" style={{ height: 240 }}>
          <MapContainer
            center={[lat, lng]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            // Disable most interactions — this is a preview, not a working map.
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
            zoomControl={false}
            // Touch-zoom is fine (double-tap-to-zoom on mobile); tap to open
            // the popup feels responsive.
            attributionControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <Marker position={[lat, lng]} icon={icon}>
              <Popup>
                <div className="text-sm">
                  <strong>{name}</strong>
                  <br />
                  {stationType === 'fixed' ? '📍 Puesto fijo' : '🛵 En movimiento'}
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Subtle hover hint so the user knows the map is clickable. */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />

          {/* Floating "Cómo llegar" pill in the corner — reinforces the click
              affordance on mobile where hover doesn't exist. */}
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white shadow-md text-primary border border-primary/20">
            <Navigation size={14} aria-hidden="true" />
            Cómo llegar
          </span>
        </div>
      </a>

      <div className="px-4 py-2 text-xs text-gray-500 flex items-center gap-1.5">
        <MapPin size={12} aria-hidden="true" />
        {stationType === 'fixed'
          ? 'Puesto fijo · ubicación estable'
          : 'Se mueve por la ciudad · ubicación aproximada'}
      </div>
    </div>
  )
}