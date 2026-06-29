/**
 * Slug helpers for human-friendly vendor URLs.
 *
 * Slug format: `{business-name-slugified}-{city-slugified}`
 *   /vendor/frutas-don-jaime-cali
 *
 * Implementation notes:
 *  - Generated on-the-fly from `vendors.name` and `vendors.city_id` (no DB migration).
 *  - Tildes are stripped, lowercased, only `[a-z0-9-]` survive.
 *  - `isUuid()` is the source of truth for distinguishing legacy `/vendor/<uuid>` links
 *    from new slug links (used by the page to issue 301 redirects).
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

/**
 * Convert arbitrary text to a URL-safe slug.
 *
 *   "Frutas Don Jaime"   -> "frutas-don-jaime"
 *   "Arepas La Caleña"   -> "arepas-la-calena"
 *   "Ropa & Accesorios"  -> "ropa-accesorios"
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ') // drop punctuation to spaces
    .trim()
    .replace(/\s+/g, '-') // collapse runs of spaces into single dash
    .replace(/-+/g, '-') // collapse repeated dashes
}

/**
 * Build a vendor's public slug from its business name and city id.
 *
 *   vendorSlug({ name: "Frutas Don Jaime", cityId: "cali" })
 *   -> "frutas-don-jaime-cali"
 */
export function vendorSlug(opts: {
  name: string
  cityId: string | null | undefined
}): string {
  const namePart = slugify(opts.name) || 'vendedor'
  const cityPart = opts.cityId ? slugify(opts.cityId) : ''
  return cityPart ? `${namePart}-${cityPart}` : namePart
}
