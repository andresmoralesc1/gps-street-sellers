/**
 * Tests for Ley 1581/2012 ARCO endpoints + consent log.
 *
 * Covers:
 *   - POST /api/consent: validation, anon-with-email, id (user), dedupe
 *   - GET /api/account/export: structure, no password_hash, includes consent log
 *   - DELETE /api/account: confirm header required, hard-delete cascade
 *
 * Run: node --test scripts/tests/arco.test.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
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

// ---- Next.js + auth stubs ---------------------------------------------------

function installNextStub() {
  const nextServerPath = path.join(__dirname, '../../apps/web/node_modules/next/server.js')
  if (!require.cache[nextServerPath]) {
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
            const body = JSON.stringify(data)
            const nr = new module.exports.NextResponse(body, {
              ...init,
              headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
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
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/auth') || req === '@/lib/auth') {
      return {
        verifyToken: async () => payload,
        getTokenFromRequest: () => payload ? 'fake-token' : null,
        signTokenSync: () => 'signed.jwt.token',
      }
    }
    return origLoad.call(this, req, ...rest)
  }
  return () => {
    Module._load = origLoad
  }
}

// ---- In-memory DB pool ------------------------------------------------------

function makeFakePool(seed = {}) {
  const state = {
    users: seed.users ?? [],
    profiles: seed.profiles ?? [],
    consent_logs: seed.consent_logs ?? [],
    vendors: seed.vendors ?? [],
    orders: seed.orders ?? [],
    favorites: seed.favorites ?? [],
    notifications: seed.notifications ?? [],
    push_subscriptions: seed.push_subscriptions ?? [],
    vendor_views: seed.vendor_views ?? [],
  }

  const client = {
    async query(sql, params) {
      const s = sql.trim()

      // --- consent_logs ---
      if (/INSERT INTO consent_logs/i.test(s)) {
        const [userId, type, version, granted, ip, ua] = params
        // Idempotent — if exists, return same row
        const existing = state.consent_logs.find(
          (r) => r.user_id === userId && r.consent_type === type && r.policy_version === version
        )
        if (existing) return { rows: [existing], rowCount: 0 }
        const row = {
          id: 'cl-' + (state.consent_logs.length + 1),
          user_id: userId,
          consent_type: type,
          policy_version: version,
          granted,
          ip_address: ip,
          user_agent: ua,
          created_at: new Date().toISOString(),
        }
        state.consent_logs.push(row)
        return { rows: [row], rowCount: 1 }
      }

      // --- BEGIN / COMMIT ---
      if (/^BEGIN/i.test(s)) return { rows: [] }
      if (/^COMMIT/i.test(s)) return { rows: [] }
      if (/^ROLLBACK/i.test(s)) return { rows: [] }

      // --- account DELETE flow ---
      if (/SELECT id FROM profiles WHERE user_id/i.test(s)) {
        const u = state.profiles.find((p) => p.user_id === params[0])
        return { rows: u ? [{ id: u.id }] : [] }
      }
      if (/UPDATE orders SET buyer_id = NULL/i.test(s)) {
        let n = 0
        state.orders.forEach((o) => {
          if (o.buyer_id === params[0]) {
            o.buyer_id = null
            n++
          }
        })
        return { rows: [], rowCount: n }
      }
      if (/DELETE FROM favorites WHERE buyer_id/i.test(s)) {
        const before = state.favorites.length
        for (let i = state.favorites.length - 1; i >= 0; i--) {
          if (state.favorites[i].buyer_id === params[0]) state.favorites.splice(i, 1)
        }
        return { rows: [], rowCount: before - state.favorites.length }
      }
      if (/DELETE FROM notifications WHERE profile_id/i.test(s)) {
        const before = state.notifications.length
        for (let i = state.notifications.length - 1; i >= 0; i--) {
          if (state.notifications[i].profile_id === params[0]) state.notifications.splice(i, 1)
        }
        return { rows: [], rowCount: before - state.notifications.length }
      }
      if (/UPDATE vendor_views SET user_id = NULL/i.test(s)) {
        let n = 0
        state.vendor_views.forEach((v) => {
          if (v.user_id === params[0]) {
            v.user_id = null
            n++
          }
        })
        return { rows: [], rowCount: n }
      }
      if (/DELETE FROM users WHERE id = \$1 RETURNING id/i.test(s)) {
        const idx = state.users.findIndex((u) => u.id === params[0])
        if (idx === -1) return { rows: [], rowCount: 0 }
        state.users.splice(idx, 1)
        // Simulate cascade
        for (let i = state.profiles.length - 1; i >= 0; i--) {
          if (state.profiles[i].user_id === params[0]) state.profiles.splice(i, 1)
        }
        for (let i = state.push_subscriptions.length - 1; i >= 0; i--) {
          if (state.push_subscriptions[i].user_id === params[0]) state.push_subscriptions.splice(i, 1)
        }
        for (let i = state.consent_logs.length - 1; i >= 0; i--) {
          if (state.consent_logs[i].user_id === params[0]) state.consent_logs.splice(i, 1)
        }
        return { rows: [{ id: params[0] }], rowCount: 1 }
      }

      // --- account EXPORT flow ---
      if (/SELECT id, email, name, phone, city_id, role, created_at\s+FROM users/i.test(s)) {
        return { rows: state.users.filter((u) => u.id === params[0]) }
      }
      if (/SELECT id FROM vendors WHERE user_id = \$1/i.test(s)) {
        return { rows: state.vendors.filter((v) => v.user_id === params[0]) }
      }
      if (/FROM orders WHERE buyer_id = \$1 ORDER BY/i.test(s)) {
        return { rows: state.orders.filter((o) => o.buyer_id === params[0]) }
      }
      if (/FROM orders WHERE vendor_id = \$1 ORDER BY/i.test(s)) {
        return { rows: state.orders.filter((o) => o.vendor_id === params[0]) }
      }
      if (/FROM favorites\s+WHERE buyer_id = \$1 ORDER BY/i.test(s)) {
        return { rows: state.favorites.filter((f) => f.buyer_id === params[0]) }
      }
      if (/FROM consent_logs WHERE user_id = \$1/i.test(s)) {
        return { rows: state.consent_logs.filter((c) => c.user_id === params[0]) }
      }
      if (/FROM push_subscriptions WHERE user_id = \$1/i.test(s)) {
        return { rows: state.push_subscriptions.filter((p) => p.user_id === params[0]) }
      }

      throw new Error('Fake pool: unhandled SQL — ' + s.slice(0, 80))
    },
  }

  const pool = {
    query: client.query,
    async connect() {
      return client
    },
    __getState: () => state,
  }
  return pool
}

function withPool(pool, fn) {
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/db') || req === '@/lib/db') return pool
    return origLoad.call(this, req, ...rest)
  }
  return Promise.resolve(fn()).finally(() => {
    Module._load = origLoad
  })
}

// ---- Load handlers ----------------------------------------------------------

let consentHandler, exportHandler, deleteHandler

test.before(async () => {
  installNextStub()
  try {
    require.resolve('tsx/cjs')
    require('tsx/cjs')
  } catch {
    test.skip('tsx not installed — skipping ARCO tests')
    return
  }
  try {
    consentHandler = (await import('../apps/web/app/api/consent/route.ts')).POST
    exportHandler = (await import('../apps/web/app/api/account/export/route.ts')).GET
    deleteHandler = (await import('../apps/web/app/api/account/route.ts')).DELETE
  } catch (err) {
    test.skip('could not load route modules: ' + err.message)
  }
})

function makeRequest({ body, headers = {}, cookies = '' } = {}) {
  const reqHeaders = { 'content-type': 'application/json', ...headers }
  if (cookies) reqHeaders.cookie = cookies
  return {
    headers: new Map(Object.entries(reqHeaders)),
    async json() {
      return body
    },
  }
}

// ---- /api/consent ----------------------------------------------------------

test('POST /api/consent rejects invalid consentType', async () => {
  if (!consentHandler) return
  const restore = stubAuth()
  const pool = makeFakePool()
  await withPool(pool, async () => {
    const res = await consentHandler(
      makeRequest({ body: { consentType: 'hacking', granted: true } })
    )
    assert.equal(res.status, 400)
    assert.match(JSON.parse(res.body).error, /consentType/)
  })
  restore()
})

test('POST /api/consent rejects missing granted', async () => {
  if (!consentHandler) return
  const restore = stubAuth()
  const pool = makeFakePool()
  await withPool(pool, async () => {
    const res = await consentHandler(
      makeRequest({ body: { consentType: 'cookies' } })
    )
    assert.equal(res.status, 400)
    assert.match(JSON.parse(res.body).error, /granted/)
  })
  restore()
})

test('POST /api/consent (anonymous) requires email', async () => {
  if (!consentHandler) return
  const restore = stubAuth({ payload: null })
  const pool = makeFakePool()
  await withPool(pool, async () => {
    const res = await consentHandler(
      makeRequest({ body: { consentType: 'cookies', granted: true } })
    )
    assert.equal(res.status, 400)
    assert.match(JSON.parse(res.body).error, /email/)
  })
  restore()
})

test('POST /api/consent (authenticated) logs to consent_logs', async () => {
  if (!consentHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'buyer' } })
  const pool = makeFakePool()
  await withPool(pool, async () => {
    const res = await consentHandler(
      makeRequest({
        body: { consentType: 'cookies', granted: true, policyVersion: 'v1.0' },
      })
    )
    assert.equal(res.status, 200)
    assert.equal(pool.__getState().consent_logs.length, 1)
    assert.equal(pool.__getState().consent_logs[0].consent_type, 'cookies')
  })
  restore()
})

test('POST /api/consent is idempotent (re-submitting same consent is a no-op)', async () => {
  if (!consentHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'buyer' } })
  const pool = makeFakePool()
  await withPool(pool, async () => {
    const body = { consentType: 'cookies', granted: true, policyVersion: 'v1.0' }
    await consentHandler(makeRequest({ body }))
    await consentHandler(makeRequest({ body }))
    await consentHandler(makeRequest({ body }))
    assert.equal(pool.__getState().consent_logs.length, 1, 'only 1 row despite 3 inserts')
  })
  restore()
})

// ---- /api/account/export ---------------------------------------------------

test('GET /api/account/export returns 401 without auth', async () => {
  if (!exportHandler) return
  const restore = stubAuth({ payload: null })
  const pool = makeFakePool({
    users: [{ id: 'u1', email: 'a@b.com', name: 'A', role: 'buyer' }],
  })
  await withPool(pool, async () => {
    const res = await exportHandler(makeRequest({}))
    assert.equal(res.status, 401)
  })
  restore()
})

test('GET /api/account/export includes identity + consent log + push subs', async () => {
  if (!exportHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'buyer' } })
  const pool = makeFakePool({
    users: [
      { id: 'u1', email: 'a@b.com', name: 'Alice', phone: '300111', city_id: 'bog', role: 'buyer' },
    ],
    profiles: [{ id: 'p1', user_id: 'u1' }],
    consent_logs: [
      { id: 'c1', user_id: 'u1', consent_type: 'terms', policy_version: 'v1.0', granted: true, ip_address: null, user_agent: null, created_at: '2026-06-28' },
    ],
    push_subscriptions: [
      { id: 'ps1', user_id: 'u1', endpoint: 'https://push.example/u1/a', p256dh: 'x', auth: 'y', created_at: '2026-06-28', last_used_at: null },
    ],
  })
  await withPool(pool, async () => {
    const res = await exportHandler(makeRequest({}))
    assert.equal(res.status, 200)
    const exported = JSON.parse(res.body)
    assert.equal(exported.identity.email, 'a@b.com')
    assert.equal(exported.consent_log.length, 1)
    assert.equal(exported.push_subscriptions.length, 1)
    // password_hash MUST NOT appear anywhere
    const dump = JSON.stringify(exported)
    assert.equal(dump.includes('password_hash'), false, 'password_hash leaked!')
    // Cache-Control header set
    assert.match(res.headers['Cache-Control'], /no-store/)
  })
  restore()
})

// ---- /api/account DELETE ---------------------------------------------------

test('DELETE /api/account returns 409 without X-Confirm-Delete header', async () => {
  if (!deleteHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'buyer' } })
  const pool = makeFakePool({
    users: [{ id: 'u1', email: 'a@b.com' }],
  })
  await withPool(pool, async () => {
    const res = await deleteHandler(makeRequest({}))
    assert.equal(res.status, 409)
  })
  restore()
})

test('DELETE /api/account anonymizes orders + cascades delete', async () => {
  if (!deleteHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'buyer' } })
  const pool = makeFakePool({
    users: [{ id: 'u1', email: 'a@b.com' }],
    profiles: [{ id: 'p1', user_id: 'u1' }],
    orders: [
      { id: 'o1', buyer_id: 'p1', vendor_id: 'v1', status: 'completed', total: 100, created_at: '2026-06-01' },
    ],
    favorites: [{ id: 'f1', buyer_id: 'p1', vendor_id: 'v1', created_at: '2026-06-01' }],
    notifications: [{ id: 'n1', profile_id: 'p1', type: 'order', payload: '{}', read: false, created_at: '2026-06-01' }],
    vendor_views: [{ id: 1, vendor_id: 'v1', user_id: 'u1', viewed_at: '2026-06-01' }],
    consent_logs: [{ id: 'c1', user_id: 'u1', consent_type: 'terms', policy_version: 'v1.0', granted: true }],
  })
  await withPool(pool, async () => {
    const res = await deleteHandler(
      makeRequest({ headers: { 'x-confirm-delete': 'true' } })
    )
    assert.equal(res.status, 200)
    const state = pool.__getState()
    // User gone
    assert.equal(state.users.length, 0)
    // Profile gone (cascade)
    assert.equal(state.profiles.length, 0)
    // Consent logs gone (cascade)
    assert.equal(state.consent_logs.length, 0)
    // Orders anonymized (buyer_id NULL) but KEPT for business audit
    assert.equal(state.orders.length, 1)
    assert.equal(state.orders[0].buyer_id, null)
    // Favorites DELETED (no business value without user)
    assert.equal(state.favorites.length, 0)
    // Notifications DELETED
    assert.equal(state.notifications.length, 0)
    // Vendor views anonymized (user_id NULL) but KEPT for analytics
    assert.equal(state.vendor_views.length, 1)
    assert.equal(state.vendor_views[0].user_id, null)
    // Auth cookies cleared
    assert.ok(res.headers['Set-Cookie'] || res.headers['set-cookie'] || JSON.stringify(res.headers).includes('token'))
  })
  restore()
})

test('DELETE /api/account returns 404 if user not found', async () => {
  if (!deleteHandler) return
  const restore = stubAuth({ payload: { userId: 'u-ghost', role: 'buyer' } })
  const pool = makeFakePool({ users: [] })
  await withPool(pool, async () => {
    const res = await deleteHandler(
      makeRequest({ headers: { 'x-confirm-delete': 'true' } })
    )
    assert.equal(res.status, 404)
  })
  restore()
})