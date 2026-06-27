'use client'

import { clsx } from 'clsx'

interface ToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ enabled, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={clsx(
        'relative w-12 h-7 rounded-full transition-colors',
        enabled ? 'bg-secondary' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div
        className={clsx(
          'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-7' : 'translate-x-1'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  )
}
