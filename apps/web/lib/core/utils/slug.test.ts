/**
 * Tests for lib/core/utils/slug.ts
 *
 * Slug helpers used to build SEO-friendly vendor URLs
 * (`/vendor/frutas-don-jaime-cali`) and to distinguish them
 * from legacy UUID links.
 */
import { describe, expect, test } from 'vitest'
import { isUuid, slugify, vendorSlug } from './slug'

describe('isUuid', () => {
  test('accepts a canonical UUID', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  test('accepts uppercase UUIDs', () => {
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  test('rejects a vendor slug', () => {
    expect(isUuid('frutas-don-jaime-cali')).toBe(false)
  })

  test('rejects a string that just looks similar', () => {
    expect(isUuid('550e8400e29b41d4a716446655440000')).toBe(false) // no dashes
    expect(isUuid('550e8400-e29b-41d4-a716')).toBe(false) // too short
  })
})

describe('slugify', () => {
  test('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Frutas Don Jaime')).toBe('frutas-don-jaime')
  })

  test('strips Spanish diacritics', () => {
    expect(slugify('Arepas La Caleña')).toBe('arepas-la-calena')
  })

  test('drops ampersand and other punctuation', () => {
    expect(slugify('Ropa & Accesorios!!!')).toBe('ropa-accesorios')
  })

  test('collapses repeated dashes', () => {
    expect(slugify('foo---bar')).toBe('foo-bar')
    expect(slugify('foo - bar')).toBe('foo-bar')
  })

  test('trims leading and trailing whitespace', () => {
    expect(slugify('  frutas  ')).toBe('frutas')
  })
})

describe('vendorSlug', () => {
  test('joins name and city with a dash', () => {
    expect(vendorSlug({ name: 'Frutas Don Jaime', cityId: 'cali' }))
      .toBe('frutas-don-jaime-cali')
  })

  test('falls back to "vendedor" when name slugifies to empty', () => {
    expect(vendorSlug({ name: '!!!', cityId: 'cali' })).toBe('vendedor-cali')
  })

  test('omits city suffix when cityId is null or empty', () => {
    expect(vendorSlug({ name: 'Frutas Don Jaime', cityId: null }))
      .toBe('frutas-don-jaime')
    expect(vendorSlug({ name: 'Frutas Don Jaime', cityId: undefined }))
      .toBe('frutas-don-jaime')
    expect(vendorSlug({ name: 'Frutas Don Jaime', cityId: '' }))
      .toBe('frutas-don-jaime')
  })
})