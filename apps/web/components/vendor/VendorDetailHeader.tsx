'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Heart, ShoppingCart } from 'lucide-react'

interface Props {
  vendorName: string
  vendorId: string
  isFavorite: boolean
  cartItemCount: number
  heartPop: boolean
  cartBounce: boolean
  onBack: () => void
  onToggleFavorite: () => void
  onOpenCart: () => void
}

/**
 * Top bar for the vendor detail page: back button, vendor name,
 * favorite toggle, and cart button (with item-count badge).
 *
 * Micro-interactions (sprint A — already wired before the split):
 * - `animate-heart-pop` on the heart icon for ~400ms when toggled
 * - `animate-cart-bounce` on the cart icon for ~500ms when item added
 * - `animate-badge-pop` on the count chip when the count changes
 *   (the `key={cartItemCount}` remount trick triggers it on every change)
 */
export function VendorDetailHeader({
  vendorName,
  isFavorite,
  cartItemCount,
  heartPop,
  cartBounce,
  onBack,
  onToggleFavorite,
  onOpenCart,
}: Props) {
  const router = useRouter()

  return (
    <header className="bg-white shadow-sm p-4 flex items-center gap-4">
      <button
        type="button"
        onClick={onBack}
        className="min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-stone-100 active:bg-stone-200 transition-colors flex items-center justify-center"
        aria-label="Volver"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <h1 className="text-lg font-bold">{vendorName}</h1>
      <button
        type="button"
        onClick={onToggleFavorite}
        className="ml-auto min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-stone-100 active:bg-stone-200 transition-colors flex items-center justify-center"
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        aria-pressed={isFavorite}
      >
        <Heart
          size={28}
          className={
            (isFavorite ? 'fill-accent text-accent' : 'text-gray-400') +
            ' transition-transform duration-300' +
            (heartPop ? ' animate-heart-pop' : '')
          }
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        onClick={onOpenCart}
        className="relative min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-stone-100 active:bg-stone-200 transition-colors flex items-center justify-center"
        aria-label={`Abrir carrito${cartItemCount > 0 ? `, ${cartItemCount} ${cartItemCount === 1 ? 'producto' : 'productos'}` : ''}`}
      >
        <ShoppingCart
          size={28}
          className={'text-gray-600 transition-transform duration-300' + (cartBounce ? ' animate-cart-bounce' : '')}
          aria-hidden="true"
        />
        {cartItemCount > 0 && (
          <span
            key={cartItemCount}
            className={
              'absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center' +
              (cartBounce ? ' animate-badge-pop' : '')
            }
          >
            {cartItemCount}
          </span>
        )}
      </button>
    </header>
  )
}
