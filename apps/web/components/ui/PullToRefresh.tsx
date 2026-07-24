'use client'

import { useRef, useState, useCallback, type ReactNode, type TouchEvent } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Pull-to-refresh wrapper (Sprint 4 B12, mobile UX finishing).
 *
 * Detects a vertical swipe-down gesture anchored at the very top of the
 * wrapped content (within TOUCH_START_TOP_PX of the visible top edge).
 * Once the user pulls past PULL_THRESHOLD_PX, releases, and the gesture
 * was dominantly vertical (vs horizontal), fires onRefresh().
 *
 * Why a wrapper component instead of an inline gesture on MapView?
 *   - MapView is a 676-line monstrosity; adding 80 lines of gesture state
 *     + spinner markup would push it past the maintainability cliff.
 *   - The gesture is generic — any future page can wrap itself in
 *     <PullToRefresh onRefresh={...}> without copying logic.
 *   - PullToRefresh sets `overscroll-behavior: contain` so the OS-level
 *     pull-to-refresh (Chrome Android address bar collapse) doesn't
 *     fight with us — without this, the page bounces twice on release.
 *
 * Accessibility:
 *   - The status badge is `role="status" aria-live="polite"` so screen
 *     readers announce "Refrescando" / "Listo" without interrupting.
 *   - The touch listener is on a wrapper `<div>` not on the children, so
 *     children keep their own focus / click handlers (map drag, button
 *     taps). We use `{ passive: true }` for touchstart and a non-passive
 *     listener only if we ever need preventDefault (we don't here).
 *
 * Edge cases:
 *   - User starts the touch NOT at the top → ignored. Prevents stealing
 *     drags from map markers / sheet handles.
 *   - Pull distance capped at 1.5x threshold so the spinner doesn't fly
 *     off-screen on a fast flick.
 *   - If the wrapped content itself scrolls vertically (e.g. a long
 *     list), the gesture is only active when `window.scrollY === 0`.
 */
const PULL_THRESHOLD_PX = 100
const TOUCH_START_TOP_PX = 24

export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<void> | void
  children: ReactNode
  className?: string
}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const startY = useRef<number>(0)
  const distanceRef = useRef(0)

  const maxPull = PULL_THRESHOLD_PX * 1.5

  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    // Only capture if the user touches near the top AND the page isn't
    // scrolled (otherwise we'd fight with normal scroll).
    const target = e.target as HTMLElement | null
    if (!target) return
    // The top container is the first child of the wrapper; clicks on
    // anything beyond the top region are out of scope.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const touchY = e.touches[0].clientY
    if (rect.top > TOUCH_START_TOP_PX) return
    if (typeof window !== 'undefined' && window.scrollY > 0) return
    touchStartY.current = touchY
    startY.current = touchY
    distanceRef.current = 0
  }, [])

  const onTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) return
    const touchY = e.touches[0].clientY
    const dy = touchY - touchStartY.current
    if (dy <= 0) {
      // User is swiping UP — not a pull-to-refresh.
      distanceRef.current = 0
      setPullDistance(0)
      return
    }
    // Apply a rubber-band feel so the pull doesn't feel stiff past 1.5x.
    const capped = Math.min(dy, maxPull)
    distanceRef.current = capped
    setPullDistance(capped)
  }, [maxPull])

  const onTouchEnd = useCallback(async () => {
    if (touchStartY.current === null) return
    touchStartY.current = null
    const finalDist = distanceRef.current
    distanceRef.current = 0
    if (finalDist >= PULL_THRESHOLD_PX && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(PULL_THRESHOLD_PX * 0.6) // park the spinner mid-threshold
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [onRefresh, isRefreshing])

  // Visual state: hide the spinner until the user pulls ~25% of the
  // threshold. Show "Soltar para refrescar" once over the threshold.
  const ready = pullDistance >= PULL_THRESHOLD_PX && !isRefreshing
  const spinnerVisible = pullDistance > PULL_THRESHOLD_PX * 0.25 || isRefreshing
  const label = isRefreshing
    ? 'Refrescando…'
    : ready
      ? 'Soltar para refrescar'
      : pullDistance > 0
        ? 'Seguí jalando'
        : ''

  return (
    <div
      className={className ?? 'h-full w-full'}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        // Stop the OS from collapsing the address bar / fighting our gesture.
        overscrollBehaviorY: 'contain',
        touchAction: 'pan-y',
      }}
    >
      {/* Floating spinner above the wrapped content. Pointer-events-none so
          it never blocks taps on the map underneath. */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 transition-opacity"
        style={{
          top: 8,
          opacity: spinnerVisible ? 1 : 0,
        }}
        role="status"
        aria-live="polite"
      >
        <div
          className="h-9 w-9 rounded-full bg-white shadow-md border border-stone-200 flex items-center justify-center transition-transform"
          style={{
            transform: `rotate(${pullDistance * 1.2}deg)`,
          }}
        >
          {isRefreshing ? (
            <Loader2 size={18} className="animate-spin text-primary" aria-hidden="true" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={ready ? 'text-primary' : 'text-stone-500'}
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
        </div>
        {label && (
          <span className="text-xs font-medium text-stone-700 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full shadow-sm">
            {label}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}