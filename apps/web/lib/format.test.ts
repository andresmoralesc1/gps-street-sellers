/**
 * Tests for lib/format.ts (formatPrice).
 *
 * The seller dashboard's product preview used to render prices
 * inconsistently: "1500" when price was a string, "1.500" when it was
 * a number. B-005 fix — both shapes now go through formatPrice.
 */
import { describe, expect, test } from 'vitest'
import { formatPrice } from './format'

describe('formatPrice', () => {
  test('formats a number with thousands separator', () => {
    expect(formatPrice(1500)).toBe('$1.500')
  })

  test('parses and formats a numeric string', () => {
    expect(formatPrice('1500')).toBe('$1.500')
  })

  test('handles decimals in a string', () => {
    // es-CO locale uses "," as decimal separator
    expect(formatPrice('1500.5')).toBe('$1.500,5')
  })

  test('returns em-dash for null', () => {
    expect(formatPrice(null)).toBe('—')
  })

  test('returns em-dash for undefined', () => {
    expect(formatPrice(undefined)).toBe('—')
  })

  test('returns em-dash for non-numeric string', () => {
    expect(formatPrice('abc')).toBe('—')
  })

  test('handles small numbers', () => {
    expect(formatPrice(100)).toBe('$100')
  })

  test('handles zero', () => {
    expect(formatPrice(0)).toBe('$0')
  })
})