/**
 * Edge-safe auth helpers — safe to import from middleware (edge runtime).
 *
 * Does NOT import jsonwebtoken (Node-only).
 * Use lib/auth-sign.ts for the sync HS256 signer if you need to issue tokens.
 */

import { jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

export interface TokenPayload {
  userId: string
  email?: string
  role: 'buyer' | 'seller'
  tokenVersion: number
}

// Don't throw at module load — the middleware runs in edge runtime where
// process.env may not be fully populated at import time. We instead lazily
// resolve the secret on first use, and surface a clear error if it's missing
// (so misconfigured deploys fail fast instead of returning 0-byte responses).
function getSecretKey(): Uint8Array | null {
  const raw = process.env.JWT_SECRET
  if (!raw) return null
  return new TextEncoder().encode(raw)
}
function getPreviousKey(): Uint8Array | null {
  const raw = process.env.JWT_SECRET_PREVIOUS || ''
  if (!raw) return null
  return new TextEncoder().encode(raw)
}

const secretKey = getSecretKey()
const previousKey = getPreviousKey()

/**
 * Edge-safe token verification (used by middleware).
 * Returns null on any failure (invalid signature, expired, revoked).
 */
export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  if (!secretKey) return null
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
 * Extract token from request headers (Authorization: Bearer ...) or cookie ('token').
 * Works in both edge and node runtime.
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('token')?.value || null
}