/**
 * Format a price value (string or number) for display in the UI.
 *
 *   formatPrice(1500)      -> "$1.500"
 *   formatPrice("1500")    -> "$1.500"
 *   formatPrice("1500.5")  -> "$1.500,5"
 *   formatPrice(null)      -> "—"
 *   formatPrice(undefined) -> "—"
 *   formatPrice("abc")     -> "—"  (NaN guard)
 *
 * The API sometimes returns price as string (postgres numeric) and
 * sometimes as number (jsonb). This helper normalizes both so the UI
 * shows "1.500" consistently instead of mixing "1500" and "1.500".
 */
export function formatPrice(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(n) ? `$${(n as number).toLocaleString('es-CO')}` : '—'
}