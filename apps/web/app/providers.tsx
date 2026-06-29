'use client'

import type { ReactNode } from 'react'
import { AuthInitializer } from '@/components/AuthInitializer'

export function Providers({ children }: { children: ReactNode }) {
  return <AuthInitializer>{children}</AuthInitializer>
}