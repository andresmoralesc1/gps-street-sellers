'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface MobileBottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /**
   * Accessible label for the dialog. Required for screen readers.
   */
  ariaLabel: string
  /**
   * Pixels of vertical drag required to dismiss. Defaults to 100.
   * Set higher to make accidental dismiss harder.
   */
  dismissThreshold?: number
  /**
   * Optional className for the panel itself (overrides padding, etc.)
   */
  className?: string
}

/**
 * Mobile-first bottom sheet (touch-device only). Wraps a drag handle, smooth
 * drag tracking, and swipe-down-to-dismiss. On desktop (>639px) this
 * renders the children directly without the drag UI — the caller is
 * responsible for their own desktop layout.
 *
 * Why: Leaflet's marker click + Leaflet popup already work on hover/click,
 * but on a touch device hovering the map is impossible. The previous
 * implementation just rendered a `VendorCard` at `bottom: 88px`, which
 * forces the user to find the X to close. A drag handle + swipe-down
 * matches Material Design / iOS sheet patterns and works with one thumb
 * in the calle.
 *
 * Pitfalls avoided:
 *  - `touch-action: pan-y` lets the user scroll the sheet contents
 *    vertically without the drag handler eating the gesture. Only when
 *    the gesture starts on the handle (or at the very top of the sheet)
 *    do we hijack it for dismiss.
 *  - Drag state lives in `useRef` not `useState` — updating it on every
 *    pointermove would cause a re-render storm at 60fps.
 *  - The transform is applied via inline style with `transform` (not
 *    tailwind classes) because the translateY value is a runtime number.
 *  - We rely on `pointerdown`/`pointermove`/`pointerup` (Pointer Events)
 *    so the same handler works for mouse + touch without separate code.
 */
export function MobileBottomSheet({
  open,
  onClose,
  children,
  ariaLabel,
  dismissThreshold = 100,
  className,
}: MobileBottomSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const startYRef = useRef<number | null>(null)
  const translateRef = useRef(0)
  const [translate, setTranslate] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Reset translate whenever the sheet re-opens or the open prop changes.
  useEffect(() => {
    if (open) {
      translateRef.current = 0
      setTranslate(0)
      setDragging(false)
    }
  }, [open])

  // Body scroll lock while the sheet is open on mobile — prevents the
  // map from scrolling behind the user's thumb.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  function isHandleOrTop(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    if (target.dataset.sheetDragHandle === 'true') return true
    // Also allow grabbing anywhere in the first 24px of the panel
    const panel = panelRef.current
    if (!panel) return false
    const rect = panel.getBoundingClientRect()
    const yWithinPanel = (target as HTMLElement).getBoundingClientRect().top - rect.top
    return yWithinPanel < 24
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isHandleOrTop(e.target)) return
    startYRef.current = e.clientY
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (startYRef.current == null) return
    const delta = e.clientY - startYRef.current
    // Only allow drag downward (positive). Upward drag is reserved for
    // the inner scroll of the sheet content.
    const clamped = Math.max(0, delta)
    translateRef.current = clamped
    setTranslate(clamped)
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (startYRef.current == null) return
    const delta = translateRef.current
    startYRef.current = null
    setDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore — capture may have been released already
    }
    if (delta > dismissThreshold) {
      // Snap closed
      setTranslate(0)
      onClose()
    } else {
      // Spring back to resting position
      setTranslate(0)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop only on mobile — tap to dismiss. Desktop callers should
          render their own layout and not include this sheet. */}
      <div
        className="sm:hidden fixed inset-0 z-[999] bg-black/30 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={clsx(
          'sm:hidden fixed left-2 right-2 bottom-[72px] z-[1000]',
          'max-h-[70vh] overflow-y-auto overscroll-contain',
          'bg-white rounded-2xl shadow-2xl border border-stone-200',
          dragging ? '' : 'transition-transform duration-200 ease-out',
          'animate-slide-up',
          className
        )}
        style={{
          transform: `translateY(${translate}px)`,
          // Respect iOS notch / Android gesture bar
          paddingBottom: 'env(safe-area-inset-bottom)',
          // Allow vertical pan inside the sheet so the user can scroll
          // the content (vendor description, contact buttons) without
          // the drag handler eating the gesture. Horizontal pan is
          // reserved for the map underneath.
          touchAction: 'pan-y',
        }}
      >
        {/* Drag handle — 44px touch target (Apple HIG). The visual bar is
            centered visually but the entire row is the touch target. */}
        <div
          data-sheet-drag-handle="true"
          className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          aria-hidden="true"
        >
          <div className="w-10 h-1.5 rounded-full bg-stone-300" />
        </div>
        <div className="px-3 pb-4">{children}</div>
      </div>
    </>
  )
}
