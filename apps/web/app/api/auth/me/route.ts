import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { isTokenRevoked } from '@/lib/auth-db'
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
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    if (await isTokenRevoked(decoded.userId, decoded.tokenVersion)) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }

    const user = await getUserFromDb(decoded.userId)
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    return NextResponse.json(user)
  } catch (err) {
    console.error('GET /api/auth/me error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/auth/me — update user profile (name, phone, cityId)
export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    if (await isTokenRevoked(decoded.userId, decoded.tokenVersion)) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }

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

    values.push(decoded.userId)
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
    console.error('PATCH /api/auth/me error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}