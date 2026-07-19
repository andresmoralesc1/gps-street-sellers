/**
 * Tests for the product validation helper used by /products form.
 *
 * Run: node --test scripts/tests/validation.test.js
 *
 * The validation helper is intentionally a plain .js file (no TS) so we can
 * require it directly without needing a transpile step.
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  validateProductName,
  validateProductDescription,
  validateProductPrice,
  validateProductPhotoUrl,
  validateProduct,
  hasErrors,
  MAX_PRICE,
} = require(path.join(__dirname, '../../apps/web/lib/products/validation.js'))

// --- name -----------------------------------------------------------------
test('name: rejects empty', () => {
  assert.ok(validateProductName(''))
  assert.ok(validateProductName('   '))
  assert.ok(validateProductName(undefined))
  assert.ok(validateProductName(null))
})
test('name: rejects >200 chars', () => {
  assert.ok(validateProductName('a'.repeat(201)))
})
test('name: accepts a normal name', () => {
  assert.equal(validateProductName('Empanada de pollo'), undefined)
})
test('name: trims whitespace before length check', () => {
  assert.equal(validateProductName('   ok   '), undefined)
})
test('name: rejects non-string types', () => {
  assert.ok(validateProductName(123))
  assert.ok(validateProductName({}))
  assert.ok(validateProductName([]))
})

// --- description ----------------------------------------------------------
test('description: optional — empty is OK', () => {
  assert.equal(validateProductDescription(''), undefined)
  assert.equal(validateProductDescription(undefined), undefined)
  assert.equal(validateProductDescription(null), undefined)
})
test('description: rejects >5000 chars', () => {
  assert.ok(validateProductDescription('a'.repeat(5001)))
})
test('description: rejects non-string when present', () => {
  assert.ok(validateProductDescription(123))
  assert.ok(validateProductDescription(true))
})

// --- price ----------------------------------------------------------------
test('price: required', () => {
  assert.ok(validateProductPrice(''))
  assert.ok(validateProductPrice(undefined))
  assert.ok(validateProductPrice(null))
})
test('price: rejects non-numeric strings', () => {
  assert.ok(validateProductPrice('abc'))
  assert.ok(validateProductPrice('NaN'))
})
test('price: rejects 0 and negative', () => {
  assert.ok(validateProductPrice(0))
  assert.ok(validateProductPrice(-1))
  assert.ok(validateProductPrice('-5'))
})
test('price: rejects > MAX_PRICE', () => {
  assert.ok(validateProductPrice(MAX_PRICE + 1))
  assert.ok(validateProductPrice('100000000'))
})
test('price: accepts normal values', () => {
  assert.equal(validateProductPrice(2500), undefined)
  assert.equal(validateProductPrice('2500'), undefined)
  assert.equal(validateProductPrice('0.5'), undefined)
  assert.equal(validateProductPrice(MAX_PRICE), undefined)
})

// --- photoUrl -------------------------------------------------------------
test('photoUrl: optional — empty is OK', () => {
  assert.equal(validateProductPhotoUrl(''), undefined)
  assert.equal(validateProductPhotoUrl(undefined), undefined)
  assert.equal(validateProductPhotoUrl(null), undefined)
})
test('photoUrl: rejects malformed URLs', () => {
  assert.ok(validateProductPhotoUrl('not-a-url'))
  assert.ok(validateProductPhotoUrl('just-text'))
})
test('photoUrl: accepts a normal URL', () => {
  assert.equal(validateProductPhotoUrl('https://example.com/img.jpg'), undefined)
})
test('photoUrl: accepts a relative-ish path? no — must be absolute URL', () => {
  // Per the rules: validate with `new URL()`, which rejects plain paths.
  assert.ok(validateProductPhotoUrl('/uploads/foo.jpg'))
})

// --- validateProduct (aggregate) ------------------------------------------
test('validateProduct: empty input flags all required fields', () => {
  const e = validateProduct({})
  assert.ok(e.name)
  assert.ok(e.price)
  // description and photoUrl are optional, so they shouldn't be flagged
  assert.equal(e.description, undefined)
  assert.equal(e.photoUrl, undefined)
})
test('validateProduct: a valid input returns no errors', () => {
  const e = validateProduct({
    name: 'Empanada',
    description: 'Rellena de pollo',
    price: '2500',
    photoUrl: 'https://example.com/x.jpg',
  })
  assert.equal(hasErrors(e), false)
})
test('validateProduct: collects all errors at once', () => {
  const e = validateProduct({
    name: '',
    description: 'a'.repeat(6000),
    price: '-1',
    photoUrl: 'nope',
  })
  assert.ok(e.name)
  assert.ok(e.description)
  assert.ok(e.price)
  assert.ok(e.photoUrl)
})
test('validateProduct: handles number price directly', () => {
  const e = validateProduct({ name: 'X', price: 100 })
  assert.equal(hasErrors(e), false)
})

// --- hasErrors ------------------------------------------------------------
test('hasErrors: false when no errors', () => {
  assert.equal(hasErrors({}), false)
})
test('hasErrors: true when any field has an error', () => {
  assert.equal(hasErrors({ name: 'x' }), true)
  assert.equal(hasErrors({ photoUrl: 'x' }), true)
})
