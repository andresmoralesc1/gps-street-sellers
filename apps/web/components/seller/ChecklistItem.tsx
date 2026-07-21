'use client'

import { Check } from 'lucide-react'

/**
 * One row of the onboarding checklist shown on the seller dashboard.
 * Filled green circle + dark text when done; empty gray circle + muted
 * text when pending. Kept as its own component because it's reused 6
 * times in the dashboard and was previously inline at the bottom of
 * SellerDashboard.tsx (extracted 2026-07-21 to reduce that file).
 */
export function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? 'bg-green-500' : 'bg-gray-200'}`}>
        {done ? (
          <Check size={14} className="text-white" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-gray-400" />
        )}
      </div>
      <span className={`text-sm ${done ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}