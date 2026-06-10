'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Vendor } from '@/lib/core/types'
import { getCategoryInfo } from '@/lib/core/constants'

interface VendorCardProps {
  vendor: Vendor
  compact?: boolean
  onClose?: () => void
  onViewDetails?: () => void
}

export function VendorCard({ vendor, compact, onClose, onViewDetails }: VendorCardProps) {
  const category = getCategoryInfo(vendor.category)

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 min-w-[200px]">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ background: category.color }}
        >
          {category.icon}
        </div>
        <div>
          <h3 className="font-semibold">{vendor.name}</h3>
          <p className="text-sm text-gray-500">{category.label}</p>
        </div>
      </div>
    )
  }

  return (
    <Card variant="elevated" className="p-4">
      <div className="flex gap-4">
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl flex-shrink-0"
          style={{ background: category.color }}
        >
          {category.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{vendor.name}</h3>
              <Badge variant="primary">{category.label}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{vendor.ratingAvg.toFixed(1)}</span>
            </div>
          </div>

          <p className="text-gray-600 mt-2 text-sm line-clamp-2">
            {vendor.description}
          </p>

          <div className="flex gap-2 mt-3">
            {onViewDetails && (
              <Button size="sm" onClick={onViewDetails}>
                Ver detalles
              </Button>
            )}
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}