import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'


// PATCH /api/notifications/[id] — mark as read
type RouteContext = { params: Promise<{ id: string }> }
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: notifId } = await context.params

    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    if (!notifId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }
    // Defense: reject non-UUID up front so we never hit a 22P02 from PG.
    if (!/^[0-9a-f-]{36}$/i.test(notifId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Verify ownership
    const check = await pool.query(
      `SELECT id FROM notifications
       WHERE id = $1 AND user_id IN (SELECT id FROM profiles WHERE user_id = $2)`,
      [notifId, auth.userId]
    )

    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 })
    }

    const { read } = await req.json()
    const result = await pool.query(
      'UPDATE notifications SET read = $1 WHERE id = $2 RETURNING *',
      [read !== undefined ? read : true, notifId]
    )

    return NextResponse.json({ notification: result.rows[0] })
  } catch (err) {
    logger.error(serializeErr(err), 'Notifications PATCH error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
