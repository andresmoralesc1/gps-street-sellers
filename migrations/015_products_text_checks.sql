-- Migration 015: CHECK constraints on products & product_photos text fields.
--
-- Background (products audit 2026-07-19):
--   - products.name: text without length bound. Endpoint-level validation
--     used `if (!name)` truthy, which accepts " " (one space), 5000-char
--     names, or even arrays/objects coerced via JSON.stringify quirks.
--   - products.description: text without length bound. Could store megabytes
--     of arbitrary text — abuse / DoS surface.
--   - products.photo_url: any non-null string accepted. URL regex lives in
--     the POST handler, but schema should defend too (defense in depth).
--   - product_photos.url: same problem, plus the POST handler used to
--     require /^https?:\/\// which rejects the legitimate seed URLs
--     `/products/cali/*.jpg` served from public/.
--   - product_photos.position: integer without bound — could grow unbounded
--     if the API ever inserted custom positions.
--
-- Bounds chosen for sane street-vendor catalogue use:
--   - name: 1..200 chars (after trim) — empanada descriptions fit
--   - description: up to 5000 chars — about 1 page of text
--   - photo_url: http(s) absolute OR relative path under /products/ or
--     /storage/ (the legitimate paths the app uses)
--
-- Safe for existing data: pre-flight queries below confirm all 21 rows
-- already satisfy every constraint.

BEGIN;

-- Pre-flight: nothing violates
DO $$
DECLARE
  bad_name int;
  bad_desc int;
  bad_url int;
  bad_photo_url int;
  bad_photo_url_pos int;
BEGIN
  SELECT count(*) INTO bad_name FROM products WHERE name IS NULL OR btrim(name) = '' OR length(btrim(name)) > 200;
  SELECT count(*) INTO bad_desc FROM products WHERE description IS NOT NULL AND length(description) > 5000;
  SELECT count(*) INTO bad_url FROM products WHERE photo_url IS NOT NULL AND photo_url !~ '^(https?://|/products/|/storage/)';
  SELECT count(*) INTO bad_photo_url FROM product_photos WHERE url IS NULL OR length(url) < 1 OR length(url) > 2048 OR url !~ '^(https?://|/products/|/storage/)';
  SELECT count(*) INTO bad_photo_url_pos FROM product_photos WHERE position < 0 OR position > 999;

  IF bad_name > 0 OR bad_desc > 0 OR bad_url > 0 OR bad_photo_url > 0 OR bad_photo_url_pos > 0 THEN
    RAISE EXCEPTION 'Pre-flight failed: bad_name=%, bad_desc=%, bad_url=%, bad_photo_url=%, bad_photo_url_pos=%',
      bad_name, bad_desc, bad_url, bad_photo_url, bad_photo_url_pos;
  END IF;
END $$;

-- products.name: 1..200 chars after trim
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_name_length') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_name_length
      CHECK (length(btrim(name)) BETWEEN 1 AND 200);
  END IF;
END $$;

-- products.description: optional, max 5000 chars
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_description_length') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_description_length
      CHECK (description IS NULL OR length(description) <= 5000);
  END IF;
END $$;

-- products.photo_url: NULL or http(s) or /products/ or /storage/
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_photo_url_format') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_photo_url_format
      CHECK (photo_url IS NULL OR photo_url ~ '^(https?://[^\s]+|/products/[^\s]+|/storage/[^\s]+)$');
  END IF;
END $$;

-- product_photos.url: 1..2048 chars, same path whitelist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_photos_url_format') THEN
    ALTER TABLE product_photos
      ADD CONSTRAINT product_photos_url_format
      CHECK (length(url) BETWEEN 1 AND 2048 AND url ~ '^(https?://[^\s]+|/products/[^\s]+|/storage/[^\s]+)$');
  END IF;
END $$;

-- product_photos.position: 0..999 (sane range for street-vendor catalog)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_photos_position_range') THEN
    ALTER TABLE product_photos
      ADD CONSTRAINT product_photos_position_range
      CHECK (position BETWEEN 0 AND 999);
  END IF;
END $$;

COMMIT;