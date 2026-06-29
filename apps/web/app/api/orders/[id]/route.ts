import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { notify } from '@/lib/push'


// GET /api/orders/[id] — buyer or vendor of this order only
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise

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
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise

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
    const updatedOrder = result.rows[0]

    // Push notification to the buyer when the order status changes.
    // Buyer-facing messages only — cancellation/acceptance/ready/completed.
    const STATUS_MESSAGES: Record<string, { title: string; body: string; url: string }> = {
      accepted: {
        title: '✅ Pedido aceptado',
        body: 'Tu vendedor aceptó tu pedido. Te avisaremos cuando esté listo.',
        url: '/orders',
      },
      ready: {
        title: '🎉 Pedido listo',
        body: 'Tu pedido está listo para recoger. ¡Pasa por él!',
        url: '/orders',
      },
      completed: {
        title: '✓ Pedido completado',
        body: 'Tu pedido fue entregado. ¡Gracias por usar BarrioTech!',
        url: '/orders',
      },
      cancelled: {
        title: '✗ Pedido cancelado',
        body: 'Tu vendedor canceló tu pedido.',
        url: '/orders',
      },
    }

    const message = STATUS_MESSAGES[status]
    if (message) {
      // Resolve buyer.users_id from order.buyer_id (FK to profiles.id).
      const buyerRes = await pool.query(
        'SELECT user_id FROM profiles WHERE id = $1',
        [updatedOrder.buyer_id]
      )
      if (buyerRes.rows.length > 0) {
        // Fire-and-forget — push failures must not fail the order update.
        void notify(buyerRes.rows[0].user_id, message).catch((err) => {
          console.error('[orders] push notify failed:', err)
        })
      }
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (err) {
    console.error('Order PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
