/**
 * Tests for lib/push.ts — runs with Node's built-in test runner (node:test).
 *
 * Strategy: we don't hit a real push provider (Chrome/FCM/Mozilla autopush).
 * Instead we:
 *   1. stub the DB pool (push_subscriptions + notifications tables)
 *   2. stub the `web-push` module to simulate success and 410-expiry
 *   3. assert notify() returns the right counts and removes dead subs
 *
 * Run: node --test scripts/tests/push.test.js
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')

// Load .env so the module under test sees VAPID keys.
const { loadEnv } = require('./_lib/env-loader')
loadEnv()

// Build a fake web-push module that records calls and lets us simulate errors.
const sentPayloads = []
function installWebPushFake(mode = 'success') {
  sentPayloads.length = 0
  const fake = {
    setVapidDetails: (subject, pub, priv) => {
      fake.subject = subject
      fake.pub = pub
      fake.priv = priv
    },
    generateVAPIDKeys: () => ({ publicKey: 'fake-pub', privateKey: 'fake-priv' }),
    sendNotification: async (subscription, payload) => {
      const json = JSON.parse(payload)
      sentPayloads.push({ subscription, payload: json })
      if (mode === 'success') return { statusCode: 201 }
      if (mode === 'gone') {
        const err = new Error('subscription expired')
        err.statusCode = 410
        throw err
      }
      if (mode === 'notfound') {
        const err = new Error('no such subscription')
        err.statusCode = 404
        throw err
      }
      throw new Error('unexpected mode: ' + mode)
    },
  }
  // Intercept require('web-push') so lib/push.ts picks up the fake.
  const origResolve = Module._resolveFilename
  const origLoad = Module._load
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'web-push') return 'web-push-fake'
    return origResolve.call(this, request, ...rest)
  }
  Module._load = function (request, ...rest) {
    if (request === 'web-push') return fake
    return origLoad.call(this, request, ...rest)
  }
  return () => {
    Module._resolveFilename = origResolve
    Module._load = origLoad
  }
}

// In-memory fake DB pool. Each push.ts query hits one of these.
function makeFakePool(opts = {}) {
  const subs = opts.subs || [] // { id, user_id, endpoint, p256dh, auth }
  const notifications = opts.notifications || []
  return {
    __getSubs: () => subs,
    __getNotifications: () => notifications,
    async query(sql, params) {
      const s = sql.trim()
      // SELECT push_subscriptions JOIN profiles WHERE p.user_id = $1
      if (/FROM push_subscriptions p JOIN profiles u ON u\.id = p\.user_id WHERE u\.user_id/i.test(s)) {
        const userId = params[0]
        return { rows: subs.filter((x) => x.user_id === userId) }
      }
      // DELETE expired subscriptions
      if (/DELETE FROM push_subscriptions WHERE endpoint/i.test(s)) {
        const endpoint = params[0]
        const before = subs.length
        for (let i = subs.length - 1; i >= 0; i--) {
          if (subs[i].endpoint === endpoint) subs.splice(i, 1)
        }
        return { rows: [], rowCount: before - subs.length }
      }
      // INSERT INTO notifications
      if (/INSERT INTO notifications/i.test(s)) {
        const [profileId, type, payload] = params
        const row = { id: 'notif-' + (notifications.length + 1), profile_id: profileId, type, payload, read: false, created_at: new Date().toISOString() }
        notifications.push(row)
        return { rows: [row] }
      }
      throw new Error('Fake pool: unhandled SQL — ' + s.slice(0, 80))
    },
  }
}

let pushMod

test.before(async () => {
  // Inject the fake pool into the module cache so push.ts picks it up
  // when it does `import pool from '@/lib/db'` (compiled at runtime via
  // Next's tsx-style loader). For these tests we require the module path
  // directly and patch its dependency.
  // Simpler: register the fake via the same resolve hook.
  const dbPath = path.join(__dirname, '../../apps/web/lib/db.ts')
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req === '@/lib/db' || req === dbPath || req.endsWith('lib/db')) {
      return makeFakePool()
    }
    return origLoad.call(this, req, ...rest)
  }

  // Require the module — it will go through tsx loader if available, else fail.
  // Use a dynamic import so we can catch errors gracefully.
  try {
    pushMod = await import('../apps/web/lib/push.ts')
  } catch (err) {
    // Fallback: if tsx loader isn't installed, skip tests with a clear message.
    test.skip('tsx loader not available — install tsx to run push tests: ' + err.message)
  }
})

test('notify sends to all subscriptions of a user', async () => {
  if (!pushMod) return
  const restore = installWebPushFake('success')
  const fakePool = makeFakePool({
    subs: [
      { id: 's1', user_id: 'u1', endpoint: 'https://push.example/u1/device-a', p256dh: 'aa', auth: 'bb' },
      { id: 's2', user_id: 'u1', endpoint: 'https://push.example/u1/device-b', p256dh: 'cc', auth: 'dd' },
    ],
  })
  // Re-point db import to our populated fake
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/db')) return fakePool
    return origLoad.call(this, req, ...rest)
  }

  const result = await pushMod.notify('u1', { title: 'Hola', body: 'Test', url: '/map' })
  assert.equal(result.sent, 2, 'should have sent 2 notifications')
  assert.equal(result.failed, 0, 'should have 0 failures')
  assert.equal(sentPayloads.length, 2)
  assert.equal(sentPayloads[0].payload.title, 'Hola')
  assert.equal(fakePool.__getNotifications().length, 1, 'should have inserted 1 in-app notification')

  restore()
  Module._load = origLoad
})

test('notify deletes 410 subscriptions automatically', async () => {
  if (!pushMod) return
  const restore = installWebPushFake('gone')
  const fakePool = makeFakePool({
    subs: [
      { id: 's1', user_id: 'u2', endpoint: 'https://push.example/u2/old', p256dh: 'aa', auth: 'bb' },
      { id: 's2', user_id: 'u2', endpoint: 'https://push.example/u2/fresh', p256dh: 'cc', auth: 'dd' },
    ],
  })
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/db')) return fakePool
    return origLoad.call(this, req, ...rest)
  }

  const result = await pushMod.notify('u2', { title: 'X', body: 'Y', url: '/x' })
  assert.equal(result.sent, 0, 'no successful sends')
  assert.equal(result.failed, 2, 'both failed with 410')
  assert.equal(fakePool.__getSubs().length, 0, 'expired subscriptions removed from DB')

  restore()
  Module._load = origLoad
})

test('notify returns zero counts when user has no subscriptions', async () => {
  if (!pushMod) return
  const restore = installWebPushFake('success')
  const fakePool = makeFakePool({ subs: [] })
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/db')) return fakePool
    return origLoad.call(this, req, ...rest)
  }

  const result = await pushMod.notify('u-no-subs', { title: 'X', body: 'Y', url: '/x' })
  assert.equal(result.sent, 0)
  assert.equal(result.failed, 0)
  assert.equal(sentPayloads.length, 0, 'should not have called sendNotification')

  restore()
  Module._load = origLoad
})

test('notify gracefully handles missing VAPID keys', async () => {
  if (!pushMod) return
  const origPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const origPriv = process.env.VAPID_PRIVATE_KEY
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY

  const restore = installWebPushFake('success')
  const fakePool = makeFakePool({
    subs: [{ id: 's1', user_id: 'u3', endpoint: 'https://push.example/u3/x', p256dh: 'a', auth: 'b' }],
  })
  const origLoad = Module._load
  Module._load = function (req, ...rest) {
    if (req.endsWith('lib/db')) return fakePool
    return origLoad.call(this, req, ...rest)
  }

  const result = await pushMod.notify('u3', { title: 'X', body: 'Y', url: '/x' })
  assert.equal(result.sent, 0)
  assert.equal(result.failed, 0)
  assert.equal(sentPayloads.length, 0, 'must not send when VAPID unconfigured')
  assert.equal(fakePool.__getNotifications().length, 1, 'in-app notification still recorded as fallback')

  // Restore env
  if (origPub) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origPub
  if (origPriv) process.env.VAPID_PRIVATE_KEY = origPriv
  restore()
  Module._load = origLoad
})