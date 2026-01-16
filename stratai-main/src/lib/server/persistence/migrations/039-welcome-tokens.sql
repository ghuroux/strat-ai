-- Migration 039: Welcome Tokens Support
-- Extends password_reset_tokens to support welcome emails for new users
-- See: docs/features/WELCOME_EMAIL_ON_USER_CREATION.md
-- Related: US-001 - Add token_type column to password_reset_tokens table

-- ============================================================
-- TOKEN TYPE COLUMN
-- ============================================================
-- Add token_type to distinguish between reset tokens (1 hour expiry)
-- and welcome tokens (7 day expiry) for new user onboarding

-- Add token_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'password_reset_tokens'
        AND column_name = 'token_type'
    ) THEN
        ALTER TABLE password_reset_tokens
        ADD COLUMN token_type TEXT NOT NULL DEFAULT 'reset';
    END IF;
END $$;

-- Add CHECK constraint for valid token types (drop first if exists for idempotency)
ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_type_check;
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_type_check
    CHECK (token_type IN ('reset', 'welcome'));

-- Create index for efficient lookup by token_type
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_type
    ON password_reset_tokens(token_type);

-- Add comments for documentation
COMMENT ON COLUMN password_reset_tokens.token_type IS 'Token purpose: reset (password reset, 1hr expiry) or welcome (new user, 7 day expiry)';

-- ============================================================
-- EMAIL LOGS TYPE UPDATE
-- ============================================================
-- Add 'welcome' to the allowed email types

-- Drop and recreate the constraint to include 'welcome' type
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_type_check
    CHECK (email_type IN ('password_reset', 'email_verification', 'team_invite', 'notification', 'welcome'));

COMMENT ON CONSTRAINT email_logs_type_check ON email_logs IS 'Valid email types including welcome emails for new users';
