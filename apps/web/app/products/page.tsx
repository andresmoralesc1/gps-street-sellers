'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MOCK_PRODUCTS } from '@/lib/mockData'

export default function ProductsPage() {
  // Productos del vendedor mock (v2)
  const myProducts = MOCK_PRODUCTS.filter((p) => p.vendorId === 'v2')

  return (
    <div className="min-h-screen bg-background-cream pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost">←</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Mis Productos</h1>
          <p className="text-sm text-gray-500">{myProducts.length} productos</p>
        </div>
      </header>

      <div className="p-4">
        {myProducts.length === 0 ? (
          <Card variant="outlined" className="p-8 text-center">
            <span className="text-5xl mb-4 block">📦</span>
            <h2 className="text-xl font-bold mb-2">Sin productos</h2>
            <p className="text-gray-500 mb-4">
              Agrega productos para que los compradores vean qué ofreces
            </p>
            <Button>Agregar producto</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {myProducts.map((product) => (
              <Card key={product.id} variant="outlined" className="p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-3xl">
                    📦
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-gray-500 text-sm">{product.description}</p>
                    <p className="text-primary font-bold mt-1">
                      ${product.price.toLocaleString('es-CO')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">✏️</Button>
                </div>
              </Card>
            ))}

            <Button variant="outline" className="w-full mt-4">
              + Agregar producto
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3">
        <Link href="/dashboard" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <span className="text-2xl">📊</span>
          <span className="text-xs">Dashboard</span>
        </Link>
        <Link href="/products" className="flex flex-col items-center text-primary">
          <span className="text-2xl">📦</span>
          <span className="text-xs">Productos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}
