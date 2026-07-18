import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isTokenRevoked } from '@/lib/auth-db'
import pool from '@/lib/db'


export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await req.json()

    // Find vendor by user
    const profileRes = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [userId]
    )

    if (profileRes.rows.length === 0) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const profileId = profileRes.rows[0].id

    const vendorRes = await pool.query(
      'SELECT id FROM vendors WHERE profile_id = $1',
      [profileId]
    )

    if (vendorRes.rows.length === 0) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    const vendorId = vendorRes.rows[0].id

    // Build update query dynamically for allowed fields
    // NOTE: 'is_verified' is intentionally NOT here — only admins can verify vendors.
    // vehicle_type + vehicle_photo_url let vendors show what cart/vehicle they use
    // (used for the "anunciate en el carrito" revenue stream and buyer trust).
    // Map client camelCase keys to DB snake_case columns.
    // Keys not in this map are ignored (intentional: prevents arbitrary column writes).
    const clientToDb: Record<string, string> = {
      name: 'name',
      description: 'description',
      category: 'category',
      phone: 'phone',
      cityId: 'city_id',
      isActive: 'is_active',
      photoUrl: 'photo_url',
      vehicleType: 'vehicle_type',
      vehiclePhotoUrl: 'vehicle_photo_url',
      stationType: 'station_type',
    }
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const [clientKey, dbField] of Object.entries(clientToDb)) {
      if (body[clientKey] !== undefined) {
        updates.push(`${dbField} = $${paramIndex}`)
        values.push(body[clientKey])
        paramIndex++
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron campos para actualizar' }, { status: 400 })
    }

    values.push(vendorId)
    const query = `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`

    const result = await pool.query(query, values)

    return NextResponse.json({ vendor: result.rows[0] })
  } catch (err) {
    console.error('Vendors/me PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
