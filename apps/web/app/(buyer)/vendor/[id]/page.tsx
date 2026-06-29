import { VendorDetailClient } from '@/components/vendor/VendorDetailClient'

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Note: legacy UUID URLs are redirected to the slug form
  // client-side inside VendorDetailClient (see useEffect there).
  return <VendorDetailClient vendorId={id} />
}