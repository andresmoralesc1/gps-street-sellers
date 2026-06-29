/**
 * DB-bound auth helpers — must only be imported from API routes (node runtime).
 *
 * Do NOT import this from middleware.ts or any edge runtime code,
 * because `pg` (PostgreSQL client) is not edge-compatible.
 */

import pool from './db'

/**
 * Returns true if the token's tokenVersion no longer matches the user's current version
 * (i.e. the token has been revoked by a logout or admin action).
 */
export async function isTokenRevoked(userId: string, tokenVersion: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT token_version FROM profiles WHERE user_id = $1',
    [userId]
  )
  if (result.rows.length === 0) return false // profile row missing = not revoked
  return result.rows[0].token_version !== tokenVersion
}