/**
 * CRIT-15: Centralized JSON body parsing for API routes.
 *
 * Bare `await req.json()` throws on malformed bodies — the call site has to
 * either wrap in try/catch or accept a 500 from Next's default handler.
 * This helper:
 *   - Catches JSON parse errors and returns a typed Failure
 *   - Optionally validates the body matches a schema shape (object, not array)
 *   - Lets the caller decide how to respond (use it inside their try/catch
 *     and translate the failure to a 400 with a Spanish message).
 *
 * Usage:
 *   const parsed = await parseJsonBody(req)
 *   if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
 *   const { email, password } = parsed.body
 */

import type { NextRequest } from 'next/server'

export type ParseJsonResult<T> =
  | { ok: true; body: T }
  | { ok: false; error: string }

export async function parseJsonBody<T = unknown>(req: NextRequest): Promise<ParseJsonResult<T>> {
  // Short-circuit: most route handlers only act on POST/PATCH/PUT/DELETE.
  if (req.method === 'GET' || req.method === 'HEAD') {
    return { ok: false, error: 'Método sin cuerpo' }
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { ok: false, error: 'JSON inválido en el cuerpo de la solicitud' }
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON' }
  }

  return { ok: true, body: raw as T }
}
