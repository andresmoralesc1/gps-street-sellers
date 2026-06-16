'use client'

import Link from 'next/link'
import { useStore } from '@/store/useStore'
import { MOCK_VENDORS, MOCK_LOCATIONS } from '@/lib/mockData'
import { VendorCard } from '@/components/map/VendorCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useMemo } from 'react'
import { calculateDistance } from '@/lib/core/utils'

export default function FavoritesPage() {
  const favoriteIds = useStore((s) => s.favoriteIds)
  const userLocation = useStore((s) => s.userLocation)

  const favoriteVendors = useMemo(() => {
    return favoriteIds
      .map((id) => MOCK_VENDORS.find((v) => v.id === id))
      .filter((v) => v !== undefined)
  }, [favoriteIds])

  return (
    <div className="min-h-screen bg-background-cream pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold">Mis Favoritos</h1>
        <p className="text-sm text-gray-500">
          {favoriteIds.length}/10 vendedores guardados
        </p>
      </header>

      <div className="p-4">
        {favoriteVendors.length === 0 ? (
          <Card variant="outlined" className="p-8 text-center">
            <span className="text-5xl mb-4 block">❤️</span>
            <h2 className="text-xl font-bold mb-2">No tienes favoritos</h2>
            <p className="text-gray-500 mb-4">
              Guarda vendedores como favoritos para verlos rápidamente
            </p>
            <Link href="/map">
              <Button>Explorar vendedores</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {favoriteVendors.map((vendor) => {
              const loc = MOCK_LOCATIONS[vendor!.id]
              const distance = userLocation && loc
                ? calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
                : undefined

              return (
                <Link key={vendor!.id} href={`/vendor/${vendor!.id}`}>
                  <VendorCard
                    vendor={vendor!}
                    distance={distance}
                    onClose={() => {}}
                    onViewDetails={() => {}}
                  />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3">
        <Link href="/map" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <span className="text-2xl">🗺️</span>
          <span className="text-xs">Mapa</span>
        </Link>
        <Link href="/favorites" className="flex flex-col items-center text-primary">
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
