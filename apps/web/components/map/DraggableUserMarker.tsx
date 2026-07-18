'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

interface Props {
  /** Current location. The marker reflects this until the user drags it. */
  location: { lat: number; lng: number }
  /** Called continuously while dragging. Used to update the store. */
  onDrag: (lat: number, lng: number) => void
  /** Called once on drag end. Used to recenter the map. */
  onDragEnd: (lat: number, lng: number) => void
}

/**
 * A draggable Leaflet Marker representing the user's location.
 *
 * In normal mode the user-location is a passive CircleMarker (read-only).
 * When the parent flips into "adjust" mode this component takes over:
 * the marker becomes a pin the user can drag anywhere on the map, and
 * `onDrag` updates the global store so distance filters and the vendor
 * list recompute against the new origin.
 *
 * Implementation notes:
 * - We use a custom DivIcon so the user sees a recognizable "you are
 *   here" pin instead of the default Leaflet pin.
 * - `draggable={true}` enables the drag handlers.
 * - Cursor changes via the `.leaflet-grab` class — Leaflet adds it
 *   automatically while hovering a draggable marker.
 * - We listen to `move` to update `onDrag` (continuous), and to
 *   `dragend` to call `onDragEnd` (one-shot — used to recenter).
 */
export function DraggableUserMarker({ location, onDrag, onDragEnd }: Props) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)

  // Listen to map clicks while in adjust mode so the user can also tap
  // a point on the map (not just drag) to move the pin. This is more
  // natural on mobile than trying to drag a tiny marker.
  useMapEvents({
    click: (e) => {
      // Only treat the click as a "set location here" if it didn't land
      // on a vendor marker — we don't want to steal clicks from vendors.
      // Leaflet doesn't give us a "did I hit a marker" signal here, but
      // vendor markers call stopPropagation in their own click handler,
      // so if we got here it wasn't a vendor.
      onDragEnd(e.latlng.lat, e.latlng.lng)
    },
  })

  const icon = useMemo(
    () =>
      new L.DivIcon({
        html: `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
          ">
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: rgba(59, 130, 246, 0.25);
              animation: locationPulse 1.8s ease-out infinite;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #3B82F6;
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            "></div>
          </div>
        `,
        className: 'user-location-draggable-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    []
  )

  // When the location prop changes from outside (e.g. "Volver a GPS"),
  // move the marker so it stays in sync.
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([location.lat, location.lng])
    }
  }, [location.lat, location.lng])

  return (
    <Marker
      ref={markerRef}
      position={[location.lat, location.lng]}
      icon={icon}
      draggable={true}
      eventHandlers={{
        drag: (e) => {
          const { lat, lng } = e.target.getLatLng()
          onDrag(lat, lng)
        },
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng()
          onDragEnd(lat, lng)
        },
      }}
    />
  )
}