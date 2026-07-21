'use client'

import { formatBusinessHoursShort } from '@/lib/business-hours'
import type { Vendor } from '@/lib/core/types'

interface Props {
  vendor: Vendor
}

/**
 * Open / closed / station-type / business-hours pills shown just under
 * the vendor profile. Tells the buyer at a glance whether the vendor is
 * reachable right now, how they operate (fixed vs on-the-move), and
 * their typical schedule — so they don't bounce just because it's
 * currently closed.
 */
export function VendorStatusBadges({ vendor }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {vendor.isOpen !== undefined && (
        <span
          className={
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ' +
            (vendor.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700')
          }
          aria-label={vendor.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
        >
          <span className={'w-1.5 h-1.5 rounded-full ' + (vendor.isOpen ? 'bg-green-600' : 'bg-gray-500')} />
          {vendor.isOpen ? 'Abierto ahora' : 'Cerrado'}
        </span>
      )}
      {vendor.stationType && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
          {vendor.stationType === 'fixed' ? '📍 Puesto fijo' : '🛵 Se mueve por la ciudad'}
        </span>
      )}
      {vendor.businessHours && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-50 text-stone-600">
          🕐 {formatBusinessHoursShort(vendor.businessHours)}
        </span>
      )}
    </div>
  )
}
