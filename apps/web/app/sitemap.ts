import type { MetadataRoute } from 'next'
import pool from '@/lib/db'

/**
 * Dynamic sitemap — pulled at build time / on ISR.
 * Includes all active vendor URLs (for SEO indexing) plus static marketing pages.
 *
 * i18n:
 *   The site is currently ES-only. Earlier we emitted hreflang for /es/ /pt/
 *   /en/ — but those URL prefixes don't exist yet (no [locale] segment in
 *   app/). Search engines flagged every entry with three 404 alternates. We
 *   now emit ONLY `x-default` (canonical Spanish URL) until a locale segment
 *   is added. When translation lands, swap `LOCALES_ENABLED` to true and
 *   every URL will start emitting 3 hreflangs automatically — assuming the
 *   corresponding routes exist.
 */

const BASE = 'https://gps.andresmorales.com.co'

// Flip to true the day [locale] routing lands. Until then, emitting hreflang
// for non-existent URLs is an SEO sin (Search Console "alternates have errors").
const LOCALES_ENABLED = false
const LOCALES = ['es', 'pt', 'en'] as const

type LocalizedEntry = { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }

const STATIC_PAGES: LocalizedEntry[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/map', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/como-funciona', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/nosotros', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contacto', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/preguntas-frecuentes', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/login', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/register', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/privacidad', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terminos', priority: 0.3, changeFrequency: 'yearly' },
]

function buildAlternates(esPath: string) {
  // x-default → Spanish URL (no prefix). Always emit.
  const languages: Record<string, string> = {
    'x-default': `${BASE}${esPath}`,
  }
  if (LOCALES_ENABLED) {
    for (const loc of LOCALES) {
      languages[loc] = `${BASE}/${loc}${esPath}`
    }
  }
  return languages
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${BASE}${page.path}`,
    lastModified: new Date(),
    priority: page.priority,
    changeFrequency: page.changeFrequency,
    alternates: { languages: buildAlternates(page.path) },
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