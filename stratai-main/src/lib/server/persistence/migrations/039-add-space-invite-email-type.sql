-- Migration 039: Add space_invite email type
-- Extends email_logs.email_type to support space invitation emails
--
-- Story: US-003 - Create space invitation email template
-- See: docs/features/SENDGRID_EMAIL_INTEGRATION.md

-- ============================================================
-- UPDATE EMAIL TYPE CONSTRAINT
-- ============================================================
-- Add 'space_invite' to the allowed email types

-- Drop existing constraint
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_type_check;

-- Add updated constraint with space_invite
ALTER TABLE email_logs ADD CONSTRAINT email_logs_type_check
    CHECK (email_type IN (
        'password_reset',
        'email_verification',
        'team_invite',
        'space_invite',
        'notification'
    ));

-- Add comment documenting the change
COMMENT ON COLUMN email_logs.email_type IS
    'Type of email sent. Values: password_reset, email_verification, team_invite, space_invite, notification. Updated 2026-01-16 to add space_invite for Space collaboration invitations.';
