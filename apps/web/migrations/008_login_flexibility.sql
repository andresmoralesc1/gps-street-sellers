-- Migration: login flexibility — phone OR email, at least one required.
--
-- Background:
--   Many informal vendors in Cali don't have email but do have a phone number.
--   Registration now accepts email-only, phone-only, or both — but at least
--   one must be present.
--
-- Login also accepts either as the identifier.
--
-- Constraints:
--   1. users.email  becomes nullable
--   2. users.phone  becomes UNIQUE (partial index, NULLs allowed — Postgres
--      UNIQUE already allows multiple NULLs by default, but we add a partial
--      UNIQUE index to be explicit and queryable)
--   3. profiles.email becomes nullable too + its UNIQUE index becomes partial
--   4. A CHECK constraint enforces the "at least one" rule at the DB level
--      so app bugs can't sneak in NULL/NULL rows.

-- 1. Drop NOT NULL on email (users + profiles)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Partial UNIQUE on phone — NULLs don't conflict, two non-null phones can't match.
--    Idempotent: IF NOT EXISTS on the index.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
  ON users(phone) WHERE phone IS NOT NULL;

-- 3a. Replace profiles UNIQUE email constraint with a partial one so phone-only
--     users (profiles.email = NULL) don't collide. The UNIQUE on email is
--     defined via a CONSTRAINT (not just an INDEX), so we drop the constraint
--     then create a partial index in its place.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
  ON profiles(email) WHERE email IS NOT NULL;

-- 3b. CHECK constraint: at least one of (email, phone) must be present.
--     profiles doesn't have a phone column — its "contact" is email only,
--     and we mirror the constraint loosely (email NULL allowed; FK to users
--     still requires users.email or users.phone to be present).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_or_phone_required') THEN
    ALTER TABLE users ADD CONSTRAINT users_email_or_phone_required
      CHECK (email IS NOT NULL OR phone IS NOT NULL);
  END IF;
END $$;