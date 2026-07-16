// Shared auth helpers — used by /api/auth/register, /api/auth/login, etc.
// Centralizes the email-or-phone detection so the two endpoints agree.
//
// Why a single helper: login and register must use the SAME rules for
// "is this input an email?" — otherwise a user can register as "juan@y"
// but fail to log in because the validator disagrees. Keep one source of truth.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Detects whether a string looks like an email address.
 * Phone strings (digits, spaces, +, -) are NOT emails.
 */
export function isEmail(input: string): boolean {
  return EMAIL_RE.test(input.trim())
}

/**
 * Detects whether a string looks like a phone number.
 * Colombia default = 10 digits, with optional +57 prefix.
 */
export function isPhone(input: string): boolean {
  const digits = input.replace(/\D/g, '')
  // 10 digits = local Colombian, 12 digits with 57 prefix = international format
  return digits.length === 10 || (digits.startsWith('57') && digits.length === 12)
}

/**
 * Normalizes a phone string to digits only, keeping the 57 prefix if present.
 * Returns null if the input doesn't look like a valid Colombian phone.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.startsWith('57') && digits.length === 12) return digits
  return null
}

/**
 * Normalizes an email to lowercase. Trims whitespace.
 * Returns null if the input doesn't pass the email regex.
 */
export function normalizeEmail(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!isEmail(trimmed)) return null
  return trimmed
}