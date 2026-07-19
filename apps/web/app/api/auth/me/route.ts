import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import pool from '@/lib/db'
import { requireAuth } from '@/lib/auth'
async function getUserFromDb(userId: string) {
  const result = await pool.query(
    'SELECT id, email, name, role, phone, city_id, is_active FROM users WHERE id = $1',
    [userId]
  )
  if (result.rows.length === 0) return null
  const u = result.rows[0]
  if (!u.is_active) return null
  return {
    id: u.id,
    email: u.email,
    fullName: u.name || '',
    role: u.role,
    phone: u.phone || '',
    cityId: u.city_id || '',
    avatarUrl: '',
  }
}

// GET /api/auth/me — reads cookie OR Authorization header
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const user = await getUserFromDb(auth.userId)
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    return NextResponse.json(user)
  } catch (err) {
    logger.error(serializeErr(err), 'GET /api/auth/me error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/auth/me — update user profile (name, phone, cityId)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const { name, phone, cityId } = await req.json()

    // SECURITY: 'role' is intentionally NOT updatable here. Role is set once at
    // /api/auth/register and is immutable for the lifetime of the account. To
    // change role, contact support (intentional friction to prevent silent
    // privilege escalation from buyer to seller or vice versa).
    void 0

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(name)
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`)
      values.push(phone)
    }
    if (cityId !== undefined) {
      updates.push(`city_id = $${paramCount++}`)
      values.push(cityId)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    values.push(auth.userId)
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, role, phone, city_id`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const user = result.rows[0]
    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.name,
      role: user.role,
      phone: user.phone || '',
      cityId: user.city_id || '',
      avatarUrl: '',
    })
  } catch (err) {
    logger.error(serializeErr(err), 'PATCH /api/auth/me error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}