'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Package, Clock, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useStore } from '@/store/useStore'

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmado', bg: 'bg-primary-100 text-primary-700', icon: Clock },
  delivered: { label: 'Entregado', bg: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelado', bg: 'bg-red-100 text-red-700', icon: XCircle },
}

interface OrderItem {
  name: string
  quantity: number
  price: number
  productId: string
}

interface Order {
  id: string
  status: string
  total: number
  createdAt: string
  vendor_name?: string
  items: OrderItem[]
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const user = useStore((s) => s.user)
  const _hasHydrated = useStore((s) => s._hasHydrated)

  useEffect(() => {
    // Wait for hydration
    if (!_hasHydrated) return

    // Redirect if not logged in
    if (!user) {
      router.push('/login')
      return
    }
  }, [_hasHydrated, user, router])

  useEffect(() => {
    if (!user) return

    fetch('/api/orders', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) {
          setOrders(data.orders)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch orders:', err)
        setLoading(false)
      })
  }, [user])

  // Show loading while hydrating
  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  // Seller role check
  if (user?.role === 'seller') {
    return (
      <div className="min-h-screen bg-background-cream">
        <header className="bg-white shadow-sm p-4 flex items-center gap-4">
          <Link href="/map">
            <Button variant="ghost" className="p-2">
              <ChevronLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Mis Pedidos</h1>
        </header>
        <div className="p-4 text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Esta sección es para compradores</p>
          <Link href="/dashboard">
            <Button variant="primary">Ir al Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-cream">
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Link href="/map">
          <Button variant="ghost" className="p-2">
            <ChevronLeft size={20} />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Mis Pedidos</h1>
      </header>

      <div className="p-4 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Aún no tienes pedidos</p>
            <p className="text-gray-400 text-sm mt-1">Cuando hagas un pedido, aparecerá aquí</p>
            <Link href="/map">
              <Button variant="primary" className="mt-4">Explorar vendedores</Button>
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
            const StatusIcon = config.icon
            const isExpanded = expandedOrder === order.id

            return (
              <Card
                key={order.id}
                variant="outlined"
                className="p-4 cursor-pointer transition-all"
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{order.vendor_name || 'Vendedor'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={config.bg}>
                      <StatusIcon size={10} className="mr-1" />
                      {config.label}
                    </Badge>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">#{order.id.slice(0, 8)}</span>
                  <span className="font-bold text-primary">
                    ${Number(order.total).toLocaleString('es-CO')}
                  </span>
                </div>

                {isExpanded && order.items && order.items.length > 0 && (
                  <div className="border-t mt-3 pt-3 space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-gray-600">
                          ${(item.price * item.quantity).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3">
        <Link href="/map" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span className="text-xs mt-1">Mapa</span>
        </Link>
        <Link href="/favorites" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          <span className="text-xs mt-1">Favoritos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="text-xs mt-1">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}
