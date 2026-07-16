import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/vendors/[id]/catalog — public catalog for sharing via WhatsApp.
 * Returns vendor info + available products in a compact format for wa.me text.
 *
 * No auth required — this is public data intended to be shared.
 * Rate-limited via middleware / proxy at the edge.
 */
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const vendorId = params.id

  try {
    const vendorRes = await pool.query(
      `SELECT id, name, slug, category, description, phone, city_id, photo_url
       FROM vendors
       WHERE id = $1 AND is_active = TRUE`,
      [vendorId]
    )
    if (vendorRes.rows.length === 0) {
      return NextResponse.json({ error: 'Vendor no encontrado' }, { status: 404 })
    }

    const v = vendorRes.rows[0]

    // products table doesn't have is_available/is_active — products are
    // public-by-default once the vendor is active. Owner can soft-delete via
    // a separate flag (TODO if needed).
    const productsRes = await pool.query(
      `SELECT p.id, p.name, p.description, p.price, p.photo_url,
              COALESCE(
                (SELECT json_agg(json_build_object('id', pp.id, 'url', pp.url) ORDER BY pp.position)
                 FROM product_photos pp WHERE pp.product_id = p.id),
                '[]'::json
              ) AS photos
       FROM products p
       WHERE p.vendor_id = $1
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [vendorId]
    )

    return NextResponse.json({
      vendor: {
        id: v.id,
        name: v.name,
        category: v.category,
        description: v.description,
        phone: v.phone,
        city_id: v.city_id,
        photoUrl: v.photo_url,
      },
      products: productsRes.rows,
      shareUrl: `/vendedor/${v.slug ?? v.id}`,
    })
  } catch (err) {
    console.error('GET catalog error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}