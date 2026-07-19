-- Migration: NOT NULL constraints on critical columns.
--
-- Background (from AUDITORIA_DB.md §6):
--   Many columns are technically nullable but should never be NULL in practice.
--   Pre-flight confirmed all proposed columns have 0 NULLs across the entire DB
--   (users.name, profiles.name, reviews.{rating,vendor_id}, products.vendor_id,
--    orders.{buyer_id,vendor_id}, order_items.{order_id,product_id},
--    favorites.{buyer_id,vendor_id}, notifications.user_id).
--
-- We don't apply NOT NULL to columns where NULL is intentional:
--   - consent_logs.user_id (anonymous consents)
--   - products.photo_url, products.description (optional UX)
--   - vendors.{latitude,longitude,business_hours_*,phone,description}
--     (some vendors may not stream GPS or fill every field)
--   - reviews.comment (optional review body)

BEGIN;

-- users.name — every user has a name in onboarding
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

-- profiles.name — same
ALTER TABLE profiles ALTER COLUMN name SET NOT NULL;

-- reviews.rating — a review without rating is meaningless
ALTER TABLE reviews ALTER COLUMN rating SET NOT NULL;

-- reviews.vendor_id — review without vendor is orphaned
ALTER TABLE reviews ALTER COLUMN vendor_id SET NOT NULL;

-- products.vendor_id — product without vendor is orphaned
ALTER TABLE products ALTER COLUMN vendor_id SET NOT NULL;

-- orders.{buyer_id,vendor_id} — orders need both sides
ALTER TABLE orders ALTER COLUMN buyer_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN vendor_id SET NOT NULL;

-- order_items — items must belong to an order
ALTER TABLE order_items ALTER COLUMN order_id SET NOT NULL;

-- favorites — needs both buyer and vendor
ALTER TABLE favorites ALTER COLUMN buyer_id SET NOT NULL;
ALTER TABLE favorites ALTER COLUMN vendor_id SET NOT NULL;

-- notifications — needs a recipient
ALTER TABLE notifications ALTER COLUMN user_id SET NOT NULL;

COMMIT;
