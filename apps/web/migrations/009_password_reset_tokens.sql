-- 008_password_reset_tokens.sql
-- S1-AUTH-1 (audit 2026-07-22): persist password reset tokens so they can be
-- marked used_at and reused-free. Previously the forgot-password flow signed
-- a stateless JWT with purpose='password_reset' that could be replayed up to
-- 1h after issue (the link traveled in plain through email providers, third
-- party logs, etc.). This table mirrors email_verification_tokens: a row per
-- token, SHA-256-hashed, single-use, with expiry.
--
-- Backward-compat: the reset-password endpoint still accepts JWTs that look
-- like the old format (purpose=password_reset) and falls back to validating
-- them via the new table if a token_hash row exists. During the migration
-- window both paths work; after all in-flight JWTs expire (1h post-deploy)
-- the legacy JWT path can be removed.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid                        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  text                        NOT NULL,                       -- SHA-256 of the plaintext, base64url
    expires_at  timestamp with time zone    NOT NULL,
    used_at     timestamp with time zone,
    created_at  timestamp with time zone    NOT NULL DEFAULT now()
);

-- Hot path: validate a token by its hash, lock the row to prevent races.
CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_hash_idx
    ON password_reset_tokens (token_hash);

-- Cleanup query for the cron job: "delete tokens that are expired AND used OR
-- expired more than 7 days ago". This index is a covering index for that
-- partial-scan.
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_idx
    ON password_reset_tokens (expires_at)
    WHERE used_at IS NULL;

-- FK index on user_id for "list all tokens for this user" GDPR exports.
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
    ON password_reset_tokens (user_id);
