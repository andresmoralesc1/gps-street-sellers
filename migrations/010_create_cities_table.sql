-- Migration: cities table + FK from vendors + ad_campaigns
--
-- Background (from AUDITORIA_DB.md §6):
--   The vendors.city_id and ad_campaigns.target_city_id columns are TEXT but
--   there is no authoritative city list in the DB. Valid values are derived
--   from the hardcoded COLOMBIA_CITIES array in apps/web/lib/core/constants/cities.ts.
--   This creates a real FK so:
--     - typos in city_id at INSERT/UPDATE time are rejected by the DB
--     - the canonical city list (id, name, department, center, timezone) lives
--       in one place and the TS array stays in sync (we sync at startup)
--     - analytics queries (e.g. "vendors per department") are easy
--
-- Strategy: 1:1 mirror of COLOMBIA_CITIES. The TS array is the source of truth
-- for runtime validation (no DB round-trip on /register); the DB table is the
-- source of truth for FK integrity and joins. A startup hook in lib/core/db.ts
-- could diff+warn if they drift, but is out of scope for this migration.

BEGIN;

-- 1. Create the table
CREATE TABLE IF NOT EXISTS cities (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  department  text NOT NULL,
  center_lat  double precision NOT NULL,
  center_lng  double precision NOT NULL,
  timezone    text NOT NULL DEFAULT 'America/Bogota',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Populate with the same 18 cities from COLOMBIA_CITIES (slug = id).
--    ON CONFLICT DO NOTHING makes this idempotent and safe to re-run.
INSERT INTO cities (id, name, department, center_lat, center_lng) VALUES
  ('bogota',       'Bogotá',       'Cundinamarca',     4.6097,  -74.0817),
  ('medellin',     'Medellín',     'Antioquia',        6.2476,  -75.5658),
  ('cali',         'Cali',         'Valle del Cauca',  3.4516,  -76.5320),
  ('barranquilla', 'Barranquilla', 'Atlántico',       10.9685,  -74.7813),
  ('cartagena',    'Cartagena',    'Bolívar',         10.3910,  -75.4794),
  ('bucaramanga',  'Bucaramanga',  'Santander',        7.1193,  -73.1227),
  ('cucuta',       'Cúcuta',       'Norte de Santander', 7.8890, -72.4947),
  ('pereira',      'Pereira',      'Risaralda',        4.8133,  -75.6961),
  ('ibague',       'Ibagué',       'Tolima',           4.4389,  -75.2324),
  ('manizales',    'Manizales',    'Caldas',           5.0689,  -75.5174),
  ('santa-marta',  'Santa Marta',  'Magdalena',       11.2408,  -74.2099),
  ('villavicencio','Villavicencio','Meta',             4.1420,  -73.6347),
  ('pasto',        'Pasto',        'Nariño',           1.2051,  -77.2666),
  ('neiva',        'Neiva',        'Huila',            2.5273,  -75.2879),
  ('armenia',      'Armenia',      'Quindío',          4.5333,  -75.6833),
  ('sincelejo',    'Sincelejo',    'Sucre',            9.3047,  -75.3978),
  ('tunja',        'Tunja',        'Boyacá',           5.5353,  -73.3678),
  ('riohacha',     'Riohacha',     'La Guajira',      11.5447,  -72.9072)
ON CONFLICT (id) DO NOTHING;

-- 3. Add FK from vendors.city_id (existing column is text, nullable).
--    NOT VALID first so the FK is created instantly; then VALIDATE to confirm
--    all existing rows are compliant. Pre-flight confirmed: only 'cali' is in
--    use across 8 vendors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendors_city_id_fkey'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_city_id_fkey
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL
      NOT VALID;
    ALTER TABLE vendors VALIDATE CONSTRAINT vendors_city_id_fkey;
  END IF;
END $$;

-- 4. Add FK from ad_campaigns.target_city_id (also text).
--    Pre-flight: ad_campaigns has 0 rows in production (no breakage risk).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ad_campaigns_target_city_id_fkey'
  ) THEN
    ALTER TABLE ad_campaigns
      ADD CONSTRAINT ad_campaigns_target_city_id_fkey
      FOREIGN KEY (target_city_id) REFERENCES cities(id) ON DELETE SET NULL
      NOT VALID;
    ALTER TABLE ad_campaigns VALIDATE CONSTRAINT ad_campaigns_target_city_id_fkey;
  END IF;
END $$;

COMMIT;
