import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS || ''

function verifyToken(token: string): { userId: string; role: string; tokenVersion: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; tokenVersion: number }
  } catch {
    if (!JWT_SECRET_PREVIOUS) return null
    try {
      return jwt.verify(token, JWT_SECRET_PREVIOUS) as { userId: string; role: string; tokenVersion: number }
    } catch {
      return null
    }
  }
}

function getTokenFromRequest(req: NextRequest): string | null {
  // Try Authorization header first
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  // Fall back to cookie
  const cookies = req.cookies.getAll()
  const tokenCookie = cookies.find((c) => c.name === 'token')
  return tokenCookie?.value || null
}

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

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    // Verify token hasn't been revoked
    const profileResult = await pool.query(
      'SELECT token_version FROM profiles WHERE user_id = $1',
      [decoded.userId]
    )
    if (profileResult.rows.length > 0 && decoded.tokenVersion !== profileResult.rows[0].token_version) {
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
    // Accept Authorization header OR cookie token
    let token: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else {
      token = req.cookies.get('token')?.value || null
    }

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch {
      if (JWT_SECRET_PREVIOUS) {
        try {
          decoded = jwt.verify(token, JWT_SECRET_PREVIOUS)
        } catch {
          return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
      }
    }

    const profileResult = await pool.query(
      'SELECT token_version FROM profiles WHERE user_id = $1',
      [decoded.userId]
    )
    if (profileResult.rows.length > 0 && decoded.tokenVersion !== profileResult.rows[0].token_version) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }

    const { role, name, phone, cityId } = await req.json()

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`)
      values.push(role)
    }
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
