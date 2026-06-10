'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MOCK_VENDORS, getVendorReviews } from '@/lib/mockData'
import { getCategoryInfo } from '@/lib/core/constants'

interface SellerDashboardProps {
  vendorId: string
}

export function SellerDashboard({ vendorId }: SellerDashboardProps) {
  const vendor = MOCK_VENDORS.find((v) => v.id === vendorId)
  if (!vendor) return null

  const reviews = getVendorReviews(vendorId)
  const category = getCategoryInfo(vendor.category)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-primary">24</p>
          <p className="text-sm text-gray-500">Vistos hoy</p>
        </Card>
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-secondary">{reviews.length}</p>
          <p className="text-sm text-gray-500">Reseñas</p>
        </Card>
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-yellow-500">{vendor.ratingAvg.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Rating</p>
        </Card>
      </div>

      {/* Info del vendedor */}
      <Card variant="elevated" className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            style={{ background: category.color }}
          >
            {category.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold">{vendor.name}</h2>
            <Badge variant="primary">{category.label}</Badge>
          </div>
        </div>
        <p className="text-gray-600 mt-4">{vendor.description}</p>
      </Card>

      {/* Reseñas recientes */}
      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold mb-3">Reseñas recientes</h3>
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin reseñas aún</p>
        ) : (
          <div className="space-y-2">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="flex items-center gap-2">
                <span className="text-yellow-500">
                  {'★'.repeat(review.rating)}
                </span>
                <span className="text-sm text-gray-600">{review.comment}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}