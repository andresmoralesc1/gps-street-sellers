'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Star, Apple, UtensilsCrossed, CupSoda, Palette, Shirt, Package, ChevronRight, Check, MapPin, Phone } from 'lucide-react'
import { getCategoryInfo } from '@/lib/core/constants'
import type { VendorCategory } from '@/lib/core/types'

const CategoryIconMap: Record<VendorCategory, typeof Apple> = {
  frutas: Apple,
  comida: UtensilsCrossed,
  bebidas: CupSoda,
  artesanias: Palette,
  ropa: Shirt,
  otros: Package,
}

interface SellerDashboardProps {
  vendorId: string
  products?: any[]
  productCount?: number
  vendorPhotoUrl?: string | null
}

interface VendorStats {
  viewsToday: number
  totalOrders: number
  rating: number
  reviewCount: number
}

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  price: string
}

interface Order {
  id: string
  buyer_name: string
  total: string
  status: string
  created_at: string
  items: OrderItem[]
}

export function SellerDashboard({ vendorId, products = [], productCount = 0, vendorPhotoUrl = null }: SellerDashboardProps) {
  const [vendor, setVendor] = useState<any>(null)
  const [stats, setStats] = useState<VendorStats>({ viewsToday: 0, totalOrders: 0, rating: 0, reviewCount: 0 })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/vendors/${vendorId}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/vendors/${vendorId}/stats`, { credentials: 'include' }).then((r) => r.ok ? r.json() : { viewsToday: 0, totalOrders: 0, rating: 0, reviewCount: 0 }).catch(() => ({ viewsToday: 0, totalOrders: 0, rating: 0, reviewCount: 0 })),
      fetch(`/api/orders`, { credentials: 'include' }).then((r) => r.ok ? r.json() : { orders: [] }).catch(() => ({ orders: [] })),
    ]).then(([vendorData, statsData, ordersData]) => {
      if (vendorData?.id) {
        setVendor(vendorData)
        setStats({
          viewsToday: statsData.viewsToday ?? 0,
          totalOrders: statsData.totalOrders ?? 0,
          rating: parseFloat(vendorData.rating ?? 0),
          reviewCount: vendorData.review_count ?? 0,
        })
        setOrders(ordersData.orders ?? [])
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [vendorId])

  if (loading || !vendor) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="outlined" className="p-4 text-center animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-100 rounded w-2/3 mx-auto" />
            </Card>
          ))}
        </div>
        <Card variant="elevated" className="p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-xl" />
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const category = getCategoryInfo(vendor.category)
  const IconComponent = CategoryIconMap[vendor.category as VendorCategory] ?? Package

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-primary">{stats.viewsToday}</p>
          <p className="text-sm text-gray-500">Vistos hoy</p>
        </Card>
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-secondary">{stats.totalOrders}</p>
          <p className="text-sm text-gray-500">Pedidos</p>
        </Card>
        <Card variant="outlined" className="p-4 text-center">
          <p className="text-3xl font-bold text-yellow-500">{stats.rating.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Rating</p>
        </Card>
      </div>

      {/* Quick Start Checklist */}
      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Quick Start Checklist</h3>
        <div className="space-y-2">
          {/* Foto de perfil */}
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${vendor.photo_url ? 'bg-green-500' : 'bg-gray-200'}`}>
              {vendor.photo_url ? (
                <Check size={14} className="text-white" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-400" />
              )}
            </div>
            <span className={`text-sm ${vendor.photo_url ? 'text-gray-700' : 'text-gray-400'}`}>Foto de perfil</span>
          </div>
          {/* Agregar productos */}
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${productCount > 0 ? 'bg-green-500' : 'bg-gray-200'}`}>
              {productCount > 0 ? (
                <Check size={14} className="text-white" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-400" />
              )}
            </div>
            <span className={`text-sm ${productCount > 0 ? 'text-gray-700' : 'text-gray-400'}`}>Agregar productos</span>
          </div>
          {/* Compartir ubicación */}
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${vendor.latitude ? 'bg-green-500' : 'bg-gray-200'}`}>
              {vendor.latitude ? (
                <Check size={14} className="text-white" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-400" />
              )}
            </div>
            <span className={`text-sm ${vendor.latitude ? 'text-gray-700' : 'text-gray-400'}`}>Compartir ubicación</span>
          </div>
          {/* WhatsApp */}
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${vendor.phone ? 'bg-green-500' : 'bg-gray-200'}`}>
              {vendor.phone ? (
                <Check size={14} className="text-white" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-400" />
              )}
            </div>
            <span className={`text-sm ${vendor.phone ? 'text-gray-700' : 'text-gray-400'}`}>WhatsApp</span>
          </div>
        </div>
      </Card>

      {/* Empty state - Tu primer pedido */}
      {stats.totalOrders === 0 && (
        <Card variant="outlined" className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="20" width="60" height="50" rx="4" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2"/>
              <rect x="20" y="10" width="40" height="15" rx="2" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2"/>
              <rect x="30" y="35" width="20" height="2" rx="1" fill="#D1D5DB"/>
              <rect x="30" y="41" width="20" height="2" rx="1" fill="#D1D5DB"/>
              <rect x="30" y="47" width="12" height="2" rx="1" fill="#D1D5DB"/>
              <path d="M45 55 L55 65 L70 45" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Aún no tienes pedidos</h3>
          <p className="text-sm text-gray-500">Añade productos y comparte tu ubicación para empezar a recibir pedidos</p>
        </Card>
      )}

      {/* Info del vendedor */}
      <Card variant="elevated" className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center"
            style={{ background: category?.color ?? '#F97316' }}
          >
            <IconComponent size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {vendor.name}
              {vendor.is_verified && (
                <span title="Vendedor verificado">✅</span>
              )}
            </h2>
            <Badge variant="primary">{category?.label ?? vendor.category}</Badge>
          </div>
        </div>
        {vendor.description && (
          <p className="text-gray-600 mt-4">{vendor.description}</p>
        )}
      </Card>

      {/* Orders section */}
      {orders.length > 0 && (
        <Card variant="outlined" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Pedidos recientes</h3>
            <span className="text-sm text-gray-500">{orders.length} en total</span>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{order.buyer_name}</p>
                  <p className="text-xs text-gray-500">
                    {order.items.map((item) => `${item.quantity}x ${item.product_name}`).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-primary">
                    ${parseFloat(order.total).toLocaleString('es-CO')}
                  </p>
                  <Badge variant={order.status === 'pending' ? 'secondary' : order.status === 'completed' ? 'primary' : 'outline'}>
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Products preview */}
      {productCount > 0 && (
        <Card variant="outlined" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Mis Productos</h3>
            <span className="text-sm text-gray-500">{productCount} en total</span>
          </div>
          <div className="space-y-2">
            {products.slice(0, 3).map((product: any) => (
              <div key={product.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                {product.photo_url ? (
                  <img
                    src={product.photo_url}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package size={16} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-primary text-sm font-bold">
                    ${product.price.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/products" className="block mt-3">
            <div className="flex items-center justify-center gap-1 text-primary text-sm font-medium">
              Ver todos
              <ChevronRight size={16} />
            </div>
          </Link>
        </Card>
      )}
    </div>
  )
}
