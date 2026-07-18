'use client'

import { Card } from '@/components/ui/Card'
import { Star, User } from 'lucide-react'
import type { Review } from '@/lib/core/types'

interface VendorReviewsProps {
  reviews: Review[]
}

export function VendorReviews({ reviews }: VendorReviewsProps) {
  if (reviews.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold mb-3">Reseñas</h3>
        <Card variant="outlined" className="p-4 text-center text-gray-500">
          Aún no hay reseñas para este vendedor
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">Reseñas ({reviews.length})</h3>
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id} variant="outlined" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={16} className="text-primary-700" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString('es-CO')}
                </span>
              </div>
            </div>
            <p className="text-gray-700">{review.comment}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}