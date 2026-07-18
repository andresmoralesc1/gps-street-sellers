'use client'

import { Card } from '@/components/ui/Card'
import { Package, Plus, User } from 'lucide-react'
import type { Product } from '@/lib/core/types'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { User as UserType } from '@/store/useStore'

interface VendorProductsProps {
  products: Product[]
  onAddToCart?: (product: Product) => void
  compact?: boolean
  user?: UserType | null
  /** N12: extra photos per product id */
  extraPhotos?: Record<string, string[]>
}

export function VendorProducts({ products, onAddToCart, compact, user, extraPhotos }: VendorProductsProps) {
  const router = useRouter()

  if (products.length === 0) {
    return (
      <Card variant="outlined" className="p-4 text-center text-gray-500">
        Este vendedor aún no tiene productos
      </Card>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">Productos</h3>
      <div className={clsx('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            compact={compact}
            onAddToCart={onAddToCart}
            user={user}
            router={router}
            extraPhotos={extraPhotos?.[product.id]}
          />
        ))}
      </div>
    </div>
  )
}

interface ProductCardProps {
  product: Product
  compact?: boolean
  onAddToCart?: (product: Product) => void
  user?: UserType | null
  router: ReturnType<typeof useRouter>
  extraPhotos?: string[]
}

function ProductCard({ product, compact, onAddToCart, user, router, extraPhotos }: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const allPhotos = [product.photoUrl, ...(extraPhotos ?? [])].filter(Boolean) as string[]
  const showPhoto = allPhotos.length > 0 && !imgFailed
  const currentPhoto = allPhotos[photoIdx] || product.photoUrl

  return (
    <Card variant="outlined" className="overflow-hidden p-0">
      {!compact && (
        <div className="w-full aspect-square bg-gray-100 overflow-hidden relative">
          {showPhoto ? (
            <img
              src={currentPhoto}
              alt={product.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={32} className="text-gray-400" />
            </div>
          )}
          {/* N12: dots indicator for multi-photo carousel */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {allPhotos.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoIdx(idx)}
                  aria-label={`Foto ${idx + 1} de ${allPhotos.length}`}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === photoIdx ? 'bg-white w-4' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold leading-tight">{product.name}</h4>
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
            <p className="text-primary-700 font-bold mt-1">
              ${product.price.toLocaleString('es-CO')}
            </p>
          </div>
          {onAddToCart ? (
            user ? (
              <button
                onClick={() => onAddToCart(product)}
                className="p-2 bg-primary text-white rounded-full hover:bg-primary-600 transition-colors flex-shrink-0"
                aria-label={`Agregar ${product.name} al carrito`}
              >
                <Plus size={18} />
              </button>
            ) : (
              <button
                onClick={() => router.push('/register')}
                className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors flex-shrink-0"
                title="Regístrate para agregar"
                aria-label="Regístrate para agregar al carrito"
              >
                <User size={18} />
              </button>
            )
          ) : null}
        </div>
      </div>
    </Card>
  )
}