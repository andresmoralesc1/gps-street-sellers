'use client'

import { useEffect, useRef } from 'react'

export interface VendorLocationUpdate {
  vendorId: string
  latitude: number
  longitude: number
  isActive: boolean
  locationUpdatedAt: string
}

/**
 * Subscribe to live GPS updates for a city.
 * Connects to /api/vendors/stream?cityId=... and calls onUpdate
 * whenever a vendor's location changes.
 *
 * Auto-reconnects on disconnect (handled by EventSource spec).
 */
export function useVendorStream(
  cityId: string | null,
  onUpdate: (u: VendorLocationUpdate) => void
) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!cityId) return

    const source = new EventSource(`/api/vendors/stream?cityId=${encodeURIComponent(cityId)}`)

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        // Ignore pings
        if (data.type === 'ping') return
        onUpdateRef.current(data)
      } catch {
        /* ignore malformed events */
      }
    }

    source.onerror = () => {
      // EventSource auto-reconnects. We just log; closing the source
      // would prevent reconnect per spec.
      console.warn('[stream] SSE connection error, will auto-reconnect')
    }

    return () => {
      source.close()
    }
  }, [cityId])
}

/**
 * Send the vendor's GPS to /api/vendors/[id]/location every `intervalMs`.
 * Only runs when `enabled` is true (typically only on the seller dashboard
 * with location permission granted).
 */
export function useVendorLocationBroadcaster(
  vendorId: string | null,
  intervalMs: number = 30_000,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!vendorId || !enabled) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    let watchId: number | null = null
    let lastSentAt = 0
    const minDeltaMs = intervalMs - 5_000

    const send = (lat: number, lng: number) => {
      const now = Date.now()
      if (now - lastSentAt < minDeltaMs) return
      lastSentAt = now

      fetch(`/api/vendors/${vendorId}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, isActive: true }),
        keepalive: true,
      }).catch((err) => console.warn('[broadcaster] PUT failed:', err))
    }

    watchId = navigator.geolocation.watchPosition(
      (pos) => send(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn('[broadcaster] geolocation error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    )

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  }, [vendorId, intervalMs, enabled])
}