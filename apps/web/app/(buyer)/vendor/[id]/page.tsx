import { VendorDetailClient } from '@/components/vendor/VendorDetailClient'

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <VendorDetailClient vendorId={id} />
}