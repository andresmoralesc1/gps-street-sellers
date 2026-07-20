import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200',
        {
          'bg-stone-100 text-stone-700': variant === 'default',
          'bg-primary/10 text-primary-700 shadow-sm': variant === 'primary',
          // bg-secondary/30 + text-secondary-dark = solid 4.5:1 contrast on white-ish bg
          // (was 3.28:1 with /10, /20 still failed under light backgrounds)
          'bg-secondary/30 text-secondary-dark shadow-sm font-bold': variant === 'secondary',
          'border border-current text-stone-600': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
