'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Bell, ChevronLeft, ShoppingCart, MessageCircle, Star, User, Phone, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { VendorProfile } from '@/components/vendor/VendorProfile'
import { VendorProducts } from '@/components/vendor/VendorProducts'
import { VendorReviews } from '@/components/vendor/VendorReviews'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { useStore } from '@/store/useStore'
import type { Vendor, Product, Review } from '@/lib/core/types'
import { isUuid } from '@/lib/core/utils/slug'

interface Props {
  /**
   * Always a UUID. The server resolves both UUID and slug URLs to the canonical
   * UUID before passing it here so client endpoints (favorites, orders, etc.)
   * always get a valid UUID.
   */
  vendorId: string
  /**
   * The slug from the URL (for canonical redirects and breadcrumb display).
   * May be the same value as `vendorId` when the URL was already a UUID.
   */
  vendorSlug?: string
}

export function VendorDetailClient({ vendorId, vendorSlug }: Props) {
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

  // Micro-interaction states — heart pop + cart badge bounce on add
  const [heartPop, setHeartPop] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)
  const triggerHeartPop = () => {
    setHeartPop(true)
    window.setTimeout(() => setHeartPop(false), 400)
  }
  const triggerCartBounce = () => {
    setCartBounce(true)
    window.setTimeout(() => setCartBounce(false), 500)
  }

  const isFavorite = favoriteIds.includes(vendorId)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    // If the URL was a UUID and we now know the canonical slug, redirect
    // once so the URL is human-friendly. Skip if the URL is already the slug
    // to avoid an infinite loop.
    if (vendorSlug && isUuid(vendorId) && vendorSlug !== vendorId) {
      router.replace(`/vendor/${vendorSlug}`)
      return
    }

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
      // Don't kick the user out to /register — show an inline prompt.
      const shouldLogin = window.confirm('Inicia sesión para guardar favoritos. ¿Ir a login?')
      if (shouldLogin) {
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
      }
      return
    }
    const wasFavorite = isFavorite
    if (isFavorite) {
      removeFavorite(vendorId)
    } else {
      addFavorite(vendorId)
    }
    triggerHeartPop()
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
      toast({
        kind: wasFavorite ? 'info' : 'success',
        title: wasFavorite ? 'Eliminado de favoritos' : 'Agregado a favoritos',
        description: vendor.name,
      })
    } catch {
      // Rollback optimistic update
      if (wasFavorite) {
        addFavorite(vendorId)
      } else {
        removeFavorite(vendorId)
      }
      toast({ kind: 'error', title: 'No se pudo actualizar favoritos' })
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
        <button
          onClick={toggleFavorite}
          className="ml-auto p-2 rounded-full hover:bg-stone-100 active:bg-stone-200 transition-colors"
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
          onClick={() => setCartOpen(true)}
          className="relative p-2 rounded-full hover:bg-stone-100 active:bg-stone-200 transition-colors"
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

      <div className="p-4 space-y-6 max-w-5xl mx-auto md:p-6 md:space-y-8">
        <VendorProfile vendor={adaptedVendor} />

          {/* Action buttons — visible to everyone */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-3">
              Contacta a {vendor.name}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors md:py-2.5"
                >
                  <Phone size={18} />
                  <span>Llamar</span>
                </a>
              )}
              {vendor.phone && (
                <button
                  type="button"
                  onClick={handleWhatsAppDirect}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors md:py-2.5"
                >
                  <MessageCircle size={18} />
                  <span>WhatsApp</span>
                </button>
              )}
              {vendor.latitude && vendor.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary-dark text-white font-medium rounded-xl transition-colors md:py-2.5"
                >
                  <Navigation size={18} />
                  <span>Cómo llegar</span>
                </a>
              )}
            </div>
          </div>

        <VendorProducts products={products} onAddToCart={(p) => { addToCart(p); triggerCartBounce(); toast({ kind: 'success', title: 'Agregado al carrito', description: p.name }) }} user={user} />

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
