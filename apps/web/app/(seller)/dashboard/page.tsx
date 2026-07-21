'use client'

import { Suspense } from 'react'
import { DashboardContent, DashboardSkeleton } from '@/components/seller/Dashboard'

export default function SellerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}