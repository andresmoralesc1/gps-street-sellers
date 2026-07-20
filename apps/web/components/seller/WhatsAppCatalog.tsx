'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * N13 — WhatsApp public catalog.
 * Builds a formatted text block with vendor info + products,
 * opens wa.me with pre-filled message that the seller can send to clients.
 */
interface CatalogItem {
  id: string
  name: string
  description?: string
  price: number | string
  photo_url?: string | null
}

interface CatalogData {
  vendor: { id: string; name: string; description?: string; phone?: string; city_name?: string }
  products: CatalogItem[]
  shareUrl: string
}

interface WhatsAppCatalogProps {
  vendorId: string
}

export function WhatsAppCatalog({ vendorId }: WhatsAppCatalogProps) {
  const [catalog, setCatalog] = useState<CatalogData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}/catalog`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setCatalog(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [vendorId])

  const handleShare = () => {
    if (!catalog) return
    const { vendor, products, shareUrl } = catalog
    const lines: string[] = []
    lines.push(`🛒 *${vendor.name}*`)
    if (vendor.city_name) lines.push(`📍 ${vendor.city_name}`)
    if (vendor.description) lines.push(`\n${vendor.description}`)
    lines.push('')

    if (products.length === 0) {
      lines.push('_(Pronto tendré productos disponibles)_')
    } else {
      products.slice(0, 10).forEach((p, idx) => {
        const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price
        lines.push(`${idx + 1}. *${p.name}* — $${price.toLocaleString('es-CO')}`)
        if (p.description) lines.push(`   ${p.description}`)
      })
    }

    lines.push('')
    lines.push(`👀 Ver todo: ${typeof window !== 'undefined' ? window.location.origin : ''}${shareUrl}`)
    lines.push('\n¡Pídeme por aquí! 🤙')

    const text = encodeURIComponent(lines.join('\n'))
    const phone = vendor.phone ? vendor.phone.replace(/\D/g, '') : ''
    // If no buyer phone, open wa.me with empty chat (seller pastes text).
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-sm">Compartir por WhatsApp</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {loading
              ? 'Cargando catálogo...'
              : catalog
              ? `${catalog.products.length} productos listos para enviar`
              : 'Sin catálogo disponible'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleShare}
          disabled={loading || !catalog}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
          Enviar
        </button>
      </div>
    </Card>
  )
}