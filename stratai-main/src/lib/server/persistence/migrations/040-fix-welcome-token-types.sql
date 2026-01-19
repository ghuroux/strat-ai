-- Migration 040: Fix Welcome Token Types
-- Converts existing tokens for users who haven't logged in from 'reset' to 'welcome'
-- These were created before migration 039 added the token_type column

-- ============================================================
-- BACKFILL: Convert reset tokens to welcome for pending users
-- ============================================================
-- Users who haven't logged in (last_login_at IS NULL) had their
-- welcome tokens incorrectly set to 'reset' when migration 039 ran.
-- We identify these by finding tokens where:
--   1. User has never logged in (last_login_at IS NULL)
--   2. Token type is 'reset'
--   3. Token is not yet used (used_at IS NULL)
--   4. Token was created around the same time as the user (within 1 hour)

UPDATE password_reset_tokens prt
SET token_type = 'welcome',
    -- Also extend expiry to 7 days from now if it's about to expire
    expires_at = CASE
        WHEN expires_at < NOW() + INTERVAL '7 days'
        THEN NOW() + INTERVAL '7 days'
        ELSE expires_at
    END
FROM users u
WHERE prt.user_id = u.id
  AND u.last_login_at IS NULL
  AND u.deleted_at IS NULL
  AND prt.token_type = 'reset'
  AND prt.used_at IS NULL;

-- ============================================================
-- ADD space_invite EMAIL TYPE
-- ============================================================
-- Add 'space_invite' to the allowed email types for space invitation emails

ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_type_check
    CHECK (email_type IN ('password_reset', 'email_verification', 'team_invite', 'space_invite', 'notification', 'welcome'));

-- ============================================================
-- VERIFICATION (run after migration)
-- ============================================================
-- Check that pending users now have welcome tokens:
-- SELECT u.email, prt.token_type, prt.expires_at, prt.used_at
-- FROM users u
-- LEFT JOIN password_reset_tokens prt ON prt.user_id = u.id
-- WHERE u.last_login_at IS NULL
-- ORDER BY u.created_at DESC;
