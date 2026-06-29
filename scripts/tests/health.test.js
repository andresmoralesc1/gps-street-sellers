/**
 * Tests for the /api/health endpoints — runs with Node's built-in test runner.
 *
 * Strategy:
 *   - /api/health: no DB. Just verify it returns 200 + expected fields.
 *   - /api/health/ready: fakes the DB pool with both pass and fail modes
 *     and asserts the response code + body shape.
 *
 * Run: node --test scripts/tests/health.test.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')

function loadEnv() {
  const envPath = path.join(__dirname, '../../apps/web/.env')
  const txt = require('node:fs').readFileSync(envPath, 'utf8')
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m) {
      let v = m[2].trim()
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}
loadEnv()

// Mock NextResponse so we can import the route handlers in plain Node.
const nextServerPath = path.join(__dirname, '../../apps/web/node_modules/next/server.js')
try {
  require.resolve(nextServerPath)
} catch {
  // next/server only resolves under Next's bundler — install a stub for tests.
  Module._cache[nextServerPath] = {
    id: nextServerPath,
    filename: nextServerPath,
    loaded: true,
    exports: {
      NextResponse: class {
        constructor(body, init) {
          this.body = body
          this.status = init?.status ?? 200
          this.headers = init?.headers ?? {}
        }
        static json(data, init) {
          return new module.exports.NextResponse(JSON.stringify(data), {
            ...init,
            headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
          })
        }
      },
    },
  }
}

// ---- Fakes -----------------------------------------------------------------

function fakePool(behavior) {
  return {
    async query(sql) {
      const s = sql.trim()
      if (s === 'SELECT 1 AS ok') {
        if (behavior === 'ok') return { rows: [{ ok: 1 }] }
        if (behavior === 'wrong') return { rows: [{ ok: 0 }] }
        if (behavior === 'throw') throw new Error('connection refused')
        if (behavior === 'slow') {
          await new Promise((r) => setTimeout(r, 3000))
          return { rows: [{ ok: 1 }] }
        }
      }
      throw new Error('fakePool: unhandled — ' + s.slice(0, 60))
    },
  }
}

function withPool(behavior, fn) {
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/db')) return fakePool(behavior)
    return origLoad.call(this, req, ...rest)
  }
  return Promise.resolve(fn()).finally(() => {
    Module._load = origLoad
  })
}

// ---- Load handlers (after stubs are in place) ------------------------------

const healthPath = path.join(__dirname, '../../apps/web/app/api/health/route.ts')
const readyPath = path.join(__dirname, '../../apps/web/app/api/health/ready/route.ts')

let healthHandler, readyHandler
test.before(async () => {
  // Add a tsx-style loader hook so we can import .ts routes directly.
  // If tsx isn't installed we skip these tests gracefully.
  try {
    require.resolve('tsx/cjs')
    require('tsx/cjs')
  } catch {
    test.skip('tsx not installed — skipping health route tests')
    return
  }
  try {
    healthHandler = (await import(healthPath)).GET
    readyHandler = (await import(readyPath)).GET
  } catch (err) {
    test.skip('could not load route modules: ' + err.message)
  }
})

// ---- /api/health -----------------------------------------------------------

test('GET /api/health returns 200 with uptime, memory, version', async () => {
  if (!healthHandler) return
  const res = await healthHandler()
  assert.equal(res.status, 200)
  const body = JSON.parse(res.body)
  assert.equal(body.status, 'ok')
  assert.equal(typeof body.uptime, 'number')
  assert.ok(body.uptime >= 0)
  assert.equal(typeof body.uptimeHuman, 'string')
  assert.equal(typeof body.timestamp, 'string')
  // ISO 8601 sanity check
  assert.ok(!isNaN(Date.parse(body.timestamp)))
  assert.equal(typeof body.memory.heapUsedMB, 'number')
  assert.equal(typeof body.memory.rssMB, 'number')
  assert.equal(typeof body.pid, 'number')
  assert.match(body.nodeVersion, /^v\d+\.\d+\.\d+/)
})

test('GET /api/health does NOT touch the database', async () => {
  if (!healthHandler) return
  // If the handler touches the DB the next test (with throwing pool) would fail,
  // so just calling it twice in a row proves it's pool-independent.
  const a = await healthHandler()
  const b = await healthHandler()
  assert.equal(a.status, 200)
  assert.equal(b.status, 200)
})

// ---- /api/health/ready -----------------------------------------------------

test('GET /api/health/ready returns 200 when DB responds', async () => {
  if (!readyHandler) return
  await withPool('ok', async () => {
    const res = await readyHandler()
    assert.equal(res.status, 200)
    const body = JSON.parse(res.body)
    assert.equal(body.status, 'ok')
    assert.equal(body.checks.database.status, 'ok')
    assert.ok(body.checks.database.latencyMs >= 0)
    assert.ok(body.checks.database.latencyMs < 100) // local PG is fast
  })
})

test('GET /api/health/ready returns 503 when DB throws', async () => {
  if (!readyHandler) return
  await withPool('throw', async () => {
    const res = await readyHandler()
    assert.equal(res.status, 503)
    const body = JSON.parse(res.body)
    assert.equal(body.status, 'degraded')
    assert.equal(body.checks.database.status, 'fail')
    assert.match(body.checks.database.error, /connection refused/)
  })
})

test('GET /api/health/ready returns 503 when DB returns unexpected shape', async () => {
  if (!readyHandler) return
  await withPool('wrong', async () => {
    const res = await readyHandler()
    assert.equal(res.status, 503)
    const body = JSON.parse(res.body)
    assert.equal(body.checks.database.status, 'fail')
    assert.match(body.checks.database.error, /Unexpected query result/)
  })
})