import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// Public: GET /api/vendors
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const active = searchParams.get('active')
    const withLocation = searchParams.get('withLocation') === 'true'

    let query = 'SELECT v.*, c.label as category_label FROM vendors v LEFT JOIN categories c ON v.category = c.id WHERE 1=1'
    const params: any[] = []

    if (category) {
      params.push(category)
      query += ` AND v.category = $${params.length}`
    }

    if (active === 'true') {
      query += ' AND v.is_active = true'
    }

    // Only vendors that have GPS coordinates
    if (withLocation) {
      query += ' AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL'
    }

    const cityId = searchParams.get('cityId')
    if (cityId) {
      params.push(cityId)
      query += ` AND v.city_id = $${params.length}`
    }

    query += ' ORDER BY v.created_at DESC'

    const result = await pool.query(query, params)

    // Map DB snake_case rows to camelCase for frontend
    const vendors = result.rows.map((v) => ({
      id: v.id,
      userId: v.user_id,
      name: v.name,
      category: v.category,
      description: v.description,
      photoUrl: v.photo_url,
      isActive: v.is_active,
      isVerified: v.is_verified || false,
      ratingAvg: parseFloat(v.rating) || 0,
      reviewCount: v.review_count || 0,
      createdAt: v.created_at,
      latitude: v.latitude,
      longitude: v.longitude,
      category_label: v.category_label,
    }))

    return NextResponse.json({ vendors })
  } catch (err) {
    console.error('Vendors GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
