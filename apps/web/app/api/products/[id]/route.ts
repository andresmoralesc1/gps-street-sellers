import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params

    if (!productId || !UUID_RE.test(productId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    if (!productId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Verify ownership
    const check = await pool.query(
      `SELECT p.id FROM products p
       JOIN vendors v ON v.id = p.vendor_id
       JOIN profiles pr ON pr.id = v.profile_id
       WHERE p.id = $1 AND pr.user_id = $2`,
      [productId, auth.userId]
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
