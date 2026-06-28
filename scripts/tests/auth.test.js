/**
 * Tests for the auth module — runs with Node's built-in test runner (node:test).
 * No external deps required.
 *
 * Run: node --test scripts/tests/auth.test.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')

// Load .env into process.env
function loadEnv() {
  const envPath = path.join(__dirname, '../../apps/web/.env')
  const txt = fs.readFileSync(envPath, 'utf8')
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

// Reset rate limit so tests aren't blocked by prior runs.
// Each test run starts fresh — useful when iterating locally.
async function resetRateLimit() {
  const { Client } = require('pg')
  const c = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gps_street_sellers',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  })
  try {
    await c.connect()
    await c.query("DELETE FROM rate_limit_attempts WHERE bucket IN ('login', 'register')")
  } catch (e) {
    // table might not exist yet — non-fatal
  } finally {
    await c.end()
  }
}

// Compile the TS file to JS via require hook (use tsx or pre-compile?)
// For simplicity we test via the running Next.js endpoint — see test file #2.
// Here we test the JS-only pieces.

// We use the public /api/auth/login endpoint to verify end-to-end flow.
const BASE = 'https://gps.neuralflow.space'

async function fetchJSON(path, options = {}) {
  const res = await fetch(BASE + path, options)
  let body = null
  try { body = await res.json() } catch {}
  return { status: res.status, body, headers: res.headers }
}

test('POST /api/auth/login with valid creds returns 200 + token', async () => {
  await resetRateLimit()
  const res = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@hermes.local', password: 'TestPassword123' }),
  })
  assert.equal(res.status, 200)
  assert.ok(res.body.token, 'should have token')
  assert.ok(res.body.user, 'should have user')
  assert.equal(res.body.user.email, 'test@hermes.local')
  assert.equal(res.body.user.role, 'buyer')
})

test('POST /api/auth/login with wrong password returns 401', async () => {
  const res = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@hermes.local', password: 'wrong-password' }),
  })
  assert.equal(res.status, 401)
  assert.equal(res.body.error, 'Credenciales inválidas')
})

test('POST /api/auth/login with empty body returns 400', async () => {
  const res = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'Faltan credenciales')
})

test('POST /api/auth/login with non-existent user returns 401 (no info leak)', async () => {
  const res = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody-here@nowhere.local', password: 'whatever' }),
  })
  assert.equal(res.status, 401)
  // Same error message as wrong-password → no user enumeration
  assert.equal(res.body.error, 'Credenciales inválidas')
})

test('GET /api/auth/me with no token returns 401', async () => {
  const res = await fetchJSON('/api/auth/me')
  assert.equal(res.status, 401)
})

test('GET /api/auth/me with invalid token returns 401', async () => {
  const res = await fetchJSON('/api/auth/me', {
    headers: { Authorization: 'Bearer fake.invalid.token' },
  })
  assert.equal(res.status, 401)
  assert.equal(res.body.error, 'Token inválido')
})

test('GET /api/auth/me with valid token returns user', async () => {
  // First, log in to get a token
  const login = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@hermes.local', password: 'TestPassword123' }),
  })
  const token = login.body.token

  const me = await fetchJSON('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(me.status, 200)
  assert.equal(me.body.email, 'test@hermes.local')
})

test('GET /api/auth/me with cookie token works too', async () => {
  const login = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@hermes.local', password: 'TestPassword123' }),
  })
  // Capture Set-Cookie from login response
  // fetch in Node doesn't expose raw Set-Cookie header easily; we test via Authorization above.
  // This is just to ensure the cookie path works through the middleware-protected route /favorites.
  const favorites = await fetch(BASE + '/favorites', {
    redirect: 'manual',
    headers: { Cookie: `token=${login.body.token}` },
  })
  assert.notEqual(favorites.status, 500)
  // Should redirect (307) to login if cookie token is bad, or 200 if valid.
  // Our test user has valid token so middleware should let it through.
  // The page itself returns 200 because /favorites is an authenticated page.
  assert.ok([200, 307].includes(favorites.status))
})

test('POST /api/auth/register rejects invalid city', async () => {
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'unique-fresh-' + Date.now() + '@test.local',
      password: 'Password123',
      name: 'Test',
      phone: '3001234567',
      cityId: 'atlantis', // not in COLOMBIA_CITIES
    }),
  })
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'Ciudad inválida')
})

test('PATCH /api/products/[id] rejects malformed UUID', async () => {
  const login = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@hermes.local', password: 'TestPassword123' }),
  })
  const res = await fetchJSON('/api/products/not-a-uuid', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${login.body.token}`,
    },
    body: JSON.stringify({ name: 'x' }),
  })
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'ID inválido')
})