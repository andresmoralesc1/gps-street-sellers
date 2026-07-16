// sign-token.js — mint a JWT for testing.
// Usage: node sign-token.js <userId> <role>
// Reads token_version from DB so the JWT survives isTokenRevoked().
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { Client } = require('pg');

const env = fs.readFileSync('/home/telchar/gps-street-sellers/apps/web/.env', 'utf8');
const secret = env.match(/JWT_SECRET=["']?([^"'\n]+)["']?/)?.[1];
const host = env.match(/DB_HOST=["']?([^"'\n]+)["']?/)?.[1] || 'localhost';
const port = parseInt(env.match(/DB_PORT=["']?([^"'\n]+)["']?/)?.[1] || '5432', 10);
const db   = env.match(/DB_NAME=["']?([^"'\n]+)["']?/)?.[1];
const user = env.match(/DB_USER=["']?([^"'\n]+)["']?/)?.[1];
const pass = env.match(/DB_PASSWORD=["']?([^"'\n]+)["']?/)?.[1];

(async () => {
  const userId = process.argv[2];
  const role = process.argv[3] || 'seller';

  const client = new Client({ host, port, database: db, user, password: pass });
  await client.connect();
  const r = await client.query(
    'SELECT token_version FROM profiles WHERE user_id = $1',
    [userId]
  );
  await client.end();

  const tokenVersion = r.rows[0]?.token_version ?? 1;
  const token = jwt.sign(
    { userId, role, tokenVersion },
    secret,
    { expiresIn: '1h' }
  );
  console.log(token);
})();