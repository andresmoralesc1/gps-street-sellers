import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  isLoading,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(
        'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        {
          'bg-gradient-to-b from-primary to-primary-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]': variant === 'primary',
          'bg-gradient-to-b from-secondary to-secondary-dark text-white shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]': variant === 'secondary',
          'border-2 border-primary/20 text-primary-700 hover:bg-primary/5 hover:border-primary/40 active:bg-primary/10 active:scale-[0.97]': variant === 'outline',
          'text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200 active:scale-[0.97]': variant === 'ghost',
        },
        {
          'px-3 py-1.5 text-sm rounded-lg': size === 'sm',
          'px-5 py-2.5 text-sm': size === 'md',
          'px-7 py-3.5 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
