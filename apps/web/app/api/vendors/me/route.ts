import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { isTokenRevoked } from '@/lib/auth-db'
import pool from '@/lib/db'


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
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // N16: return ALL vendors owned by this user.
    const result = await pool.query(
      `SELECT v.*, c.label as category_label
       FROM vendors v
       LEFT JOIN categories c ON v.category = c.id
       JOIN profiles p ON p.id = v.profile_id
       WHERE p.user_id = $1
       ORDER BY v.created_at ASC`,
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ vendors: [], vendor: null })
    }

    const map = (v: any) => ({
      id: v.id,
      profileId: v.profile_id,
      name: v.name,
      category: v.category,
      description: v.description,
      photoUrl: v.photo_url,
      isActive: v.is_active,
      isVerified: v.is_verified || false,
      ratingAvg: parseFloat(v.rating) || 0,
      reviewCount: v.review_count || 0,
      createdAt: v.created_at,
      latitude: v.latitude,
      longitude: v.longitude,
      category_label: v.category_label,
      phone: v.phone,
      slug: v.slug,
    })

    const vendors = result.rows.map(map)
    // Backwards compat: also return single `vendor` (first one) for legacy callers.
    return NextResponse.json({ vendors, vendor: vendors[0] })
  } catch (err) {
    console.error('Vendor me error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/vendors/me — create vendor for authenticated user
export async function POST(req: NextRequest) {
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
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    userId = decoded.userId

    const { name, description, category, phone, cityId } = await req.json()

    if (!name || !category) {
      return NextResponse.json({ error: 'Nombre y categoría son requeridos' }, { status: 400 })
    }

    // Check if user already has a profile
    let profileRes = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [userId]
    )

    let profileId: string

    if (profileRes.rows.length === 0) {
      // Get user email
      const userRes = await pool.query('SELECT email, name FROM users WHERE id = $1', [userId])
      const user = userRes.rows[0]

      // Create profile
      const newProfile = await pool.query(
        `INSERT INTO profiles (user_id, email, name, role)
         VALUES ($1, $2, $3, 'seller') RETURNING id`,
        [userId, user.email, user.name]
      )
      profileId = newProfile.rows[0].id
    } else {
      profileId = profileRes.rows[0].id
      await pool.query("UPDATE profiles SET role = 'seller' WHERE id = $1", [profileId])
    }

    // N16: removed the "ya tienes un perfil de vendedor" guard so a user
    // can own multiple vendors (e.g. family members or sister businesses).
    // Optionally cap at 3 vendors per user to prevent abuse.
    const vendorCount = await pool.query(
      'SELECT COUNT(*) as c FROM vendors WHERE profile_id = $1',
      [profileId]
    )
    if (Number(vendorCount.rows[0].c) >= 3) {
      return NextResponse.json({ error: 'Máximo 3 tiendas por usuario' }, { status: 400 })
    }

    // Create vendor
    const result = await pool.query(
      `INSERT INTO vendors (profile_id, name, description, category, phone, city_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING *`,
      [profileId, name, description || '', category, phone || '', cityId || 'bogota']
    )

    // Update user role to seller
    await pool.query("UPDATE users SET role = 'seller' WHERE id = $1", [userId])

    return NextResponse.json({ vendor: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('Vendors/me POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/vendors/me — update vendor profile (including is_verified)
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
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    if (await isTokenRevoked(decoded.userId, decoded.tokenVersion)) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }
    userId = decoded.userId

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
    const allowedFields = [
      'name', 'description', 'category', 'phone', 'city_id', 'is_active',
      'photo_url', 'vehicle_type', 'vehicle_photo_url',
    ]
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Map camelCase JS fields to snake_case DB columns
        const dbField = field === 'photoUrl' ? 'photo_url' : field
        updates.push(`${dbField} = $${paramIndex}`)
        values.push(body[field])
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
