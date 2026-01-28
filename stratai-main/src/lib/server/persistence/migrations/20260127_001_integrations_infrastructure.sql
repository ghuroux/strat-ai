-- Migration: 20260127_001_integrations_infrastructure
-- Description: Add integration infrastructure tables for OAuth connections (Calendar, GitHub, etc.)
-- Author: Claude
-- Date: 2026-01-27
-- Rollback: DROP TABLE IF EXISTS integration_logs, area_integrations, integration_credentials, integrations, oauth_states CASCADE;
-- ============================================================================

-- ============================================================================
-- Table: integrations
-- Purpose: User-level integration config (service type, status, config)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY DEFAULT ('int_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),

    -- Owner: user_id for foundational integrations (Calendar), space_id for contextual (GitHub)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Service identification
    service_type TEXT NOT NULL,

    -- Connection status
    status TEXT NOT NULL DEFAULT 'disconnected',

    -- Provider-specific configuration (e.g., selected calendar ID, default settings)
    config JSONB DEFAULT '{}'::jsonb,

    -- Error tracking
    last_error TEXT,
    last_error_at TIMESTAMPTZ,

    -- Timestamps
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT integrations_service_type_check CHECK (service_type IN ('calendar', 'github', 'linear', 'jira', 'slack')),
    CONSTRAINT integrations_status_check CHECK (status IN ('disconnected', 'connecting', 'connected', 'error', 'expired')),

    -- Either user_id OR space_id must be set, not both
    CONSTRAINT integrations_owner_check CHECK (
        (user_id IS NOT NULL AND space_id IS NULL) OR
        (user_id IS NULL AND space_id IS NOT NULL)
    )
);

-- Unique constraint: one integration per service per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_user_service
    ON integrations(user_id, service_type) WHERE user_id IS NOT NULL;

-- Unique constraint: one integration per service per space
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_space_service
    ON integrations(space_id, service_type) WHERE space_id IS NOT NULL;

-- Index for finding all integrations for a user
CREATE INDEX IF NOT EXISTS idx_integrations_user
    ON integrations(user_id) WHERE user_id IS NOT NULL;

-- Index for finding all integrations for a space
CREATE INDEX IF NOT EXISTS idx_integrations_space
    ON integrations(space_id) WHERE space_id IS NOT NULL;

-- Index for finding all integrations for an org
CREATE INDEX IF NOT EXISTS idx_integrations_org
    ON integrations(org_id);

-- ============================================================================
-- Table: integration_credentials
-- Purpose: Encrypted OAuth tokens and API keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_credentials (
    id TEXT PRIMARY KEY DEFAULT ('cred_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),

    -- Link to integration
    integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

    -- Credential type
    credential_type TEXT NOT NULL,

    -- Encrypted values (AES-256-GCM encrypted)
    encrypted_value TEXT NOT NULL,

    -- Encryption metadata
    encryption_iv TEXT NOT NULL,  -- Initialization vector for AES-GCM
    encryption_tag TEXT NOT NULL, -- Authentication tag for AES-GCM

    -- Token metadata (unencrypted for query/refresh logic)
    expires_at TIMESTAMPTZ,
    scope TEXT,  -- OAuth scopes granted

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT credential_type_check CHECK (credential_type IN ('access_token', 'refresh_token', 'api_key'))
);

-- Index for finding credentials by integration
CREATE INDEX IF NOT EXISTS idx_integration_credentials_integration
    ON integration_credentials(integration_id);

-- Index for finding expiring tokens (for refresh job)
CREATE INDEX IF NOT EXISTS idx_integration_credentials_expiring
    ON integration_credentials(expires_at)
    WHERE credential_type = 'access_token' AND expires_at IS NOT NULL;

-- ============================================================================
-- Table: area_integrations
-- Purpose: Area-level activation and overrides for integrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS area_integrations (
    id TEXT PRIMARY KEY DEFAULT ('aint_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),

    -- Links
    area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

    -- Activation status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Area-specific overrides (e.g., specific calendar for this area)
    overrides JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one activation per area per integration
    CONSTRAINT area_integrations_unique UNIQUE (area_id, integration_id)
);

-- Index for finding all integrations for an area
CREATE INDEX IF NOT EXISTS idx_area_integrations_area
    ON area_integrations(area_id);

-- Index for finding all areas using an integration
CREATE INDEX IF NOT EXISTS idx_area_integrations_integration
    ON area_integrations(integration_id);

-- ============================================================================
-- Table: integration_logs
-- Purpose: Audit trail for compliance and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_logs (
    id TEXT PRIMARY KEY DEFAULT ('ilog_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),

    -- Context
    integration_id TEXT REFERENCES integrations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Event details
    event_type TEXT NOT NULL,
    service_type TEXT NOT NULL,

    -- Action details
    action TEXT NOT NULL,  -- e.g., 'calendar_list_events', 'calendar_create_event'

    -- Request/response summary (not full payloads for privacy)
    request_summary JSONB,
    response_summary JSONB,

    -- Status
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,

    -- Performance
    duration_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT integration_logs_event_type_check CHECK (event_type IN ('connect', 'disconnect', 'refresh', 'tool_call', 'error', 'rate_limit')),
    CONSTRAINT integration_logs_status_check CHECK (status IN ('success', 'failure', 'rate_limited'))
);

-- Index for finding logs by integration
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration
    ON integration_logs(integration_id);

-- Index for finding logs by user
CREATE INDEX IF NOT EXISTS idx_integration_logs_user
    ON integration_logs(user_id);

-- Index for finding logs by org
CREATE INDEX IF NOT EXISTS idx_integration_logs_org
    ON integration_logs(org_id);

-- Index for finding recent logs (sorted by time for efficient range queries)
CREATE INDEX IF NOT EXISTS idx_integration_logs_recent
    ON integration_logs(created_at DESC);

-- ============================================================================
-- Table: oauth_states
-- Purpose: CSRF protection for OAuth flows
-- ============================================================================
CREATE TABLE IF NOT EXISTS oauth_states (
    id TEXT PRIMARY KEY DEFAULT ('oauth_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),

    -- State token (random string for CSRF protection)
    state TEXT NOT NULL UNIQUE,

    -- Context for callback
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,

    -- Where to redirect after OAuth
    redirect_uri TEXT,

    -- Additional context (e.g., space_id for space-level integrations)
    context JSONB DEFAULT '{}'::jsonb,

    -- Expiration (short-lived, e.g., 10 minutes)
    expires_at TIMESTAMPTZ NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT oauth_states_service_type_check CHECK (service_type IN ('calendar', 'github', 'linear', 'jira', 'slack'))
);

-- Index for finding state by token (fast lookup in callback)
CREATE INDEX IF NOT EXISTS idx_oauth_states_state
    ON oauth_states(state);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expired
    ON oauth_states(expires_at);

-- ============================================================================
-- Cleanup: Remove expired OAuth states (can be run periodically)
-- ============================================================================
-- Note: In production, consider a scheduled job to run:
-- DELETE FROM oauth_states WHERE expires_at < NOW();
