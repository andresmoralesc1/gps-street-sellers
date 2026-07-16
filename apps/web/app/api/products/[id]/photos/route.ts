import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

/**
 * GET /api/products/[id]/photos — list all photos for a product.
 * POST /api/products/[id]/photos — add a photo (owner-only).
 * DELETE /api/products/[id]/photos — remove a photo (owner-only).
 */

export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  try {
    const result = await pool.query(
      'SELECT id, url, position, created_at FROM product_photos WHERE product_id = $1 ORDER BY position ASC, created_at ASC',
      [params.id]
    )
    return NextResponse.json({ photos: result.rows })
  } catch (err) {
    console.error('GET photos error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  try {
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    // Verify ownership: product must belong to a vendor owned by this user.
    const ownerCheck = await pool.query(
      `SELECT p.id FROM products p
       JOIN vendors v ON v.id = p.vendor_id
       WHERE p.id = $1 AND v.profile_id IN (SELECT id FROM profiles WHERE user_id = $2)`,
      [params.id, decoded.userId]
    )
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const url = (body.url || '').trim()
    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    // Cap at 6 photos per product.
    const countResult = await pool.query(
      'SELECT COUNT(*) as c FROM product_photos WHERE product_id = $1',
      [params.id]
    )
    if (Number(countResult.rows[0].c) >= 6) {
      return NextResponse.json({ error: 'Máximo 6 fotos por producto' }, { status: 400 })
    }

    const maxPos = await pool.query(
      'SELECT COALESCE(MAX(position), -1) as m FROM product_photos WHERE product_id = $1',
      [params.id]
    )
    const nextPos = Number(maxPos.rows[0].m) + 1

    const inserted = await pool.query(
      'INSERT INTO product_photos (product_id, url, position) VALUES ($1, $2, $3) RETURNING *',
      [params.id, url, nextPos]
    )

    // If this is the first photo, also set products.photo_url for legacy readers.
    if (nextPos === 0) {
      await pool.query('UPDATE products SET photo_url = $1 WHERE id = $2', [url, params.id])
    }

    return NextResponse.json({ photo: inserted.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('POST photos error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  try {
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const ownerCheck = await pool.query(
      `SELECT p.id FROM products p
       JOIN vendors v ON v.id = p.vendor_id
       WHERE p.id = $1 AND v.profile_id IN (SELECT id FROM profiles WHERE user_id = $2)`,
      [params.id, decoded.userId]
    )
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const photoId = body.photo_id
    if (!photoId) return NextResponse.json({ error: 'Falta photo_id' }, { status: 400 })

    const del = await pool.query(
      'DELETE FROM product_photos WHERE id = $1 AND product_id = $2 RETURNING id',
      [photoId, params.id]
    )
    if (del.rows.length === 0) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE photos error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}