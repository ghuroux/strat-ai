-- ============================================================================
-- StratAI Seed Data
-- ============================================================================
-- Generated: 2026-01-16
--
-- Creates initial test data:
-- - StraTech organization
-- - Admin users (Gabriel, William)
-- - Org memberships
-- - Organization space with membership
-- - Personal space (system) for each user
-- - General areas for each space
--
-- Run this AFTER schema.sql
-- ============================================================================

-- Use fixed IDs for reproducibility
\set org_id '10000000-0000-0000-0000-000000000001'
\set gabriel_id '20000000-0000-0000-0000-000000000001'
\set william_id '09b457ac-e909-490d-a9ff-fa021da713ae'

-- ============================================================================
-- 1. ORGANIZATION
-- ============================================================================

INSERT INTO organizations (id, name, slug, system_prompt)
VALUES (
    :'org_id'::uuid,
    'StraTech',
    'stratech',
    'You are an AI assistant for StraTech, a software development company. Be helpful, professional, and focused on productivity.'
);

-- ============================================================================
-- 2. USERS
-- ============================================================================

-- Gabriel (Organization Admin)
-- Password: "password123" (change after first login!)
-- Hash format: salt:sha256(password+salt) - used by src/lib/server/auth.ts
INSERT INTO users (id, organization_id, email, username, display_name, first_name, last_name, password_hash, status)
VALUES (
    :'gabriel_id'::uuid,
    :'org_id'::uuid,
    'gabriel@stratech.co.za',
    'gabriel',
    'Gabriel Roux',
    'Gabriel',
    'Roux',
    'd3138361c1080cf34af890f8794b743f:767ad14f92067c4d37bd36c22c34a875903ecfb0e3a3ee89d16c7c7744c8709b',
    'active'
);

-- William (Organization Admin)
-- Password: "password123" (change after first login!)
INSERT INTO users (id, organization_id, email, username, display_name, first_name, last_name, password_hash, status)
VALUES (
    :'william_id'::uuid,
    :'org_id'::uuid,
    'william@strathost.co.za',
    'william',
    'William Mac Donald',
    'William',
    'Mac Donald',
    'd3138361c1080cf34af890f8794b743f:767ad14f92067c4d37bd36c22c34a875903ecfb0e3a3ee89d16c7c7744c8709b',
    'active'
);

-- ============================================================================
-- 3. ORG MEMBERSHIPS
-- ============================================================================

INSERT INTO org_memberships (organization_id, user_id, role)
VALUES
    (:'org_id'::uuid, :'gabriel_id'::uuid, 'owner'),
    (:'org_id'::uuid, :'william_id'::uuid, 'admin');

-- ============================================================================
-- 4. SPACES
-- ============================================================================

-- Organization Space (StraTech)
INSERT INTO spaces (id, user_id, name, type, slug, space_type, organization_id, color, icon, order_index, is_pinned)
VALUES (
    'sp_org_stratech',
    :'gabriel_id'::uuid,
    'StraTech',
    'custom',
    'stratech-org',
    'organization',
    :'org_id'::uuid,
    '#6366f1',
    'building',
    0,
    false
);

-- Personal Space for Gabriel (system space)
INSERT INTO spaces (id, user_id, name, type, slug, space_type, color, icon, order_index, is_pinned)
VALUES (
    'sp_personal_gabriel',
    :'gabriel_id'::uuid,
    'Personal',
    'system',
    'personal',
    'personal',
    '#22c55e',
    'user',
    1,
    false
);

-- Personal Space for William (system space)
INSERT INTO spaces (id, user_id, name, type, slug, space_type, color, icon, order_index, is_pinned)
VALUES (
    'sp_personal_william',
    :'william_id'::uuid,
    'Personal',
    'system',
    'personal',
    'personal',
    '#22c55e',
    'user',
    1,
    false
);

-- ============================================================================
-- 5. SPACE MEMBERSHIPS
-- ============================================================================

-- Both users have admin access to the org space
INSERT INTO space_memberships (id, space_id, user_id, role, is_pinned)
VALUES
    ('sm_org_gabriel', 'sp_org_stratech', :'gabriel_id'::uuid, 'admin', true),
    ('sm_org_william', 'sp_org_stratech', :'william_id'::uuid, 'admin', true);

-- Owners of personal spaces (via spaces.user_id, not memberships)
-- Personal spaces don't need memberships - ownership is via user_id

-- ============================================================================
-- 6. AREAS (General areas for each space)
-- ============================================================================

-- Generate unique area IDs based on timestamp pattern
\set org_area_id 'area_org_general'
\set gabriel_area_id 'area_personal_gabriel_general'
\set william_area_id 'area_personal_william_general'

-- General area for StraTech org space
INSERT INTO areas (id, space_id, user_id, name, slug, is_general, order_index)
VALUES (
    :'org_area_id',
    'sp_org_stratech',
    :'gabriel_id'::uuid,
    'General',
    'general',
    true,
    0
);

-- General area for Gabriel's personal space
INSERT INTO areas (id, space_id, user_id, name, slug, is_general, order_index)
VALUES (
    :'gabriel_area_id',
    'sp_personal_gabriel',
    :'gabriel_id'::uuid,
    'General',
    'general',
    true,
    0
);

-- General area for William's personal space
INSERT INTO areas (id, space_id, user_id, name, slug, is_general, order_index)
VALUES (
    :'william_area_id',
    'sp_personal_william',
    :'william_id'::uuid,
    'General',
    'general',
    true,
    0
);

-- ============================================================================
-- 7. SAMPLE CONTENT (optional - for testing)
-- ============================================================================

-- Sample conversation in org space
INSERT INTO conversations (id, user_id, title, model, space_id, area_id, messages)
VALUES (
    'conv_welcome',
    :'gabriel_id'::uuid,
    'Welcome to StraTech',
    'claude-sonnet-4-20250514',
    'sp_org_stratech',
    :'org_area_id',
    '[{"role": "user", "content": "Hello! This is a test conversation."}, {"role": "assistant", "content": "Welcome to StraTech! How can I help you today?"}]'::jsonb
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after seeding to verify:
--
-- SELECT * FROM organizations;
-- SELECT id, email, display_name, organization_id FROM users;
-- SELECT * FROM org_memberships;
-- SELECT id, name, type, space_type, slug FROM spaces ORDER BY space_type, type;
-- SELECT sm.*, s.name as space_name FROM space_memberships sm JOIN spaces s ON sm.space_id = s.id;
-- SELECT id, name, space_id, is_general FROM areas;
-- ============================================================================

-- Print success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Seed data created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Organization: StraTech';
    RAISE NOTICE 'Users (password: password123):';
    RAISE NOTICE '  - gabriel@stratech.co.za (owner)';
    RAISE NOTICE '  - william@strathost.co.za (admin)';
    RAISE NOTICE '';
    RAISE NOTICE 'Change passwords after first login!';
    RAISE NOTICE '============================================';
END $$;
