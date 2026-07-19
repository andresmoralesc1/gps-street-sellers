import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i


// GET /api/products?vendorId=xxx
//
// CRIT-5 fix note: this endpoint was incorrectly migrated to requireAuth()
// by the bulk script, but the original design has GET with *optional* auth
// (browsers can browse products without being logged in). POST below stays
// behind requireAuth().
export async function GET(req: NextRequest) {
  try {
    // GET is intentionally public — browsers can browse the catalogue without
    // being logged in. We still try to parse the token if present so future
    // logic could personalize, but anonymous viewers always get a 200.

    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')

    let query = 'SELECT id, vendor_id, name, description, price, photo_url, created_at FROM products WHERE 1=1'
    const params: any[] = []

    if (vendorId) {
      // Reject malformed UUIDs up front so we don't hand a non-UUID string to
      // the uuid column (which would 500 with a syntax error from Postgres).
      if (!UUID_RE.test(vendorId)) {
        return NextResponse.json({ products: [] }, { status: 200 })
      }
      params.push(vendorId)
      query += ` AND vendor_id = $${params.length}`
    }

    query += ' ORDER BY created_at DESC LIMIT 200'

    const result = await pool.query(query, params)
    return NextResponse.json({ products: result.rows })
  } catch (err) {
    logger.error(serializeErr(err), 'Products GET error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/products — create product (seller only)
export async function POST(req: NextRequest) {
  try {
    // CRIT audit fix: switched from verifyToken() to requireAuth() so that
    // a revoked session (e.g. user logged out elsewhere) cannot keep creating
    // products until the JWT naturally expires.
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const decoded = auth

    if (decoded.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden crear productos' }, { status: 403 })
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    // Strict validation: reject arrays/objects masquerading as scalars.
    const rawName = body.name
    const rawDescription = body.description
    const rawPrice = body.price
    const rawPhotoUrl = body.photo_url
    const rawVendorId = body.vendor_id

    if (typeof rawName !== 'string' || !rawName.trim() || rawName.trim().length > 200) {
      return NextResponse.json(
        { error: 'Nombre inválido (1-200 caracteres)' },
        { status: 400 }
      )
    }
    const name = rawName.trim()

    let description: string | null = null
    if (rawDescription !== undefined && rawDescription !== null && rawDescription !== '') {
      if (typeof rawDescription !== 'string' || rawDescription.length > 5000) {
        return NextResponse.json({ error: 'Descripción inválida' }, { status: 400 })
      }
      description = rawDescription
    }

    const priceNum = Number(rawPrice)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: 'Precio inválido (debe ser mayor a 0)' }, { status: 400 })
    }
    if (priceNum > 99999999.99) {
      return NextResponse.json(
        { error: 'Precio demasiado grande (máx 99,999,999.99 COP)' },
        { status: 400 }
      )
    }

    let photo_url: string | null = null
    if (rawPhotoUrl !== undefined && rawPhotoUrl !== null && rawPhotoUrl !== '') {
      if (typeof rawPhotoUrl !== 'string') {
        return NextResponse.json({ error: 'photo_url inválido' }, { status: 400 })
      }
      photo_url = rawPhotoUrl.trim() || null
    }

    let vendorId: string | null = null
    if (rawVendorId !== undefined && rawVendorId !== null && rawVendorId !== '') {
      if (typeof rawVendorId !== 'string' || !UUID_RE.test(rawVendorId)) {
        return NextResponse.json({ error: 'vendor_id inválido' }, { status: 400 })
      }
      vendorId = rawVendorId
    }

    // If no vendorId provided, look up the authenticated seller's own vendor
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
       VALUES ($1, $2, $3, $4, $5) RETURNING id, vendor_id, name, description, price, photo_url, created_at`,
      [vendorId, name, description, priceNum, photo_url]
    )

    return NextResponse.json({ product: result.rows[0] }, { status: 201 })
  } catch (err: any) {
    logger.error(serializeErr(err), 'Products POST error:')
    if (err?.code === '22003') {
      return NextResponse.json(
        { error: 'Precio demasiado grande (máx 99,999,999.99 COP)' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
