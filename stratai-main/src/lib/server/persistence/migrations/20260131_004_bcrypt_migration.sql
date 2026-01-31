-- ============================================================================
-- Migration: 20260131_004_bcrypt_migration
-- Description: Migrate password hashing from SHA-256 to bcrypt (clean break)
-- ============================================================================
-- Adds force_password_reset column, flags all existing password users,
-- and clears their old SHA-256 hashes. Users must reset via email flow.
-- Also adds 'security_upgrade' to email_logs email_type constraint.
-- ============================================================================

-- 1. Add force_password_reset column
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN DEFAULT false NOT NULL;

-- 2. Mark all users with passwords as needing reset
UPDATE users SET force_password_reset = true WHERE password_hash IS NOT NULL;

-- 3. Clear old SHA-256 hashes (they can't be verified with bcrypt)
UPDATE users SET password_hash = NULL WHERE force_password_reset = true;

-- 4. Add 'security_upgrade' to email_logs email_type CHECK constraint
-- Drop and recreate the constraint to include the new type
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_email_type_check
    CHECK (email_type IN ('password_reset', 'email_verification', 'team_invite', 'space_invite', 'notification', 'welcome', 'calendar_connect', 'task_assigned', 'security_upgrade'));

-- ============================================================================
-- Rollback:
--   UPDATE users SET force_password_reset = false;
--   ALTER TABLE users DROP COLUMN force_password_reset;
--   ALTER TABLE email_logs DROP CONSTRAINT email_logs_email_type_check;
--   ALTER TABLE email_logs ADD CONSTRAINT email_logs_email_type_check
--       CHECK (email_type IN ('password_reset', 'email_verification', 'team_invite', 'space_invite', 'notification', 'welcome', 'calendar_connect', 'task_assigned'));
-- Note: SHA-256 hashes cannot be recovered after clearing. Users would need new passwords regardless.
-- ============================================================================
