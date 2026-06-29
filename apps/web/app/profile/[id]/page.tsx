import { VendorDetailClient } from '@/components/vendor/VendorDetailClient'

export default function PublicVendorProfile({ params }: { params: { id: string } }) {
  return <VendorDetailClient vendorId={params.id} />
}
