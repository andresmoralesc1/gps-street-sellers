'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Star, Circle, Apple, UtensilsCrossed, CupSoda, Palette, Shirt, Package } from 'lucide-react'
import type { Vendor, VendorCategory } from '@/lib/core/types'
import { getCategoryInfo } from '@/lib/core/constants'

const CategoryIconMap: Record<VendorCategory, typeof Apple> = {
  frutas: Apple,
  comida: UtensilsCrossed,
  bebidas: CupSoda,
  artesanias: Palette,
  ropa: Shirt,
  otros: Package,
}

interface VendorProfileProps {
  vendor: Vendor
}

export function VendorProfile({ vendor }: VendorProfileProps) {
  const category = getCategoryInfo(vendor.category)
  const IconComponent = CategoryIconMap[vendor.category]

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-start gap-4">
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: category.color }}
        >
          <IconComponent size={48} className="text-white" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold">{vendor.name}</h2>
            {vendor.isActive && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Circle size={8} fill="currentColor" className="text-green-500" />
                Activo
              </Badge>
            )}
          </div>

          <Badge variant="outline">{category.label}</Badge>

          <div className="flex items-center gap-2 mt-3">
            <Star size={20} className="text-yellow-500 fill-yellow-500" />
            <span className="text-xl font-bold">{vendor.ratingAvg.toFixed(1)}</span>
            <span className="text-gray-500">({Math.floor(Math.random() * 50 + 10)} reseñas)</span>
          </div>

          <p className="text-gray-600 mt-4">{vendor.description}</p>
        </div>
      </div>
    </Card>
  )
}