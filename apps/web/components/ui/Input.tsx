import { clsx } from 'clsx'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full px-4 py-2 rounded-lg border border-gray-300',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'placeholder:text-gray-400',
          error && 'border-accent focus:ring-accent',
          className
        )}
        {...props}
      />
      {error && <span className="text-sm text-accent">{error}</span>}
    </div>
  )
}
