import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'




// POST /api/favorites — add a vendor to favorites
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)

    if (auth instanceof NextResponse) return auth

    const profileResult = await pool.query(
      'SELECT token_version FROM profiles WHERE user_id = $1',
      [auth.userId]
    )
    const { vendorId } = await req.json()
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId requerido' }, { status: 400 })
    }

    const profileIdRes = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [auth.userId])
    if (profileIdRes.rows.length === 0) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }
    const buyerId = profileIdRes.rows[0].id

    // Upsert — ignore if already exists
    await pool.query(
      `INSERT INTO favorites (buyer_id, vendor_id)
       VALUES ($1, $2)
       ON CONFLICT (buyer_id, vendor_id) DO NOTHING`,
      [buyerId, vendorId]
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    logger.error(serializeErr(err), 'Favorites POST error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET /api/favorites — returns user's favorite vendors
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const profileResult = await pool.query(
      'SELECT token_version FROM profiles WHERE user_id = $1',
      [auth.userId]
    )
    const result = await pool.query(
      `SELECT f.id, f.vendor_id, v.slug as vendor_slug, v.name as vendor_name, v.category, v.photo_url as image_url,
              v.rating, v.review_count
       FROM favorites f
       JOIN vendors v ON f.vendor_id = v.id
       JOIN profiles pr ON f.buyer_id = pr.id
       WHERE pr.user_id = $1
       ORDER BY f.created_at DESC`,
      [auth.userId]
    )

    const favorites = result.rows.map((row) => ({
      id: row.id,
      vendorId: row.vendor_id,
      vendorSlug: row.vendor_slug,
      vendorName: row.vendor_name,
      category: row.category,
      imageUrl: row.image_url,
      ratingAvg: parseFloat(row.rating) || 0,
      reviewCount: row.review_count || 0,
    }))

    return NextResponse.json({ favorites })
  } catch (err) {
    logger.error(serializeErr(err), 'Favorites GET error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/favorites?productId=X — removes a favorite
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const profileResult = await pool.query(
      'SELECT token_version FROM profiles WHERE user_id = $1',
      [auth.userId]
    )
    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId requerido' }, { status: 400 })
    }

    const profileIdRes = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [auth.userId])
    if (profileIdRes.rows.length === 0) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }
    const buyerId = profileIdRes.rows[0].id

    // Delete the favorite
    await pool.query(
      'DELETE FROM favorites WHERE buyer_id = $1 AND vendor_id = $2',
      [buyerId, vendorId]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error(serializeErr(err), 'Favorites DELETE error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
