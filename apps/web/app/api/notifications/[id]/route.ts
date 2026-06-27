import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import pool from '@/lib/db'


// PATCH /api/notifications/[id] — mark as read
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const notifId = searchParams.get('id')

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

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    if (!notifId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Verify ownership
    const check = await pool.query(
      `SELECT id FROM notifications
       WHERE id = $1 AND user_id IN (SELECT id FROM profiles WHERE user_id = $2)`,
      [notifId, decoded.userId]
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
    console.error('Notifications PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
