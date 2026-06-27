import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'


// GET /api/products?vendorId=xxx
export async function GET(req: NextRequest) {
  try {
    // Accept Authorization header OR cookie token (optional auth)
    let token: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else {
      token = req.cookies.get('token')?.value || null
    }

    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')

    let query = 'SELECT * FROM products WHERE 1=1'
    const params: any[] = []

    if (vendorId) {
      params.push(vendorId)
      query += ` AND vendor_id = $${params.length}`
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    return NextResponse.json({ products: result.rows })
  } catch (err) {
    console.error('Products GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/products — create product (seller only)
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    if (decoded.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden crear productos' }, { status: 403 })
    }

    const { name, description, price, photo_url, vendor_id } = await req.json()

    if (!name || !price) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    let vendorId = vendor_id

    // If no vendor_id provided, look up the authenticated seller's own vendor
    if (!vendorId) {
      const vendorResult = await pool.query(
        'SELECT id FROM vendors WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = $1)',
        [decoded.userId]
      )
      if (vendorResult.rows.length === 0) {
        return NextResponse.json({ error: 'Primero crea tu perfil de vendedor en el dashboard' }, { status: 400 })
      }
      vendorId = vendorResult.rows[0].id
    }

    // Verify the vendor belongs to this user
    const vendorCheck = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
      [vendorId, decoded.userId]
    )

    if (vendorCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes permiso para agregar productos a este vendor' }, { status: 403 })
    }

    const result = await pool.query(
      `INSERT INTO products (vendor_id, name, description, price, photo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [vendorId, name, description || '', price, photo_url || null]
    )

    return NextResponse.json({ product: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('Products POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
