import type { MetadataRoute } from 'next'
import pool from '@/lib/db'

// Dynamic sitemap — pulled at build time / on ISR
// Includes all active vendor URLs (for SEO indexing) plus static marketing pages.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://gps.andresmorales.com.co'

  // Static pages — kept small (high priority only)
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1.0, changeFrequency: 'weekly' },
    { url: `${base}/map`, priority: 0.9, changeFrequency: 'weekly' },
    { url: `${base}/como-funciona`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${base}/nosotros`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${base}/contacto`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${base}/preguntas-frecuentes`, priority: 0.6, changeFrequency: 'monthly' },
    // Auth pages — we still allow indexing but lower priority
    { url: `${base}/login`, priority: 0.5, changeFrequency: 'monthly' },
    { url: `${base}/register`, priority: 0.5, changeFrequency: 'monthly' },
    // Legal
    { url: `${base}/privacidad`, priority: 0.3, changeFrequency: 'yearly' },
    { url: `${base}/terminos`, priority: 0.3, changeFrequency: 'yearly' },
  ]

  // Dynamic: all active vendor slugs
  let vendorPages: MetadataRoute.Sitemap = []
  try {
    const result = await pool.query(
      `SELECT slug, created_at FROM vendors
       WHERE is_active = true AND slug IS NOT NULL`
    )
    vendorPages = result.rows.map((row) => ({
      url: `${base}/vendor/${row.slug}`,
      lastModified: new Date(row.created_at ?? Date.now()),
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    }))
  } catch (err) {
    // If DB is down at build, fall back to empty list — don't fail the sitemap
    console.error('Sitemap: failed to fetch vendors', err)
  }

  return [...staticPages, ...vendorPages]
}
