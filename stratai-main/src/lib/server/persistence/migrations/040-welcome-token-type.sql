-- Migration 040: Add token_type column for welcome emails
-- Extends password_reset_tokens to distinguish between password reset and welcome tokens
--
-- Required for: Welcome Email feature (US-001 - US-006)
-- See: docs/features/WELCOME_EMAIL_ON_USER_CREATION.md

-- ============================================================
-- ADD TOKEN_TYPE COLUMN
-- ============================================================
-- Distinguishes between reset tokens (1 hour expiry) and welcome tokens (7 day expiry)

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

-- Add comment for documentation
COMMENT ON COLUMN password_reset_tokens.token_type IS 'Token purpose: reset (password reset, 1hr expiry) or welcome (new user, 7 day expiry)';

-- ============================================================
-- UPDATE EMAIL TYPE CONSTRAINT
-- ============================================================
-- Add 'welcome' to the allowed email types

-- Drop existing constraint
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_type_check;

-- Add updated constraint with welcome
ALTER TABLE email_logs ADD CONSTRAINT email_logs_type_check
    CHECK (email_type IN (
        'password_reset',
        'email_verification',
        'team_invite',
        'space_invite',
        'welcome',
        'notification'
    ));

COMMENT ON COLUMN email_logs.email_type IS
    'Type of email sent. Values: password_reset, email_verification, team_invite, space_invite, welcome, notification';
