import { NextResponse } from 'next/server'

/**
 * GET /api/health — cheap liveness probe.
 *
 * Returns immediately. Does NOT touch the database or any external service.
 * Use this for:
 *   - Load balancer / k8s liveness probe (is the process responsive?)
 *   - Uptime monitoring that polls every few seconds
 *
 * For deep checks (DB connection, external services) use /api/health/ready.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface HealthResponse {
  status: 'ok'
  uptime: number
  uptimeHuman: string
  timestamp: string
  version: string
  memory: {
    heapUsedMB: number
    heapTotalMB: number
    rssMB: number
  }
  pid: number
  nodeVersion: string
}

function humanizeUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const mem = process.memoryUsage()
  const version =
    process.env.npm_package_version || process.env.APP_VERSION || '0.1.0'

  return NextResponse.json({
    status: 'ok',
    uptime: process.uptime(),
    uptimeHuman: humanizeUptime(process.uptime()),
    timestamp: new Date().toISOString(),
    version,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
    pid: process.pid,
    nodeVersion: process.version,
  })
}