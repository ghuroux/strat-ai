-- ============================================================
-- ORGANIZATIONS TABLE
-- ============================================================
-- Multi-tenant root entity. All data is scoped to an organization.
-- UUID primary key for enterprise-grade identity management.

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations;
CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_organizations_updated_at();

-- Comments
COMMENT ON TABLE organizations IS 'Multi-tenant root entity. All data is scoped to an organization.';
COMMENT ON COLUMN organizations.id IS 'UUID primary key';
COMMENT ON COLUMN organizations.slug IS 'URL-safe unique identifier (e.g., stratech)';
COMMENT ON COLUMN organizations.settings IS 'Organization-wide settings (JSON)';

-- Fixed Seed UUIDs (for reference):
-- StraTech Organization: 10000000-0000-0000-0000-000000000001
