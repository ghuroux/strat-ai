-- Migration 027: Area Sharing (Memberships and Restrictions)
-- Implements area_memberships from ENTITY_MODEL.md Section 6.5
-- Enables users and groups to be invited to collaborate on areas

-- ============================================================
-- STEP 1: Add columns to areas table
-- ============================================================

-- is_restricted: Controls access model
-- false (default) = space access grants area access (current behavior)
-- true = requires explicit membership
ALTER TABLE areas
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN NOT NULL DEFAULT false;

-- created_by: Track original creator (separate from current user_id)
-- Used for ownership verification in access control
ALTER TABLE areas
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- ============================================================
-- STEP 2: Backfill created_by from user_id
-- ============================================================

-- For existing areas, the current user_id is the creator
UPDATE areas
SET created_by = user_id::TEXT
WHERE created_by IS NULL;

-- ============================================================
-- STEP 3: Create area_memberships table
-- ============================================================

CREATE TABLE IF NOT EXISTS area_memberships (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,

    -- XOR: Either user_id OR group_id, never both
    -- user_id is TEXT to match areas.user_id pattern
    -- group_id is UUID to match groups.id
    user_id TEXT,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,

    -- Role within area (4-tier hierarchy)
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member', 'viewer')),

    -- Attribution for audit trail
    invited_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- XOR constraint: must have exactly one of user_id or group_id
    CONSTRAINT area_membership_xor CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- ============================================================
-- STEP 4: Create indexes
-- ============================================================

-- Unique constraints using partial indexes (handles NULL columns correctly)
-- Prevents duplicate user memberships
CREATE UNIQUE INDEX IF NOT EXISTS idx_area_memberships_user_unique
    ON area_memberships(area_id, user_id)
    WHERE user_id IS NOT NULL;

-- Prevents duplicate group memberships
CREATE UNIQUE INDEX IF NOT EXISTS idx_area_memberships_group_unique
    ON area_memberships(area_id, group_id)
    WHERE group_id IS NOT NULL;

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_area_memberships_area
    ON area_memberships(area_id);

CREATE INDEX IF NOT EXISTS idx_area_memberships_user
    ON area_memberships(user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_area_memberships_group
    ON area_memberships(group_id)
    WHERE group_id IS NOT NULL;

-- Index for is_restricted lookups when filtering areas by space
CREATE INDEX IF NOT EXISTS idx_areas_is_restricted
    ON areas(space_id, is_restricted)
    WHERE deleted_at IS NULL;

-- ============================================================
-- STEP 5: Auto-create owner memberships for existing areas
-- ============================================================

-- Every existing area should have its creator as owner
-- This ensures backwards compatibility - existing areas remain accessible
INSERT INTO area_memberships (id, area_id, user_id, role, created_at)
SELECT
    'am_' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 7) as id,
    a.id as area_id,
    a.created_by as user_id,
    'owner' as role,
    a.created_at as created_at
FROM areas a
WHERE a.deleted_at IS NULL
  AND a.created_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 6: Documentation
-- ============================================================

COMMENT ON COLUMN areas.is_restricted IS
    'If true, requires explicit area_memberships. If false, space access grants area access.';

COMMENT ON COLUMN areas.created_by IS
    'Original creator of the area. Has implicit owner access.';

COMMENT ON TABLE area_memberships IS
    'Explicit access grants for areas. Supports both user and group invites (XOR).';

COMMENT ON COLUMN area_memberships.role IS
    'Access level: owner (full), admin (manage), member (participate), viewer (read-only)';
