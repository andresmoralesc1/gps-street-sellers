'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'

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
          <WhatsAppGlyph />
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
        <WhatsAppButton
          label="Enviar"
          // The URL depends on the catalog payload, so we use onClick
          // instead of href. preventDefault keeps the <a> from navigating
          // to '#' — handleShare opens wa.me itself, then the seller
          // can review the message before sending.
          onClick={(e) => {
            e.preventDefault()
            handleShare()
          }}
          className={clsx(
            'px-3 py-1.5 text-sm rounded-lg',
            (loading || !catalog) && 'opacity-50 pointer-events-none'
          )}
        />
      </div>
    </Card>
  )
}

/** Brand glyph for the panel header. Inlined SVG so we don't pull
 *  lucide's MessageCircle into the bundle for one tiny spot. */
function WhatsAppGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  )
}
