'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { VendorCard } from './VendorCard'
import { useStore } from '@/store/useStore'
import { MOCK_VENDORS, MOCK_LOCATIONS, getActiveVendors } from '@/lib/mockData'
import type { Vendor } from '@/lib/core/types'
import type { LatLng } from 'leaflet'

// Fix para íconos de Leaflet en Next.js
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapUpdater({ center }: { center: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [map, center])
  return null
}

const BOGOTA_CENTER: [number, number] = [4.6097, -74.0817]

export function MapView() {
  const router = useRouter()
  const [center, setCenter] = useState<[number, number]>(BOGOTA_CENTER)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const filters = useStore((s) => s.filters)
  const userLocation = useStore((s) => s.userLocation)

  useEffect(() => {
    // Simular ubicación del usuario (Bogotá)
    if (!userLocation) {
      useStore.getState().setUserLocation({ lat: 4.6097, lng: -74.0817 })
    }
  }, [])

  useEffect(() => {
    if (userLocation) {
      setCenter([userLocation.lat, userLocation.lng])
    }
  }, [userLocation])

  const activeVendors = getActiveVendors().filter((v) => {
    if (filters.category && v.category !== filters.category) return false
    return true
  })

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={15}
        className="w-full h-full rounded-xl"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={{ lat: center[0], lng: center[1] } as LatLng} />

        {activeVendors.map((vendor) => {
          const loc = MOCK_LOCATIONS[vendor.id]
          if (!loc) return null

          return (
            <Marker
              key={vendor.id}
              position={[loc.lat, loc.lng]}
              eventHandlers={{
                click: () => setSelectedVendor(vendor),
              }}
            >
              <Popup>
<VendorCard vendor={vendor} compact />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Vendor Card Overlay */}
      {selectedVendor && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <VendorCard
            vendor={selectedVendor}
            onClose={() => setSelectedVendor(null)}
            onViewDetails={() => {
              router.push(`/vendor/${selectedVendor.id}`)
            }}
          />
        </div>
      )}
    </div>
  )
}