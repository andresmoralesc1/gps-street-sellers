import { redirect } from 'next/navigation'
import pool from '@/lib/db'
import { isUuid } from '@/lib/core/utils/slug'
import { VendorDetailClient } from '@/components/vendor/VendorDetailClient'

/**
 * Public catalog page at /vendedor/[slug].
 *
 * Shared with the buyer-only /vendor/[id] route via VendorDetailClient —
 * the difference is only the URL shape:
 *   - /vendor/[id]    accepts a UUID id (deep-link, signed messages)
 *   - /vendedor/[slug]  is the human-friendly shareable URL
 *
 * Server resolves the slug to the canonical UUID before rendering so the
 * client always sees a valid UUID for API calls.
 */
export default async function VendorPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!slug) redirect('/map')

  // Fast path: if the URL is already a UUID, pass it straight through.
  if (isUuid(slug)) {
    return <VendorDetailClient vendorId={slug} vendorSlug={slug} />
  }

  // Resolve the slug to the vendor id. Slugs are unique.
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM vendors WHERE slug = $1 LIMIT 1',
    [slug]
  )
  if (rows.length === 0) {
    // Unknown slug → fall back to the map so the user can browse.
    redirect('/map')
  }

  return <VendorDetailClient vendorId={rows[0].id} vendorSlug={slug} />
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // Best-effort title — keeps share previews tidy without crashing on bad slugs.
  return {
    title: `Vendedor · ${slug}`,
    description: 'Catálogo público del vendedor ambulante.',
  }
}
