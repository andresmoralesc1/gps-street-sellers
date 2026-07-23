'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Store, X } from 'lucide-react'

/**
 * Seller onboarding completion banner (2026-07-23, CRIT-A2).
 *
 * Scenario: a user registers with role='seller'. The /api/auth/register
 * endpoint auto-bootstraps a vendors row inside the same transaction
 * (lines 251-279 of apps/web/app/api/auth/register/route.ts) with
 * is_active=false and a placeholder name "Mi negocio de {firstName}".
 * If the seller never completes the /onboarding VendorFormSlide — they
 * closed the tab mid-flow, lost signal in the street, or registered
 * without intending to set up a puesto right away — they end up with
 * user.role='seller' but a vendor that is permanently is_active=false
 * (and thus invisible on the map).
 *
 * What this banner does:
 *   - For sellers whose /api/vendors/me returns vendors.length===0,
 *     OR returns a vendor with is_active=false AND is_verified=false
 *     (still placeholder), shows a dismissable yellow CTA bar that
 *     links to /onboarding?next=<current path>.
 *   - Persists dismiss state in localStorage keyed by user id + vendor
 *     id so it re-appears if the placeholder vendor changes (e.g. the
 *     seller names it but never sets it active).
 *
 * What this banner does NOT do:
 *   - It does NOT redirect. A seller might want to browse the map first
 *     to see the area before setting up. An aggressive redirect would
 *     trap them out of the app on a flaky street connection.
 *
 * Touch targets: the close (X) button is min 44px square (h-11 w-11).
 * The CTA button uses the shared <Button> component which is already
 * min-height 44px on mobile (see Button.tsx). The banner itself is
 * min-h-[56px] so the content is thumb-reachable.
 */
const STORAGE_PREFIX = 'seller_onboarding_banner_dismissed:'

function dismissKey(userId: string, vendorKey: string): string {
  // Key per (user, vendor). When the vendor changes (or one is created)
  // the key changes too and the banner re-appears.
  return `${STORAGE_PREFIX}${userId}:${vendorKey}`
}

export function SellerOnboardingBanner() {
  const user = useStore((s) => s.user)
  const router = useRouter()
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [vendorKey, setVendorKey] = useState<string>('none')
  const [dismissed, setDismissed] = useState(false)

  // Only consider the banner when we have a logged-in seller.
  useEffect(() => {
    if (!user || user.role !== 'seller') {
      setShow(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function check() {
      try {
        const res = await fetch('/api/vendors/me', {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) {
          // 403 = buyer hitting the endpoint, 401 = not logged in. Either
          // way, banner should hide. Network errors → silent fail (we
          // don't want a flashing banner if the API blips).
          if (!cancelled) setShow(false)
          return
        }
        const data = await res.json()
        const list: Array<{ id?: string; isActive?: boolean; isVerified?: boolean; name?: string }> =
          data.vendors ?? (data.vendor ? [data.vendor] : [])

        // Conditions to show:
        //   1. No vendor at all (legacy sellers, or registered before
        //      the auto-bootstrap in register landed in production).
        //   2. Has a vendor but it's still the placeholder
        //      (is_active=false AND is_verified=false) — the seller
        //      hasn't finished onboarding yet.
        let needsOnboarding = false
        let key = 'none'
        if (list.length === 0) {
          needsOnboarding = true
          key = 'empty'
        } else {
          const placeholder = list.find(
            (v) => v.isActive === false && v.isVerified === false
          )
          if (placeholder) {
            needsOnboarding = true
            key = placeholder.id ?? 'placeholder'
          }
        }

        if (cancelled) return

        setVendorKey(key)
        const isDismissed = window.localStorage.getItem(dismissKey(user!.id, key)) === '1'
        setDismissed(isDismissed)
        setShow(needsOnboarding && !isDismissed)
      } catch {
        // Network / abort — silent.
      }
    }

    check()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [user])

  if (!show || !user) return null

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(dismissKey(user.id, vendorKey), '1')
    } catch {
      // localStorage full / disabled — silent.
    }
    setShow(false)
  }

  return (
    <div
      role="region"
      aria-label="Onboarding incompleto"
      className="sticky top-0 z-40 w-full bg-amber-50 border-b border-amber-200"
    >
      <div className="mx-auto flex max-w-screen-lg items-center gap-3 px-4 py-3 min-h-[56px]">
        <Store
          className="shrink-0 text-amber-700"
          size={22}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900 leading-snug">
            Completá el registro de tu puesto
          </p>
          <p className="text-xs text-amber-800/90 leading-snug mt-0.5">
            Tu cuenta está creada pero el puesto aún no es visible en el mapa.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push(`/onboarding?next=${encodeURIComponent(pathname || '/profile/edit')}`)}
          className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          aria-label="Completar registro del puesto"
        >
          Completar
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar aviso"
          className="shrink-0 inline-flex items-center justify-center h-11 w-11 rounded-lg text-amber-800 hover:bg-amber-100 active:bg-amber-200 transition-colors"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}