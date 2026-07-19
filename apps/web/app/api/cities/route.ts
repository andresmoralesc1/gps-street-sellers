import { NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { COLOMBIA_CITIES } from '@/lib/core/constants'

// GET /api/cities — returns list of cities
export async function GET() {
  try {
    return NextResponse.json({ cities: COLOMBIA_CITIES })
  } catch (err) {
    logger.error(serializeErr(err), 'Cities GET error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
