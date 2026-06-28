import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

/**
 * DELETE /api/account — ARCO right of cancellation / suppression.
 *
 * Ley 1581/2012 art. 9 + Decreto 1377/2013 art. 13: the user can request
 * deletion of their personal data at any time. We:
 *
 *   1. Anonymize records that have business/audit value (orders,
 *      notifications, favorites) — PII removed but row kept for
 *      accounting.
 *   2. Null-out vendor_views.user_id (preserves visit counts).
 *   3. Hard-delete profile, push_subscriptions, consent_logs (FK CASCADE
 *      handles this when users row is deleted).
 *   4. Hard-delete the user row — cascades into profiles/push_subs/
 *      consent_logs.
 *   5. Clear auth cookies so the deleted user cannot reuse them.
 *
 * Hard-deleted data is unrecoverable. We do NOT keep a soft-delete flag.
 *
 * Auth: required. A user can only delete their own account.
 */
export const runtime = 'nodejs'

export async function DELETE(request: NextRequest) {
  // 1. Authenticate
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  const userId = payload.userId

  // 2. Optional confirmation header to prevent accidental deletions.
  // Browsers SHOULD call confirm() before hitting this, but defense in
  // depth costs nothing.
  if (request.headers.get('x-confirm-delete') !== 'true') {
    return NextResponse.json(
      {
        error: 'Confirmation header missing',
        hint: 'Re-send with header "X-Confirm-Delete: true" to confirm.',
      },
      { status: 409 }
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Look up the user's profile id (needed for FK references).
    const profileRes = await client.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [userId]
    )
    const profileId = profileRes.rows[0]?.id ?? null

    // Anonymize records that reference the profile. We keep the rows so
    // sellers can still see "X orders received" without knowing who the
    // buyer was after deletion. The buyer_id FK is set to NULL where
    // possible, otherwise the row stays with a tombstone UUID.
    if (profileId) {
      // Anonymize orders: zero out the FK (orders.buyer_id is nullable).
      await client.query(
        `UPDATE orders SET buyer_id = NULL WHERE buyer_id = $1`,
        [profileId]
      )
      // Anonymize favorites: drop the rows (no business value without the user).
      await client.query(`DELETE FROM favorites WHERE buyer_id = $1`, [profileId])
      // Anonymize notifications: drop (they're personal to the user).
      await client.query(`DELETE FROM notifications WHERE profile_id = $1`, [
        profileId,
      ])
    }

    // vendor_views uses user_id (users FK) directly. Drop user_id, keep
    // the visit count for analytics.
    await client.query(
      `UPDATE vendor_views SET user_id = NULL WHERE user_id = $1`,
      [userId]
    )

    // Hard-delete the user. ON DELETE CASCADE on profiles/push_subscriptions/
    // consent_logs handles related tables in one shot.
    const delRes = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    )

    if (delRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await client.query('COMMIT')

    // 3. Clear auth cookies so the deleted user can't reuse the tokens.
    const response = NextResponse.json({
      ok: true,
      deleted: true,
      message: 'Tu cuenta y datos personales fueron eliminados conforme a la Ley 1581/2012.',
    })
    response.cookies.set('token', '', { path: '/', maxAge: 0 })
    response.cookies.set('refresh-token', '', { path: '/', maxAge: 0 })
    return response
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[account delete] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  } finally {
    client.release()
  }
}