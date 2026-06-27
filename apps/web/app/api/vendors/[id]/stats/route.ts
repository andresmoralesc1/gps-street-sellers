import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('token')?.value || null
}

// GET /api/vendors/[id]/stats — owner-only vendor stats
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getToken(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let userId: string
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      userId = decoded.userId
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const vendorId = params.id

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
      [vendorId, userId]
    )
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 })
    }

    // Count orders for this vendor
    const ordersResult = await pool.query(
      `SELECT COUNT(*) as total FROM orders WHERE vendor_id = $1 AND status != 'cancelled'`,
      [vendorId]
    )

    // Views today
    const viewsTodayResult = await pool.query(
      `SELECT COUNT(*) as total FROM vendor_views
       WHERE vendor_id = $1 AND DATE(viewed_at) = CURRENT_DATE`,
      [vendorId]
    )

    return NextResponse.json({
      viewsToday: parseInt(viewsTodayResult.rows[0]?.total ?? '0', 10),
      totalOrders: parseInt(ordersResult.rows[0]?.total ?? '0', 10),
    })
  } catch (err) {
    console.error('Vendor stats error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
