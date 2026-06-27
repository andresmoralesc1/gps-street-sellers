import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'


// POST /api/reviews — submit a review (buyer only)
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    if (decoded.role !== 'buyer') {
      return NextResponse.json({ error: 'Solo compradores pueden dejar reseñas' }, { status: 403 })
    }

    const body = await req.json()
    const vendor_id = body.vendor_id || body.vendorId
    const { rating, comment, author_name } = body

    if (!vendor_id || !rating || !comment) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating debe ser entre 1 y 5' }, { status: 400 })
    }

    // Get buyer name from profile
    let name = author_name || 'Cliente anónimo'
    if (!author_name) {
      const profileResult = await pool.query(
        'SELECT name FROM profiles WHERE user_id = $1',
        [decoded.userId]
      )
      if (profileResult.rows.length > 0 && profileResult.rows[0].name) {
        name = profileResult.rows[0].name
      }
    }

    const result = await pool.query(
      `INSERT INTO reviews (vendor_id, author_name, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [vendor_id, name, rating, comment]
    )

    // Update vendor's rating cache
    const stats = await pool.query(
      'SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as count FROM reviews WHERE vendor_id = $1',
      [vendor_id]
    )
    if (stats.rows.length > 0) {
      await pool.query(
        'UPDATE vendors SET rating = $1, review_count = $2 WHERE id = $3',
        [stats.rows[0].avg_rating, stats.rows[0].count, vendor_id]
      )
    }

    return NextResponse.json({ review: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('Reviews POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// GET /api/reviews?vendorId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')

    let query = 'SELECT * FROM reviews WHERE 1=1'
    const params: any[] = []

    if (vendorId) {
      params.push(vendorId)
      query += ` AND vendor_id = $${params.length}`
    }

    query += ' ORDER BY created_at DESC LIMIT 50'

    const result = await pool.query(query, params)
    return NextResponse.json({ reviews: result.rows })
  } catch (err) {
    console.error('Reviews GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
