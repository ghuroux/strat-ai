-- ============================================================
-- Migration 015: Foundation Tables
-- ============================================================
-- Establishes multi-tenant identity infrastructure with UUID primary keys.
--
-- Tables created:
--   - organizations: Multi-tenant root entity
--   - users: User accounts within organizations
--   - org_memberships: User roles within organizations
--   - user_id_mappings: Backward compatibility for legacy TEXT user_ids
--
-- Fixed Seed UUIDs:
--   StraTech Org:       10000000-0000-0000-0000-000000000001
--   Gabriel User:       20000000-0000-0000-0000-000000000001
--   Gabriel Membership: 30000000-0000-0000-0000-000000000001
-- ============================================================

-- 1. Create organizations table (UUID PK)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Create users table (UUID PK)
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

    UNIQUE(organization_id, email),
    UNIQUE(organization_id, username)
);

-- 3. Create org_memberships table (UUID PK)
CREATE TABLE IF NOT EXISTS org_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, user_id)
);

-- 4. Create user_id_mappings table for backward compatibility
CREATE TABLE IF NOT EXISTS user_id_mappings (
    legacy_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON org_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_owner ON org_memberships(organization_id) WHERE role = 'owner';
CREATE INDEX IF NOT EXISTS idx_user_id_mappings_user ON user_id_mappings(user_id);

-- 6. Create update timestamp triggers
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

-- 7. Seed StraTech organization (fixed UUID)
INSERT INTO organizations (id, name, slug, settings)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'StraTech',
    'stratech',
    '{}'
) ON CONFLICT (id) DO NOTHING;

-- 8. Seed Gabriel Roux as admin user (fixed UUID)
INSERT INTO users (id, organization_id, email, username, display_name, status)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'gabriel@stratech.co.za',
    'gabriel',
    'Gabriel Roux',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- 9. Create Gabriel's org membership as owner (fixed UUID)
INSERT INTO org_memberships (id, organization_id, user_id, role)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'owner'
) ON CONFLICT (id) DO NOTHING;

-- 10. Map 'admin' legacy ID to Gabriel's UUID for backward compatibility
INSERT INTO user_id_mappings (legacy_id, user_id)
VALUES ('admin', '20000000-0000-0000-0000-000000000001')
ON CONFLICT (legacy_id) DO NOTHING;

-- Comments
COMMENT ON TABLE organizations IS 'Multi-tenant root entity. All data is scoped to an organization.';
COMMENT ON TABLE users IS 'User accounts within an organization';
COMMENT ON TABLE org_memberships IS 'User roles within an organization';
COMMENT ON TABLE user_id_mappings IS 'Backward compatibility: maps legacy TEXT user_ids to UUID user_ids';
