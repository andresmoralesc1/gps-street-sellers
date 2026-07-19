import { NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import pool from '@/lib/db'

/**
 * GET /api/health/ready — readiness probe (deep check).
 *
 * Pings the database with a real query and measures latency. Returns:
 *   - 200 OK   when DB is reachable and responding within threshold
 *   - 503      when DB is unreachable, slow, or pool is exhausted
 *
 * Use this for:
 *   - UptimeRobot / BetterStack / Pingdom (every 30-60s)
 *   - Pre-deploy smoke checks
 *   - Alerting when DB goes down
 *
 * Response includes per-check status so monitoring tools can surface
 * the actual problem without parsing prose.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DB_TIMEOUT_MS = 2000 // If DB takes longer than this, return 503.

interface CheckResult {
  status: 'ok' | 'fail'
  latencyMs: number
  error?: string
}

interface ReadyResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  checks: {
    database: CheckResult
  }
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    // Run with a timeout — pg has its own statement_timeout but we add a
    // race-level guard so a hung connection doesn't hang the health check.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS)
    )
    const query = pool.query('SELECT 1 AS ok')
    const result = await Promise.race([query, timeout])
    const latency = Date.now() - start
    if (result.rows[0]?.ok !== 1) {
      return { status: 'fail', latencyMs: latency, error: 'Unexpected query result' }
    }
    return { status: 'ok', latencyMs: latency }
  } catch (err) {
    // Do NOT leak driver / connection / host details to public callers.
    // Logs (server-side) capture the full error so operators can debug.
    const msg = err instanceof Error ? err.message : ''
    const safeError = msg === 'timeout' ? 'timeout' : 'check_failed'
    if (msg) {
      logger.error(serializeErr(msg), '[health/ready] database check error:')
    }
    return {
      status: 'fail',
      latencyMs: Date.now() - start,
      error: safeError,
    }
  }
}

export async function GET(): Promise<NextResponse<ReadyResponse>> {
  const database = await checkDatabase()
  const allOk = database.status === 'ok'

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: { database },
    },
    { status: allOk ? 200 : 503 }
  )
}