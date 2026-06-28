import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'


// GET /api/orders — buyer sees own orders, vendor sees own orders
export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let userId: string
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    userId = decoded.userId

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // Get user profile to determine role
    const profileRes = await pool.query(
      'SELECT id, role FROM profiles WHERE user_id = $1',
      [userId]
    )
    if (profileRes.rows.length === 0) {
      return NextResponse.json({ orders: [] })
    }
    const profile = profileRes.rows[0]

    let query = 'SELECT o.*, v.name as vendor_name, p.name as buyer_name FROM orders o JOIN vendors v ON o.vendor_id = v.id JOIN profiles p ON o.buyer_id = p.id WHERE 1=1'
    const params: any[] = []

    // Role-based filtering
    if (profile.role === 'buyer') {
      params.push(profile.id)
      query += ` AND o.buyer_id = $${params.length}`
    } else if (profile.role === 'seller') {
      params.push(profile.id)
      query += ` AND o.vendor_id = $${params.length}`
    }

    if (status) {
      params.push(status)
      query += ` AND o.status = $${params.length}`
    }

    query += ' ORDER BY o.created_at DESC'

    const result = await pool.query(query, params)

    // Get all items in one query, grouped by order_id, then merge in JS.
    // Avoids N+1 — one query for all items instead of one per order.
    const orderIds = result.rows.map((o) => o.id)
    const itemsByOrder = new Map()
    if (orderIds.length > 0) {
      const itemsResult = await pool.query(
        `SELECT oi.order_id, oi.id, oi.product_id, oi.quantity, oi.unit_price,
                pr.name as product_name
         FROM order_items oi
         JOIN products pr ON oi.product_id = pr.id
         WHERE oi.order_id = ANY($1::uuid[])`,
        [orderIds]
      )
      for (const item of itemsResult.rows) {
        if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, [])
        itemsByOrder.get(item.order_id).push(item)
      }
    }
    const ordersWithItems = result.rows.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) || [],
    }))

    return NextResponse.json({ orders: ordersWithItems })
  } catch (err) {
    console.error('Orders GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/orders — create order, buyerId comes from token
// SECURITY: prices are NEVER trusted from the client. We re-fetch each product
// from the DB, validate that every product belongs to the requested vendor,
// and compute the total server-side. The client's price field is ignored.
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let userId: string
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    userId = decoded.userId

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
