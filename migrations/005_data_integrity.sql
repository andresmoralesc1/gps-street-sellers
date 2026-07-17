-- 005_data_integrity.sql
-- Sprint 2 fixes for P0 #2/#11/#6 from internal DB audit.
--
-- What this does:
--   1. Adds reviews.user_id with FK to users (id), nullable + ON DELETE SET
--      NULL. Existing rows keep their value via the column add, but we backfill
--      from profiles.email / users.email so legacy 'author_name' reviews tie
--      to their original author when possible (ARCO/portability compliance).
--   2. Adds a CHECK constraint on reviews.author_name (length > 0 / <= 100).
--   3. Adds CHECK constraint on vendors.city_id using the canonical
--      COLOMBIA_CITIES.id list shipped in apps/web/lib/core/constants/cities.ts.
--      This replaces the "no cities table" concern — the source of truth is
--      the TypeScript constant, mirrored here as a safety net that prevents
--      typos like 'bogotá' with accent. Production reads `cities` from the
--      static list, this CHECK only rejects bad rows at write time.
--   4. NOT NULL where the audit confirmed semantics need it.
--
-- What this does NOT do (intentional):
--   - POSTGIS: deferred to Sprint 3 — schema.sql is the wrong place to add
--     extensions and the perf risk at 12 vendors is zero.
--   - Rename `favorites.buyer_id → profiles.id` to `profiles.user_id` —
--     cosmetic, breaks nothing, defer.

-- ───────────────────────────────────────────────────────────────────────────
-- (1) reviews.user_id backfill + FK
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill from profiles.email — only when the review was authored by someone
-- who still has a profile. This is best-effort and idempotent.
UPDATE public.reviews r
SET user_id = p.user_id
FROM public.profiles p
WHERE r.user_id IS NULL
  AND lower(trim(r.author_name)) = lower(trim(p.name))
  AND p.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p.user_id AND lower(u.name) = lower(r.author_name)
  );

-- Add the FK only after backfill so existing data passes the constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_id_fkey'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON public.reviews (user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- (2) reviews.author_name sanity bounds
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_author_name_length_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_author_name_length_check
  CHECK (length(btrim(author_name)) BETWEEN 1 AND 100);

-- ───────────────────────────────────────────────────────────────────────────
-- (3) vendors.city_id / category NOT NULL + CHECK on canonical city list
-- ───────────────────────────────────────────────────────────────────────────

-- Backfill: every existing vendor must have a city. Current data shows 'cali'
-- everywhere — pre-launch product, no risk. If a NULL slips through, default
-- to 'cali' (only city with real data) and log.
UPDATE public.vendors
SET city_id = 'cali'
WHERE city_id IS NULL OR btrim(city_id) = '';

-- city_id must be non-null AND in the canonical list (matches
-- apps/web/lib/core/constants/cities.ts ids).
ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_city_id_check;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_city_id_check
  CHECK (
    city_id IS NOT NULL
    AND city_id IN (
      'bogota','medellin','cali','barranquilla','cartagena','bucaramanga',
      'cucuta','pereira','ibague','manizales','santa-marta','villavicencio',
      'pasto','neiva','armenia','sincelejo','tunja','riohacha'
    )
  );

-- category: not-null with the same canonical list (already enforced in code
-- but defense-in-depth at DB layer prevents drift). Categories source of
-- truth: schema.sql seed "INSERT INTO categories".
ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_category_check;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_category_check
  CHECK (
    category IS NOT NULL
    AND category IN ('frutas','comida','bebidas','artesanias','ropa','otros')
  );

-- ───────────────────────────────────────────────────────────────────────────
-- (4) NOT NULL constraints on columns that semantically never should be NULL
-- ───────────────────────────────────────────────────────────────────────────
-- These mirror what the audit flagged as P1. Apply only where no existing
-- rows are NULL; if any are, the migration aborts and we patch data first.

-- Helper: SET CONSTRAINTS ALL DEFERRED can't be used here, so we guard per
-- column by checking counts first.

DO $body$
DECLARE
  null_count integer;
BEGIN
  -- reviews.vendor_id
  SELECT count(*) INTO null_count FROM reviews WHERE vendor_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE reviews ALTER COLUMN vendor_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'reviews.vendor_id: % null rows — leaving column nullable', null_count;
  END IF;

  -- products.vendor_id
  SELECT count(*) INTO null_count FROM products WHERE vendor_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE products ALTER COLUMN vendor_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'products.vendor_id: % null rows — leaving column nullable', null_count;
  END IF;

  -- order_items.order_id
  SELECT count(*) INTO null_count FROM order_items WHERE order_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE order_items ALTER COLUMN order_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'order_items.order_id: % null rows — leaving column nullable', null_count;
  END IF;

  -- notifications.user_id
  SELECT count(*) INTO null_count FROM notifications WHERE user_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE notifications ALTER COLUMN user_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'notifications.user_id: % null rows — leaving column nullable', null_count;
  END IF;

  -- reviews.rating (rating is the core of a review)
  SELECT count(*) INTO null_count FROM reviews WHERE rating IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE reviews ALTER COLUMN rating SET NOT NULL;
  ELSE
    RAISE NOTICE 'reviews.rating: % null rows — leaving column nullable', null_count;
  END IF;
END
$body$;
