#!/usr/bin/env node
/**
 * Apply pending SQL migrations from /migrations in lexicographic order.
 *
 * Usage:
 *   node scripts/migrate.js            # apply all pending
 *   node scripts/migrate.js --status   # show applied/pending
 *   node scripts/migrate.js --reset    # DANGER: drop all tables then apply
 *
 * Reads DB config from apps/web/.env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const ROOT = path.resolve(__dirname, '..')
const MIGRATIONS_DIR = path.join(ROOT, 'migrations')
const ENV_PATH = path.join(ROOT, 'apps/web/.env')

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`No env file at ${ENV_PATH}`)
    process.exit(1)
  }
  const txt = fs.readFileSync(ENV_PATH, 'utf8')
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m) {
      const k = m[1]
      let v = m[2].trim()
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  }
}

async function getClient() {
  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gps_street_sellers',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  })
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

async function getApplied(client) {
  const r = await client.query('SELECT filename FROM migrations ORDER BY id')
  return new Set(r.rows.map((row) => row.filename))
}

function listMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

async function status() {
  loadEnv()
  const client = await getClient()
  try {
    await client.connect()
    await ensureMigrationsTable(client)
    const applied = await getApplied(client)
    const all = listMigrations()
    console.log('Applied:')
    for (const f of all) {
      if (applied.has(f)) console.log(`  ✅ ${f}`)
    }
    console.log('\nPending:')
    for (const f of all) {
      if (!applied.has(f)) console.log(`  ⏳ ${f}`)
    }
  } finally {
    await client.end()
  }
}

async function migrate() {
  loadEnv()
  const client = await getClient()
  try {
    await client.connect()
    await ensureMigrationsTable(client)
    const applied = await getApplied(client)
    const all = listMigrations()
    let count = 0

    for (const filename of all) {
      if (applied.has(filename)) continue
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8')
      console.log(`▶ applying ${filename}...`)
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO migrations (filename) VALUES ($1)', [filename])
        await client.query('COMMIT')
        console.log(`  ✅ ${filename}`)
        count++
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`  ❌ ${filename}: ${err.message}`)
        process.exit(1)
      }
    }
    console.log(`\nDone. Applied ${count} migration(s).`)
  } finally {
    await client.end()
  }
}

async function reset() {
  console.log('⚠️  Dropping all tables in database...')
  loadEnv()
  const client = await getClient()
  try {
    await client.connect()
    await client.query(`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `)
    console.log('Tables dropped.')
    await migrate()
  } finally {
    await client.end()
  }
}

const arg = process.argv[2]
;(async () => {
  try {
    if (arg === '--status') await status()
    else if (arg === '--reset') await reset()
    else await migrate()
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
})()