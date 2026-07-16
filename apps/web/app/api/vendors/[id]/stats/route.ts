import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { isTokenRevoked } from '@/lib/auth-db'
import pool from '@/lib/db'


// GET /api/vendors/[id]/stats — owner-only vendor stats
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise

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
    if (await isTokenRevoked(decoded.userId, decoded.tokenVersion)) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }
    userId = decoded.userId

    const vendorId = params.id

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id, name, category, city_id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
      [vendorId, userId]
    )
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 })
    }
    const vendor = ownerCheck.rows[0]

    // Count orders for this vendor
    const ordersResult = await pool.query(
      `SELECT COUNT(*) as total FROM orders WHERE vendor_id = $1 AND status != 'cancelled'`,
      [vendorId]
    )

    // Views today
    const viewsTodayResult = await pool.query(
      `SELECT COUNT(*) as total FROM vendor_views
       WHERE vendor_id = $1 AND DATE(viewed_at) = CURRENT_DATE`,
      [vendorId]
    )

    // N7: Weekly views (last 7 days)
    const weeklyViewsResult = await pool.query(
      `SELECT COUNT(*) as total FROM vendor_views
       WHERE vendor_id = $1 AND viewed_at > NOW() - INTERVAL '7 days'`,
      [vendorId]
    )

    // N7: Weekly orders (last 7 days)
    const weeklyOrdersResult = await pool.query(
      `SELECT COUNT(*) as total FROM orders
       WHERE vendor_id = $1
         AND status != 'cancelled'
         AND created_at > NOW() - INTERVAL '7 days'`,
      [vendorId]
    )

    // Rating
    const ratingResult = await pool.query(
      `SELECT rating, review_count FROM vendors WHERE id = $1`,
      [vendorId]
    )

    // N15: Weekly ranking within same category + city.
    // Score = weekly_orders * 2 + weekly_views * 0.1 + rating * 5
    // Then rank_percentile = (1 - rank/total) * 100, lower = better.
    let rankPercentile: number | undefined
    if (vendor.city_id) {
      const rankingResult = await pool.query(
        `WITH vendor_scores AS (
          SELECT
            v.id,
            (
              COALESCE((
                SELECT COUNT(*) FROM orders o
                WHERE o.vendor_id = v.id AND o.status != 'cancelled' AND o.created_at > NOW() - INTERVAL '7 days'
              ), 0) * 2
              + COALESCE((
                SELECT COUNT(*) FROM vendor_views vv
                WHERE vv.vendor_id = v.id AND vv.viewed_at > NOW() - INTERVAL '7 days'
              ), 0) * 0.1
              + COALESCE(v.rating, 0) * 5
            ) AS score
          FROM vendors v
          WHERE v.category = $1 AND v.city_id = $2 AND v.is_active = TRUE
        ),
        ranked AS (
          SELECT id, score,
            PERCENT_RANK() OVER (ORDER BY score ASC) AS pct_rank
          FROM vendor_scores
        )
        SELECT pct_rank FROM ranked WHERE id = $3`,
        [vendor.category, vendor.city_id, vendorId]
      )
      if (rankingResult.rows.length > 0) {
        // pct_rank: 0 = lowest score (worst), 1 = highest (best).
        // rankPercentile: 1% = top 1%, 50% = median. Invert so lower = better.
        const pct = Number(rankingResult.rows[0].pct_rank)
        // Top performers get small numbers.
        rankPercentile = Math.round((1 - pct) * 100) || 1
      }
    }

    return NextResponse.json({
      vendorName: vendor.name,
      category: vendor.category,
      totalOrders: Number(ordersResult.rows[0].total),
      viewsToday: Number(viewsTodayResult.rows[0].total),
      weeklyViews: Number(weeklyViewsResult.rows[0].total),
      weeklyOrders: Number(weeklyOrdersResult.rows[0].total),
      rating: Number(ratingResult.rows[0]?.rating ?? 0),
      reviewCount: Number(ratingResult.rows[0]?.review_count ?? 0),
      rankPercentile,
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}