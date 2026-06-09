import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-white p-4',
        {
          'shadow-md': variant === 'elevated',
          'border border-gray-200': variant === 'outlined',
          'shadow-sm': variant === 'default',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
