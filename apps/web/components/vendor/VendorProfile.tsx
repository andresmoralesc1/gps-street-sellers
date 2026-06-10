'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Vendor } from '@gps-street-sellers/core/types'
import { getCategoryInfo } from '@gps-street-sellers/core/constants'

interface VendorProfileProps {
  vendor: Vendor
}

export function VendorProfile({ vendor }: VendorProfileProps) {
  const category = getCategoryInfo(vendor.category)

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-start gap-4">
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0"
          style={{ background: category.color }}
        >
          {category.icon}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold">{vendor.name}</h2>
            {vendor.isActive && (
              <Badge variant="secondary">🟢 Activo</Badge>
            )}
          </div>

          <Badge variant="outline">{category.label}</Badge>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-yellow-500 text-xl">★</span>
            <span className="text-xl font-bold">{vendor.ratingAvg.toFixed(1)}</span>
            <span className="text-gray-500">({Math.floor(Math.random() * 50 + 10)} reseñas)</span>
          </div>

          <p className="text-gray-600 mt-4">{vendor.description}</p>
        </div>
      </div>
    </Card>
  )
}