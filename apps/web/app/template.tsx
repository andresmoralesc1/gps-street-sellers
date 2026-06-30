'use client'

/**
 * Root template — wraps every page with a subtle fade + slide-up.
 * Next.js remounts this component on every navigation, so the
 * animation re-fires whenever the user moves between routes.
 *
 * `prefers-reduced-motion` is honored via globals.css — the keyframes
 * stop when the user has reduced-motion enabled.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      <div className="animate-slide-up">{children}</div>
    </div>
  )
}
