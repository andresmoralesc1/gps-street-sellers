import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS || ''

function verifyToken(token: string): { userId: string; role: string; tokenVersion: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; tokenVersion: number }
  } catch {
    if (!JWT_SECRET_PREVIOUS) return null
    try {
      return jwt.verify(token, JWT_SECRET_PREVIOUS) as { userId: string; role: string; tokenVersion: number }
    } catch {
      return null
    }
  }
}

function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  const cookies = req.cookies.getAll()
  const tokenCookie = cookies.find((c) => c.name === 'token')
  return tokenCookie?.value || null
}

// POST /api/favorites — add a vendor to favorites
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const profileResult = await pool.query(
      'SELECT token_version FROM profiles WHERE user_id = $1',
      [decoded.userId]
    )
    if (profileResult.rows.length > 0 && decoded.tokenVersion !== profileResult.rows[0].token_version) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }

    const { vendorId } = await req.json()
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId requerido' }, { status: 400 })
    }

    const profileIdRes = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [decoded.userId])
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
    console.error('Favorites POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET /api/favorites — returns user's favorite vendors
export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    // Verify token hasn't been revoked
    const profileResult = await pool.query(
      'SELECT token_version FROM profiles WHERE user_id = $1',
      [decoded.userId]
    )
    if (profileResult.rows.length > 0 && decoded.tokenVersion !== profileResult.rows[0].token_version) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }

    const result = await pool.query(
      `SELECT f.id, f.vendor_id, v.name as vendor_name, v.category, v.photo_url as image_url,
              v.rating_avg, v.review_count
       FROM favorites f
       JOIN vendors v ON f.vendor_id = v.id
       JOIN profiles pr ON f.buyer_id = pr.id
       WHERE pr.user_id = $1
       ORDER BY f.created_at DESC`,
      [decoded.userId]
    )

    const favorites = result.rows.map((row) => ({
      id: row.id,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      category: row.category,
      imageUrl: row.image_url,
      ratingAvg: parseFloat(row.rating_avg) || 0,
      reviewCount: row.review_count || 0,
    }))

    return NextResponse.json({ favorites })
  } catch (err) {
    console.error('Favorites GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/favorites?productId=X — removes a favorite
export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    // Verify token hasn't been revoked
    const profileResult = await pool.query(
      'SELECT token_version FROM profiles WHERE user_id = $1',
      [decoded.userId]
    )
    if (profileResult.rows.length > 0 && decoded.tokenVersion !== profileResult.rows[0].token_version) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId requerido' }, { status: 400 })
    }

    const profileIdRes = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [decoded.userId])
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
    console.error('Favorites DELETE error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
