import { VendorDetailClient } from '@/components/vendor/VendorDetailClient'

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  return <VendorDetailClient vendorId={params.id} />
}