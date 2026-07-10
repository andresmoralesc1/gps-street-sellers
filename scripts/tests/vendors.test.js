/**
 * Tests for vendors/products endpoints — runs with Node's built-in test runner.
 *
 * Run: node --test scripts/tests/vendors.test.js
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

test('GET /api/vendors returns vendor list', async () => {
  const res = await fetchJSON('/api/vendors')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.vendors), 'should have vendors array')
  assert.ok(res.body.vendors.length > 0, 'should have at least one vendor')
})

test('GET /api/vendors?active=true only returns active vendors', async () => {
  const res = await fetchJSON('/api/vendors?active=true')
  assert.equal(res.status, 200)
  for (const v of res.body.vendors) {
    assert.equal(v.isActive, true, 'all vendors should be active')
  }
})

test('GET /api/vendors?withLocation=true filters out vendors without GPS', async () => {
  const res = await fetchJSON('/api/vendors?withLocation=true')
  assert.equal(res.status, 200)
  for (const v of res.body.vendors) {
    assert.ok(typeof v.latitude === 'number' && typeof v.longitude === 'number',
      `vendor ${v.id} missing GPS`)
  }
})

test('GET /api/products returns product list', async () => {
  const res = await fetchJSON('/api/products')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.products))
})

test('GET /api/cities returns COLOMBIA_CITIES', async () => {
  const res = await fetchJSON('/api/cities')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.cities))
  assert.ok(res.body.cities.find((c) => c.id === 'bogota'), 'should have bogota')
  assert.ok(res.body.cities.find((c) => c.id === 'medellin'), 'should have medellin')
})

test('GET /api/stats returns counters', async () => {
  const res = await fetchJSON('/api/stats')
  assert.equal(res.status, 200)
  assert.ok(typeof res.body.activeVendors === 'number')
  assert.ok(typeof res.body.activeCities === 'number')
})

test('GET /api/favorites without token returns 401', async () => {
  const res = await fetchJSON('/api/favorites')
  assert.equal(res.status, 401)
})

test('GET /api/orders without token returns 401', async () => {
  const res = await fetchJSON('/api/orders')
  assert.equal(res.status, 401)
})

test('GET /api/notifications without token returns 401', async () => {
  const res = await fetchJSON('/api/notifications')
  assert.equal(res.status, 401)
})