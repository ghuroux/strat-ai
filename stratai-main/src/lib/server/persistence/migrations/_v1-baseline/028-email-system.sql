-- Migration 028: Email System Tables
-- Supports password reset, rate limiting, and email audit logging
-- See: docs/SENDGRID_EMAIL_INTEGRATION.md

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
-- Stores hashed tokens for password reset flow
-- Only the hash is stored; plain token is sent via email

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,           -- SHA256 hash of token
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,                -- NULL = unused
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
    ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
    ON password_reset_tokens(expires_at)
    WHERE used_at IS NULL;

COMMENT ON TABLE password_reset_tokens IS 'Secure password reset tokens (hashed)';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA256 hash - plain token sent via email';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'NULL = unused, set when consumed';

-- ============================================================
-- PASSWORD RESET ATTEMPTS (Rate Limiting)
-- ============================================================
-- Tracks reset attempts by email and IP to prevent abuse

CREATE TABLE IF NOT EXISTS password_reset_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email
    ON password_reset_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_ip
    ON password_reset_attempts(ip_address, attempted_at)
    WHERE ip_address IS NOT NULL;

COMMENT ON TABLE password_reset_attempts IS 'Rate limiting for password reset requests';

-- ============================================================
-- EMAIL LOGS (Audit Trail)
-- ============================================================
-- Tracks all emails sent through the system for debugging and compliance

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,           -- 'password_reset', 'verification', 'invite', etc.
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    sendgrid_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Add constraint for valid status values
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced'));

-- Add constraint for valid email types
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_type_check
    CHECK (email_type IN ('password_reset', 'email_verification', 'team_invite', 'notification'));

CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at);

COMMENT ON TABLE email_logs IS 'Audit trail for all emails sent through the system';
COMMENT ON COLUMN email_logs.sendgrid_message_id IS 'SendGrid X-Message-Id for delivery tracking';
