/**
 * Vendor filter parser + SQL builder for /api/vendors GET.
 *
 * Centralizes the WHERE-clause construction so the list query and the
 * count query can share filter logic without duplication. Before this
 * helper existed (2026-07-21 refactor), the count query re-built the
 * filter list inline, with a comment "keep this in sync with the filter
 * block above" — which was a classic copy-paste smell.
 */

export interface VendorFilters {
  category: string | null
  active: string | null
  withLocation: boolean
  cityId: string | null
  vehicleType: string | null
  bbox: string | null
}

/**
 * Parse filter values from URLSearchParams.
 * Returns plain values (already coerced) for use in buildVendorWhereClause.
 */
export function parseVendorFilters(searchParams: URLSearchParams): VendorFilters {
  return {
    category: searchParams.get('category'),
    active: searchParams.get('active'),
    withLocation: searchParams.get('withLocation') === 'true',
    cityId: searchParams.get('cityId'),
    vehicleType: searchParams.get('vehicleType'),
    bbox: searchParams.get('bbox'),
  }
}

interface WhereClause {
  /** SQL fragment starting with " AND ..." — concatenate after "WHERE 1=1". */
  where: string
  /** Positional params matching the `$N` placeholders in `where`. */
  args: unknown[]
}

/**
 * Build a WHERE clause fragment from vendor filters.
 *
 * Returns the fragment WITH a leading " AND" so it can be appended to
 * "WHERE 1=1" safely (returns "" if no filters apply, which still parses).
 *
 * @param filters  parsed filter values
 * @param startAt  the `$N` number to start placeholders at (defaults to 1).
 *                 Use a higher number when concatenating after other
 *                 placeholders in the same query.
 */
export function buildVendorWhereClause(filters: VendorFilters, startAt = 1): WhereClause {
  const w: string[] = []
  const a: unknown[] = []
  let i = startAt

  if (filters.category) {
    w.push(`AND v.category = $${i}`)
    a.push(filters.category)
    i++
  }
  if (filters.active === 'true') {
    w.push(`AND v.is_active = true`)
  }
  if (filters.withLocation) {
    w.push(`AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL`)
  }
  if (filters.cityId) {
    w.push(`AND v.city_id = $${i}`)
    a.push(filters.cityId)
    i++
  }
  if (filters.vehicleType) {
    w.push(`AND v.vehicle_type = $${i}`)
    a.push(filters.vehicleType)
    i++
  }
  if (filters.bbox) {
    const parts = filters.bbox.split(',').map(Number)
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLat, minLng, maxLat, maxLng] = parts
      if (minLat <= maxLat && minLng <= maxLng) {
        a.push(minLat, maxLat, minLng, maxLng)
        const base = i + (a.length - 4) // placeholder index for first bbox param
        w.push(`AND v.latitude BETWEEN $${base} AND $${base + 1}`)
        w.push(`AND v.longitude BETWEEN $${base + 2} AND $${base + 3}`)
      }
    }
  }
  return { where: w.join(' '), args: a }
}
