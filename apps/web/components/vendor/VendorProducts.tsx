'use client'

import { Card } from '@/components/ui/Card'
import type { Product } from '@/lib/core/types'

interface VendorProductsProps {
  products: Product[]
}

export function VendorProducts({ products }: VendorProductsProps) {
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
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <Card key={product.id} variant="outlined" className="p-3">
            <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-3xl">
              📦
            </div>
            <h4 className="font-semibold">{product.name}</h4>
            <p className="text-sm text-gray-500">{product.description}</p>
            <p className="text-primary font-bold mt-1">
              ${product.price.toLocaleString('es-CO')}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}