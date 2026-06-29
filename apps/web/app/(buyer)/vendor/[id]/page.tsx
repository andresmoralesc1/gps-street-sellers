import type { Metadata } from 'next'
import { VendorDetailClient } from '@/components/vendor/VendorDetailClient'
import { isUuid } from '@/lib/core/utils/slug'
import pool from '@/lib/db'
import { getCityById } from '@/lib/core/constants/cities'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const isUuidId = isUuid(id)
  try {
    const result = await pool.query(
      `SELECT v.name, v.category, v.description, v.photo_url, v.city_id
       FROM vendors v
       WHERE ${isUuidId ? 'v.id = $1' : 'v.slug = $1'}
       LIMIT 1`,
      [id]
    )
    if (result.rows.length > 0) {
      const v = result.rows[0]
      const cityName = getCityById(v.city_id)?.name ?? 'Colombia'
      const title = `${v.name} — ${cityName} · BarrioTech`
      const description = v.description
        ? `${v.description.slice(0, 155)}${v.description.length > 155 ? '…' : ''}`
        : `${v.name} en ${cityName} — vendedor informal en BarrioTech.`
      const images = v.photo_url ? [v.photo_url] : []
      return {
        title,
        description,
        openGraph: {
          title: v.name,
          description,
          type: 'profile',
          images,
          locale: 'es_CO',
        },
        twitter: {
          card: 'summary_large_image',
          title: v.name,
          description,
          images,
        },
      }
    }
  } catch (err) {
    console.error('generateMetadata (vendor) error:', err)
  }
  return {
    title: 'Vendedor — BarrioTech',
    description: 'Vendedor informal en BarrioTech',
  }
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <VendorDetailClient vendorId={id} />
}
