import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { isTokenRevoked } from '@/lib/auth-db'
import pool from '@/lib/db'

/**
 * POST /api/auth/role-select
 *
 * Sets the user's role ONCE during onboarding (when current role is null).
 * Returns 409 if the user already has a role set — role changes after
 * onboarding are intentionally blocked here to prevent privilege escalation.
 *
 * Body: { role: 'buyer' | 'seller' }
 * Response: { user: { id, email, name, role, phone, cityId } }
 */
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    if (await isTokenRevoked(decoded.userId, decoded.tokenVersion)) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }

    const { role } = await req.json()
    if (role !== 'buyer' && role !== 'seller') {
      return NextResponse.json(
        { error: 'Rol inválido. Debe ser "buyer" o "seller".' },
        { status: 400 }
      )
    }

    // Only allow setting role if it's currently NULL (first-time onboarding).
    // This prevents a buyer from escalating to seller (or vice versa) post-onboarding.
    const result = await pool.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2 AND role IS NULL
       RETURNING id, email, name, role, phone, city_id`,
      [role, decoded.userId]
    )

    if (result.rowCount === 0) {
      // Either user doesn't exist or already has a role.
      const checkRes = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [decoded.userId]
      )
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'El rol ya fue seleccionado. Contacta soporte para cambiarlo.' },
        { status: 409 }
      )
    }

    const u = result.rows[0]
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        phone: u.phone,
        cityId: u.city_id,
      },
    })
  } catch (err) {
    console.error('POST /api/auth/role-select error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}