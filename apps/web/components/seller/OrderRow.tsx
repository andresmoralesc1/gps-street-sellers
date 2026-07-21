'use client'

import { Truck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'

/**
 * One row in the "Recent Orders" card on the seller dashboard. Shows the
 * buyer, items, total, status badge, and two quick actions: WhatsApp
 * (pre-fills a message using the buyer phone if present) and mark-delivered
 * (only for pending orders). The parent owns the WhatsApp URL builder and
 * the action callback so it can also refresh the orders list.
 *
 * Extracted 2026-07-21 from SellerDashboard.tsx to reduce that file.
 */

export interface OrderItem {
  id: string
  product_name: string
  quantity: number
  price: string
}

export interface Order {
  id: string
  buyer_name: string
  buyer_phone?: string
  total: string
  status: string
  created_at: string
  items: OrderItem[]
}

interface OrderRowProps {
  order: Order
  whatsappUrl: string | null
  onMarkDelivered?: (orderId: string) => void
}

export function OrderRow({ order, whatsappUrl, onMarkDelivered }: OrderRowProps) {
  return (
    <div className="py-2 border-b last:border-0">
      <div className="flex items-center justify-between mb-1.5">
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
          <Badge
            variant={
              order.status === 'pending'
                ? 'secondary'
                : order.status === 'completed'
                ? 'primary'
                : 'outline'
            }
          >
            {order.status}
          </Badge>
        </div>
      </div>
      {/* N10: inline actions */}
      <div className="flex items-center gap-2 mt-2">
        {whatsappUrl && (
          <WhatsAppButton
            href={whatsappUrl}
            label={`WhatsApp · ${order.buyer_name}`}
            className="text-xs px-2 py-1 rounded-full"
          />
        )}
        {order.status === 'pending' && (
          <button
            type="button"
            onClick={() => onMarkDelivered?.(order.id)}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
          >
            <Truck size={12} /> Marcar entregado
          </button>
        )}
      </div>
    </div>
  )
}