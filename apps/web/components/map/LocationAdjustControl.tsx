'use client'

import { useState, useEffect } from 'react'
import { Crosshair, MapPin, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { clsx } from 'clsx'

interface Props {
  /**
   * Whether the user is currently dragging the location marker.
   * The parent MapView flips this when the user activates "Ajustar".
   */
  isAdjusting: boolean
  setIsAdjusting: (v: boolean) => void
  /**
   * Re-trigger browser geolocation and reset the user location pin to
   * the GPS fix. Called from the "Volver a GPS" button.
   */
  onRelocate: () => void
  /**
   * Whether a geolocation request is currently in flight.
   */
  isRelocating: boolean
  /**
   * Whether a vendor card is currently open at the bottom of the map.
   * When true, the control lifts itself above the card so they don't
   * visually collide.
   */
  selectedVendor: boolean
  /**
   * Height of the vendor card in pixels, measured by the parent. Used
   * together with `selectedVendor` to compute the lift offset.
   */
  cardHeightPx: number
}

/**
 * Floating control that lets the user manually adjust their location pin
 * on the map. Two actions:
 *
 *   1. "Ajustar ubicación" — toggles drag mode on the user-location marker.
 *      While active, the cursor turns into a grab/grabbing icon and the
 *      pin can be dragged anywhere on the map. Useful when:
 *        - GPS is inaccurate (urban canyons, indoor use)
 *        - User wants to explore a different neighborhood without
 *          changing the city selector
 *        - Browser blocked geolocation permission
 *
 *   2. "Volver a GPS" — re-requests navigator.geolocation and snaps the
 *      pin back to the device's real position.
 *
 * The component is purely a control; the actual marker-drag behaviour
 * lives in MapView via `<DraggableUserMarker>`.
 */
export function LocationAdjustControl({ isAdjusting, setIsAdjusting, onRelocate, isRelocating, selectedVendor, cardHeightPx }: Props) {
  // Hide the "Volver a GPS" button while the user is still in adjust mode —
  // they're saying "trust my manual pin, not GPS". Re-show after they exit.
  return (
    <div
      className={clsx(
        'absolute right-3 sm:right-4 z-[1000] flex flex-col items-end gap-2',
        // Lift the control above the floating vendor card when one is open.
        // cardHeightPx is measured by the parent and updates via ResizeObserver.
        // Fall back to a sensible default so we never collide with the bottom nav.
        selectedVendor
          ? cardHeightPx > 0
            ? 'bottom-[calc(72px+env(safe-area-inset-bottom)+var(--card-h))] sm:bottom-[calc(1rem+var(--card-h)+0.5rem)]'
            : 'bottom-[200px] sm:bottom-[200px]'
          : 'bottom-[72px] sm:bottom-4'
      )}
      style={selectedVendor && cardHeightPx > 0 ? ({ ['--card-h' as any]: `${cardHeightPx}px` } as React.CSSProperties) : undefined}
      role="group"
      aria-label="Controles de ubicación"
    >
      {/* Helper banner — only while actively adjusting */}
      {isAdjusting && (
        <div
          className="bg-primary text-white text-xs font-medium px-3 py-2 rounded-xl shadow-card max-w-[260px] animate-slide-up"
          role="status"
          aria-live="polite"
        >
          Arrastra el pin para ajustar tu ubicación. Vuelve a tocar este botón cuando termines.
        </div>
      )}

      <div className="flex flex-col gap-2 bg-white rounded-2xl shadow-card border border-stone-200 p-1.5">
        <button
          onClick={() => setIsAdjusting(!isAdjusting)}
          aria-pressed={isAdjusting}
          aria-label={isAdjusting ? 'Terminar ajuste de ubicación' : 'Ajustar mi ubicación'}
          title={isAdjusting ? 'Terminar ajuste' : 'Ajustar mi ubicación'}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[40px]',
            isAdjusting
              ? 'bg-primary text-white hover:bg-primary-600'
              : 'text-stone-700 hover:bg-stone-100'
          )}
        >
          <MapPin size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{isAdjusting ? 'Listo' : 'Ajustar ubicación'}</span>
        </button>

        {!isAdjusting && (
          <button
            onClick={onRelocate}
            disabled={isRelocating}
            aria-label="Usar mi ubicación actual por GPS"
            title="Usar mi ubicación actual"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
          >
            {isRelocating ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Crosshair size={16} aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isRelocating ? 'Buscando...' : 'Usar GPS'}</span>
          </button>
        )}
      </div>
    </div>
  )
}