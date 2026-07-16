import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

/**
 * GET /api/vendors/[id]/location-history — owner-only.
 * Returns vendor GPS snapshots for the last N days (default 7, max 90).
 * Used by N14 heatmap component.
 */
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const vendorId = params.id

  try {
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const decoded = await verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const ownerCheck = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
      [vendorId, decoded.userId]
    )
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const days = Math.min(parseInt(searchParams.get('days') || '7', 10) || 7, 90)

    const result = await pool.query(
      `SELECT latitude, longitude, recorded_at
       FROM vendor_location_history
       WHERE vendor_id = $1
         AND recorded_at > NOW() - ($2 || ' days')::INTERVAL
       ORDER BY recorded_at DESC
       LIMIT 5000`,
      [vendorId, days.toString()]
    )

    // Cluster nearby points into heatmap cells.
    // ~3 decimal places ≈ 110m at the equator (close enough for Colombia).
    const cells: Record<string, { lat: number; lng: number; count: number; lastSeen: string }> = {}
    for (const row of result.rows) {
      const lat = Number(row.latitude)
      const lng = Number(row.longitude)
      const key = `${lat.toFixed(3)},${lng.toFixed(3)}`
      if (!cells[key]) {
        cells[key] = { lat, lng, count: 0, lastSeen: row.recorded_at }
      }
      cells[key].count += 1
    }

    return NextResponse.json({
      cells: Object.values(cells),
      total: result.rows.length,
      days,
    })
  } catch (err) {
    console.error('GET location-history error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}