import { NextRequest, NextResponse } from 'next/server'

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

    if (bbox) {
      const parts = bbox.split(',').map(Number)
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const [minLat, minLng, maxLat, maxLng] = parts
        params.push(minLat, maxLat, minLng, maxLng)
        query += ` AND v.latitude BETWEEN $${params.length - 3} AND $${params.length - 2}`
        query += ` AND v.longitude BETWEEN $${params.length - 1} AND $${params.length}`
      }
    }

    // Sponsored first, then most recent location update, then created_at.
    // NULLS LAST so unsponsored vendors sort naturally below sponsored.
    query += ' ORDER BY v.is_sponsored DESC NULLS LAST, v.location_updated_at DESC NULLS LAST, v.created_at DESC'

    // Reasonable cap — the map view only shows what's in the visible bbox anyway.
    query += ` LIMIT ${limit} OFFSET ${offset}`

    const result = await pool.query(query, params)

    const vendors = result.rows.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      category: v.category,
      categoryLabel: v.category_label,
      description: v.description,
      photoUrl: v.photo_url,
      vehicleType: v.vehicle_type,
      vehiclePhotoUrl: v.vehicle_photo_url,
      isActive: v.is_active,
      isVerified: v.is_verified || false,
      isSponsored: v.is_sponsored || false,
      sponsoredUntil: v.sponsored_until,
      ratingAvg: parseFloat(v.rating) || 0,
      reviewCount: v.review_count || 0,
      createdAt: v.created_at,
      latitude: v.latitude,
      longitude: v.longitude,
      cityId: v.city_id,
      locationUpdatedAt: v.location_updated_at,
    }))

    // Pull active ad campaigns for this city/category context.
    // Ads are independent of vendors — they're a separate revenue stream.
    let adsQuery = `
      SELECT id, brand_name, image_url, target_url, target_city_id, target_category
      FROM ad_campaigns
      WHERE status = 'active'
        AND NOW() BETWEEN starts_at AND ends_at
    `
    const adsParams: any[] = []
    if (cityId) {
      adsParams.push(cityId)
      adsQuery += ` AND (target_city_id IS NULL OR target_city_id = $${adsParams.length})`
    } else {
      adsQuery += ' AND target_city_id IS NULL'
    }
    if (category) {
      adsParams.push(category)
      adsQuery += ` AND (target_category IS NULL OR target_category = $${adsParams.length})`
    } else {
      adsQuery += ' AND target_category IS NULL'
    }
    adsQuery += ' ORDER BY created_at DESC LIMIT 5'

    // Run vendor query + count + ads in parallel — saves 2 round-trips.
    // Both queries share the same filter, so we duplicate the WHERE clause.
    const buildWhere = (placeholder: (n: number) => string): { where: string; args: any[] } => {
      const w: string[] = ['WHERE 1=1']
      const a: any[] = []
      const p = (v: any) => { a.push(v); return `$${a.length}` }
      if (category) w.push(`AND v.category = ${p(category)}`)
      if (active === 'true') w.push('AND v.is_active = true')
      if (withLocation) w.push('AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL')
      if (cityId) w.push(`AND v.city_id = ${p(cityId)}`)
      if (vehicleType) w.push(`AND v.vehicle_type = ${p(vehicleType)}`)
      if (bbox) {
        const parts = bbox.split(',').map(Number)
        if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
          const [minLat, minLng, maxLat, maxLng] = parts
          a.push(minLat, maxLat, minLng, maxLng)
          const base = a.length - 3
          w.push(`AND v.latitude BETWEEN $${base} AND $${base + 1}`)
          w.push(`AND v.longitude BETWEEN $${base + 2} AND $${base + 3}`)
        }
      }
      return { where: w.join(' '), args: a }
    }
    const { where: countWhere, args: countArgs } = buildWhere((n) => `$${n}`)
    const totalCountResult = await pool.query(
      `SELECT COUNT(*)::int AS n FROM vendors_with_sponsorship v ${countWhere}`,
      countArgs
    )

    const adsResult = await pool.query(adsQuery, adsParams)
    const ads = adsResult.rows.map((a) => ({
      id: a.id,
      brandName: a.brand_name,
      imageUrl: a.image_url,
      targetUrl: a.target_url,
    }))

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
    console.error('Vendors GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Pool import — kept at the bottom so the hot code reads top-down.
import pool from '@/lib/db'