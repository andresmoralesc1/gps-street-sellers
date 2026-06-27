/**
 * Single auth module — used by middleware, API routes, and any server-side code.
 *
 * Replaces 3 duplicate verifyToken implementations that lived inline in
 * middleware.ts and 16 API route files.
 *
 * Two JWT libraries are present in the project:
 *   - `jose` (used by middleware, edge runtime compatible)
 *   - `jsonwebtoken` (used by API route handlers, node runtime)
 *
 * Both are wrapped here so callers don't need to know which to use.
 *
 * IMPORTANT: This module is safe to import from edge runtime (middleware).
 * It does NOT import the pg pool — anything DB-bound lives in lib/auth-db.ts.
 */

import { jwtVerify, SignJWT } from 'jose'
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

export interface TokenPayload {
  userId: string
  email?: string
  role: 'buyer' | 'seller'
  tokenVersion: number
}

const JWT_SECRET_RAW = process.env.JWT_SECRET
if (!JWT_SECRET_RAW && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production')
}
const JWT_SECRET = JWT_SECRET_RAW || 'gps-street-sellers-secret-key-change-in-production'
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS || ''

// jose uses Uint8Array, jsonwebtoken uses string
const SECRET_BYTES = new TextEncoder().encode(JWT_SECRET)
const SECRET_PREV_BYTES = JWT_SECRET_PREVIOUS ? new TextEncoder().encode(JWT_SECRET_PREVIOUS) : null

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7

// ── Sign ────────────────────────────────────────────────────────────────────

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SEVEN_DAYS_SECONDS}s`)
    .sign(SECRET_BYTES)
}

// Sync variant for places that already use jsonwebtoken.sign
export function signTokenSync(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// ── Verify (edge / jose) — used by middleware ───────────────────────────────

export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_BYTES)
    return payload as unknown as TokenPayload
  } catch {
    if (!SECRET_PREV_BYTES) return null
    try {
      const { payload } = await jwtVerify(token, SECRET_PREV_BYTES)
      return payload as unknown as TokenPayload
    } catch {
      return null
    }
  }
}

// ── Verify (node / jsonwebtoken) — used by API routes ───────────────────────

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    if (!JWT_SECRET_PREVIOUS) return null
    try {
      return jwt.verify(token, JWT_SECRET_PREVIOUS) as TokenPayload
    } catch {
      return null
    }
  }
}

// ── Extract token from request ─────────────────────────────────────────────

export function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('token')?.value || null
}

// ── Cookie helpers ─────────────────────────────────────────────────────────

export function authCookieOptions(maxAge: number = SEVEN_DAYS_SECONDS) {
  return {
    httpOnly: true,
    path: '/',
    maxAge,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
}