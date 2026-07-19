import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'


// GET /api/products?vendorId=xxx
//
// CRIT-5 fix note: this endpoint was incorrectly migrated to requireAuth()
// by the bulk script, but the original design has GET with *optional* auth
// (browsers can browse products without being logged in). POST below stays
// behind requireAuth().
export async function GET(req: NextRequest) {
  try {
    // Optional auth — read token if present but don't 401 on its absence.
    // (We don't use the decoded payload here; we just need to know the user
    // is allowed to browse the catalogue, which is always true.)
    const token = getTokenFromRequest(req)
    if (token) {
      // Verify silently — invalid tokens just become anonymous viewers.
      await verifyToken(token)
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
    logger.error(serializeErr(err), 'Products GET error:')
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

    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    if (decoded.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden crear productos' }, { status: 403 })
    }

    const { name, description, price, photo_url, vendor_id } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }
    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: 'Precio inválido (debe ser mayor a 0)' }, { status: 400 })
    }
    if (priceNum > 99999999.99) {
      return NextResponse.json(
        { error: 'Precio demasiado grande (máx 99,999,999.99 COP)' },
        { status: 400 }
      )
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
      [vendorId, name, description || '', priceNum, photo_url || null]
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
