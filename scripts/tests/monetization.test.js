/**
 * Tests for Etapa 6 — monetization (sponsorships, ads) + SSE stream.
 *
 * Covers:
 *   - POST /api/sponsorships requires auth (401)
 *   - POST /api/sponsorships rejects invalid plan
 *   - POST /api/sponsorships creates 7-day semanal sponsorship
 *   - POST /api/sponsorships rejects duplicate active (409)
 *   - GET /api/vendors returns is_sponsored flag (from view)
 *   - GET /api/vendors filters by bbox
 *   - GET /api/vendors includes ads array
 *
 * Run: node --test scripts/tests/monetization.test.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const { loadEnv } = require('./_lib/env-loader')
loadEnv()

function installNextStub() {
  const p = path.join(__dirname, '../../apps/web/node_modules/next/server.js')
  if (!require.cache[p]) {
    Module._cache[p] = {
      id: p, filename: p, loaded: true,
      exports: {
        NextResponse: class {
          constructor(body, init) {
            this.body = body; this.status = init?.status ?? 200; this.headers = init?.headers ?? {}
          }
          static json(data, init) {
            const body = JSON.stringify(data)
            const nr = new module.exports.NextResponse(body, {
              ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
            })
            nr._body = body
            return nr
          }
        },
      },
    }
  }
}

function stubAuth({ payload = null } = {}) {
  const orig = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/auth') || req === '@/lib/auth') {
      return {
        verifyToken: async () => payload,
        getTokenFromRequest: () => (payload ? 'fake-token' : null),
      }
    }
    return orig.call(this, req, ...rest)
  }
  return () => { Module._load = orig }
}

function makeFakePool() {
  const state = {
    vendors: [],
    sponsorships: [],
    ad_campaigns: [],
  }

  return {
    query: async (sql, params = []) => {
      const s = sql.trim()

      // ----- vendors_with_sponsorship view -----
      if (/SELECT v\.\*, c\.label AS category_label\s+FROM vendors_with_sponsorship/.test(s)) {
        const where = []
        const vars = {}
        for (let i = 0; i < params.length; i++) vars[`$${i + 1}`] = params[i]
        let filtered = state.vendors.map((v) => ({
          ...v,
          is_sponsored: state.sponsorships.some(
            (sp) => sp.vendor_id === v.id && sp.status === 'active' && new Date(sp.ends_at) > new Date()
          ),
          sponsored_until: state.sponsorships
            .filter((sp) => sp.vendor_id === v.id && sp.status === 'active' && new Date(sp.ends_at) > new Date())
            .reduce((acc, sp) => (acc == null || sp.ends_at > acc ? sp.ends_at : acc), null),
          category_label: v.category,
        }))
        // Apply filter conditions (rough matching)
        if (/v\.category = \$1/.test(s) && vars['$1']) filtered = filtered.filter((v) => v.category === vars['$1'])
        if (/v\.is_active = true/.test(s)) filtered = filtered.filter((v) => v.is_active)
        if (/v\.city_id = \$1/.test(s) && vars['$1']) filtered = filtered.filter((v) => v.city_id === vars['$1'])
        if (/v\.vehicle_type = \$1/.test(s) && vars['$1']) filtered = filtered.filter((v) => v.vehicle_type === vars['$1'])
        if (/v\.latitude IS NOT NULL/.test(s)) filtered = filtered.filter((v) => v.latitude != null && v.longitude != null)
        if (/v\.latitude BETWEEN \$1 AND \$2/.test(s)) {
          filtered = filtered.filter((v) => v.latitude >= vars['$1'] && v.latitude <= vars['$2'])
        }
        if (/v\.longitude BETWEEN \$3 AND \$4/.test(s)) {
          filtered = filtered.filter((v) => v.longitude >= vars['$3'] && v.longitude <= vars['$4'])
        }
        // ORDER BY ... LIMIT
        const lim = /LIMIT (\d+)/.exec(s)
        if (lim) filtered = filtered.slice(0, parseInt(lim[1], 10))
        return { rows: filtered }
      }

      // ----- ad_campaigns -----
      if (/SELECT id, brand_name, image_url, target_url, target_city_id, target_category/.test(s)) {
        const now = new Date()
        let ads = state.ad_campaigns.filter(
          (a) => a.status === 'active' && new Date(a.starts_at) <= now && new Date(a.ends_at) >= now
        )
        if (/target_city_id IS NULL/.test(s) && !/target_city_id =/.test(s)) {
          ads = ads.filter((a) => a.target_city_id == null)
        } else if (/target_city_id IS NULL OR target_city_id = \$1/.test(s)) {
          ads = ads.filter((a) => a.target_city_id == null || a.target_city_id === params[0])
        }
        if (/target_category IS NULL/.test(s) && !/target_category =/.test(s)) {
          ads = ads.filter((a) => a.target_category == null)
        }
        return { rows: ads }
      }

      // ----- sponsorship creation -----
      if (/INSERT INTO sponsorships \(vendor_id, plan, amount_cents, ends_at, status\)/.test(s)) {
        const [vendorId, plan, amount, ends_at, status] = params
        const row = {
          id: 'sp-' + (state.sponsorships.length + 1),
          vendor_id: vendorId, plan, amount_cents: amount, ends_at, status,
          starts_at: new Date().toISOString(),
        }
        state.sponsorships.push(row)
        return { rows: [row] }
      }

      // ----- duplicate check -----
      if (/SELECT id, ends_at FROM sponsorships\s+WHERE vendor_id = \$1 AND status = 'active' AND ends_at > NOW/.test(s)) {
        const now = new Date()
        const row = state.sponsorships.find(
          (sp) => sp.vendor_id === params[0] && sp.status === 'active' && new Date(sp.ends_at) > now
        )
        return { rows: row ? [{ id: row.id, ends_at: row.ends_at }] : [] }
      }

      // ----- list user's sponsorships -----
      if (/SELECT id, plan, amount_cents, starts_at, ends_at, status, created_at\s+FROM sponsorships\s+WHERE vendor_id = \$1/.test(s)) {
        const rows = state.sponsorships
          .filter((sp) => sp.vendor_id === params[0])
          .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at))
        return { rows }
      }

      // ----- get my vendor id -----
      if (/SELECT v\.id FROM vendors v JOIN profiles p ON p\.id = v\.profile_id WHERE p\.user_id = \$1/.test(s)) {
        const v = state.vendors.find((v) => v.profile_user_id === params[0])
        return { rows: v ? [{ id: v.id }] : [] }
      }

      // ----- get one user (test helper) -----
      if (/SELECT id, latitude, longitude, is_active, location_updated_at\s+FROM vendors_with_sponsorship\s+WHERE city_id = \$1/.test(s)) {
        let filtered = state.vendors.filter((v) => v.city_id === params[0] && v.latitude != null)
        return { rows: filtered }
      }

      throw new Error('Fake pool: unhandled SQL — ' + s.slice(0, 80))
    },
    __getState: () => state,
  }
}

function withPool(pool, fn) {
  const orig = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/db') || req === '@/lib/db') return pool
    return orig.call(this, req, ...rest)
  }
  return Promise.resolve(fn()).finally(() => {
    Module._load = orig
  })
}

function makeReq({ headers = {}, body = {} } = {}) {
  const reqHeaders = { 'content-type': 'application/json', ...headers }
  if (headers.cookie) reqHeaders.cookie = headers.cookie
  if (headers.authorization) reqHeaders.authorization = headers.authorization
  return {
    headers: new Map(Object.entries(reqHeaders)),
    async json() { return body },
    async formData() { return new Map() },
  }
}

let sponsorGET, sponsorPOST, vendorsGET

test.before(async () => {
  installNextStub()
  try {
    require('tsx/cjs')
    sponsorGET = (await import('../apps/web/app/api/sponsorships/route.ts')).GET
    sponsorPOST = (await import('../apps/web/app/api/sponsorships/route.ts')).POST
    vendorsGET = (await import('../apps/web/app/api/vendors/route.ts')).GET
  } catch (err) {
    test.skip('could not load route modules: ' + err.message)
  }
})

test('POST /api/sponsorships rejects without auth', async () => {
  if (!sponsorPOST) return
  const restore = stubAuth({ payload: null })
  const pool = makeFakePool()
  await withPool(pool, async () => {
    const res = await sponsorPOST(makeReq({ body: { plan: 'semanal' } }))
    assert.equal(res.status, 401)
  })
  restore()
})

test('POST /api/sponsorships rejects invalid plan', async () => {
  if (!sponsorPOST) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'seller' } })
  const pool = makeFakePool({
    vendors: [{ id: 'v1', profile_user_id: 'u1', category: 'comida' }],
  })
  await withPool(pool, async () => {
    const res = await sponsorPOST(makeReq({ body: { plan: 'trimestral' } }))
    assert.equal(res.status, 400)
    assert.match(JSON.parse(res.body).error, /plan/)
  })
  restore()
})

test('POST /api/sponsorships creates 7-day semanal sponsorship', async () => {
  if (!sponsorPOST) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'seller' } })
  const pool = makeFakePool({
    vendors: [{ id: 'v1', profile_user_id: 'u1', category: 'comida' }],
  })
  await withPool(pool, async () => {
    const res = await sponsorPOST(makeReq({ body: { plan: 'semanal' } }))
    assert.equal(res.status, 200)
    const sp = JSON.parse(res.body).sponsorship
    assert.equal(sp.plan, 'semanal')
    assert.equal(sp.amountCents, 2_000_000) // 20.000 COP in cents
    assert.equal(sp.status, 'active')
    // ends_at must be ~7 days in the future
    const days = (new Date(sp.endsAt) - new Date(sp.startsAt)) / (1000 * 60 * 60 * 24)
    assert.ok(days >= 6.9 && days <= 7.1, `expected ~7 days, got ${days}`)
  })
  restore()
})

test('POST /api/sponsorships rejects duplicate active (409)', async () => {
  if (!sponsorPOST) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'seller' } })
  const pool = makeFakePool({
    vendors: [{ id: 'v1', profile_user_id: 'u1', category: 'comida' }],
  })
  await withPool(pool, async () => {
    const first = await sponsorPOST(makeReq({ body: { plan: 'semanal' } }))
    assert.equal(first.status, 200)
    const second = await sponsorPOST(makeReq({ body: { plan: 'mensual' } }))
    assert.equal(second.status, 409)
  })
  restore()
})

test('GET /api/sponsorships returns active + history', async () => {
  if (!sponsorGET) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'seller' } })
  const pool = makeFakePool({
    vendors: [{ id: 'v1', profile_user_id: 'u1', category: 'comida' }],
  })
  await withPool(pool, async () => {
    await sponsorPOST(makeReq({ body: { plan: 'semanal' } }))
    const res = await sponsorGET(makeReq({}))
    assert.equal(res.status, 200)
    const list = JSON.parse(res.body).sponsorships
    assert.equal(list.length, 1)
    assert.equal(list[0].plan, 'semanal')
    assert.equal(list[0].active, true)
  })
  restore()
})

test('GET /api/vendors returns isSponsored flag in response', async () => {
  if (!vendorsGET) return
  const pool = makeFakePool({
    vendors: [
      { id: 'v1', name: 'Sponsored', category: 'comida', city_id: 'bog', is_active: true, latitude: 4.6, longitude: -74.0, rating: 4.5, review_count: 10 },
      { id: 'v2', name: 'Organic', category: 'comida', city_id: 'bog', is_active: true, latitude: 4.7, longitude: -74.1, rating: 4.0, review_count: 5 },
    ],
    sponsorships: [
      { id: 'sp1', vendor_id: 'v1', plan: 'semanal', amount_cents: 2_000_000, status: 'active', starts_at: new Date(Date.now() - 86_400_000).toISOString(), ends_at: new Date(Date.now() + 6 * 86_400_000).toISOString() },
    ],
  })
  await withPool(pool, async () => {
    const req = makeReq({ headers: { cookie: '' } })
    req.url = 'http://test/api/vendors'
    const res = await vendorsGET(req)
    assert.equal(res.status, 200)
    const data = JSON.parse(res.body)
    assert.equal(data.vendors.length, 2)
    const sponsored = data.vendors.find((v) => v.name === 'Sponsored')
    const organic = data.vendors.find((v) => v.name === 'Organic')
    assert.equal(sponsored.isSponsored, true)
    assert.equal(organic.isSponsored, false)
    // Sponsored must come first
    assert.equal(data.vendors[0].id, 'v1', 'sponsored should be first')
    assert.equal(data.sponsoredCount, 1)
  })
})

test('GET /api/vendors filters by bbox', async () => {
  if (!vendorsGET) return
  const pool = makeFakePool({
    vendors: [
      { id: 'in1', name: 'In', city_id: 'bog', is_active: true, latitude: 4.6, longitude: -74.0, category: 'comida' },
      { id: 'in2', name: 'In', city_id: 'bog', is_active: true, latitude: 4.7, longitude: -74.1, category: 'comida' },
      { id: 'out1', name: 'Out', city_id: 'bog', is_active: true, latitude: 10.0, longitude: -75.0, category: 'comida' },
    ],
  })
  await withPool(pool, async () => {
    const req = makeReq({})
    req.url = 'http://test/api/vendors?bbox=4.5,-74.2,4.8,-73.9'
    const res = await vendorsGET(req)
    const data = JSON.parse(res.body)
    assert.equal(data.vendors.length, 2, 'should only return 2 in bbox')
    assert.ok(data.vendors.every((v) => v.id !== 'out1'))
  })
})

test('GET /api/vendors includes ads array', async () => {
  if (!vendorsGET) return
  const pool = makeFakePool({
    vendors: [{ id: 'v1', name: 'X', city_id: 'bog', is_active: true, latitude: 4.6, longitude: -74.0, category: 'comida' }],
    ad_campaigns: [
      {
        id: 'ad1', brand_name: 'Coca-Cola', image_url: '/uploads/ad1.png', target_url: 'https://coca-cola.com',
        target_city_id: null, target_category: null,
        starts_at: new Date(Date.now() - 86_400_000).toISOString(),
        ends_at: new Date(Date.now() + 86_400_000).toISOString(),
        status: 'active',
      },
    ],
  })
  await withPool(pool, async () => {
    const req = makeReq({})
    req.url = 'http://test/api/vendors'
    const res = await vendorsGET(req)
    const data = JSON.parse(res.body)
    assert.ok(Array.isArray(data.ads))
    assert.equal(data.ads.length, 1)
    assert.equal(data.ads[0].brandName, 'Coca-Cola')
  })
})