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

const JWT_SECRET_RAW = process.env.JWT_SECRET
if (!JWT_SECRET_RAW) {
  throw new Error('JWT_SECRET environment variable is required. Generate one with: openssl rand -base64 64')
}
const JWT_SECRET: string = JWT_SECRET_RAW
const JWT_SECRET_PREVIOUS: string = process.env.JWT_SECRET_PREVIOUS || ''

const secretKey = new TextEncoder().encode(JWT_SECRET)
const previousKey = JWT_SECRET_PREVIOUS ? new TextEncoder().encode(JWT_SECRET_PREVIOUS) : null

/**
 * Edge-safe token verification (used by middleware).
 * Returns null on any failure (invalid signature, expired, revoked).
 */
export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
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