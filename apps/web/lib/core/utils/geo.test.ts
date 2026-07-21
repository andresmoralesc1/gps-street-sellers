/**
 * Tests for lib/core/utils/geo.ts
 *
 * Geospatial helpers used by the map page to filter vendors by distance
 * from the buyer's location. If these break, the map shows vendors
 * far away (or hides vendors that are right next to the buyer).
 */
import { describe, expect, test } from 'vitest'
import { calculateDistance, filterByDistance } from './geo'

describe('calculateDistance', () => {
  test('returns 0 for the same point', () => {
    const d = calculateDistance(3.4516, -76.532, 3.4516, -76.532)
    expect(d).toBe(0)
  })

  test('returns a known distance for Cali -> Bogota (~300km)', () => {
    // Cali: 3.4516, -76.5320   Bogota: 4.7110, -74.0721
    // Reference value: ~301 km (great-circle distance)
    const d = calculateDistance(3.4516, -76.532, 4.7110, -74.0721)
    expect(d / 1000).toBeGreaterThan(290)
    expect(d / 1000).toBeLessThan(310)
  })

  test('is symmetric: d(A,B) === d(B,A)', () => {
    const ab = calculateDistance(3.4516, -76.532, 4.7110, -74.0721)
    const ba = calculateDistance(4.7110, -74.0721, 3.4516, -76.532)
    expect(Math.abs(ab - ba)).toBeLessThan(0.01)
  })
})

describe('filterByDistance', () => {
  const vendors = [
    { id: 'near',  lat: 3.4516, lng: -76.5320, name: 'A 0m' },
    { id: 'mid',   lat: 3.4616, lng: -76.5320, name: 'A ~1.1km north' },
    { id: 'far',   lat: 4.7110, lng: -74.0721, name: 'Bogota' },
  ]

  test('keeps only vendors within maxDistance', () => {
    const result = filterByDistance(vendors, 3.4516, -76.532, 2000)
    expect(result.map(v => v.id)).toEqual(['near', 'mid'])
  })

  test('returns empty when maxDistance is 0 and no vendor is at exact same point', () => {
    const result = filterByDistance(
      [{ id: 'a', lat: 3.452, lng: -76.532, name: 'tiny offset' }],
      3.4516,
      -76.532,
      0,
    )
    expect(result).toEqual([])
  })

  test('keeps vendor exactly at the user location with maxDistance=0', () => {
    const result = filterByDistance(
      [{ id: 'a', lat: 3.4516, lng: -76.532, name: 'same point' }],
      3.4516,
      -76.532,
      0,
    )
    expect(result.map(v => v.id)).toEqual(['a'])
  })

  test('does not mutate the input array', () => {
    const before = [...vendors]
    filterByDistance(vendors, 3.4516, -76.532, 2000)
    expect(vendors).toEqual(before)
  })
})