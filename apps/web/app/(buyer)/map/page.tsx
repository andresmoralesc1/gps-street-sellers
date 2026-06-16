'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FilterBar } from '@/components/map/FilterBar'
import { useStore } from '@/store/useStore'
import { useEffect } from 'react'
import { MOCK_VENDORS } from '@/lib/mockData'

// Dynamic import para evitar SSR con Leaflet
const MapView = dynamic(
  () => import('@/components/map/MapView').then((m) => m.MapView),
  { ssr: false, loading: () => <div className="flex-1 bg-gray-200 animate-pulse rounded-xl" /> }
)

export default function MapPage() {
  const setVendors = useStore((s) => s.setVendors)
  const pathname = usePathname()

  useEffect(() => {
    setVendors(MOCK_VENDORS)
  }, [setVendors])

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-800">GPS Street Sellers</h1>
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
          <span className="text-2xl">🗺️</span>
          <span className="text-xs">Mapa</span>
        </Link>
        <Link href="/favorites" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <span className="text-2xl">❤️</span>
          <span className="text-xs">Favoritos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}