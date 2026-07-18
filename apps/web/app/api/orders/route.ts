import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'


// GET /api/orders — buyer sees own orders, vendor sees own orders
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    // Get buyer profile from userId
    const profileRes = await pool.query(
      'SELECT id, role FROM profiles WHERE user_id = $1',
      [userId]
    )
    if (profileRes.rows.length === 0) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }
    const profile = profileRes.rows[0]

    if (profile.role !== 'buyer') {
      return NextResponse.json({ error: 'Solo compradores pueden crear órdenes' }, { status: 403 })
    }

    const { vendorId, items } = await req.json()

    if (!vendorId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Validate item shape (productId + quantity, both required)
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 999) {
        return NextResponse.json({ error: 'Cada item debe tener productId y quantity (1-999)' }, { status: 400 })
      }
    }

    // SECURITY: fetch real prices + validate ownership in one query.
    // We DO NOT trust item.price from the client.
    // NOTE: products table does not currently have stock or is_active columns,
    // so we only validate vendor_id here. Stock/active checks should be re-added
    // when those columns exist in the schema.
    const productIds = items.map((i: any) => i.productId)
    const productsRes = await pool.query(
      `SELECT id, vendor_id, price
       FROM products
       WHERE id = ANY($1::uuid[])`,
      [productIds]
    )

    if (productsRes.rows.length !== productIds.length) {
      return NextResponse.json({ error: 'Uno o más productos no existen' }, { status: 400 })
    }

    // Build a price map AND validate ownership
    const priceMap = new Map<string, { price: number; vendorId: string }>()
    for (const p of productsRes.rows) {
      priceMap.set(p.id, {
        price: parseFloat(p.price),
        vendorId: p.vendor_id,
      })
    }

    // Compute total server-side using DB prices
    let total = 0
    for (const item of items) {
      const product = priceMap.get(item.productId)
      if (!product) {
        return NextResponse.json({ error: `Producto ${item.productId} no encontrado` }, { status: 400 })
      }
      if (product.vendorId !== vendorId) {
        return NextResponse.json({ error: `Producto ${item.productId} no pertenece al vendedor` }, { status: 400 })
      }
      total += product.price * item.quantity
    }

    // Transaction: create order + insert items atomically
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const orderResult = await client.query(
        `INSERT INTO orders (buyer_id, vendor_id, total) VALUES ($1, $2, $3) RETURNING *`,
        [profile.id, vendorId, total]
      )
      const order = orderResult.rows[0]

      // Build items insert using server-side prices
      const itemsValues: any[] = []
      const placeholders: string[] = []
      let paramIdx = 1
      for (const item of items) {
        const serverPrice = priceMap.get(item.productId)!.price
        placeholders.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3})`)
        itemsValues.push(order.id, item.productId, item.quantity, serverPrice)
        paramIdx += 4
      }

      const itemsResult = await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ${placeholders.join(', ')} RETURNING *`,
        itemsValues
      )

      await client.query('COMMIT')

      return NextResponse.json({ order: { ...order, items: itemsResult.rows } }, { status: 201 })
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Orders POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
