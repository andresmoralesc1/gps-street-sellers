'use client'

import { useState, useRef, MouseEvent } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * WhatsApp CTA button with two micro-interactions (2026-07-21):
 *
 *   1. **Click ripple** — a circular overlay emanates from the click
 *      point (Material/Radix pattern). Works on mouse + touch because
 *      the calculation reads from both event payloads.
 *
 *   2. **Paper-plane fly-out** — a tiny `<Send>` icon rises from the
 *      button and arcs toward the WhatsApp icon position, then fades.
 *      Communicates "your message is on its way" without blocking the
 *      navigation (the click still opens the wa.me URL in a new tab
 *      after a short delay so the animation is perceptible).
 *
 * Both effects are gated by `prefers-reduced-motion` via the CSS media
 * query in globals.css (the animation classes used are all listed there),
 * so users with motion sensitivity get a plain green button with no
 * animation.
 */
interface WhatsAppButtonProps {
  href: string
  children?: React.ReactNode
  className?: string
  /** Optional label shown next to the icon. Defaults to "WhatsApp". */
  label?: string
}

export function WhatsAppButton({
  href,
  children,
  className,
  label = 'WhatsApp',
}: WhatsAppButtonProps) {
  const buttonRef = useRef<HTMLAnchorElement>(null)
  // Each ripple is a one-shot element with its own starting position.
  // We store them as state so React can render/cleanup. The ID is needed
  // to apply a `key` so the animation re-fires on repeat clicks.
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number; size: number }>
  >([])
  const nextRippleIdRef = useRef(0)
  const [flying, setFlying] = useState(false)

  const triggerEffect = (clientX: number, clientY: number) => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    // Center the ripple on the click point. `size` is the largest of
    // width/height so the circle covers the entire button even from
    // a corner click.
    const x = clientX - rect.left
    const y = clientY - rect.top
    const size = Math.max(rect.width, rect.height)
    const id = nextRippleIdRef.current++
    setRipples((prev) => [...prev, { id, x, y, size }])
    // Garbage-collect after the animation completes (matches the
    // 0.65s duration defined in tailwind.config.ts). Using a slightly
    // longer timeout avoids the ripple vanishing a frame early.
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 750)
    setFlying(true)
    window.setTimeout(() => setFlying(false), 600)
  }

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Capture the click coords first — clicking with the keyboard
    // doesn't provide them, but the geometric center is a fine fallback.
    const x = e.clientX || 0
    const y = e.clientY || 0
    if (x === 0 && y === 0 && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      triggerEffect(rect.left + rect.width / 2, rect.top + rect.height / 2)
    } else {
      triggerEffect(x, y)
    }
  }

  return (
    <a
      ref={buttonRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={`Contactar por ${label}`}
      className={clsx(
        // Always-relative so the absolute ripple children anchor to the
        // actual button box, not the next positioned ancestor.
        'relative inline-flex items-center justify-center gap-2',
        // Standard green for WhatsApp brand recognition. The shadow is
        // tinted green too so the button feels "lifted" on desktop.
        'bg-[#25D366] hover:bg-[#1DAB52] active:bg-[#1DAB52]',
        'text-white font-semibold rounded-xl px-5 py-2.5 text-sm',
        'shadow-lg shadow-[#25D366]/25 hover:shadow-xl hover:shadow-[#25D366]/30',
        // Subtle lift on hover + press feedback. Slightly less than the
        // generic Button because this is a one-action button and we
        // don't want it competing with the page-level CTAs.
        'transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
        'focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 focus:ring-offset-2',
        'overflow-hidden', // clip the ripple so it doesn't bleed outside
        className
      )}
    >
      {/* Main icon — this is the "anchor" for the flying paper plane
          which translates from this element's position. */}
      <MessageCircle size={18} aria-hidden="true" className="relative z-10" />
      <span className="relative z-10">{children ?? label}</span>

      {/* Ripples — one div per click, positioned at the click point. */}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="absolute rounded-full bg-white/40 animate-ripple pointer-events-none"
          style={{
            left: r.x - r.size / 2,
            top: r.y - r.size / 2,
            width: r.size,
            height: r.size,
          }}
        />
      ))}

      {/* Paper-plane fly-out — positioned at the icon's spot and
          translated upward-rightward by the `fly-out` keyframes. */}
      {flying && (
        <Send
          size={16}
          aria-hidden="true"
          className="absolute left-[14px] top-1/2 -translate-y-1/2 animate-fly-out text-white pointer-events-none"
        />
      )}
    </a>
  )
}
