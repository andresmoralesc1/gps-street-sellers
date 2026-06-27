'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Bell, ChevronLeft, ShoppingCart, MessageCircle, Star, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VendorProfile } from '@/components/vendor/VendorProfile'
import { VendorProducts } from '@/components/vendor/VendorProducts'
import { VendorReviews } from '@/components/vendor/VendorReviews'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { useStore } from '@/store/useStore'
import type { Vendor, Product, Review } from '@/lib/core/types'

interface Props {
  vendorId: string
}

export function VendorDetailClient({ vendorId }: Props) {
  const router = useRouter()
  const [vendor, setVendor] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const favoriteIds = useStore((s) => s.favoriteIds)
  const addFavorite = useStore((s) => s.addFavorite)
  const removeFavorite = useStore((s) => s.removeFavorite)
  const addToCart = useStore((s) => s.addToCart)
  const cart = useStore((s) => s.cart)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const clearCart = useStore((s) => s.clearCart)
  const user = useStore((s) => s.user)

  const isFavorite = favoriteIds.includes(vendorId)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          router.push('/map')
          return
        }
        setVendor(data.vendor)
        setProducts(
          (data.products || []).map((p: any) => ({
            id: p.id,
            vendorId: p.vendor_id,
            name: p.name,
            description: p.description || '',
            photoUrl: p.photo_url || '',
            price: parseFloat(p.price),
          }))
        )
        setReviews(
          (data.reviews || []).map((r: any) => ({
            id: r.id,
            vendorId: r.vendor_id,
            customerId: r.author_name,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
          }))
        )
      })
      .catch(() => router.push('/map'))
  }, [vendorId, router])

  const toggleFavorite = async () => {
    if (!user) {
      router.push('/register')
      return
    }
    const wasFavorite = isFavorite
    if (isFavorite) {
      removeFavorite(vendorId)
    } else {
      addFavorite(vendorId)
    }
    try {
      const res = await fetch(
        isFavorite
          ? `/api/favorites?vendorId=${vendorId}`
          : '/api/favorites',
        {
          method: isFavorite ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: isFavorite ? undefined : JSON.stringify({ vendorId }),
        }
      )
      if (!res.ok) throw new Error('Request failed')
    } catch {
      // Rollback optimistic update
      if (wasFavorite) {
        addFavorite(vendorId)
      } else {
        removeFavorite(vendorId)
      }
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setIsCheckingOut(true)
    setCheckoutError('')
    try {
      const items = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }))
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vendorId, items }),
      })
      if (res.ok) {
        clearCart()
        setCartOpen(false)
      } else {
        const data = await res.json()
        setCheckoutError(data.error || 'Error al procesar el pedido')
      }
    } catch {
      setCheckoutError('Error de conexión')
    } finally {
      setIsCheckingOut(false)
    }
  }

  const submitReview = async () => {
    if (!user || reviewText.trim().length === 0) return
    const savedText = reviewText
    const savedRating = reviewRating
    setSubmittingReview(true)
    setReviewError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendor_id: vendorId,
          rating: savedRating,
          comment: savedText.trim(),
        }),
      })
      if (res.ok) {
        setReviewSuccess(true)
        setReviewText('')
        setReviewRating(5)
        // Refresh reviews
        const data = await fetch(`/api/vendors/${vendorId}`).then((r) => r.json())
        setReviews(
          (data.reviews || []).map((r: any) => ({
            id: r.id,
            vendorId: r.vendor_id,
            customerId: r.author_name,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
          }))
        )
      } else {
        setReviewError('No se pudo enviar la reseña. Intenta de nuevo.')
        setReviewText(savedText)
        setReviewRating(savedRating)
      }
    } catch {
      setReviewError('Error de conexión')
      setReviewText(savedText)
      setReviewRating(savedRating)
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleWhatsAppDirect = () => {
    if (!vendor?.phone) return
    const text = `¡Hola! Quiero saber más sobre tus productos en BarrioTech`
    const waUrl = `https://wa.me/${vendor.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    )
  }

  // Adapt vendor to component's expected shape
  const adaptedVendor: Vendor = {
    id: vendor.id,
    userId: '',
    name: vendor.name,
    category: vendor.category,
    description: vendor.description || '',
    photoUrl: vendor.photo_url || '',
    isActive: vendor.is_active,
    isVerified: vendor.is_verified || false,
    ratingAvg: parseFloat(vendor.rating_avg) || 0,
    reviewCount: vendor.review_count || 0,
    createdAt: vendor.created_at,
  }

  return (
    <div className="min-h-screen bg-background-cream pb-20">
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold">{vendor.name}</h1>
        <button onClick={toggleFavorite} className="ml-auto">
          <Heart
            size={28}
            className={isFavorite ? 'fill-accent text-accent' : 'text-gray-400'}
          />
        </button>
        <button onClick={() => setCartOpen(true)} className="relative">
          <ShoppingCart size={28} className="text-gray-600" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </button>
      </header>

      <div className="p-4 space-y-6">
        <VendorProfile vendor={adaptedVendor} />

          {/* CTA — solo para usuarios logueados */}
          {user ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-800 mb-3">
                ¿Prefieres hablar directo? Contacta a {vendor.name} por WhatsApp
              </p>
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white border-0"
                onClick={handleWhatsAppDirect}
              >
                <MessageCircle size={20} />
                Contactar por WhatsApp
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-3">
                Regístrate para contactar a {vendor.name} directamente
              </p>
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => router.push('/register')}
              >
                <User size={18} />
                Regístrate gratis
              </Button>
            </div>
          )}

        <VendorProducts products={products} onAddToCart={addToCart} user={user} />

        {/* Review Form */}
        {user && user.role === 'buyer' && (
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
              {reviewError && (
                <p className="text-red-500 text-sm">{reviewError}</p>
              )}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setReviewRating(n)} className="text-2xl">
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
                  onChange={(e) => setReviewText(e.target.value)}
                />
                <Button
                  className="w-full"
                  size="sm"
                  onClick={submitReview}
                  isLoading={submittingReview}
                  disabled={reviewText.trim().length === 0}
                >
                  Enviar reseña
                </Button>
              </div>
            )}
          </div>
        )}

        <VendorReviews reviews={reviews} />

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-600 text-sm mb-3">
            Recibe una notificación cuando este vendedor esté cerca de ti
          </p>
          {user ? (
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
              <Bell size={18} />
              Notificarme cuando esté cerca
            </Button>
          ) : (
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={() => router.push('/register')}>
              <User size={18} />
              Regístrate para notificarte
            </Button>
          )}
        </div>
      </div>

      <CartDrawer
        vendorPhone={vendor.phone}
        vendorName={vendor.name}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
        checkoutError={checkoutError}
      />
    </div>
  )
}
