/**
 * Shared env loader for integration tests (CRIT-CI 2026-07-23).
 *
 * Why this exists:
 *   - Each test file used to declare its own `loadEnv()` that called
 *     `fs.readFileSync(apps/web/.env, ...)`. If that file is missing
 *     (CI, fresh clone, no secrets provisioned) the whole test file
 *     throws ENOENT before any test runs — exactly what broke the
 *     GitHub Actions `test` workflow for 5+ consecutive runs.
 *   - We also need tests to point at a configurable BASE URL
 *     (`TEST_BASE_URL`, defaults to http://localhost:3005) so CI can
 *     run them against a local Next.js server instead of production.
 *
 * Behavior:
 *   - If `apps/web/.env` exists: load any KEY=value lines into
 *     `process.env`, but only if not already set (so CI env vars win).
 *   - If it doesn't exist: silent no-op — tests that need env vars
 *     fall back to whatever the runner / workflow provided.
 *   - Skips commented lines (`#`) and empty lines.
 *   - Strips surrounding double quotes from values.
 *
 * Tests that mock the DB pool (health, validation) don't need this
 * at all, but calling it is harmless. Tests that hit a real server
 * (vendors, auth, products, etc.) call `getBase()` to know where to
 * point fetch().
 */

const path = require('node:path')
const fs = require('node:fs')

const ENV_PATH = path.join(__dirname, '..', '..', 'apps', 'web', '.env')

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return // missing is OK
  let txt
  try {
    txt = fs.readFileSync(ENV_PATH, 'utf8')
  } catch {
    return // unreadable is also OK
  }
  for (const rawLine of txt.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    // CI env vars (already in process.env) win over .env file values.
    if (process.env[m[1]] === undefined) process.env[m[1]] = v
  }
}

function getBase() {
  return process.env.TEST_BASE_URL || 'http://localhost:3005'
}

module.exports = { loadEnv, getBase, ENV_PATH }