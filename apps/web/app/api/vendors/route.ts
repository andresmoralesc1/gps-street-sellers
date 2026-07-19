import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { isOpenNow } from '@/lib/business-hours'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'

// Public: GET /api/vendors
//
// Query params:
//   category       filter by category id
//   active=true    only vendors currently streaming GPS
//   withLocation   only vendors with lat/lng
//   cityId         filter by city
//   vehicleType    filter by vehicle type (bicicleta|moto|carro|pie|triciclo|otro)
//   bbox=lat1,lng1,lat2,lng2   bounding box for map view (minLat,minLng,maxLat,maxLng)
//
// Sponsored vendors (active sponsorships) are returned FIRST.
// Response shape: { vendors: [...], ads: [...], sponsoredCount, totalCount }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const active = searchParams.get('active')
    const withLocation = searchParams.get('withLocation') === 'true'
    const cityId = searchParams.get('cityId')
    const vehicleType = searchParams.get('vehicleType')
    const bbox = searchParams.get('bbox')

    // Pagination — capped at 500 to keep the map query bounded.
    // Default 200 is what the map page typically renders in a single viewport.
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 500)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    // Build filter against the view (so we get is_sponsored for free)
    let query = `
      SELECT v.*, c.label AS category_label
      FROM vendors_with_sponsorship v
      LEFT JOIN categories c ON v.category = c.id
      WHERE 1=1
    `
    const params: any[] = []

    if (category) {
      params.push(category)
      query += ` AND v.category = $${params.length}`
    }

    if (active === 'true') {
      query += ' AND v.is_active = true'
    }

    if (withLocation) {
      query += ' AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL'
    }

    if (cityId) {
      params.push(cityId)
      query += ` AND v.city_id = $${params.length}`
    }

    if (vehicleType) {
      params.push(vehicleType)
      query += ` AND v.vehicle_type = $${params.length}`
    }

    // Bounding box filter for the map viewport
    if (bbox) {
      const parts = bbox.split(',').map(Number)
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const [minLat, minLng, maxLat, maxLng] = parts
        if (minLat <= maxLat && minLng <= maxLng) {
          params.push(minLat, maxLat, minLng, maxLng)
          const base = params.length - 3
          query += ` AND v.latitude BETWEEN $${base} AND $${base + 1}`
          query += ` AND v.longitude BETWEEN $${base + 2} AND $${base + 3}`
        }
      }
    }

    // Sponsored first, then by most recent activity
    query += ' ORDER BY v.is_sponsored DESC, COALESCE(v.location_updated_at, v.created_at) DESC'
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await pool.query(query, params)
    // ads is a VIEW (see migrations/014_ads_view_and_seed.sql) backed by
    // ad_campaigns. Window filter is applied here, not in the view, so admin
    // tooling can still SELECT paused/expired rows.
    const adsResult = await pool.query(`
      SELECT id, brand_name, image_url, target_url
      FROM ads
      WHERE is_active = true
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
      ORDER BY priority DESC, created_at DESC
      LIMIT 5
    `)
    const ads = adsResult.rows.map((a) => ({
      id: a.id,
      brandName: a.brand_name,
      imageUrl: a.image_url,
      targetUrl: a.target_url,
    }))

    // Strip phone unless viewer is owner (phone leak fix)
    const viewerId = (await resolveViewerId(req)) || null
    const vendors = result.rows.map((v) => {
      const isOwner = viewerId && v.profile_id === viewerId
      return {
        id: v.id,
        name: v.name,
        slug: v.slug,
        description: v.description,
        category: v.category,
        categoryLabel: v.category_label,
        latitude: v.latitude,
        longitude: v.longitude,
        isActive: v.is_active,
        isVerified: v.is_verified,
        rating: v.rating,
        reviewCount: v.review_count,
        photoUrl: v.photo_url,
        cityId: v.city_id,
        vehicleType: v.vehicle_type,
        vehiclePhotoUrl: v.vehicle_photo_url,
        businessHoursEnabled: v.business_hours_enabled,
        businessHoursStart: v.business_hours_start,
        businessHoursEnd: v.business_hours_end,
        businessDays: v.business_days,
        stationType: v.station_type,
        isSponsored: v.is_sponsored,
        isOpenNow: isOpenNow(
          v.business_hours_start,
          v.business_hours_end,
          v.business_days,
        ),
        ...(isOwner ? { phone: v.phone } : {}),
      }
    })

    // Build total count by stripping LIMIT/OFFSET and counting with same filters
    const buildWhere = (n: (i: number) => string) => {
      const w: string[] = []
      const a: any[] = []
      const baseParams = params.slice(0, params.length - 2)
      // Rebuild WHERE clauses that match the above — keep this in sync with the
      // filter block above. Limit/Offset are stripped.
      let i = 1
      if (category) { w.push(`AND v.category = ${n(i)}`); a.push(category); i++ }
      if (active === 'true') { w.push(`AND v.is_active = true`) }
      if (withLocation) { w.push(`AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL`) }
      if (cityId) { w.push(`AND v.city_id = ${n(i)}`); a.push(cityId); i++ }
      if (vehicleType) { w.push(`AND v.vehicle_type = ${n(i)}`); a.push(vehicleType); i++ }
      if (bbox) {
        const parts = bbox.split(',').map(Number)
        if (parts.length === 4 && parts.every((num) => Number.isFinite(num))) {
          const [minLat, minLng, maxLat, maxLng] = parts
          if (minLat <= maxLat && minLng <= maxLng) {
            a.push(minLat, maxLat, minLng, maxLng)
            const base = a.length - 3
            w.push(`AND v.latitude BETWEEN ${n(base)} AND ${n(base + 1)}`)
            w.push(`AND v.longitude BETWEEN ${n(base + 2)} AND ${n(base + 3)}`)
          }
        }
      }
      return { where: w.join(' '), args: a }
    }
    const { where: countWhere, args: countArgs } = buildWhere((n) => `$${n}`)
    // WHERE 1=1 prefix — matches the main query above so `countWhere` (which
    // starts with "AND ...") parses correctly. Without this, the count query
    // throws "syntax error at or near AND" on every GET with active/category/etc.
    const totalCountResult = await pool.query(
      `SELECT COUNT(*)::int AS n FROM vendors_with_sponsorship v WHERE 1=1 ${countWhere}`,
      countArgs
    )

    const sponsoredCount = vendors.filter((v) => v.isSponsored).length

    return NextResponse.json(
      {
        vendors,
        ads,
        sponsoredCount,
        totalCount: totalCountResult.rows[0]?.n ?? vendors.length,
        limit,
        offset,
      },
      {
        // Public listing is cheap to cache; CDNs/edge can serve 60s + SWR 5min.
        // Phone leak was fixed by the per-field check in the GET above.
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300' },
      }
    )
  } catch (err) {
    logger.error(serializeErr(err), 'Vendors GET error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/vendors — create a new vendor owned by the authenticated seller.
 *
 * Auth: seller or admin (requireAuth). Returns 403 for buyers, 401 for anonymous.
 *
 * Body (all required unless marked optional):
 *   {
 *     name:           string (1..80 chars, trimmed)
 *     category:       one of categories.id (server-side validated)
 *     station_type:   'fixed' | 'mobile'  (default: 'mobile')
 *     description?:   string (max 500 chars)
 *     city_id?:       string (cities.id)  — optional but encouraged
 *     phone?:         string (digits, optional — surfaced to buyer map only
 *                                 for the vendor owner)
 *     latitude?:      number (-90..90)
 *     longitude?:     number (-180..180)
 *   }
 *
 * Behavior:
 *   - Resolves the caller's profile_id (vendors.profile_id FKs to profiles.id).
 *   - If the user already owns at least one vendor, returns 409 Conflict (each
 *     seller manages one storefront; multi-vendor is a separate decision and
 *     currently not in scope).
 *   - Generates slug from name + city_id (lowercase, dash-separated, deduped
 *     with a numeric suffix on collision).
 *   - Inserts as `is_active = false` — the vendor starts hidden and the user
 *     opts in via VendorVisibility toggle. This is intentional: forcing
 *     `is_active = true` on creation produced ghost pins in the past.
 *   - Returns the full vendor row so the client can navigate straight to
 *     the dashboard without an extra round-trip.
 *
 * Why this endpoint was missing:
 *   Migration 009 deleted orphan vendors with `profile_id IS NULL`. The 8
 *   surviving vendors are seed/test data with valid profile_ids. No UI path
 *   existed to create a *new* vendor from a freshly registered seller, so
 *   sellers could register but never convert — funnel conversion 0%.
 *   This endpoint closes that hole.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    // auth.role is 'buyer' | 'seller' per TokenPayload — only sellers create vendors.
    if (auth.role !== 'seller') {
      return NextResponse.json(
        { error: 'Solo vendedores pueden crear un puesto' },
        { status: 403 }
      )
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    // ── Field validation ────────────────────────────────────────────────
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name.length < 1 || name.length > 80) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 1 y 80 caracteres' },
        { status: 400 }
      )
    }

    const category = typeof body.category === 'string' ? body.category.trim() : ''
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [category]
    )
    if (category.length === 0 || categoryCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoría inválida' },
        { status: 400 }
      )
    }

    const stationType = body.station_type ?? 'mobile'
    if (stationType !== 'fixed' && stationType !== 'mobile') {
      return NextResponse.json(
        { error: 'station_type debe ser "fixed" o "mobile"' },
        { status: 400 }
      )
    }

    let description: string | null = null
    if (body.description !== undefined && body.description !== null) {
      if (typeof body.description !== 'string') {
        return NextResponse.json({ error: 'description debe ser texto' }, { status: 400 })
      }
      const trimmed = body.description.trim()
      if (trimmed.length > 500) {
        return NextResponse.json(
          { error: 'description máximo 500 caracteres' },
          { status: 400 }
        )
      }
      description = trimmed.length > 0 ? trimmed : null
    }

    let cityId: string | null = null
    if (body.city_id !== undefined && body.city_id !== null) {
      if (typeof body.city_id !== 'string') {
        return NextResponse.json({ error: 'city_id debe ser texto' }, { status: 400 })
      }
      const cityCheck = await pool.query(
        'SELECT id FROM cities WHERE id = $1',
        [body.city_id]
      )
      if (cityCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Ciudad inválida' },
          { status: 400 }
        )
      }
      cityId = body.city_id
    }

    let phone: string | null = null
    if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
      if (typeof body.phone !== 'string') {
        return NextResponse.json({ error: 'phone debe ser texto' }, { status: 400 })
      }
      const digits = body.phone.replace(/\D/g, '')
      if (digits.length < 7 || digits.length > 15) {
        return NextResponse.json(
          { error: 'phone debe tener entre 7 y 15 dígitos' },
          { status: 400 }
        )
      }
      phone = digits
    }

    let latitude: number | null = null
    let longitude: number | null = null
    if (body.latitude !== undefined && body.latitude !== null) {
      const lat = Number(body.latitude)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json(
          { error: 'latitude debe estar entre -90 y 90' },
          { status: 400 }
        )
      }
      latitude = lat
    }
    if (body.longitude !== undefined && body.longitude !== null) {
      const lng = Number(body.longitude)
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'longitude debe estar entre -180 y 180' },
          { status: 400 }
        )
      }
      longitude = lng
    }
    // Reject partial coordinate pairs (lat without lng or vice versa)
    if ((latitude === null) !== (longitude === null)) {
      return NextResponse.json(
        { error: 'latitude y longitude deben venir juntos o ambos omitirse' },
        { status: 400 }
      )
    }

    // ── Resolve profile ─────────────────────────────────────────────────
    const profileRes = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [auth.userId]
    )
    if (profileRes.rows.length === 0) {
      logger.error(
        { userId: auth.userId },
        'POST /api/vendors: seller has no profile row (data integrity bug)'
      )
      return NextResponse.json(
        { error: 'Perfil no encontrado. Contactá soporte.' },
        { status: 500 }
      )
    }
    const profileId = profileRes.rows[0].id

    // ── Conflict: one vendor per seller (current scope) ─────────────────
    const existing = await pool.query(
      'SELECT id, name FROM vendors WHERE profile_id = $1 LIMIT 1',
      [profileId]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          error: 'Ya tenés un puesto creado',
          vendor: { id: existing.rows[0].id, name: existing.rows[0].name },
        },
        { status: 409 }
      )
    }

    // ── Slug generation ─────────────────────────────────────────────────
    const slug = await generateUniqueSlug(name, cityId)

    // ── Insert ──────────────────────────────────────────────────────────
    const insertSql = `
      INSERT INTO vendors (
        profile_id, name, slug, category, description,
        city_id, latitude, longitude, station_type,
        phone, is_active, is_verified, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, false, NOW())
      RETURNING id, profile_id, name, slug, category, description,
                city_id, latitude, longitude, station_type, phone,
                is_active, is_verified, created_at
    `
    const insertParams = [
      profileId, name, slug, category, description,
      cityId, latitude, longitude, stationType, phone,
    ]
    const result = await pool.query(insertSql, insertParams)
    const v = result.rows[0]

    logger.info(
      { userId: auth.userId, vendorId: v.id, slug: v.slug },
      'vendor.created'
    )

    return NextResponse.json(
      {
        vendor: {
          id: v.id,
          profileId: v.profile_id,
          name: v.name,
          slug: v.slug,
          category: v.category,
          description: v.description,
          cityId: v.city_id,
          latitude: v.latitude,
          longitude: v.longitude,
          stationType: v.station_type,
          phone: v.phone,
          isActive: v.is_active,
          isVerified: v.is_verified,
          createdAt: v.created_at,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    logger.error(serializeErr(err), 'Vendors POST error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Resolve the viewer's profile_id from a token, if present. Used by GET to
 * gate the `phone` field. Returns null when unauthenticated or buyer-only.
 */
async function resolveViewerId(req: NextRequest): Promise<string | null> {
  const { getTokenFromRequest } = await import('@/lib/auth-edge')
  const token = getTokenFromRequest(req)
  if (!token) return null
  try {
    const { verifyTokenEdge } = await import('@/lib/auth-edge')
    const decoded = await verifyTokenEdge(token)
    if (!decoded) return null
    const r = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [decoded.userId])
    return r.rows[0]?.id ?? null
  } catch {
    return null
  }
}

/**
 * Generate a URL-safe slug from a vendor name. Collisions get a numeric suffix.
 *
 * Examples:
 *   "Arepas La Caleña" + city "cali" → "arepas-la-calena-cali"
 *   "Arepas La Caleña" (no city)     → "arepas-la-calena"
 *
 * If the base slug is taken, append -2, -3, ... until unique.
 */
async function generateUniqueSlug(name: string, cityId: string | null): Promise<string> {
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
    const r = await pool.query('SELECT 1 FROM vendors WHERE slug = $1 LIMIT 1', [candidate])
    if (r.rows.length === 0) return candidate
  }
  // Fallback to random suffix (should be unreachable for any realistic scale).
  return `${withCity}-${Date.now().toString(36)}`
}
