'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heart, Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VendorProfile } from '@/components/vendor/VendorProfile'
import { VendorProducts } from '@/components/vendor/VendorProducts'
import { VendorReviews } from '@/components/vendor/VendorReviews'
import { MOCK_VENDORS, getVendorProducts, getVendorReviews } from '@/lib/mockData'
import { useStore } from '@/store/useStore'
import type { Vendor, Product, Review } from '@/lib/core/types'

export default function VendorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const vendorId = params.id as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  const favoriteIds = useStore((s) => s.favoriteIds)
  const addFavorite = useStore((s) => s.addFavorite)
  const removeFavorite = useStore((s) => s.removeFavorite)

  const isFavorite = favoriteIds.includes(vendorId)

  useEffect(() => {
    const v = MOCK_VENDORS.find((v) => v.id === vendorId)
    if (!v) {
      router.push('/map')
      return
    }
    setVendor(v)
    setProducts(getVendorProducts(vendorId))
    setReviews(getVendorReviews(vendorId))
  }, [vendorId, router])

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(vendorId)
    } else {
      addFavorite(vendorId)
    }
  }

  if (!vendor) return null

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ←
        </Button>
        <h1 className="text-lg font-bold">{vendor.name}</h1>
        <button
          onClick={toggleFavorite}
          className="ml-auto"
        >
          <Heart
            size={28}
            className={isFavorite ? 'fill-accent text-accent' : 'text-gray-400'}
          />
        </button>
      </header>

      <div className="p-4 space-y-6">
        <VendorProfile vendor={vendor} />
        <VendorProducts products={products} />
        <VendorReviews reviews={reviews} />

        {/* Botón notificarme */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-600 text-sm mb-3">
            Recibe una notificación cuando este vendedor esté cerca de ti
          </p>
          <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
            <Bell size={18} />
            Notificarme cuando esté cerca
          </Button>
        </div>
      </div>
    </div>
  )
}