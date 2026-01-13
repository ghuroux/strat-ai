-- Migration 029: Page Sharing with Permissions & Audit Logging
-- Created: 2026-01-13
-- Purpose: Enable granular page sharing with user/group permissions and comprehensive audit logging
-- Context: "Context remains current through collaboration"

-- ============================================================================
-- PART 1: Update pages table visibility
-- ============================================================================

-- Expand visibility from binary (private/shared) to three-level (private/area/space)
ALTER TABLE pages
  DROP CONSTRAINT IF EXISTS pages_visibility_check,
  ADD CONSTRAINT pages_visibility_check
    CHECK (visibility IN ('private', 'area', 'space'));

-- Migrate existing data: 'shared' → 'area'
UPDATE pages SET visibility = 'area' WHERE visibility = 'shared';

-- Note: All existing pages should now be either 'private' or 'area'

-- ============================================================================
-- PART 2: Create page_user_shares table (user-level page sharing)
-- ============================================================================

CREATE TABLE page_user_shares (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,        -- TEXT to match pages.user_id pattern
    permission TEXT NOT NULL DEFAULT 'viewer'
        CHECK (permission IN ('viewer', 'editor', 'admin')),
    shared_by TEXT NOT NULL,       -- User who granted access
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: user can only be shared once per page
CREATE UNIQUE INDEX idx_page_user_shares_unique
    ON page_user_shares(page_id, user_id);

-- Query optimization indexes
CREATE INDEX idx_page_user_shares_page ON page_user_shares(page_id);
CREATE INDEX idx_page_user_shares_user ON page_user_shares(user_id);

-- ============================================================================
-- PART 3: Create page_group_shares table (group-level page sharing)
-- ============================================================================

CREATE TABLE page_group_shares (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'viewer'
        CHECK (permission IN ('viewer', 'editor', 'admin')),
    shared_by TEXT NOT NULL,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: group can only be shared once per page
CREATE UNIQUE INDEX idx_page_group_shares_unique
    ON page_group_shares(page_id, group_id);

-- Query optimization indexes
CREATE INDEX idx_page_group_shares_page ON page_group_shares(page_id);
CREATE INDEX idx_page_group_shares_group ON page_group_shares(group_id);

-- ============================================================================
-- PART 4: Create audit_events table (comprehensive activity logging)
-- ============================================================================

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,         -- For multi-tenancy (future, nullable)
    user_id TEXT NOT NULL,         -- Who performed action
    event_type TEXT NOT NULL,      -- 'page_viewed', 'page_edited', 'page_shared_user', etc.
    resource_type TEXT NOT NULL,   -- 'page' | 'document' | 'area' | 'space' | 'task'
    resource_id TEXT NOT NULL,     -- ID of the resource
    action TEXT NOT NULL,          -- 'view', 'edit', 'share', 'unshare', 'permission_change'
    metadata JSONB,                -- Event-specific data (targets, permissions, changes)
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Validation: ensure non-empty critical fields
    CONSTRAINT audit_events_valid CHECK (
        event_type != '' AND
        resource_type != '' AND
        action != ''
    )
);

-- Indexes for common query patterns
-- Most queries: "show me all events for page X" (sorted by time)
CREATE INDEX idx_audit_events_resource
    ON audit_events(resource_type, resource_id, created_at DESC);

-- User activity queries: "show me all events by user Y"
CREATE INDEX idx_audit_events_user
    ON audit_events(user_id, created_at DESC);

-- Event type filtering: "show me all page_shared_user events"
CREATE INDEX idx_audit_events_type
    ON audit_events(event_type, created_at DESC);

-- General time-based queries: "show me recent events"
CREATE INDEX idx_audit_events_created
    ON audit_events(created_at DESC);

-- ============================================================================
-- Migration complete!
-- ============================================================================

-- Summary:
-- - Updated pages.visibility to support 'space' option
-- - Migrated existing 'shared' pages to 'area' visibility
-- - Created page_user_shares table (3 indexes)
-- - Created page_group_shares table (3 indexes)
-- - Created audit_events table (4 indexes)
-- Total: 3 tables + 10 indexes created
