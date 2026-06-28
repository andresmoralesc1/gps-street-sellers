import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import pool from '@/lib/db'


// GET /api/notifications — list user notifications
export async function GET(req: NextRequest) {
  try {
    // Accept Authorization header OR cookie token
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

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id IN (SELECT id FROM profiles WHERE user_id = $1)
       ORDER BY created_at DESC
       LIMIT 50`,
      [decoded.userId]
    )

    const unreadResult = await pool.query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id IN (SELECT id FROM profiles WHERE user_id = $1) AND read = false`,
      [decoded.userId]
    )

    return NextResponse.json({
      notifications: result.rows,
      unread_count: parseInt(unreadResult.rows[0].count),
    })
  } catch (err) {
    console.error('Notifications GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
