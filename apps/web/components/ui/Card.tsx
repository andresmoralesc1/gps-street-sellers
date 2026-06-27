import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass'
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-200',
        {
          'bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5': variant === 'elevated',
          'bg-white border border-stone-200/60': variant === 'outlined',
          'bg-white/80 backdrop-blur-md border border-white/20 shadow-soft': variant === 'glass',
          'bg-white shadow-card': variant === 'default',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
