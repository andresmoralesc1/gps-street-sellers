/**
 * Tests for lib/utils.ts (cn helper).
 *
 * `cn` is the standard Tailwind class merger (clsx). It powers
 * every conditional className in the UI (active state, hover,
 * disabled, etc). Tiny but called everywhere.
 */
import { describe, expect, test } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  test('joins truthy class strings with spaces', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  test('drops falsy values (false, null, undefined)', () => {
    expect(cn('px-4', false && 'hidden', null, undefined, 'py-2')).toBe('px-4 py-2')
  })

  test('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled'))
      .toBe('btn btn-active')
  })

  test('returns empty string when all inputs are falsy', () => {
    expect(cn(false, null, undefined)).toBe('')
  })
})