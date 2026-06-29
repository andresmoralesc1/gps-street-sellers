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
    query += ' LIMIT 500'

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

    const adsResult = await pool.query(adsQuery, adsParams)
    const ads = adsResult.rows.map((a) => ({
      id: a.id,
      brandName: a.brand_name,
      imageUrl: a.image_url,
      targetUrl: a.target_url,
    }))

    const sponsoredCount = vendors.filter((v) => v.isSponsored).length

    return NextResponse.json({
      vendors,
      ads,
      sponsoredCount,
      totalCount: vendors.length,
    })
  } catch (err) {
    console.error('Vendors GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Pool import — kept at the bottom so the hot code reads top-down.
import pool from '@/lib/db'