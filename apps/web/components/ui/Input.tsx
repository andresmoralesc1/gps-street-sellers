import { clsx } from 'clsx'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-stone-700 block min-h-[24px]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        disabled={props.disabled}
        className={clsx(
          'w-full px-4 py-3 rounded-xl border border-stone-200 bg-white',
          'transition-all duration-200',
          'hover:border-stone-300',
          'focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary focus:shadow-sm focus:shadow-primary/10',
          'placeholder:text-stone-400 placeholder:font-normal',
          error && 'border-accent focus:ring-accent/15 hover:border-accent/70',
          props.disabled && 'bg-stone-50 cursor-not-allowed opacity-60',
          className
        )}
        {...props}
      />
      {error && <span className="text-sm text-accent font-medium">{error}</span>}
    </div>
  )
}
