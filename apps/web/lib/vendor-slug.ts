import type { Pool, PoolClient } from 'pg'

/**
 * Generate a unique slug for a vendor.
 *
 * Normalizes the business name (lowercase, strip diacritics, drop
 * punctuation, collapse dashes) and appends the city id. If the base
 * slug is already taken, tries with -2, -3, ... up to -99.
 *
 * Exported so it can be reused from any code path that creates a vendor
 * (e.g. the seller auto-bootstrap inside POST /api/auth/register).
 * Before this extraction the helper was a private function in
 * /api/vendors/route.ts which made it impossible to reuse from the
 * register flow without dragging the whole route module into the auth
 * bundle.
 *
 * Accepts either a `Pool` (for top-level queries) or a `PoolClient`
 * (for use inside a BEGIN/COMMIT transaction) so callers don't have
 * to acquire a dedicated client when they don't already have one.
 */
type Queryable = Pick<PoolClient, 'query'>

export async function generateUniqueSlug(
  executor: Queryable,
  name: string,
  cityId: string | null
): Promise<string> {
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
      .replace(/[^a-z0-9\s-]/g, '')     // drop punctuation
      .trim()
      .replace(/\s+/g, '-')              // spaces → dashes
      .replace(/-+/g, '-')               // collapse multiple dashes
      .replace(/^-|-$/g, '')             // trim leading/trailing dashes
      .slice(0, 60)                      // safety bound

  const base = slugify(name) || 'puesto'
  const withCity = cityId ? `${base}-${slugify(cityId)}` : base

  // Try base, then -2, -3, ... up to -99.
  for (let i = 1; i < 100; i++) {
    const candidate = i === 1 ? withCity : `${withCity}-${i}`
    const r = await executor.query('SELECT 1 FROM vendors WHERE slug = $1 LIMIT 1', [candidate])
    if (r.rows.length === 0) return candidate
  }

  // 99 collisions is astronomically unlikely — fall back to a timestamped
  // slug so we never crash the register flow.
  return `${withCity}-${Date.now()}`
}
