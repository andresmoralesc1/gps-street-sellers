import { useMemo } from 'react'
import { calculateDistance } from '@/lib/core/utils'
import { MOCK_LOCATIONS } from '@/lib/mockData'
import type { LatLng } from 'leaflet'

export function useVendorDistance(
  vendorId: string,
  userLocation: { lat: number; lng: number } | null
): number | undefined {
  return useMemo(() => {
    if (!userLocation) return undefined
    const loc = MOCK_LOCATIONS[vendorId as keyof typeof MOCK_LOCATIONS]
    if (!loc) return undefined
    return calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
  }, [vendorId, userLocation])
}

export function useVendorDistances(
  vendorIds: string[],
  userLocation: { lat: number; lng: number } | null
): Record<string, number | undefined> {
  return useMemo(() => {
    if (!userLocation) {
      return Object.fromEntries(vendorIds.map((id) => [id, undefined]))
    }
    return Object.fromEntries(
      vendorIds.map((id) => {
        const loc = MOCK_LOCATIONS[id as keyof typeof MOCK_LOCATIONS]
        if (!loc) return [id, undefined]
        return [id, calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng)]
      })
    )
  }, [vendorIds, userLocation])
}