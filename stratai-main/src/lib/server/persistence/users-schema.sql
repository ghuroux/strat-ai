-- ============================================================
-- USERS TABLE
-- ============================================================
-- User accounts within an organization.
-- UUID primary key for enterprise-grade identity management.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    password_hash TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Unique email and username within organization
    UNIQUE(organization_id, email),
    UNIQUE(organization_id, username)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Comments
COMMENT ON TABLE users IS 'User accounts within an organization';
COMMENT ON COLUMN users.id IS 'UUID primary key';
COMMENT ON COLUMN users.organization_id IS 'FK to organizations - user belongs to this org';
COMMENT ON COLUMN users.status IS 'Account status: active, inactive, suspended';
COMMENT ON COLUMN users.password_hash IS 'Hashed password (null if using external auth)';
COMMENT ON COLUMN users.settings IS 'User preferences and settings (JSON)';

-- Fixed Seed UUIDs (for reference):
-- Gabriel Roux (Admin): 20000000-0000-0000-0000-000000000001
