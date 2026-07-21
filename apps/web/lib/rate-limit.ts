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
import { getClientIp } from './trusted-ip'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number
}

/**
 * Convenience wrapper that resolves the client IP from a NextRequest
 * (using the trusted-proxy logic) and then calls checkRateLimit.
 * Callers that already have a string IP can still call checkRateLimit
 * directly with the `ip` argument.
 */
export async function checkRateLimitFromRequest(
  req: { headers: Headers },
  bucket: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return checkRateLimit(getClientIp(req as any), bucket, maxAttempts, windowMs)
}

export async function checkRateLimit(
  ip: string,
  bucket: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs)

  // CRIT-9: set a short statement timeout so a stuck rate-limit query can't
  // hold a connection from the pool. 1.5s is generous for COUNT + a single
  // index lookup, but short enough to fail fast if the table grows or DB stalls.
  await pool.query("SET LOCAL statement_timeout = '1500ms'")

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