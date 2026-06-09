import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-gray-100 text-gray-700': variant === 'default',
          'bg-primary/10 text-primary': variant === 'primary',
          'bg-secondary/10 text-secondary': variant === 'secondary',
          'border border-current': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
