import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'

// PATCH /api/vendors/me/location — update vendor GPS coordinates
export async function PATCH(req: NextRequest) {
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

    let userId: string
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      userId = decoded.userId
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { latitude, longitude } = await req.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Latitud y longitud son requeridas y deben ser números' }, { status: 400 })
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
    }

    // Get vendor for this user
    const vendorRes = await pool.query(
      'SELECT v.id FROM vendors v JOIN profiles p ON p.id = v.profile_id WHERE p.user_id = $1',
      [userId]
    )

    if (vendorRes.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes perfil de vendedor' }, { status: 404 })
    }

    const vendorId = vendorRes.rows[0].id

    // Update vendor location + set active
    await pool.query(
      'UPDATE vendors SET latitude = $1, longitude = $2, is_active = true WHERE id = $3',
      [latitude, longitude, vendorId]
    )

    return NextResponse.json({ success: true, latitude, longitude })
  } catch (err) {
    console.error('Vendor location update error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
