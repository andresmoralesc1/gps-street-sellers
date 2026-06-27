import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('token')?.value || null
}

// PUT /api/vendors/[id]/location — update vendor location (owner only)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getToken(req)
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

    const vendorId = params.id

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
      [vendorId, userId]
    )
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes permiso para actualizar esta ubicación' }, { status: 403 })
    }

    const { latitude, longitude, isActive } = await req.json()

    const updates: string[] = []
    const paramsList: any[] = []

    if (latitude != null && longitude != null) {
      // Validate coordinates for Colombia
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (lat < -4.2 || lat > 13.5 || lng < -79.1 || lng > -66.9) {
        return NextResponse.json({ error: 'Coordenadas fuera de Colombia' }, { status: 400 })
      }
      paramsList.push(lat, lng)
      updates.push(`latitude = $1, longitude = $2, location_updated_at = NOW()`)
    }

    if (typeof isActive === 'boolean') {
      paramsList.push(isActive)
      updates.push(`is_active = $${paramsList.length}`)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    paramsList.push(vendorId)
    const result = await pool.query(
      `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${paramsList.length} RETURNING *`,
      paramsList
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    return NextResponse.json({ vendor: result.rows[0] })
  } catch (err) {
    console.error('Vendor location PUT error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
