/**
 * Pure validation helpers for the product create/edit form. Kept separate
 * from the page so they can be unit-tested without React or the DOM.
 *
 * The rules below mirror the backend checks in apps/web/app/api/products/route.ts
 * (POST) and apps/web/app/api/products/[id]/route.ts (PATCH). The same rules
 * have to run on both sides — the client can be bypassed, but a friendly
 * inline message saves a roundtrip when the user types something invalid.
 *
 * Kept as plain JS (no TS) so the test runner can require this file directly
 * without needing a transpile step. The `module.exports` style works under
 * Next.js bundling too because Next aliases CommonJS to ESM at the edge.
 */

const MAX_PRICE = 99999999.99

function validateProductName(raw) {
  if (raw === undefined || raw === null) return 'Nombre requerido'
  if (typeof raw !== 'string') return 'Nombre inválido'
  const trimmed = raw.trim()
  if (!trimmed) return 'Nombre requerido'
  if (trimmed.length > 200) return 'Nombre demasiado largo (máx 200 caracteres)'
  return undefined
}

function validateProductDescription(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined
  if (typeof raw !== 'string') return 'Descripción inválida'
  if (raw.length > 5000) return 'Descripción demasiado larga (máx 5000 caracteres)'
  return undefined
}

function validateProductPrice(raw) {
  if (raw === undefined || raw === null || raw === '') return 'Precio requerido'
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
  if (!Number.isFinite(n)) return 'Precio inválido'
  if (n <= 0) return 'Precio debe ser mayor a 0'
  if (n > MAX_PRICE) return 'Precio demasiado grande (máx ' + MAX_PRICE.toLocaleString('es-CO') + ' COP)'
  return undefined
}

function validateProductPhotoUrl(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined
  if (typeof raw !== 'string') return 'URL inválida'
  try {
    // eslint-disable-next-line no-new
    new URL(raw)
  } catch {
    return 'URL inválida'
  }
  return undefined
}

function validateProduct(input) {
  const errors = {}
  const nameErr = validateProductName(input.name)
  if (nameErr) errors.name = nameErr
  const descErr = validateProductDescription(input.description)
  if (descErr) errors.description = descErr
  const priceErr = validateProductPrice(input.price)
  if (priceErr) errors.price = priceErr
  const photoErr = validateProductPhotoUrl(input.photoUrl)
  if (photoErr) errors.photoUrl = photoErr
  return errors
}

function hasErrors(errors) {
  return Boolean(errors.name || errors.description || errors.price || errors.photoUrl)
}

module.exports = {
  MAX_PRICE,
  validateProductName,
  validateProductDescription,
  validateProductPrice,
  validateProductPhotoUrl,
  validateProduct,
  hasErrors,
}
