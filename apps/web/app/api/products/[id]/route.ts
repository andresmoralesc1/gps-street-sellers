import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RouteContext = {
  params: { id: string }
}

// PATCH /api/products/[id] — update product
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const productId = context.params.id

    if (!productId || !UUID_RE.test(productId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

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

    let decoded: { userId: string; role: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { name, description, price, photo_url } = await req.json()

    const updates: string[] = []
    const params: any[] = []

    if (name !== undefined) {
      params.push(name)
      updates.push(`name = $${params.length}`)
    }
    if (description !== undefined) {
      params.push(description)
      updates.push(`description = $${params.length}`)
    }
    if (price !== undefined) {
      params.push(price)
      updates.push(`price = $${params.length}`)
    }
    if (photo_url !== undefined) {
      params.push(photo_url)
      updates.push(`photo_url = $${params.length}`)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    params.push(productId)
    const result = await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ product: result.rows[0] })
  } catch (err) {
    console.error('Products PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/products/[id]
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const productId = context.params.id

    if (!productId || !UUID_RE.test(productId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

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

    let decoded: { userId: string; role: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    if (!productId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Verify ownership
    const check = await pool.query(
      `SELECT p.id FROM products p
       JOIN vendors v ON v.id = p.vendor_id
       JOIN profiles pr ON pr.id = v.profile_id
       WHERE p.id = $1 AND pr.user_id = $2`,
      [productId, decoded.userId]
    )

    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado o sin permiso' }, { status: 404 })
    }

    await pool.query('DELETE FROM products WHERE id = $1', [productId])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Products DELETE error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
