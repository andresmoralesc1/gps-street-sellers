import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

/**
 * GET /api/account/export — ARCO right of access / portability.
 *
 * Ley 1581/2012 art. 9: the user has the right to know what personal
 * data we hold about them and obtain a copy in a structured format.
 *
 * Returns a JSON document with everything we know about the caller:
 *   - identity (email, name, phone, city, role, created_at)
 *   - profile (vendor data if applicable)
 *   - orders placed (no buyer info — just IDs/timestamps/status)
 *   - favorites list (vendor IDs only, no names)
 *   - consent log (audit trail of every consent event)
 *   - push subscriptions metadata (endpoints + created_at)
 *
 * Sensitive fields (password_hash) are NEVER exported.
 *
 * Response format: `application/json` with Content-Disposition suggesting
 * a filename so the browser offers to save it.
 *
 * Auth: required. A user can only export their own data.
 */
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  const userId = payload.userId

  try {
    // 1. Core identity.
    const userRes = await pool.query(
      `SELECT id, email, name, phone, city_id, role, created_at
       FROM users WHERE id = $1`,
      [userId]
    )
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const user = userRes.rows[0]

    // 2. Profile id (for orders/favorites lookups).
    const profileRes = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [userId]
    )
    const profileId = profileRes.rows[0]?.id ?? null

    // 3. Vendor (if exists). vendors has profile_id (FK to profiles), not user_id.
    let vendorRes: { rows: unknown[] } = { rows: [] }
    if (profileId) {
      vendorRes = await pool.query(
        `SELECT id, name, description, category, phone, city_id,
                rating, is_active, is_verified, created_at, updated_at
         FROM vendors WHERE profile_id = $1`,
        [profileId]
      )
    }

    // 4. Orders placed (buyer = profile).
    let ordersPlaced: unknown[] = []
    if (profileId) {
      const r = await pool.query(
        `SELECT id, vendor_id, status, total, created_at
         FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC`,
        [profileId]
      )
      ordersPlaced = r.rows
    }

    // 5. Orders received (vendor side).
    const ordersReceived: unknown[] = []
    for (const v of (vendorRes.rows as Array<{ id: string }>)) {
      const r = await pool.query(
        `SELECT id, status, total, created_at
         FROM orders WHERE vendor_id = $1 ORDER BY created_at DESC`,
        [v.id]
      )
      ordersReceived.push(...r.rows)
    }

    // 6. Favorites (just vendor IDs).
    let favorites: unknown[] = []
    if (profileId) {
      const r = await pool.query(
        `SELECT vendor_id, created_at FROM favorites
         WHERE buyer_id = $1 ORDER BY created_at DESC`,
        [profileId]
      )
      favorites = r.rows
    }

    // 7. Consent log — entire audit trail.
    const consentRes = await pool.query(
      `SELECT consent_type, policy_version, granted,
              ip_address, user_agent, created_at
       FROM consent_logs WHERE user_id = $1 ORDER BY created_at`,
      [userId]
    )

    // 8. Push subscriptions metadata (NOT the auth keys — those are
    //    cryptographic material the user doesn't need).
    const pushRes = await pool.query(
      `SELECT endpoint, created_at, last_used_at
       FROM push_subscriptions WHERE user_id = $1`,
      [userId]
    )

    const exportData = {
      generated_at: new Date().toISOString(),
      generator: 'BarrioTech — Ley 1581/2012 ARCO export',
      identity: user,
      vendor: vendorRes.rows[0] ?? null,
      orders: {
        placed: ordersPlaced,
        received: ordersReceived,
      },
      favorites,
      consent_log: consentRes.rows,
      push_subscriptions: pushRes.rows.map((r) => ({
        endpoint: r.endpoint,
        created_at: r.created_at,
        last_used_at: r.last_used_at,
      })),
      notice:
        'Este documento contiene tus datos personales conforme al derecho de Acceso de la Ley 1581/2012. ' +
        'Si detectas información incorrecta, solicita Rectificación. ' +
        'Para eliminar tu cuenta, usa DELETE /api/account.',
    }

    const filename = `barriotech-export-${userId.slice(0, 8)}-${Date.now()}.json`
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // No caching — this is personal data.
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[account export] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}