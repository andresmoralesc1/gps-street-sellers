'use client'

import { useState, useRef, useCallback, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * N3 — Pull-to-refresh.
 * Touch-driven vertical drag that triggers a refresh when the user releases
 * beyond a threshold. Shows a small spinner above the content.
 *
 * Works on iOS Safari, Chrome Android. Falls back to button-only on desktop.
 */
interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: ReactNode
}

const PULL_THRESHOLD = 80 // px

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return
    // Only start if at top of scroll
    const scroller = e.currentTarget as HTMLElement
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    if (scrollTop > 5) {
      startYRef.current = null
      return
    }
    startYRef.current = e.touches[0].clientY
  }, [refreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || refreshing) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      setPullDistance(0)
      return
    }
    // Apply resistance so it feels elastic
    const resisted = Math.min(delta * 0.4, 120)
    setPullDistance(resisted)
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return
    startYRef.current = null
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPullDistance(0)
  }, [pullDistance, refreshing, onRefresh])

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none z-30 transition-opacity"
          style={{
            top: -40,
            transform: `translateY(${pullDistance}px)`,
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
          }}
        >
          <div className="flex items-center gap-2 bg-white shadow-md rounded-full px-3 py-1.5 text-xs text-gray-600">
            <Loader2
              size={14}
              className={`${refreshing || pullDistance >= PULL_THRESHOLD ? 'animate-spin' : ''}`}
            />
            <span>
              {refreshing
                ? 'Actualizando...'
                : pullDistance >= PULL_THRESHOLD
                ? 'Suelta para actualizar'
                : 'Desliza para actualizar'}
            </span>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}