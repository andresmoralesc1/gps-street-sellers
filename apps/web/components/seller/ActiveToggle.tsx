'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { useEffect, useRef } from 'react'
import { clientLog } from '@/lib/client-logger'

interface ActiveToggleProps {
  vendorId: string
}

export function ActiveToggle({ vendorId }: ActiveToggleProps) {
  const isActive = useStore((s) => s.isSellerActive)
  const setSellerActive = useStore((s) => s.setSellerActive)
  const userLocation = useStore((s) => s.userLocation)
  const setUserLocation = useStore((s) => s.setUserLocation)
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // B1 fix: separate location-tracking lifecycle from state-sync.
  // Track location every 10s ONLY when isActive; do NOT depend on
  // userLocation in deps (avoids destroy/recreate on every tick).
  useEffect(() => {
    if (!isActive) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current)
        locationIntervalRef.current = null
      }
      return
    }

    if (!navigator.geolocation) return

    // Prime one immediate sample so the marker moves instantly when toggled on.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )

    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5000 }
      )
    }, 10000)

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current)
        locationIntervalRef.current = null
      }
    }
  }, [isActive, setUserLocation])

  // Sync to backend when isActive or position changes.
  // B8 fix: also include setSellerActive indirectly via isActive.
  useEffect(() => {
    if (!vendorId) return

    fetch(`/api/vendors/${vendorId}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        isActive,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
      }),
    // B-009-like: use clientLog instead of console.error.
    }).catch((err) => clientLog.error('ActiveToggle fetch error:', err))
  }, [isActive, vendorId, userLocation])

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
      <div>
        {/* h2 (not h3): previously this jumped from <h1> on the dashboard
            straight to <h3> here, which violated heading-order in axe. h2
            nests correctly under the page's <h1>. */}
        <h2 className="font-semibold text-lg">Estado de visibilidad</h2>
        <p className="text-gray-500 text-sm">
          {isActive
            ? 'Los compradores pueden verte en el mapa'
            : 'Los compradores no pueden verte'}
        </p>
      </div>

      {/* B8 fix: role="switch" + aria-checked for screen readers */}
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={isActive ? 'Desactivar visibilidad' : 'Activar visibilidad'}
        onClick={() => setSellerActive(!isActive)}
        className={clsx(
          'relative w-14 h-8 rounded-full transition-colors',
          isActive ? 'bg-secondary' : 'bg-gray-300'
        )}
      >
        <div
          className={clsx(
            'absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform',
            isActive ? 'translate-x-7' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}