import type { MetadataRoute } from 'next'
import pool from '@/lib/db'

// Dynamic sitemap — pulled at build time / on ISR.
// Includes all active vendor URLs (for SEO indexing) plus static marketing pages.
//
// Multi-idioma: although the app is currently ES-only, we expose alternate
// hreflang annotations for ES/PT/EN so search engines don't index the same
// page 3x when translation files land. x-default points to ES.

const BASE = 'https://gps.andresmorales.com.co'
const LOCALES = ['es', 'pt', 'en'] as const

type LocalizedEntry = { es: string; pt?: string; en?: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }

const STATIC_PAGES: LocalizedEntry[] = [
  { es: '/', priority: 1.0, changeFrequency: 'weekly' },
  { es: '/map', priority: 0.9, changeFrequency: 'weekly' },
  { es: '/como-funciona', priority: 0.8, changeFrequency: 'monthly' },
  { es: '/nosotros', priority: 0.7, changeFrequency: 'monthly' },
  { es: '/contacto', priority: 0.7, changeFrequency: 'monthly' },
  { es: '/preguntas-frecuentes', priority: 0.6, changeFrequency: 'monthly' },
  { es: '/login', priority: 0.5, changeFrequency: 'monthly' },
  { es: '/register', priority: 0.5, changeFrequency: 'monthly' },
  { es: '/privacidad', priority: 0.3, changeFrequency: 'yearly' },
  { es: '/terminos', priority: 0.3, changeFrequency: 'yearly' },
]

function buildAlternates(esPath: string) {
  const languages: Record<string, string> = {}
  for (const loc of LOCALES) {
    languages[loc] = `${BASE}/${loc}${esPath}`
  }
  languages['x-default'] = `${BASE}${esPath}`
  return languages
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${BASE}${page.es}`,
    lastModified: new Date(),
    priority: page.priority,
    changeFrequency: page.changeFrequency,
    alternates: { languages: buildAlternates(page.es) },
  }))

  let vendorPages: MetadataRoute.Sitemap = []
  try {
    const result = await pool.query(
      `SELECT slug, created_at FROM vendors
       WHERE is_active = true AND slug IS NOT NULL`
    )
    vendorPages = result.rows.map((row) => {
      const esPath = `/vendor/${row.slug}`
      return {
        url: `${BASE}${esPath}`,
        lastModified: new Date(row.created_at ?? Date.now()),
        priority: 0.8,
        changeFrequency: 'weekly' as const,
        alternates: { languages: buildAlternates(esPath) },
      }
    })
  } catch (err) {
    console.error('Sitemap: failed to fetch vendors', err)
  }

  return [...staticPages, ...vendorPages]
}