'use client'

import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  reviewText: string
  reviewRating: number
  reviewSuccess: boolean
  reviewError: string
  submittingReview: boolean
  onTextChange: (text: string) => void
  onRatingChange: (n: number) => void
  onSubmit: () => void
}

/**
 * 5-star + textarea review form. Caller is responsible for gating
 * (only show for buyers — sellers can't review their own profile).
 * Shows a success card after submission so the user gets confirmation
 * without navigating away.
 *
 * Star tap is direct — no hover preview; mobile doesn't have hover and
 * the surprise-and-correct pattern is fine for a 5-scale.
 */
export function VendorReviewForm({
  reviewText,
  reviewRating,
  reviewSuccess,
  reviewError,
  submittingReview,
  onTextChange,
  onRatingChange,
  onSubmit,
}: Props) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <Star size={18} className="text-yellow-500" />
        Deja tu reseña
      </h3>
      {reviewSuccess ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-center">
          ¡Gracias por tu reseña!
        </div>
      ) : (
        <div className="space-y-3">
          {reviewError && <p className="text-red-500 text-sm">{reviewError}</p>}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onRatingChange(n)}
                aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                aria-pressed={n <= reviewRating}
                className="text-2xl"
              >
                <Star
                  size={24}
                  className={n <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                />
              </button>
            ))}
          </div>
          <textarea
            className="w-full border rounded-xl p-3 text-sm"
            rows={3}
            placeholder="Cuéntanos tu experiencia..."
            value={reviewText}
            onChange={(e) => onTextChange(e.target.value)}
          />
          <Button
            className="w-full"
            size="sm"
            onClick={onSubmit}
            isLoading={submittingReview}
            disabled={reviewText.trim().length === 0}
          >
            Enviar reseña
          </Button>
        </div>
      )}
    </div>
  )
}
