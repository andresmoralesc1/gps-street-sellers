'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Heart, Settings } from 'lucide-react'
import { FilterBar } from '@/components/map/FilterBar'
import { CitySelector } from '@/components/map/CitySelector'
import { useStore } from '@/store/useStore'
import { useEffect } from 'react'
import type { Vendor } from '@/lib/core/types'

// Dynamic import para evitar SSR con Leaflet
const MapView = dynamic(
  () => import('@/components/map/MapView').then((m) => m.MapView),
  { ssr: false, loading: () => <div className="flex-1 bg-gray-200 animate-pulse rounded-xl" /> }
)

// Transform API vendor to match Vendor type with lat/lng directly
function transformVendor(apiVendor: any): Vendor {
  return {
    id: apiVendor.id,
    userId: apiVendor.profile_id,
    name: apiVendor.name,
    category: apiVendor.category,
    description: apiVendor.description || '',
    photoUrl: apiVendor.photo_url || '',
    isActive: apiVendor.is_active,
    ratingAvg: apiVendor.rating_avg || 0,
    reviewCount: apiVendor.review_count || 0,
    createdAt: apiVendor.created_at,
    latitude: apiVendor.latitude,
    longitude: apiVendor.longitude,
  }
}

export default function MapPage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const vendorId = useStore((s) => s.vendorId)
  const setVendors = useStore((s) => s.setVendors)

  useEffect(() => {
    // Redirect sellers with vendorId to seller dashboard
    if (user?.role === 'seller' && vendorId) {
      router.push('/dashboard')
      return
    }

    async function fetchVendors() {
      try {
        const res = await fetch('/api/vendors?active=true&withLocation=true')
        if (!res.ok) throw new Error('Failed to fetch vendors')
        const data = await res.json()
        const transformed = data.vendors.map(transformVendor)
        setVendors(transformed)
      } catch (err) {
        // Don't show fake mock data — let the empty-state UI explain the issue.
        console.error('Error fetching vendors:', err)
        setVendors([])
      }
    }
    fetchVendors()
  }, [setVendors])

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">BarrioTech</h1>
        <CitySelector />
      </header>

      {/* Filtros */}
      <div className="px-4 pt-4">
        <FilterBar />
      </div>

      {/* Mapa */}
      <div className="flex-1 px-4 pb-4">
        <MapView />
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white border-t flex justify-around py-3">
        <Link href="/map" className="flex flex-col items-center text-primary">
          <MapPin size={24} />
          <span className="text-xs mt-1">Mapa</span>
        </Link>
        <Link href="/favorites" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <Heart size={24} />
          <span className="text-xs mt-1">Favoritos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <Settings size={24} />
          <span className="text-xs mt-1">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}