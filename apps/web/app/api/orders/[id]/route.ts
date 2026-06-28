import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'


// GET /api/orders/[id] — buyer or vendor of this order only
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let userId: string
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    userId = decoded.userId

    // Get user's profile to check role
    const profileRes = await pool.query(
      'SELECT id, role FROM profiles WHERE user_id = $1',
      [userId]
    )
    if (profileRes.rows.length === 0) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }
    const profile = profileRes.rows[0]

    // Get order and verify ownership
    const orderRes = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [params.id]
    )
    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }
    const order = orderRes.rows[0]

    // Verify buyer or vendor of this order
    const isBuyer = order.buyer_id === profile.id
    const isVendor = order.vendor_id
      ? await pool.query(
          'SELECT id FROM vendors WHERE id = $1 AND profile_id = $2',
          [order.vendor_id, profile.id]
        ).then(r => r.rows.length > 0)
      : false

    if (!isBuyer && !isVendor) {
      return NextResponse.json({ error: 'No tienes acceso a esta orden' }, { status: 403 })
    }

    const itemsResult = await pool.query(
      'SELECT oi.*, pr.name as product_name FROM order_items oi JOIN products pr ON oi.product_id = pr.id WHERE oi.order_id = $1',
      [order.id]
    )

    return NextResponse.json({ order: { ...order, items: itemsResult.rows } })
  } catch (err) {
    console.error('Order GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/orders/[id] — vendor of this order can update status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let userId: string
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    userId = decoded.userId

    const profileRes = await pool.query(
      'SELECT id, role FROM profiles WHERE user_id = $1',
      [userId]
    )
    if (profileRes.rows.length === 0) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }
    const profile = profileRes.rows[0]

    const { status } = await req.json()

    if (!['pending', 'accepted', 'ready', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    // Verify vendor owns this order
    const orderRes = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [params.id]
    )
    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }
    const order = orderRes.rows[0]

    const vendorCheck = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND profile_id = $2',
      [order.vendor_id, profile.id]
    )
    if (vendorCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Solo el vendedor puede cambiar el estado' }, { status: 403 })
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, params.id]
    )

    return NextResponse.json({ order: result.rows[0] })
  } catch (err) {
    console.error('Order PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
