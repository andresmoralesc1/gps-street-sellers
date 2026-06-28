import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'


type RouteContext = {
  params: { id: string }
}

// GET /api/vendors/[id]
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const vendorId = context.params.id

    const vendorResult = await pool.query(
      `SELECT v.*, c.label as category_label
       FROM vendors v
       LEFT JOIN categories c ON v.category = c.id
       WHERE v.id = $1`,
      [vendorId]
    )

    if (vendorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    const vendor = vendorResult.rows[0]

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

    return NextResponse.json({
      vendor: {
        ...vendor,
        rating: avgRating,
        review_count: reviews.length,
      },
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
    const vendorId = context.params.id

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
