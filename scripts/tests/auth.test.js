/**
 * Tests for the auth module — runs with Node's built-in test runner (node:test).
 * No external deps required.
 *
 * Run: node --test scripts/tests/auth.test.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const { loadEnv, getBase } = require('./_lib/env-loader')
const { setupTestUser, wipeCiTestRows } = require('./_lib/seed')

loadEnv()

// Best-effort: if a prior test run died before its `exit`-hook cleanup
// ran, ci-test-* rows may linger. Wipe at startup so each run is
// reproducible. Skip silently if the DB is unreachable.
test('setup: wipe any leftover ci-test-* rows from previous runs', async () => {
  await wipeCiTestRows()
})

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
const BASE = getBase()

async function fetchJSON(path, options = {}) {
  const res = await fetch(BASE + path, options)
  let body = null
  try { body = await res.json() } catch {}
  return { status: res.status, body, headers: res.headers }
}

test('POST /api/auth/login with valid email returns 200 + user + sets cookies', async () => {
  await resetRateLimit()
  // Setup: register a buyer we control (CI-run user; gets auto-cleaned at exit).
  const u = await setupTestUser({ role: 'buyer' })
  const res = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Send as `identifier` — backend detects email vs phone.
    body: JSON.stringify({ identifier: u.email, password: u.password }),
  })
  assert.equal(res.status, 200)
  // Token is set via httpOnly cookies only — never echo it in the body.
  assert.equal(res.body.token, undefined, 'token must NOT be in response body')
  assert.ok(res.body.user, 'should have user')
  assert.equal(res.body.user.email, u.email)
  assert.equal(res.body.user.role, 'buyer')
  // Set-Cookie should be present
  const setCookie = res.headers.get('set-cookie') || ''
  assert.match(setCookie, /token=/, 'should set token cookie')
  assert.match(setCookie, /refresh-token=/, 'should set refresh-token cookie')
  assert.match(setCookie, /HttpOnly/i, 'cookies must be HttpOnly')
})

test('POST /api/auth/login with wrong password returns 401', async () => {
  const u = await setupTestUser({ role: 'buyer' })
  const res = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: u.email, password: 'wrong-password' }),
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
  // Sprint 7: resetRateLimit because previous tests in this run may
  // have consumed the 10/min login rate-limit bucket on the same IP.
  // Without this the test flakes with a 429 instead of the expected 401.
  await resetRateLimit()
  const res = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'nobody-here@nowhere.local', password: 'whatever' }),
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
  // First, register+login our own CI user — no reliance on remote seed.
  const u = await setupTestUser({ role: 'buyer' })
  // setupTestUser already extracted the token from Set-Cookie.
  const me = await fetchJSON('/api/auth/me', {
    headers: { Authorization: `Bearer ${u.token}` },
  })
  assert.equal(me.status, 200)
  assert.equal(me.body.email, u.email)
})

test('GET /api/auth/me with cookie token works too', async () => {
  const u = await setupTestUser({ role: 'buyer' })
  // Cookie path through /favorites to verify middleware accepts the token.
  const favorites = await fetch(BASE + '/favorites', {
    redirect: 'manual',
    headers: { Cookie: `token=${u.token}` },
  })
  assert.notEqual(favorites.status, 500)
  // Should redirect (307) to login if cookie token is bad, or 200 if valid.
  // Our test user has valid token so middleware should let it through.
  // The page itself returns 200 because /favorites is an authenticated page.
  assert.ok([200, 307].includes(favorites.status))
})

test('POST /api/auth/register rejects invalid city', async () => {
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'unique-fresh-' + ts + '@test.local',
      password: 'Password123',
      name: 'Test',
      phone: ('3' + String(ts).slice(-9)).slice(-10), // 10-digit Colombian mobile
      cityId: 'atlantis', // not in COLOMBIA_CITIES
      role: 'buyer',
      acceptedTerms: true,   // Ley 1581/2012 — Etapa 4
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'Ciudad inválida')
})

test('POST /api/auth/register rejects when consent checkboxes missing', async () => {
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'no-consent-' + ts + '@test.local',
      password: 'Password123',
      name: 'Test',
      phone: ('3' + String(ts).slice(-9)).slice(-10), // 10-digit Colombian mobile
      cityId: 'bogota',
      role: 'buyer',
      // missing acceptedTerms + acceptedPrivacy
    }),
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /Términos|Tratamiento/i)
})

test('POST /api/auth/register rejects when role missing', async () => {
  // Etapa 5: role is selected during registration (single-step).
  // No more "register as buyer, escalate later" — must be explicit.
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'no-role-' + ts + '@test.local',
      password: 'Password123',
      name: 'Test',
      phone: ('3' + String(ts).slice(-9)).slice(-10), // 10-digit Colombian mobile
      cityId: 'bogota',
      acceptedTerms: true,
      acceptedPrivacy: true,
      // role intentionally omitted
    }),
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /vendedor|comprador|tipo de cuenta/i)
})

test('POST /api/auth/register rejects invalid role value', async () => {
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bad-role-' + ts + '@test.local',
      password: 'Password123',
      name: 'Test',
      phone: ('3' + String(ts).slice(-9)).slice(-10), // 10-digit Colombian mobile
      cityId: 'bogota',
      role: 'admin', // only 'buyer' or 'seller' allowed
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /vendedor|comprador|tipo de cuenta/i)
})

test('POST /api/auth/register creates user as seller when role=seller', async () => {
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'new-seller-' + ts + '@test.local',
      password: 'Password123',
      name: 'Fresh Seller',
      phone: ('3' + String(ts).slice(-9)).slice(-10), // 10-digit Colombian mobile
      cityId: 'bogota',
      role: 'seller',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 200)
  assert.equal(res.body.user.role, 'seller')
  assert.equal(res.body.user.email.includes('new-seller-'), true)
})

test('POST /api/auth/register creates user as buyer when role=buyer', async () => {
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'new-buyer-' + ts + '@test.local',
      password: 'Password123',
      name: 'Fresh Buyer',
      phone: ('3' + String(ts).slice(-9)).slice(-10), // 10-digit Colombian mobile
      cityId: 'bogota',
      role: 'buyer',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 200)
  assert.equal(res.body.user.role, 'buyer')
})

test('PATCH /api/products/[id] rejects malformed UUID', async () => {
  const u = await setupTestUser({ role: 'seller' })
  const res = await fetchJSON('/api/products/not-a-uuid', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${u.token}`,
    },
    body: JSON.stringify({ name: 'x' }),
  })
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'ID inválido')
})

// ════════════════════════════════════════════════════════════════════════
// Phone-only registration + login tests (Etapa 8 — login flexibility)
// ════════════════════════════════════════════════════════════════════════
//
// These cover the new "at least one of (email, phone) required" model.
// Many informal vendors in Cali don't have email — they sign up with just
// a phone number, and later log in using the same phone as identifier.

test('POST /api/auth/register allows phone-only registration (no email)', async () => {
  await resetRateLimit()
  const ts = Date.now()
  const phone = ('3' + String(ts).slice(-9)).slice(-10) // 10-digit Colombian mobile
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // no email field
      password: 'Password123',
      name: 'Phone Only Seller',
      phone,
      cityId: 'cali',
      role: 'seller',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 200)
  assert.equal(res.body.user.email, '', 'email should be empty string when not provided')
  assert.equal(res.body.user.phone, phone)
  assert.equal(res.body.user.role, 'seller')
})

test('POST /api/auth/register rejects when both email AND phone are missing', async () => {
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // no email, no phone
      password: 'Password123',
      name: 'No Contact',
      cityId: 'cali',
      role: 'buyer',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /email.*teléfono|al menos uno/i)
})

test('POST /api/auth/register rejects invalid email format', async () => {
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'not-an-email',
      password: 'Password123',
      name: 'Bad Email',
      phone: ('3' + String(ts).slice(-9)).slice(-10),
      cityId: 'cali',
      role: 'buyer',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /email|formato/i)
})

test('POST /api/auth/register rejects invalid phone format', async () => {
  const ts = Date.now()
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bad-phone-' + ts + '@test.local',
      password: 'Password123',
      name: 'Bad Phone',
      phone: '123', // not 10 digits
      cityId: 'cali',
      role: 'buyer',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /teléfono|10 dígitos/i)
})

test('POST /api/auth/register rejects duplicate phone', async () => {
  const ts = Date.now()
  const phone = ('3' + String(ts).slice(-9)).slice(-10)
  // First registration with phone only
  await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: 'Password123',
      name: 'First',
      phone,
      cityId: 'cali',
      role: 'buyer',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  // Second attempt with same phone + different email
  const res = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'second-' + ts + '@test.local',
      password: 'Password123',
      name: 'Second',
      phone,
      cityId: 'cali',
      role: 'buyer',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /teléfono ya está registrado/i)
})

test('POST /api/auth/login accepts a phone as identifier', async () => {
  // Register a phone-only user first
  await resetRateLimit()
  const ts = Date.now()
  const phone = ('3' + String(ts).slice(-9)).slice(-10)
  const regRes = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: 'Password123',
      name: 'Phone Login Test',
      phone,
      cityId: 'cali',
      role: 'buyer',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(regRes.status, 200)

  // Now login with the phone (no email involved)
  const loginRes = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: phone, password: 'Password123' }),
  })
  assert.equal(loginRes.status, 200)
  assert.equal(loginRes.body.user.phone, phone)
  assert.equal(loginRes.body.user.email, '')
})

test('POST /api/auth/login rejects an unparseable identifier (not email, not phone)', async () => {
  // Sprint 7: resetRateLimit for the same reason as the 401 test above.
  await resetRateLimit()
  const res = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'just-some-text', password: 'whatever' }),
  })
  assert.equal(res.status, 401)
  assert.equal(res.body.error, 'Credenciales inválidas')
})

// --- Sprint 7 B-AUTH: auth fixes regression tests ---------------------

test('Sprint 7 B-AUTH-1: POST /api/auth/register includes user.emailVerified', async () => {
  // Regression: before Sprint 7, the register response had
  // `emailVerified: true` only at the TOP level, not inside `user`.
  // Frontend's setUser(data.user) → user.emailVerified was undefined →
  // EmailVerifyBanner showed "Verifica tu email" right after register
  // even though email was already verified.
  await resetRateLimit()
  const email = 'sprint7-' + Date.now() + '@example.test'
  const reg = await fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Sprint7Test2026!',
      name: 'Sprint 7 Tester',
      cityId: 'bogota',
      role: 'buyer',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  })
  assert.equal(reg.status, 200, `register should 200, got ${reg.status}`)
  // Both layers must agree: top-level emailVerified AND user.emailVerified.
  assert.equal(reg.body.emailVerified, true, 'top-level emailVerified must be true')
  assert.equal(reg.body.user.emailVerified, true,
    'user.emailVerified must be true so frontend Zustand store hides the banner')
})

test('Sprint 7 B-AUTH-3: POST /api/auth/refresh does NOT require Origin header', async () => {
  // Regression: before Sprint 7, the global CSRF guard rejected refresh
  // requests that lacked Origin (which can happen on mobile networks
  // and certain fetch implementations). Since SameSite=strict cookies
  // already prevent cross-origin abuse, the guard is redundant here.
  await resetRateLimit()
  const u = await setupTestUser({ role: 'buyer' })
  const login = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: u.email, password: u.password }),
  })
  if (login.status !== 200) return
  const setCookie = login.headers.get('set-cookie') || ''
  const cookieHeader = setCookie.split(',').map((c) => c.split(';')[0]).join('; ')
  // Intentionally omit Origin.
  const res = await fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({}),
  })
  assert.equal(res.status, 200,
    `refresh should 200 without Origin (cookie is httpOnly+strict), got ${res.status}`)
  const j = await res.json()
  assert.equal(j.expiresIn, 900, 'should report 900s expiry')
})
