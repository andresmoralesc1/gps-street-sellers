import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'


// GET /api/notifications — list user notifications
export async function GET(req: NextRequest) {
  try {
    // Rate limit: 60 reads/min per IP — blocks enumeration/exfiltration.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const { allowed, retryAfter } = await checkRateLimit(ip, 'notifications_read', 60, 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id IN (SELECT id FROM profiles WHERE user_id = $1)
       ORDER BY created_at DESC
       LIMIT 50`,
      [auth.userId]
    )

    const unreadResult = await pool.query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id IN (SELECT id FROM profiles WHERE user_id = $1) AND read = false`,
      [auth.userId]
    )

    return NextResponse.json({
      notifications: result.rows,
      unread_count: parseInt(unreadResult.rows[0].count),
    })
  } catch (err) {
    logger.error(serializeErr(err), 'Notifications GET error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
