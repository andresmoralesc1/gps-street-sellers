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
}

export function VendorProducts({ products, onAddToCart, compact, user }: VendorProductsProps) {
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
      <div className={clsx('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            compact={compact}
            onAddToCart={onAddToCart}
            user={user}
            router={router}
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
}

function ProductCard({ product, compact, onAddToCart, user, router }: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const showPhoto = !!product.photoUrl && !imgFailed

  return (
    <Card variant="outlined" className="overflow-hidden p-0">
      {!compact && (
        <div className="w-full h-28 bg-gray-100 overflow-hidden relative">
          {showPhoto ? (
            <img
              src={product.photoUrl}
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
        </div>
      )}
      <div className="p-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{product.name}</h4>
            <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
            <p className="text-primary font-bold mt-1">
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