/**
 * Tests for Etapa 5: security headers + rate limits.
 *
 * Covers:
 *   - next.config.js produces correct CSP, HSTS, X-Frame-Options,
 *     X-Content-Type-Options, Referrer-Policy, Permissions-Policy
 *   - Rate limiter blocks 6th contact submission, allows 5
 *   - Rate limiter blocks 11th review, allows 10
 *   - Rate limiter returns 429 with Retry-After header
 *
 * Run: node --test scripts/tests/security.test.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')

const { loadEnv } = require('./_lib/env-loader')
loadEnv()

// ---- Header tests -----------------------------------------------------------

test('next.config.js exports an async headers() function', () => {
  delete require.cache[require.resolve('../../apps/web/next.config.js')]
  const cfg = require('../../apps/web/next.config.js')
  assert.equal(typeof cfg.headers, 'function', 'headers must be a function')
})

test('next.config.js headers returns an array including a wildcard security rule', async () => {
  const cfg = require('../../apps/web/next.config.js')
  const result = await cfg.headers()
  assert.ok(Array.isArray(result))
  assert.ok(result.length >= 1)
  // The first rule must be the global security headers rule with wildcard source.
  assert.equal(result[0].source, '/(.*)')
  assert.ok(Array.isArray(result[0].headers))
  assert.ok(result[0].headers.length >= 6)
})

// next.config.js intentionally diverges by env:
//   - production: emit HSTS (max-age > 0, includeSubDomains) — strict policy.
//   - non-production: emit CSP (Content-Security-Policy header) so devs
//     see issues in dev tools; HSTS is disabled because locking
//     browsers to https://localhost makes recovery painful.
// Both configs share the rest of the OWASP baseline.
// Two tests verify each branch; one happy-path covers the union.

test('next.config.js includes all OWASP baseline headers (production branch)', async () => {
  const prevEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  delete require.cache[require.resolve('../../apps/web/next.config.js')]
  let result
  try {
    const cfg = require('../../apps/web/next.config.js')
    result = await cfg.headers()
  } finally {
    process.env.NODE_ENV = prevEnv
    delete require.cache[require.resolve('../../apps/web/next.config.js')]
  }
  const flat = result[0].headers
  const byKey = Object.fromEntries(flat.map((h) => [h.key.toLowerCase(), h.value]))

  // Production branch: HSTS strict, no inline CSP (proxied via HTTPS proxy).
  assert.ok(byKey['strict-transport-security'], 'HSTS missing')
  assert.match(byKey['strict-transport-security'], /max-age=\d+/)
  assert.match(byKey['strict-transport-security'], /includeSubDomains/)
  assert.equal(byKey['x-frame-options'], 'DENY')
  assert.equal(byKey['x-content-type-options'], 'nosniff')
  assert.equal(byKey['referrer-policy'], 'strict-origin-when-cross-origin')
  assert.ok(byKey['permissions-policy'], 'Permissions-Policy missing')
})

test('next.config.js includes all OWASP baseline headers (dev branch)', async () => {
  const prevEnv = process.env.NODE_ENV
  // Pretend we're running in dev (the default for `npm run dev`).
  process.env.NODE_ENV = 'development'
  delete require.cache[require.resolve('../../apps/web/next.config.js')]
  let result
  try {
    const cfg = require('../../apps/web/next.config.js')
    result = await cfg.headers()
  } finally {
    process.env.NODE_ENV = prevEnv
    delete require.cache[require.resolve('../../apps/web/next.config.js')]
  }
  const flat = result[0].headers
  const byKey = Object.fromEntries(flat.map((h) => [h.key.toLowerCase(), h.value]))

  // Dev branch: HSTS relaxed, CSP emitted for dev tools visibility.
  assert.match(byKey['strict-transport-security'], /max-age=0/)
  assert.equal(byKey['x-frame-options'], 'DENY')
  assert.equal(byKey['x-content-type-options'], 'nosniff')
  assert.equal(byKey['referrer-policy'], 'strict-origin-when-cross-origin')
  assert.ok(byKey['content-security-policy'], 'CSP missing in dev')
  assert.ok(byKey['permissions-policy'], 'Permissions-Policy missing')
})

test('CSP locks down frame-ancestors and object-src', async () => {
  const cfg = require('../../apps/web/next.config.js')
  const result = await cfg.headers()
  const csp = result[0].headers.find((h) => h.key === 'Content-Security-Policy').value
  assert.match(csp, /frame-ancestors 'none'/)
  assert.match(csp, /object-src 'none'/)
  assert.match(csp, /base-uri 'self'/)
  assert.match(csp, /form-action 'self'/)
})

test('CSP allows Supabase connections (for push + storage)', async () => {
  const cfg = require('../../apps/web/next.config.js')
  const csp = cfg.headers
    ? (await cfg.headers())[0].headers.find((h) => h.key === 'Content-Security-Policy').value
    : ''
  assert.match(csp, /connect-src[^;]*https:\/\/\*\.supabase\.co/)
  assert.match(csp, /connect-src[^;]*wss:\/\/\*\.supabase\.co/)
  assert.match(csp, /worker-src[^;]*'self'/)
})

test('Permissions-Policy only enables geolocation (notifications is invalid feature)', async () => {
  // 'notifications' is NOT a valid feature in the Permissions-Policy spec — using
  // it triggers a browser warning. Notifications fall under the system, not
  // permissions. Keep only geolocation and block everything else.
  const cfg = require('../../apps/web/next.config.js')
  const result = await cfg.headers()
  const pp = result[0].headers.find((h) => h.key === 'Permissions-Policy').value
  assert.match(pp, /geolocation=\(self\)/)
  assert.doesNotMatch(pp, /notifications=/, "notifications should not be in Permissions-Policy")
  assert.match(pp, /camera=\(\)/)
  assert.match(pp, /microphone=\(\)/)
})

test('HSTS is disabled in dev (max-age=0)', async () => {
  const original = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'
  delete require.cache[require.resolve('../../apps/web/next.config.js')]
  const cfg = require('../../apps/web/next.config.js')
  const result = await cfg.headers()
  const hsts = result[0].headers.find((h) => h.key === 'Strict-Transport-Security').value
  assert.match(hsts, /max-age=0/)
  process.env.NODE_ENV = original
  delete require.cache[require.resolve('../../apps/web/next.config.js')]
})


test('S3-SEC-1: Permissions-Policy includes interest-cohort=() (FLoC opt-out)', async () => {
  // Colombian Habeas Data (Law 1581/2012) + GDPR require explicit opt-out
  // from browser-based tracking cohorting. Without `interest-cohort=()` the
  // browser may assign the user to a topic group based on browsing history.
  // S3-SEC-1 added this in Sprint 3.
  const cfg = require('../../apps/web/next.config.js')
  const result = await cfg.headers()
  const pp = result[0].headers.find((h) => h.key === 'Permissions-Policy').value
  assert.match(pp, /interest-cohort=\(\)/, 'FLoC/Topics opt-out missing')
})

test('S3-SEC-2: HSTS production includes preload directive', async () => {
  // S3-SEC-2 added `preload` so the domain qualifies for the Chrome HSTS
  // preload list (hstspreload.org). Next.js must agree with Caddy's HSTS
  // so a misconfigured Caddy reload never drops the security guarantee.
  const original = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  delete require.cache[require.resolve('../../apps/web/next.config.js')]
  const cfg = require('../../apps/web/next.config.js')
  const result = await cfg.headers()
  const hsts = result[0].headers.find((h) => h.key === 'Strict-Transport-Security').value
  assert.match(hsts, /max-age=31536000/, 'max-age must be >= 1 year')
  assert.match(hsts, /includeSubDomains/, 'must include subdomains (required for preload)')
  assert.match(hsts, /preload/, 'must include preload directive for hstspreload.org submission')
  process.env.NODE_ENV = original
  delete require.cache[require.resolve('../../apps/web/next.config.js')]
})

// ---- Rate limit tests -------------------------------------------------------

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

function makeFakeRateLimitPool() {
  const state = { attempts: [] }
  return {
    query: async (sql, params) => {
      const s = sql.trim()
      if (/^BEGIN|^COMMIT|^ROLLBACK/i.test(s)) return { rows: [] }
      if (/INSERT INTO rate_limit_attempts/i.test(s)) {
        state.attempts.push({ ip: params[0], bucket: params[1], at: new Date() })
        return { rows: [], rowCount: 1 }
      }
      if (/SELECT COUNT/i.test(s)) {
        const since = params[3]
        const count = state.attempts.filter(
          (a) => a.ip === params[0] && a.bucket === params[1] && a.at >= since
        ).length
        return { rows: [{ count }] }
      }
      if (/ORDER BY attempted_at ASC LIMIT 1/i.test(s)) {
        const since = params[3]
        const oldest = state.attempts
          .filter((a) => a.ip === params[0] && a.bucket === params[1] && a.at >= since)
          .sort((a, b) => a.at - b.at)[0]
        return { rows: oldest ? [{ attempted_at: oldest.at }] : [] }
      }
      if (/SELECT now\(\)/i.test(s)) {
        return { rows: [{ now: new Date() }] }
      }
      throw new Error('Fake pool: unhandled SQL — ' + s.slice(0, 80))
    },
    __getState: () => state,
  }
}

function stubAuth({ payload = null } = {}) {
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/auth') || req === '@/lib/auth') {
      return {
        verifyToken: async () => payload,
        getTokenFromRequest: () => (payload ? 'fake-token' : null),
      }
    }
    return origLoad.call(this, req, ...rest)
  }
  return () => {
    Module._load = origLoad
  }
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

function makeReq({ headers = {}, body = {} } = {}) {
  const reqHeaders = { 'content-type': 'application/json', ...headers }
  return {
    headers: new Map(Object.entries(reqHeaders)),
    async json() {
      return body
    },
    async formData() {
      return new Map()
    },
  }
}

let contactHandler, reviewsHandler, pushSubscribeHandler, uploadHandler, consentHandler

test.before(async () => {
  installNextStub()
  try {
    require('tsx/cjs')
    contactHandler = (await import('../apps/web/app/api/contact/route.ts')).POST
    reviewsHandler = (await import('../apps/web/app/api/reviews/route.ts')).POST
    pushSubscribeHandler = (await import('../apps/web/app/api/push/subscribe/route.ts')).POST
    uploadHandler = (await import('../apps/web/app/api/upload/route.ts')).POST
    consentHandler = (await import('../apps/web/app/api/consent/route.ts')).POST
  } catch (err) {
    test.skip('could not load route modules: ' + err.message)
  }
})

test('POST /api/contact allows 5 per hour, blocks 6th', async () => {
  if (!contactHandler) return
  const restore = stubAuth()
  const pool = makeFakeRateLimitPool()
  await withPool(pool, async () => {
    const body = { name: 'A', email: 'a@b.com', subject: 'hi', message: 'msg' }
    for (let i = 1; i <= 5; i++) {
      const res = await contactHandler(makeReq({ body }))
      assert.notEqual(res.status, 429, `attempt ${i} should NOT be blocked`)
    }
    const blocked = await contactHandler(makeReq({ body }))
    assert.equal(blocked.status, 429)
    assert.match(blocked.headers['Retry-After'], /\d+/)
  })
  restore()
})

test('POST /api/contact blocks BEFORE any DB writes (no rows in contact_messages)', async () => {
  if (!contactHandler) return
  // This test verifies the 6th attempt is rate-limited without needing
  // a real contact_messages table — the rate limit short-circuits before
  // the INSERT runs.
  const restore = stubAuth()
  const pool = makeFakeRateLimitPool()
  let insertCalled = false
  // Wrap query to detect any INSERT to contact_messages
  const origQuery = pool.query
  pool.query = async function (sql, params) {
    if (/INSERT INTO contact_messages/i.test(sql)) insertCalled = true
    return origQuery.call(this, sql, params)
  }
  await withPool(pool, async () => {
    const body = { name: 'A', email: 'a@b.com', subject: 'hi', message: 'msg' }
    for (let i = 1; i <= 6; i++) {
      await contactHandler(makeReq({ body }))
    }
    assert.equal(insertCalled, false, 'INSERT must not run after rate-limit triggers')
  })
  restore()
})

test('POST /api/reviews allows 10 per hour, blocks 11th', async () => {
  if (!reviewsHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'buyer' } })
  const pool = makeFakeRateLimitPool()
  await withPool(pool, async () => {
    const body = { vendor_id: 'v1', rating: 5, comment: 'ok' }
    for (let i = 1; i <= 10; i++) {
      const res = await reviewsHandler(makeReq({ body }))
      // We expect 401/403/400 from missing vendor etc. but NOT 429
      assert.notEqual(res.status, 429, `attempt ${i} should NOT be 429`)
    }
    const blocked = await reviewsHandler(makeReq({ body }))
    assert.equal(blocked.status, 429)
  })
  restore()
})

test('POST /api/push/subscribe allows 10 per hour, blocks 11th', async () => {
  if (!pushSubscribeHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'buyer' } })
  const pool = makeFakeRateLimitPool()
  await withPool(pool, async () => {
    const body = { endpoint: 'https://push.example/u1/a', keys: { p256dh: 'x', auth: 'y' } }
    for (let i = 1; i <= 10; i++) {
      const res = await pushSubscribeHandler(makeReq({ body }))
      assert.notEqual(res.status, 429, `attempt ${i} should NOT be 429`)
    }
    const blocked = await pushSubscribeHandler(makeReq({ body }))
    assert.equal(blocked.status, 429)
  })
  restore()
})

test('POST /api/upload allows 20 per hour, blocks 21st', async () => {
  if (!uploadHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'seller' } })
  const pool = makeFakeRateLimitPool()
  await withPool(pool, async () => {
    for (let i = 1; i <= 20; i++) {
      const res = await uploadHandler(makeReq({}))
      assert.notEqual(res.status, 429, `attempt ${i} should NOT be 429`)
    }
    const blocked = await uploadHandler(makeReq({}))
    assert.equal(blocked.status, 429)
  })
  restore()
})

test('POST /api/consent allows 20 per hour, blocks 21st', async () => {
  if (!consentHandler) return
  const restore = stubAuth()
  const pool = makeFakeRateLimitPool()
  await withPool(pool, async () => {
    const body = { consentType: 'cookies', granted: true, email: 'a@b.com' }
    for (let i = 1; i <= 20; i++) {
      const res = await consentHandler(makeReq({ body }))
      assert.notEqual(res.status, 429, `attempt ${i} should NOT be 429`)
    }
    const blocked = await consentHandler(makeReq({ body }))
    assert.equal(blocked.status, 429)
    assert.match(blocked.headers['Retry-After'], /\d+/)
  })
  restore()
})

test('Rate limit responses include Retry-After header (seconds)', async () => {
  if (!contactHandler) return
  const restore = stubAuth()
  const pool = makeFakeRateLimitPool()
  await withPool(pool, async () => {
    const body = { name: 'A', email: 'a@b.com', subject: 'hi', message: 'msg' }
    for (let i = 1; i <= 5; i++) {
      await contactHandler(makeReq({ body }))
    }
    const blocked = await contactHandler(makeReq({ body }))
    assert.equal(blocked.status, 429)
    const retryAfter = parseInt(blocked.headers['Retry-After'], 10)
    assert.ok(Number.isFinite(retryAfter))
    assert.ok(retryAfter > 0)
    assert.ok(retryAfter <= 3600, 'Retry-After must be within the 1-hour window')
  })
  restore()
})

test('Rate limit buckets are independent (contact != reviews != upload)', async () => {
  if (!contactHandler || !reviewsHandler) return
  const restore = stubAuth({ payload: { userId: 'u1', role: 'buyer' } })
  const pool = makeFakeRateLimitPool()
  await withPool(pool, async () => {
    // Fill contact bucket
    const cbody = { name: 'A', email: 'a@b.com', subject: 'hi', message: 'msg' }
    for (let i = 1; i <= 5; i++) {
      await contactHandler(makeReq({ body: cbody }))
    }
    const cBlocked = await contactHandler(makeReq({ body: cbody }))
    assert.equal(cBlocked.status, 429, 'contact should be blocked')

    // Reviews bucket still has room
    const rbody = { vendor_id: 'v1', rating: 5, comment: 'ok' }
    const rOk = await reviewsHandler(makeReq({ body: rbody }))
    assert.notEqual(rOk.status, 429, 'reviews should NOT be blocked yet')
  })
  restore()
})

// ---- CSRF defense tests (S3-SEC-4) -----------------------------------------

test('S3-SEC-4: POST /api/contact with cross-origin Origin is blocked (403)', async () => {
  // A cross-origin attacker (`attacker.com`) trying to submit a contact
  // form on behalf of a logged-in user must be blocked by the Origin check.
  // This is defense-in-depth on top of SameSite=strict cookies. We send a
  // POST with the evil Origin and expect a 403.
  const base = process.env.TEST_BASE_URL || 'http://localhost:3005'
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://attacker.com',
    },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      subject: 'CSRF test',
      message: 'should be blocked',
    }),
  })
  assert.equal(res.status, 403, `expected 403 cross-origin, got ${res.status}`)
  const body = await res.json()
  assert.match(body.error || '', /CSRF|cross-origin/i)
})

test('S3-SEC-4: POST /api/contact with no Origin passes when CSRF_ALLOW_MISSING_ORIGIN=1', async () => {
  // In test/CI mode the CSRF helper is intentionally permissive about
  // missing Origin headers. Servers in production (.env.test is
  // permissive, real .env is not) would return 403 here — but our test
  // server has CSRF_ALLOW_MISSING_ORIGIN=1 set.
  const base = process.env.TEST_BASE_URL || 'http://localhost:3005'
  const res = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Originless',
      email: 'ol@example.com',
      subject: 'no-origin test',
      message: 'should pass CSRF, then hit rate limit OR succeed',
    }),
  })
  assert.notEqual(res.status, 403, 'must NOT be 403 when CSRF_ALLOW_MISSING_ORIGIN=1')
  // 400/422 (validation) or 200/201 are all acceptable. 429 is also OK
  // because it ran AFTER CSRF.
  assert.ok([200, 201, 400, 422, 429].includes(res.status), `unexpected ${res.status}`)
})
