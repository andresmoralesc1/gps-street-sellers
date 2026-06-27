/**
 * Persistent rate limiter — IP + bucket based, backed by Postgres.
 *
 * Survives PM2 restarts. Use in place of the old in-memory `Map<string, count>`.
 *
 * Usage:
 *   const { allowed, remaining, retryAfter } = await checkRateLimit(ip, 'login', 10, 15 * 60 * 1000)
 *   if (!allowed) return 429
 */

import pool from './db'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number
}

export async function checkRateLimit(
  ip: string,
  bucket: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs)

  // Count existing attempts in window
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM rate_limit_attempts
     WHERE ip = $1 AND bucket = $2 AND attempted_at >= $3`,
    [ip, bucket, since]
  )
  const count: number = countResult.rows[0].count

  if (count >= maxAttempts) {
    // Find oldest attempt in window — that determines retry-after
    const oldest = await pool.query(
      `SELECT attempted_at FROM rate_limit_attempts
       WHERE ip = $1 AND bucket = $2 AND attempted_at >= $3
       ORDER BY attempted_at ASC LIMIT 1`,
      [ip, bucket, since]
    )
    const retryAfter = oldest.rows.length
      ? Math.ceil((oldest.rows[0].attempted_at.getTime() + windowMs - Date.now()) / 1000)
      : Math.ceil(windowMs / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  // Record this attempt
  await pool.query(
    'INSERT INTO rate_limit_attempts (ip, bucket) VALUES ($1, $2)',
    [ip, bucket]
  )

  return { allowed: true, remaining: maxAttempts - count - 1 }
}

/**
 * Periodic cleanup — call from a cron job or invoke manually.
 * Removes attempts older than 1 day (anything older is irrelevant for 15-min windows).
 */
export async function cleanupRateLimits() {
  await pool.query(
    "DELETE FROM rate_limit_attempts WHERE attempted_at < NOW() - INTERVAL '1 day'"
  )
}