import type { Metadata } from 'next'
import { HomeView } from '@/components/home/HomeView'

// Home gets the default title from the layout (template: %s · BarrioTech).
// We override nothing here so the layout's Open Graph + JSON-LD stays the source of truth.
export const metadata: Metadata = {}

export default function HomePage() {
  return <HomeView />
}
