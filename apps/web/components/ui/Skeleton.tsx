import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:200%_100%] animate-shimmer',
        className
      )}
      aria-hidden="true"
    />
  )
}

/** Card skeleton — for vendor cards, product cards, review items */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={clsx('rounded-2xl bg-white p-4 shadow-card', className)} aria-hidden="true">
      <Skeleton className="h-32 w-full mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

/** Row skeleton — for list items like favorites, order history */
export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div className={clsx('flex items-center gap-3 p-3', className)} aria-hidden="true">
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/** Text block skeleton — for paragraphs / loading sections */
export function SkeletonText({ lines = 3, className }: SkeletonProps & { lines?: number }) {
  return (
    <div className={clsx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}
