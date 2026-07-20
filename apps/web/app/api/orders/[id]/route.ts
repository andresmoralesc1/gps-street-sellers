import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'
import { notify } from '@/lib/push'


// PATCH /api/orders/[id] — change order status (vendor only)
//
// The handler was historically exported as GET (Next.js convention is
// GET=read / PATCH=update). The single handler does an UPDATE so we rename
// the export to PATCH to match the verb — callers hitting GET will now get
// the proper 405 instead of a confusing 500 from a body parse failure.
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise

  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

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
          logger.error(serializeErr(err), '[orders] push notify failed:')
        })
      }
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (err) {
    logger.error(serializeErr(err), 'Order PATCH error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
