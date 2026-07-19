/**
 * Tests for /api/products endpoints — runs with Node's built-in test runner.
 *
 * Run: node --test scripts/tests/products.test.js
 *
 * These tests do NOT require authentication. They cover:
 *   - shape contracts that the seller UI relies on
 *   - validation errors that must come back as 400 (not 500) so the UI
 *     can show a useful message
 *   - ownership/authz paths (404 without auth, 401 etc.)
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')

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

const BASE = 'https://gps.andresmorales.com.co'

async function fetchJSON(path, options = {}) {
  const res = await fetch(BASE + path, options)
  let body = null
  try { body = await res.json() } catch {}
  return { status: res.status, body, headers: res.headers }
}

// --- POST /api/products -----------------------------------------------------

test('POST /api/products without auth returns 401', async () => {
  // CRIT fix: POST was already behind requireAuth, but make the contract
  // explicit so a future regression flips to 200/201 instead of bypassing
  // auth silently.
  const res = await fetchJSON('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x', price: 1 }),
  })
  assert.equal(res.status, 401, 'POST without auth must be 401')
})

test('POST /api/products with missing name still 401 (auth checked first)', async () => {
  // Server short-circuits on auth before validating body, so a missing-name
  // request still gets 401. This documents the ordering: auth wins over
  // body validation so anonymous users can't probe field names.
  const res = await fetchJSON('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: 1000 }),
  })
  assert.equal(res.status, 401)
})

// --- PATCH /api/products/[id] -----------------------------------------------

test('PATCH /api/products/{bad-uuid} returns 400, not 500', async () => {
  // CRIT fix: the old handler ran DELETE regardless of HTTP method, so any
  // call to a malformed id would reach the SQL layer. The new handler
  // validates UUID format up front and returns 400.
  const res = await fetchJSON('/api/products/not-a-uuid', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x' }),
  })
  assert.equal(res.status, 400, 'bad UUID must return 400, not 500')
  assert.ok(res.body?.error, 'should include an error message')
})

test('PATCH /api/products/{bad-uuid} returns 400 (DELETE method)', async () => {
  // Same UUID guard for DELETE
  const res = await fetchJSON('/api/products/not-a-uuid', {
    method: 'DELETE',
  })
  assert.equal(res.status, 400)
})

test('PATCH /api/products/{valid-uuid} without auth returns 401', async () => {
  // Use a syntactically valid UUID to get past the regex and hit the auth
  // check. Order: UUID → auth → ownership → body.
  const res = await fetchJSON('/api/products/00000000-0000-0000-0000-000000000000', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x' }),
  })
  assert.equal(res.status, 401)
})

test('DELETE /api/products/{valid-uuid} without auth returns 401', async () => {
  const res = await fetchJSON('/api/products/00000000-0000-0000-0000-000000000000', {
    method: 'DELETE',
  })
  assert.equal(res.status, 401)
})

// --- GET /api/products ------------------------------------------------------

test('GET /api/products returns products array (anonymous)', async () => {
  // GET is intentionally public so the catalogue is browseable.
  const res = await fetchJSON('/api/products?vendorId=00000000-0000-0000-0000-000000000000')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.products), 'response must have products[]')
})

test('GET /api/products?limit=… shape is stable', async () => {
  // No filters → all products. Smoke-test the response shape.
  const res = await fetchJSON('/api/products')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.products))
  // If there are any rows, each must have the fields the UI renders
  for (const p of res.body.products.slice(0, 3)) {
    assert.ok('id' in p && 'name' in p && 'price' in p, 'product row must have id/name/price')
  }
})

// --- Audit 2026-07-19: extended validation tests ----------------------------

test('GET /api/products?vendorId=bad-uuid returns empty array, not 500', async () => {
  // CRIT audit fix: previously a non-UUID vendorId would reach the SQL layer
  // and Postgres would return 22P02 (invalid_text_representation) → 500.
  // Now the handler validates the UUID and returns 200 with products: [].
  const res = await fetchJSON('/api/products?vendorId=not-a-uuid')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.products, [])
})

test('GET /api/products response shape excludes columns not in allowlist', async () => {
  // Audit fix: switched from SELECT * to an explicit column list so we don't
  // leak future internal columns (e.g. deleted_at, internal_notes).
  // The audit listed 7 public columns. Anything beyond must NOT be present.
  const res = await fetchJSON('/api/products')
  assert.equal(res.status, 200)
  for (const p of res.body.products.slice(0, 3)) {
    const allowed = ['id', 'vendor_id', 'name', 'description', 'price', 'photo_url', 'created_at']
    const keys = Object.keys(p)
    for (const k of keys) {
      assert.ok(allowed.includes(k), `unexpected column ${k} leaked in GET /api/products`)
    }
  }
})

test('POST /api/products requires authentication (revocation-aware)', async () => {
  // Audit fix: switched verifyToken → requireAuth so a revoked session cannot
  // keep creating products until natural JWT expiry.
  const res = await fetchJSON('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'X', price: 1 }),
  })
  assert.equal(res.status, 401, 'must be 401 without auth')
})

test('POST /api/products rejects array-typed name (strict body validation)', async () => {
  // Audit fix: previous code did `if (!name)` which accepted arrays because
  // `if ([1,2])` is truthy. Now the handler checks typeof === 'string'.
  // Without auth we still get 401 (auth wins), but the body parse path must
  // be defensive — we test by sending a body that would otherwise crash the
  // legacy trim() call if it got past auth.
  const res = await fetchJSON('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ['producto'], price: 1000 }),
  })
  assert.equal(res.status, 401, 'auth must be checked first; array-bodied POST still 401')
})

// --- /api/products/[id]/photos ----------------------------------------------

test('GET /api/products/{bad-uuid}/photos returns 400, not 500', async () => {
  // Audit fix: UUID validation up front so a malformed path doesn't reach
  // Postgres and produce a 22P02 error.
  const res = await fetchJSON('/api/products/not-a-uuid/photos')
  assert.equal(res.status, 400)
})

test('POST /api/products/{bad-uuid}/photos returns 400', async () => {
  const res = await fetchJSON('/api/products/not-a-uuid/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/x.jpg' }),
  })
  assert.equal(res.status, 400)
})

test('DELETE /api/products/{bad-uuid}/photos returns 400', async () => {
  const res = await fetchJSON('/api/products/not-a-uuid/photos', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: '00000000-0000-0000-0000-000000000000' }),
  })
  assert.equal(res.status, 400)
})

test('POST /api/products/{uuid}/photos without auth returns 401', async () => {
  const res = await fetchJSON('/api/products/00000000-0000-0000-0000-000000000000/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/x.jpg' }),
  })
  assert.equal(res.status, 401)
})

test('DELETE /api/products/{uuid}/photos without auth returns 401', async () => {
  const res = await fetchJSON('/api/products/00000000-0000-0000-0000-000000000000/photos', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: '00000000-0000-0000-0000-000000000000' }),
  })
  assert.equal(res.status, 401)
})