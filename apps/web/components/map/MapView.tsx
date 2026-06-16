'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Frown } from 'lucide-react'
import { VendorCard } from './VendorCard'
import { useStore } from '@/store/useStore'
import { getActiveVendors, MOCK_LOCATIONS } from '@/lib/mockData'
import { useVendorDistances } from '@/hooks/useVendorDistance'
import type { Vendor } from '@/lib/core/types'
import type { LatLng } from 'leaflet'

// Fix para íconos de Leaflet en Next.js (debe importarse primero)
import '@/lib/leaflet-icon-fix'

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

  // Usar hook para distancias de todos los vendors activos
  const vendorDistances = useVendorDistances(
    activeVendors.map((v) => v.id),
    userLocation
  )

  // Distancia del vendor seleccionado
  const selectedVendorDistance = selectedVendor ? vendorDistances[selectedVendor.id] : undefined

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

        {/* Indicador de ubicación del usuario */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={10}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.5,
              weight: 3,
            }}
          >
            <Popup>Tu ubicación</Popup>
          </CircleMarker>
        )}

        <MapUpdater center={{ lat: center[0], lng: center[1] } as LatLng} />

        {activeVendors.length === 0 ? (
          <Marker position={center}>
            <Popup>
              <div className="text-center p-2">
                <Frown size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="font-semibold">No hay vendedores activos</p>
                <p className="text-sm text-gray-500">Intenta con otro filtro</p>
              </div>
            </Popup>
          </Marker>
        ) : (
          activeVendors.map((vendor) => {
            const loc = MOCK_LOCATIONS[vendor.id as keyof typeof MOCK_LOCATIONS]
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
                  <VendorCard
                    vendor={vendor}
                    compact
                    distance={vendorDistances[vendor.id]}
                  />
                </Popup>
              </Marker>
            )
          })
        )}
      </MapContainer>

      {/* Vendor Card Overlay */}
      {selectedVendor && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <VendorCard
            vendor={selectedVendor}
            distance={selectedVendorDistance}
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