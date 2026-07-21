'use client'

/**
 * Leaflet helper components for MapView.
 *
 * Each one returns null and uses the imperative Leaflet API via react-leaflet
 * hooks (useMap, useMapEvents) to control the map from inside the JSX tree.
 * They're kept in one file because they're all <100 lines and share the same
 * single import surface (react-leaflet + leaflet types). Splitting further
 * would just add import boilerplate without making any one of them easier to
 * read.
 */
import { useEffect } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from 'leaflet'
import type { Vendor } from '@/lib/core/types'

// Syncs the map's view to an external center prop. Used when the user picks
// a city from the dropdown — the map should follow without animation.
export function MapUpdater({ center }: { center: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [map, center])
  return null
}

// Closes the selected vendor when the user clicks empty map (not on a marker).
export function MapClickCloser({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  })
  return null
}

// Injects a <style> tag that bumps Leaflet's zoom +/- buttons to
// WCAG-compliant 44x44px on mobile viewports. The selector chains through
// `html body` so it wins specificity against Leaflet's own
// `.leaflet-touch .leaflet-bar a { width: 30px }` without needing to
// globally raise Leaflet's selector priority. !important is kept as a
// defensive guard for any future Leaflet refactor.
export function LeafletTouchTargetOverride() {
  useEffect(() => {
    const STYLE_ID = 'leaflet-touch-target-override'
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      @media (max-width: 768px) {
        html body .leaflet-touch .leaflet-bar a,
        html body .leaflet-control-zoom a,
        html body .leaflet-control-zoom-in,
        html body .leaflet-control-zoom-out {
          width: 44px !important;
          height: 44px !important;
          line-height: 44px !important;
          font-size: 22px !important;
        }
      }
    `
    document.head.appendChild(style)
  }, [])
  return null
}

// Pans the map so the selected vendor stays visible above the floating card.
// `bottomOffsetPx` is the height in pixels the floating card occupies at the
// bottom of the viewport — we pan up by that amount so the marker isn't
// hidden under the card.
//
// Upgraded 2026-07-21 from panTo → flyTo so the user sees the spatial
// relationship between vendors (panTo just slides; flyTo animates both
// pan AND zoom, giving a sense of "the map is flying to the vendor").
// `easeLinearity: 0.25` adds a tiny ease-out so the motion feels organic
// instead of mechanically linear. Zoom range `[currentZoom, 16]` zooms
// in slightly on selection, then if the user pans away it stays where
// they left it (flyTo doesn't auto-recenter like setView would).
export function MapPanToVendor({
  vendor,
  bottomOffsetPx,
}: {
  vendor: Vendor | null
  bottomOffsetPx: number
}) {
  const map = useMap()
  useEffect(() => {
    if (!vendor || vendor.latitude == null || vendor.longitude == null) return
    const point = map.latLngToContainerPoint([vendor.latitude, vendor.longitude])
    // Move the vendor marker up by the card height + small breathing room.
    const targetPoint = L.point(point.x, point.y - bottomOffsetPx)
    const targetLatLng = map.containerPointToLatLng(targetPoint)
    const targetZoom = Math.max(map.getZoom(), 15)
    map.flyTo(targetLatLng, targetZoom, {
      animate: true,
      duration: 0.8,
      easeLinearity: 0.25,
    })
  }, [map, vendor, bottomOffsetPx])
  return null
}

// Smoothly recenters the map on a given lat/lng. Used when the user
// finishes dragging the location pin or re-locates via GPS — we want
// the map to follow so the new origin is visible.
export function MapRecenter({ center, trigger }: { center: LatLng; trigger: number }) {
  const map = useMap()
  useEffect(() => {
    if (trigger === 0) return // skip initial mount
    map.panTo(center, { animate: true, duration: 0.5 })
  }, [map, center.lat, center.lng, trigger])
  return null
}