import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { isUuid } from '@/lib/core/utils/slug'


type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/vendors/[id]
// Accepts either a vendor UUID (legacy) or a human-friendly slug
// (e.g. "frutas-don-jaime-cali"). UUIDs still work for backward-compat.
//
// Slug column is filled by migration 003_vendor_slugs.sql.
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: param } = await context.params
    const isUuidParam = isUuid(param)

    // If the caller is hitting the page (Accept: text/html) with a UUID,
    // 301-redirect to the canonical slug URL. This is what makes the
    // browser URL bar show the slug version when someone pastes a legacy link.
    const accept = req.headers.get('accept') || ''
    if (isUuidParam && accept.includes('text/html')) {
      const slugResult = await pool.query(
        'SELECT slug FROM vendors WHERE id = $1',
        [param]
      )
      const slug = slugResult.rows[0]?.slug
      if (slug) {
        const url = new URL(`/vendor/${slug}`, req.url)
        return NextResponse.redirect(url, 301)
      }
    }

    const vendorResult = await pool.query(
      `SELECT v.*, c.label as category_label
       FROM vendors v
       LEFT JOIN categories c ON v.category = c.id
       WHERE ${isUuidParam ? 'v.id = $1' : 'v.slug = $1'}`,
      [param]
    )

    if (vendorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    const vendor = vendorResult.rows[0]
    const vendorId: string = vendor.id

    // Fetch products
    const productsResult = await pool.query(
      'SELECT * FROM products WHERE vendor_id = $1 ORDER BY created_at DESC',
      [vendorId]
    )

    // Fetch reviews
    const reviewsResult = await pool.query(
      'SELECT * FROM reviews WHERE vendor_id = $1 ORDER BY created_at DESC',
      [vendorId]
    )

    // Track view
    try {
      const token = getTokenFromRequest(req)
      let userId: string | null = null
      if (token) {
        const decoded = await verifyToken(token)
        if (decoded) userId = decoded.userId
      }
      await pool.query(
        'INSERT INTO vendor_views (vendor_id, user_id) VALUES ($1, $2)',
        [vendorId, userId]
      )
    } catch {}

    const reviews = reviewsResult.rows
    const avgRating = reviews.length > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 0

    // Return vendor in camelCase to match /api/vendors (consistency).
    // products and reviews stay snake_case here; the client already maps them
    // to its own Product/Review types on the way in (see VendorDetailClient.tsx).
    const vendorRow = vendorResult.rows[0]
    const camelVendor = {
      id: vendorRow.id,
      slug: vendorRow.slug,
      name: vendorRow.name,
      category: vendorRow.category,
      categoryLabel: vendorRow.category_label,
      description: vendorRow.description,
      phone: vendorRow.phone,
      photoUrl: vendorRow.photo_url,
      vehicleType: vendorRow.vehicle_type,
      vehiclePhotoUrl: vendorRow.vehicle_photo_url,
      isActive: vendorRow.is_active,
      isVerified: vendorRow.is_verified || false,
      isSponsored: vendorRow.is_sponsored || false,
      sponsoredUntil: vendorRow.sponsored_until,
      rating: avgRating,
      reviewCount: reviews.length,
      latitude: vendorRow.latitude,
      longitude: vendorRow.longitude,
      cityId: vendorRow.city_id,
      createdAt: vendorRow.created_at,
      locationUpdatedAt: vendorRow.location_updated_at,
    }

    return NextResponse.json({
      vendor: camelVendor,
      products: productsResult.rows,
      reviews,
    })
  } catch (err) {
    console.error('Vendor GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/vendors/[id] — update vendor profile (owner only)
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: vendorId } = await context.params

    let token: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else {
      token = req.cookies.get('token')?.value || null
    }
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
      [vendorId, decoded.userId]
    )

    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes permiso para editar este perfil' }, { status: 403 })
    }

    const { name, description, category, photo_url, phone, is_active } = await req.json()

    const updates: string[] = []
    const params: any[] = []

    if (name !== undefined) {
      params.push(name)
      updates.push(`name = $${params.length}`)
    }
    if (description !== undefined) {
      params.push(description)
      updates.push(`description = $${params.length}`)
    }
    if (category !== undefined) {
      params.push(category)
      updates.push(`category = $${params.length}`)
    }
    if (photo_url !== undefined) {
      params.push(photo_url)
      updates.push(`photo_url = $${params.length}`)
    }
    if (phone !== undefined) {
      params.push(phone)
      updates.push(`phone = $${params.length}`)
    }
    if (is_active !== undefined) {
      params.push(is_active)
      updates.push(`is_active = $${params.length}`)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    params.push(vendorId)
    const result = await pool.query(
      `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )

    return NextResponse.json({ vendor: result.rows[0] })
  } catch (err) {
    console.error('Vendor PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
