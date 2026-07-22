import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import { isTokenRevoked } from '@/lib/auth-db'
import pool from '@/lib/db'
import { notify } from '@/lib/push'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/trusted-ip'


// PUT /api/vendors/[id]/location — update vendor location (owner only)
export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise

  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    // Rate limit at the legacy [id]/location endpoint. The newer /me/location
    // already has the same guard; without it here, a buggy mobile client could
    // blow up `vendor_location_history` at ~6k rows/min/vendor (60/min × 60
    // × 24 = 86k rows/day). Mirrors /me/location's "location_update" bucket.
    const rl = await checkRateLimit(getClientIp(req), 'location_update_legacy', 30, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas actualizaciones. Espera un momento.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
      )
    }

    const vendorId = params.id

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
      [vendorId, userId]
    )
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No tienes permiso para actualizar esta ubicación' }, { status: 403 })
    }

    const { latitude, longitude, isActive } = await req.json()

    const updates: string[] = []
    const paramsList: unknown[] = []

    if (latitude != null && longitude != null) {
      // Validate coordinates for Colombia
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (lat < -4.2 || lat > 13.5 || lng < -79.1 || lng > -66.9) {
        return NextResponse.json({ error: 'Coordenadas fuera de Colombia' }, { status: 400 })
      }
      paramsList.push(lat, lng)
      updates.push(`latitude = $1, longitude = $2, location_updated_at = NOW()`)
    }

    if (typeof isActive === 'boolean') {
      paramsList.push(isActive)
      updates.push(`is_active = $${paramsList.length}`)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    // Snapshot GPS only when transitioning to active OR every 10s while active.
    // We write to history inside the same transaction so partial failures
    // don't leave the live `vendors` row out of sync with history.
    const wantsHistoryWrite =
      latitude != null && longitude != null &&
      parseFloat(latitude) >= -4.2 && parseFloat(latitude) <= 13.5 &&
      parseFloat(longitude) >= -79.1 && parseFloat(longitude) <= -66.9

const client = await pool.connect()
  let updated: unknown = null
  let wasActive = false
  let vendorName = 'Vendedor'
  try {
    await client.query('BEGIN')

    // Capture previous state BEFORE update.
    const beforeRes = await client.query(
      'SELECT is_active, name FROM vendors WHERE id = $1 FOR UPDATE',
      [vendorId]
    )
    if (beforeRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }
    wasActive = beforeRes.rows[0]?.is_active ?? false
    vendorName = beforeRes.rows[0]?.name ?? 'Vendedor'

    paramsList.push(vendorId)
    const result = await client.query(
      `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${paramsList.length} RETURNING *`,
      paramsList
    )
    updated = result.rows[0]

    // pg returns untyped rows; narrow to what we actually read from it.
    const updatedRow = updated as { is_active?: boolean } | null

    // N14: record GPS snapshot for the heatmap.
    // Only insert when the vendor is currently active to avoid logging
    // location while the seller is offline.
    if (wantsHistoryWrite && updatedRow?.is_active) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      await client.query(
        `INSERT INTO vendor_location_history (vendor_id, latitude, longitude)
         VALUES ($1, $2, $3)`,
        [vendorId, lat, lng]
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }

  // Push notification when seller transitions from inactive → active.
  // Notify every buyer who has this vendor in their favorites.
  // Fire-and-forget so push failures don't fail the location update.
  const updatedRow = updated as { is_active?: boolean } | null
  if (!wasActive && updatedRow?.is_active) {
    void notifyFavoriteBuyers(vendorId, vendorName).catch((err) => {
      logger.error(serializeErr(err), '[vendor location] push to favorites failed:')
    })
  }

  return NextResponse.json({ vendor: updated })
  } catch (err) {
    logger.error(serializeErr(err), 'Vendor location PUT error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * Send a "vendor now active" push to every buyer who has this vendor in
 * their favorites list. Used when a seller transitions inactive → active,
 * so buyers can be the first to know their favorite seller is out selling.
 */
async function notifyFavoriteBuyers(vendorId: string, vendorName: string): Promise<void> {
  const res = await pool.query(
    `SELECT p.user_id
     FROM favorites f
     JOIN profiles p ON p.id = f.buyer_id
     WHERE f.vendor_id = $1`,
    [vendorId]
  )
  const message = {
    title: '🟢 Tu vendedor está activo',
    body: `${vendorName} acaba de empezar a vender. ¡Pasa por él!`,
    url: '/map',
  }
  // Send in parallel; failures are caught inside notify().
  await Promise.all(
    res.rows.map((row) => notify(row.user_id, message))
  )
}
