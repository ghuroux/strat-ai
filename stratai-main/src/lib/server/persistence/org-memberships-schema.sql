-- ============================================================
-- ORGANIZATION MEMBERSHIPS TABLE
-- ============================================================
-- User roles within an organization (owner, admin, member).
-- UUID primary key for enterprise-grade identity management.

CREATE TABLE IF NOT EXISTS org_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One membership per user per organization
    UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON org_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_owner ON org_memberships(organization_id) WHERE role = 'owner';

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_org_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_org_memberships_updated_at ON org_memberships;
CREATE TRIGGER trigger_org_memberships_updated_at
    BEFORE UPDATE ON org_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_org_memberships_updated_at();

-- Comments
COMMENT ON TABLE org_memberships IS 'User roles within an organization';
COMMENT ON COLUMN org_memberships.role IS 'Role: owner (full control), admin (manage users), member (use features)';

-- Fixed Seed UUIDs (for reference):
-- Gabriel Roux Membership: 30000000-0000-0000-0000-000000000001
