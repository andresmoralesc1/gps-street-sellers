import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import pool from '@/lib/db'

/**
 * POST /api/notifications/mark-all-read
 *
 * Marks every unread notification for the calling user as read in a single
 * UPDATE. Cheaper than PATCH /api/notifications/[id] in a loop (one round-trip
 * vs N), and avoids the "click → 1 → click → 1" client-side N+1 that the audit
 * flagged. Body is ignored.
 *
 * Auth: required.
 */
export async function POST(req: NextRequest) {
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

  try {
    // user_id on notifications is the profile id, not users.id. The owner
    // check resolves users.id → profiles.id in the WHERE.
    const result = await pool.query(
      `UPDATE notifications
       SET read = TRUE
       WHERE read = FALSE
         AND user_id IN (SELECT id FROM profiles WHERE user_id = $1)
       RETURNING id`,
      [decoded.userId]
    )

    return NextResponse.json({ updated: result.rowCount ?? result.rows.length })
  } catch (err) {
    console.error('mark-all-read error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
