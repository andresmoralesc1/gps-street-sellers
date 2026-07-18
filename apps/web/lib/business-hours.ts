/**
 * Format a `businessHours` object as a short one-line string for display.
 * Examples:
 *   - "Lun-Sáb 8-18" when same window every open day
 *   - "Lun-Vie 9-18" when only weekdays
 *   - "Abierto 24/7" when no hours configured (treated as always open)
 *   - "Horario no configurado" when toggle is enabled but no days selected
 */
export function formatBusinessHoursShort(hours: {
  enabled: boolean
  start: string | null
  end: string | null
  days: string[]
}): string {
  if (!hours.enabled) return 'Abierto 24/7'
  if (hours.days.length === 0) return 'Horario no configurado'
  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const dayLabels: Record<string, string> = {
    mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom',
  }
  // Compress consecutive days into ranges (Mon-Tue-Wed -> Lun-Mié)
  const sorted = [...hours.days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
  let rangeStart = sorted[0]
  let rangeEnd = sorted[0]
  let ranges: string[] = []
  for (let i = 1; i < sorted.length; i++) {
    if (dayOrder.indexOf(sorted[i]) === dayOrder.indexOf(rangeEnd) + 1) {
      rangeEnd = sorted[i]
    } else {
      ranges.push(rangeStart === rangeEnd ? dayLabels[rangeStart] : `${dayLabels[rangeStart]}-${dayLabels[rangeEnd]}`)
      rangeStart = sorted[i]
      rangeEnd = sorted[i]
    }
  }
  ranges.push(rangeStart === rangeEnd ? dayLabels[rangeStart] : `${dayLabels[rangeStart]}-${dayLabels[rangeEnd]}`)
  const time = hours.start && hours.end ? `${hours.start}-${hours.end}` : ''
  return `${ranges.join(', ')} ${time}`.trim()
}

/**
 * isOpenNow — pure helper, no DB / no Node-isms.
 *
 * Returns true if the current local-time falls inside the vendor's open
 * window AND today is an open day. Returns true if hours are disabled
 * (caller passed enabled=false), which the route layer interprets as
 * "always open".
 *
 * Why not Postgres-side:
 *   - This helper is used BOTH server-side (to compute isOpen in
 *     /api/vendors) AND client-side (VendorCard "Open now" badge, map
 *     marker colour, dashboard "you're closed" notice). A single source
 *     of truth in TS avoids JS/Python/JS drift.
 *   - Computed at read time so the cache stays short (60s) and the
 *     "closed" badge appears the second the schedule window closes —
 *     no edge function needed.
 *
 * `days` is a Postgres text[]; values are 'mon'..'sun'. `start`/`end` are
 * "HH:MM" strings (server normalizes these from `time without time zone`).
 *
 * Edge cases:
 *   - If start == end we treat the window as 0 minutes → closed.
 *   - We compare against the SERVER's local clock. For Colombia that's
 *     America/Bogota (UTC-5, no DST). The Vercel/Node runtime defaults
 *     to UTC, so server-side callers should pass a `now` arg with the
 *     right Date for production accuracy. The default (`new Date()`)
 *     is used by client code where the user's local clock is correct.
 */

export type StationDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

const DAY_MS = 24 * 60 * 60 * 1000

/** Map a Date to a StationDay based on its UTC day-of-week. */
function dayOfWeekUTC(d: Date): StationDay {
  // JS: 0 = Sunday, 1 = Monday ... 6 = Saturday
  const map: StationDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[d.getUTCDay()]
}

/**
 * Map a Date to a StationDay based on America/Bogota local time.
 * Colombia is UTC-5 year-round (no DST), so we subtract 5h from the UTC
 * instant. Day boundaries in Bogota can shift the result by ±1 day vs UTC.
 */
function dayOfWeekBogota(d: Date): StationDay {
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000)
  return dayOfWeekUTC(bogota)
}

/** Minutes-of-day (0..1439) in America/Bogota for a given Date. */
function bogotaMinutesOfDay(d: Date): number {
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000)
  return bogota.getUTCHours() * 60 + bogota.getUTCMinutes()
}

function parseHHMM(s: string | null | undefined): number | null {
  if (!s || typeof s !== 'string') return null
  // Accept "HH:MM" and "HH:MM:SS" (Postgres TIME comes back with seconds).
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s.trim())
  if (!m) return null
  const total = Number(m[1]) * 60 + Number(m[2])
  if (total < 0 || total > 24 * 60) return null
  return total
}

/**
 * @param start  "HH:MM"
 * @param end    "HH:MM" (must be > start)
 * @param days   string[] — accepts any case but normalizes to lowercase
 * @param now    optional Date — defaults to new Date() (UTC). Server-side
 *               callers in non-UTC zones should pass an explicit Date.
 */
export function isOpenNow(
  start: string | null | undefined,
  end: string | null | undefined,
  days: string[] | null | undefined,
  now: Date = new Date()
): boolean {
  if (!start || !end || !Array.isArray(days) || days.length === 0) {
    // Misconfigured → assume open so we don't accidentally hide a vendor
    // whose schedule is broken. Operators will see "always open" and
    // notice.
    return true
  }

  const startMin = parseHHMM(start)
  const endMin = parseHHMM(end)
  if (startMin === null || endMin === null || endMin <= startMin) return true

  // Normalize days to lowercase, trim, dedupe
  const normalizedDays = new Set(
    days.map((d) => String(d).toLowerCase().trim()).filter((d): d is StationDay =>
      d === 'mon' || d === 'tue' || d === 'wed' || d === 'thu' ||
      d === 'fri' || d === 'sat' || d === 'sun'
    )
  )
  if (normalizedDays.size === 0) return true

  const today = dayOfWeekBogota(now)
  if (!normalizedDays.has(today)) return false

  const nowMin = bogotaMinutesOfDay(now)
  return nowMin >= startMin && nowMin < endMin
}

/**
 * Helper for clients that want a human label, e.g. "Abierto · cierra 18:00"
 * or "Cerrado · abre mañana 8:00".
 *
 * Kept simple — no localization framework, returns Spanish strings.
 */
export function openStatusLabel(
  enabled: boolean,
  start: string | null | undefined,
  end: string | null | undefined,
  days: string[] | null | undefined,
  now: Date = new Date()
): { isOpen: boolean; text: string } {
  if (!enabled) return { isOpen: true, text: 'Abierto' }
  const isOpen = isOpenNow(start, end, days, now)
  if (isOpen) {
    return { isOpen: true, text: `Abierto · cierra ${end}` }
  }
  // Not open: pick the next open day
  const normalizedDays = new Set(
    (days ?? []).map((d) => String(d).toLowerCase().trim())
  )
  const dayOrder: StationDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const todayIdx = dayOrder.indexOf(dayOfWeekUTC(now))
  for (let i = 1; i <= 7; i++) {
    const next = dayOrder[(todayIdx + i) % 7]
    if (normalizedDays.has(next)) {
      const isTomorrow = i === 1
      return {
        isOpen: false,
        text: `Cerrado · ${isTomorrow ? 'abre mañana' : `abre ${dayLabel(next)}`} ${start ?? ''}`,
      }
    }
  }
  return { isOpen: false, text: 'Cerrado' }
}

function dayLabel(d: StationDay): string {
  const map: Record<StationDay, string> = {
    mon: 'lunes', tue: 'martes', wed: 'miércoles', thu: 'jueves',
    fri: 'viernes', sat: 'sábado', sun: 'domingo',
  }
  return map[d]
}

// Re-export so callers that import only one symbol don't have to know DAY_MS.
export { DAY_MS }