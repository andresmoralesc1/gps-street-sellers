import { NextResponse } from 'next/server'
import { COLOMBIA_CITIES } from '@/lib/core/constants'

// GET /api/cities — returns list of cities
export async function GET() {
  try {
    return NextResponse.json({ cities: COLOMBIA_CITIES })
  } catch (err) {
    console.error('Cities GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
