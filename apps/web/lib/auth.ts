/**
 * Auth helpers — for use in Node.js API routes only.
 *
 * Do NOT import this from middleware.ts (edge runtime).
 * Edge-safe helpers live in lib/auth-edge.ts.
 */

import { jwtVerify } from 'jose'
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import type { TokenPayload } from './auth-edge'

export type { TokenPayload } from './auth-edge'

// Re-export edge-safe helpers so API routes can import everything from one place
export { getTokenFromRequest } from './auth-edge'

const JWT_SECRET_RAW = process.env.JWT_SECRET
if (!JWT_SECRET_RAW && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production')
}
const JWT_SECRET: string = JWT_SECRET_RAW || 'gps-street-sellers-secret-key-change-in-production'
const JWT_SECRET_PREVIOUS: string = process.env.JWT_SECRET_PREVIOUS || ''

const secretKey = new TextEncoder().encode(JWT_SECRET)
const previousKey = JWT_SECRET_PREVIOUS ? new TextEncoder().encode(JWT_SECRET_PREVIOUS) : null

/**
 * Node-runtime token verification. Returns null on failure.
 * Wraps jose's jwtVerify (async) but exposes sync-style via result.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as TokenPayload
  } catch {
    if (previousKey) {
      try {
        const { payload } = await jwtVerify(token, previousKey)
        return payload as unknown as TokenPayload
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Synchronous HS256 signer (jsonwebtoken). Issues a token compatible with the
 * existing fleet of tokens already in cookies — same algorithm, same secret.
 *
 * Use in login/register routes to mint new tokens.
 */
export function signTokenSync(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Higher-level: extract token from request, verify, return user or null.
 * Returns a NextResponse on failure so callers can do:
 *   const auth = await requireAuth(req)
 *   if (auth instanceof NextResponse) return auth
 */
import { NextResponse } from 'next/server'
export async function requireAuth(req: NextRequest): Promise<TokenPayload | NextResponse> {
  const { getTokenFromRequest } = await import('./auth-edge')
  const token = getTokenFromRequest(req)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const decoded = await verifyToken(token)
  if (!decoded) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
  return decoded
}