'use client'

import { Card } from '@/components/ui/Card'
import { Package, Plus, User } from 'lucide-react'
import type { Product } from '@/lib/core/types'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
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
          <Card key={product.id} variant="outlined" className="p-3">
            {!compact && (
              <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                <Package size={32} className="text-gray-400" />
              </div>
            )}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{product.name}</h4>
                <p className="text-sm text-gray-500">{product.description}</p>
                <p className="text-primary font-bold mt-1">
                  ${product.price.toLocaleString('es-CO')}
                </p>
              </div>
              {onAddToCart ? (
                user ? (
                  <button
                    onClick={() => onAddToCart(product)}
                    className="p-2 bg-primary text-white rounded-full hover:bg-primary-600 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/register')}
                    className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors"
                    title="Regístrate para agregar"
                  >
                    <User size={18} />
                  </button>
                )
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}