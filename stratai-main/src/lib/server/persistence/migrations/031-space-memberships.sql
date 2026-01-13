-- Migration 031: Space Memberships
-- Enables organization spaces and collaborative access control
-- Pattern matches area_memberships (migration 027)

-- ============================================
-- 1. ADD SPACE TYPE AND ORGANIZATION COLUMNS
-- ============================================

-- Add space_type to distinguish personal/organization/project spaces
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS space_type TEXT
    DEFAULT 'personal' CHECK (space_type IN ('personal', 'organization', 'project'));

-- Add organization_id for future org-scoped spaces (nullable for now)
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS organization_id UUID;

-- ============================================
-- 2. CREATE SPACE_MEMBERSHIPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS space_memberships (
    id TEXT PRIMARY KEY DEFAULT 'sm_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 7),

    -- Space reference (TEXT to match spaces.id)
    space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Member target: XOR constraint (user OR group, not both)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,

    -- Role hierarchy: owner > admin > member > guest
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member', 'guest')),

    -- Attribution
    invited_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- XOR constraint: exactly one of user_id or group_id
    CONSTRAINT space_membership_target CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

-- Unique constraint: one membership per user per space
CREATE UNIQUE INDEX IF NOT EXISTS idx_space_memberships_user
    ON space_memberships(space_id, user_id) WHERE user_id IS NOT NULL;

-- Unique constraint: one membership per group per space
CREATE UNIQUE INDEX IF NOT EXISTS idx_space_memberships_group
    ON space_memberships(space_id, group_id) WHERE group_id IS NOT NULL;

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_space_memberships_space
    ON space_memberships(space_id);
CREATE INDEX IF NOT EXISTS idx_space_memberships_user_lookup
    ON space_memberships(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_space_memberships_role
    ON space_memberships(space_id, role);

-- ============================================
-- 4. CREATE UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_space_membership_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS space_membership_updated_at ON space_memberships;
CREATE TRIGGER space_membership_updated_at
    BEFORE UPDATE ON space_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_space_membership_timestamp();

-- ============================================
-- 5. BACKFILL: AUTO-CREATE OWNER MEMBERSHIPS
-- ============================================

-- For each existing space, create an owner membership for the user_id
-- This ensures backward compatibility
INSERT INTO space_memberships (space_id, user_id, role, created_at)
SELECT s.id, s.user_id::uuid, 'owner', s.created_at
FROM spaces s
WHERE s.user_id IS NOT NULL
  AND s.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM space_memberships sm
    WHERE sm.space_id = s.id AND sm.user_id = s.user_id::uuid
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. ADD COMMENTS
-- ============================================

COMMENT ON TABLE space_memberships IS 'Space-level access control. Users/groups can be members of spaces with role-based permissions.';
COMMENT ON COLUMN space_memberships.role IS 'owner=full control, admin=manage members, member=standard access, guest=limited (only shared areas)';
COMMENT ON COLUMN spaces.space_type IS 'personal=single owner, organization=org-wide, project=team project';
