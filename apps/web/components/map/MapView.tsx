'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Frown, LogIn, X } from 'lucide-react'
import Link from 'next/link'
import { VendorCard } from './VendorCard'
import { useStore } from '@/store/useStore'
import { calculateDistance } from '@/lib/core/utils/geo'
import { getCategoryInfo, COLOMBIA_CITIES } from '@/lib/core/constants'
import type { Vendor, VendorCategory } from '@/lib/core/types'
import type { LatLng } from 'leaflet'
import L from 'leaflet'
import { toast } from '@/components/ui/Toast'

// Fix para íconos de Leaflet en Next.js
import '@/lib/leaflet-icon-fix'

function MapUpdater({ center }: { center: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [map, center])
  return null
}

export function MapView() {
  const selectedCity = useStore((s) => s.selectedCity)
  const setSelectedCity = useStore((s) => s.setSelectedCity)
  const [center, setCenter] = useState<[number, number]>(selectedCity.center)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [activeVendors, setActiveVendors] = useState<Vendor[]>([])
  const filters = useStore((s) => s.filters)
  const userLocation = useStore((s) => s.userLocation)
  const user = useStore((s) => s.user)
  const _hasHydrated = useStore((s) => s._hasHydrated)
  const isLoggedIn = _hasHydrated && !!user
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false)

  // Restore the "guest banner dismissed" flag from localStorage on mount so
  // the auth prompt stays hidden across reloads, not just in-session.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('barriotech_guest_banner_dismissed') === '1') {
      setGuestBannerDismissed(true)
    }
  }, [])

  const dismissGuestBanner = () => {
    setGuestBannerDismissed(true)
    try { localStorage.setItem('barriotech_guest_banner_dismissed', '1') } catch {}
  }

  // Vendors are browsable for guests, but they cannot see details until
  // they sign in. We track this as a single flag derived from auth state.

  // Persist city selection to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedCityId')
    if (saved) {
      const city = COLOMBIA_CITIES.find((c) => c.id === saved)
      if (city) setSelectedCity(city)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save city to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedCityId', selectedCity.id)
    // When city changes, clear user location so map centers on city center
    useStore.getState().setUserLocation(null)
  }, [selectedCity])

  const fetchActiveVendors = useCallback(async () => {
    try {
      const cityId = selectedCity.id
      const res = await fetch(`/api/vendors?active=true&withLocation=true&cityId=${encodeURIComponent(cityId)}`)
      const data = await res.json()
      if (data.vendors) {
        setActiveVendors(data.vendors)
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    }
  }, [selectedCity.id])

  useEffect(() => {
    if (!userLocation) {
      // Try to get real location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            useStore.getState().setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            })
          },
          () => {
            useStore.getState().setUserLocation({ lat: selectedCity.center[0], lng: selectedCity.center[1] })
          }
        )
      } else {
        useStore.getState().setUserLocation({ lat: selectedCity.center[0], lng: selectedCity.center[1] })
      }
    }
  }, [selectedCity])

  useEffect(() => {
    fetchActiveVendors()
    const interval = setInterval(fetchActiveVendors, 30000)
    return () => clearInterval(interval)
  }, [fetchActiveVendors])

  useEffect(() => {
    if (userLocation) {
      setCenter([userLocation.lat, userLocation.lng])
    }
  }, [userLocation])

  useEffect(() => {
    setCenter(selectedCity.center)
  }, [selectedCity])

  const filteredVendors = activeVendors.filter((v) => {
    if (filters.category && v.category !== filters.category) return false
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      if (!v.name?.toLowerCase().includes(query)) return false
    }
    // null = sin límite de distancia (Todos)
    if (
      filters.maxDistanceMeters !== null &&
      userLocation &&
      v.latitude &&
      v.longitude
    ) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, v.latitude, v.longitude)
      if (dist > filters.maxDistanceMeters) return false
    }
    return true
  })

  const getVendorDistance = useCallback(
    (vendor: Vendor) => {
      if (!userLocation || !vendor.latitude || !vendor.longitude) return undefined
      return calculateDistance(userLocation.lat, userLocation.lng, vendor.latitude, vendor.longitude)
    },
    [userLocation]
  )


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

        {filteredVendors.length === 0 ? (
          <Marker position={center}>
            <Popup>
              <div className="text-center p-3 min-w-[200px]">
                <Frown size={36} className="mx-auto text-gray-400 mb-3" />
                <p className="font-semibold text-gray-800">No hay vendedores</p>
                {filters.searchQuery ? (
                  <p className="text-sm text-gray-500 mt-1">
                    No encontramos &quot;{filters.searchQuery}&quot;
                  </p>
                ) : filters.category ? (
                  <p className="text-sm text-gray-500 mt-1">
                    No hay vendedores de esta categoría
                  </p>
                ) : filters.maxDistanceMeters !== null ? (
                  <p className="text-sm text-gray-500 mt-1">
                    No hay vendedores en este radio
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">
                    Intenta con otro filtro o cambia de zona
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ) : (
          filteredVendors.map((vendor) => {
            if (!vendor.latitude || !vendor.longitude) return null
            const cat = (vendor.category as VendorCategory) || 'otros'
            const catMap: Record<string, string> = {
              frutas: '🥑', comida: '🍳', bebidas: '🧃', artesanias: '🎨', ropa: '👕', otros: '📦',
            }
            const emoji = catMap[cat] || '📦'
            const catColor = getCategoryInfo(cat).color
            // Sponsored vendors get a gold ring + star badge to differentiate
            // from organic placement. Same icon, different border treatment.
            const sponsored = (vendor as any).isSponsored
            const ringColor = sponsored ? '#F59E0B' : 'white'
            const ringWidth = sponsored ? 4 : 3
            const markerIcon = new L.DivIcon({
              html: `<div style="
                background: ${catColor};
                width: 42px;
                height: 42px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: ${ringWidth}px solid ${ringColor};
                box-shadow: 0 2px 8px rgba(0,0,0,0.3)${sponsored ? ', 0 0 12px rgba(245, 158, 11, 0.6)' : ''};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                position: relative;
              "><span style="transform: rotate(45deg);">${emoji}</span>${
                sponsored ? '<span style="position:absolute;top:-6px;right:-6px;background:#F59E0B;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;transform:rotate(45deg);box-shadow:0 1px 3px rgba(0,0,0,0.3);">⭐</span>' : ''
              }</div>`,
              className: 'vendor-category-marker',
              iconSize: [42, 42],
              iconAnchor: [21, 42],
              popupAnchor: [0, -44],
            })

            return (
              <Marker
                key={vendor.id}
                position={[vendor.latitude, vendor.longitude]}
                icon={markerIcon}
                eventHandlers={{
                  click: () => {
                    if (!isLoggedIn) {
                      // Guest mode — show a hint to sign in instead of
                      // leaking vendor details on the public map.
                      toast({
                        kind: 'info',
                        title: 'Inicia sesión para ver detalles',
                        description: `${vendor.name} y otros vendedores — solo para usuarios registrados.`,
                        action: { label: 'Ingresar', href: '/login' },
                      })
                      return
                    }
                    setSelectedVendor(vendor)
                  },
                }}
              >
                {isLoggedIn ? (
                  <Popup>
                    <VendorCard
                      vendor={vendor}
                      compact
                      distance={getVendorDistance(vendor)}
                      isSponsored={sponsored}
                      onViewDetails={() => {
                        window.location.href = `/vendor/${vendor.slug || vendor.id}`
                      }}
                    />
                  </Popup>
                ) : null}
              </Marker>
            )
          })
        )}
      </MapContainer>

      {isLoggedIn && selectedVendor && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <VendorCard
            vendor={selectedVendor}
            distance={getVendorDistance(selectedVendor)}
            onClose={() => setSelectedVendor(null)}
              onViewDetails={() => {
                window.location.href = `/vendor/${selectedVendor.slug || selectedVendor.id}`
              }}
          />
        </div>
      )}

      {/* Guest banner — only visible to non-logged-in users */}
      {!isLoggedIn && !guestBannerDismissed && (
        <div className="absolute top-4 left-4 right-4 sm:right-auto z-[1000] pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-card border border-stone-200 px-4 py-3 max-w-md flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LogIn size={18} className="text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900">Explora el mapa</p>
              <p className="text-xs text-stone-600 mt-0.5">
                Inicia sesión para ver detalles de los vendedores.
              </p>
              <div className="mt-2 flex gap-2">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-primary hover:text-primary-600 transition-colors"
                >
                  Ingresar
                </Link>
                <span className="text-xs text-stone-300" aria-hidden="true">·</span>
                <Link
                  href="/register"
                  className="text-xs font-semibold text-primary hover:text-primary-600 transition-colors"
                >
                  Registrarme
                </Link>
              </div>
            </div>
            <button
              onClick={dismissGuestBanner}
              aria-label="Cerrar aviso"
              className="p-1 rounded-lg hover:bg-stone-100 transition-colors flex-shrink-0"
            >
              <X size={16} className="text-stone-500" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}