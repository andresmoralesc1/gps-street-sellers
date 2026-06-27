'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { useEffect, useRef } from 'react'

interface ActiveToggleProps {
  vendorId: string
}

export function ActiveToggle({ vendorId }: ActiveToggleProps) {
  const isActive = useStore((s) => s.isSellerActive)
  const setSellerActive = useStore((s) => s.setSellerActive)
  const userLocation = useStore((s) => s.userLocation)
  const locationIntervalRef = useRef<NodeJS.Timeout>()

  // Sync with backend when isActive changes
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
    }).catch(console.error)
  }, [isActive, vendorId, userLocation])

  // Update location periodically when active
  useEffect(() => {
    if (isActive && userLocation) {
      locationIntervalRef.current = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              useStore.getState().setUserLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              })
            },
            () => {}
          )
        }
      }, 10000) // Update every 10 seconds
    }

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current)
      }
    }
  }, [isActive, userLocation])

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
      <div>
        <h3 className="font-semibold text-lg">Estado de visibilidad</h3>
        <p className="text-gray-500 text-sm">
          {isActive
            ? 'Los compradores pueden verte en el mapa'
            : 'Los compradores no pueden verte'}
        </p>
      </div>

      <button
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