/**
 * Tests for lib/parse-json.ts
 *
 * Every API route that accepts a body (login, register, products,
 * vendors, sellers, ...) goes through parseJsonBody. If this helper
 * misbehaves, every POST/PATCH/PUT/DELETE in the app can 500 on
 * a malformed body. These tests pin the contract.
 */
import { describe, expect, test, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { parseJsonBody } from './parse-json'

function makeReq(method: string, body?: unknown): NextRequest {
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'content-type': 'application/json' }
  }
  // Cast: NextRequest extends Request, but the constructor
  // returns the base Request type. parseJsonBody only touches
  // method/json(), so this is safe in test context.
  return new Request('http://localhost/api/test', init) as unknown as NextRequest
}

describe('parseJsonBody', () => {
  test('parses a valid object body', async () => {
    const req = makeReq('POST', { email: 'a@b.co', password: 'x' })
    const result = await parseJsonBody(req)
    expect(result).toEqual({ ok: true, body: { email: 'a@b.co', password: 'x' } })
  })

  test('rejects GET/HEAD without reading the body', async () => {
    const req = makeReq('GET')
    const jsonSpy = vi.spyOn(req, 'json')
    const result = await parseJsonBody(req)
    expect(jsonSpy).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: 'Método sin cuerpo' })
  })

  test('returns Spanish error on malformed JSON', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: '{ not valid json',
      headers: { 'content-type': 'application/json' },
    }) as unknown as NextRequest
    const result = await parseJsonBody(req)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/JSON inválido/)
    }
  })

  test('rejects JSON arrays at the top level', async () => {
    const req = makeReq('POST', [{ email: 'a@b.co' }])
    const result = await parseJsonBody(req)
    expect(result).toEqual({ ok: false, error: 'El cuerpo debe ser un objeto JSON' })
  })

  test('rejects JSON null at the top level', async () => {
    const req = makeReq('POST', null)
    const result = await parseJsonBody(req)
    expect(result).toEqual({ ok: false, error: 'El cuerpo debe ser un objeto JSON' })
  })

  test('rejects JSON primitives (string, number, bool)', async () => {
    const s = makeReq('POST', 'hello')
    expect((await parseJsonBody(s)).ok).toBe(false)
    const n = makeReq('POST', 42)
    expect((await parseJsonBody(n)).ok).toBe(false)
    const b = makeReq('POST', true)
    expect((await parseJsonBody(b)).ok).toBe(false)
  })
})