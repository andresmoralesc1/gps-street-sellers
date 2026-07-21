'use client'

import { Phone, Navigation } from 'lucide-react'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import type { Vendor } from '@/lib/core/types'

interface Props {
  vendor: Vendor
}

/**
 * Three-up CTA strip: call / WhatsApp / directions. Each button only
 * renders when the underlying capability exists on the vendor (phone
 * for call+wa, lat/lng for directions). The WhatsApp button already
 * handles its own ripple + fly-out animation — we pass the prebuilt
 * wa.me URL so it can render as a link with `href`.
 */
export function VendorContactActions({ vendor }: Props) {
  const whatsappUrl = vendor.phone
    ? `https://wa.me/${vendor.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        '¡Hola! Quiero saber más sobre tus productos en BarrioTech'
      )}`
    : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-sm text-gray-600 mb-3">Contacta a {vendor.name}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
        {vendor.phone && (
          <a
            href={`tel:${vendor.phone}`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors md:py-2.5"
          >
            <Phone size={18} />
            <span>Llamar</span>
          </a>
        )}
        {vendor.phone && whatsappUrl && (
          <WhatsAppButton href={whatsappUrl} className="w-full md:w-auto md:py-2.5" label="WhatsApp" />
        )}
        {vendor.latitude != null && vendor.longitude != null && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary-dark text-white font-medium rounded-xl transition-colors md:py-2.5"
          >
            <Navigation size={18} />
            <span>Cómo llegar</span>
          </a>
        )}
      </div>
    </div>
  )
}
