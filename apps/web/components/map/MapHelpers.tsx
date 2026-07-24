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
import { useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from 'leaflet'
import type { Vendor } from '@/lib/core/types'

// Syncs the map's view to an external center prop. Used when the user picks
// a city from the dropdown — the map should follow without animation.
// MAP-004 fix: `map.setView(center)` was passing the default zoom, which
// destroyed the user's zoom level on every city/geolocation change. Use
// `panTo` for translation-only moves (preserves zoom) when the change is
// the same zoom level we're already at, and only fall back to `setView`
// (with the current zoom) for explicit "I want a fresh view" interactions.
export function MapUpdater({ center }: { center: LatLng }) {
  const map = useMap()
  useEffect(() => {
    // Get current center to compare — if the new center is within ~10m of
    // the current one, panTo is a no-op and we don't disturb zoom at all.
    const current = map.getCenter()
    const moved =
      Math.abs(current.lat - center.lat) > 0.0001 ||
      Math.abs(current.lng - center.lng) > 0.0001
    if (!moved) return
    // panTo preserves the user's current zoom; setView would force it back.
    map.panTo(center, { animate: true, duration: 0.6 })
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
//
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
  // MAP-008 fix: track the last vendor we flew to. Without this, the
  // useEffect re-runs whenever `bottomOffsetPx` changes (which happens
  // when the bottom card animates in/out), causing `flyTo` to replay
  // on every render — pushing the user back to the vendor each time.
  // We only flyTo when the actual vendor changes, not when the offset
  // or any other prop changes.
  const lastVendorIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!vendor || vendor.latitude == null || vendor.longitude == null) return
    if (lastVendorIdRef.current === vendor.id) return
    lastVendorIdRef.current = vendor.id

    const point = map.latLngToContainerPoint([vendor.latitude, vendor.longitude])
    // Move the vendor marker up by the card height + small breathing room.
    const targetPoint = L.point(point.x, point.y - bottomOffsetPx)
    const targetLatLng = map.containerPointToLatLng(targetPoint)
    // Preserve the user's current zoom; only zoom in if the map is
    // currently way out (no point flying someone from city-level to
    // street-level without an explicit tap on a marker).
    const currentZoom = map.getZoom()
    const targetZoom = currentZoom < 14 ? Math.max(currentZoom, 15) : currentZoom
    map.flyTo(targetLatLng, targetZoom, {
      animate: true,
      duration: 0.8,
      easeLinearity: 0.25,
    })
  }, [map, vendor, bottomOffsetPx])
  return null
}

// M-003: auto-fitBounds when vendors are visible but no userLocation is set.
// Without this, opening /map in a new city shows a single tile at zoom 15 with
// vendors potentially 10+ km away. fitBounds({maxZoom:15}) gives the user a
// "see all sellers at once" view the moment data loads. Skipped if the user
// already panned the map (we can't detect that easily — so we only fire on
// first render via the `hasFit` ref).
export function MapFitBounds({ vendors }: { vendors: Vendor[] }) {
  const map = useMap()
  const hasFit = useRef(false)
  useEffect(() => {
    // MAP-007: set hasFit BEFORE the empty-list early return. Otherwise, if
    // the first render has 0 vendors and the second has N, MapFitBounds
    // runs again with the fresh data — but at that point the user may
    // have already panned/zoomed, and fitBounds wipes their state. By
    // marking "we've already attempted" on the first render, we never
    // surprise the user with an unsolicited recenter.
    if (hasFit.current) return
    hasFit.current = true
    const valid = vendors.filter(
      (v) => typeof v.latitude === 'number' && typeof v.longitude === 'number'
    )
    if (valid.length === 0) return

    // Sprint 5 B-001: padding accounts for the mobile bottom sheet
    // (MobileBottomSheet sits at the bottom 35% of the viewport on
    // <sm breakpoints). Without extra bottom padding, the bottom-most
    // markers fall under the sheet on first fit. The width padding
    // (40) keeps a slim margin around the side controls.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const bottomPad = isMobile
      ? Math.max(120, window.innerHeight * 0.35) // sheet height + a little
      : 40
    const padding: [number, number] = [40, bottomPad]

    if (valid.length === 1) {
      // Single vendor: just center on it. Preserve the user's zoom if they
      // already zoomed in (e.g. on city change), only set the floor to 15.
      const currentZoom = map.getZoom()
      const targetZoom = Math.max(currentZoom, 15)
      map.setView([valid[0].latitude as number, valid[0].longitude as number], targetZoom, { animate: true })
    } else {
      const bounds = L.latLngBounds(
        valid.map((v) => [v.latitude as number, v.longitude as number])
      )
      // maxZoom drops to 13 on mobile so a single-vendor case doesn't
      // pin the camera too tightly. The previous 15 was triggering
      // markers-out-of-viewport when sellers were 5–15 km apart.
      const maxZoom = isMobile ? 13 : 15
      map.fitBounds(bounds, { padding, maxZoom, animate: true })
    }
  }, [map, vendors])
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