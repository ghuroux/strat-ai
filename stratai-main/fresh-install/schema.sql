-- ============================================================================
-- StratAI Fresh Install Schema
-- ============================================================================
-- Generated: 2026-01-20
-- Updated: V2 migration system (20260120_001_game_scores)
--          Added game_scores table for org-wide mini-game leaderboards
-- Updated: 2026-01-27 (20260127_001_integrations_infrastructure)
--          Added integration tables for OAuth connections (Calendar, GitHub, etc.)
-- Updated: 2026-01-28 (20260128_001_page_lifecycle)
--          Added page lifecycle columns (status, finalized_at, finalized_by, current_version)
--
-- This is the complete database schema for StratAI.
-- Run this on a fresh PostgreSQL 15+ database.
--
-- Usage:
--   psql -U your_user -d stratai -f schema.sql
--
-- After running this, run seed-data.sql to create initial test data.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. UTILITY FUNCTIONS (for triggers)
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Specific updated_at functions for each table
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_org_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_space_membership_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_focus_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. CORE TABLES
-- ============================================================================

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    -- Organization-level AI settings
    system_prompt TEXT,
    allowed_tiers TEXT[] DEFAULT ARRAY['basic', 'standard', 'premium'],
    monthly_budget NUMERIC(10, 2),
    budget_alert_threshold INTEGER DEFAULT 80,
    budget_hard_limit BOOLEAN DEFAULT false,
    model_tier_assignments JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;

CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (organization_id, email),
    UNIQUE (organization_id, username)
);

CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_first_name ON users(first_name);
CREATE INDEX idx_users_last_name ON users(last_name);

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ============================================================================
-- 4. ORGANIZATION MEMBERSHIPS
-- ============================================================================

CREATE TABLE org_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_memberships_org ON org_memberships(organization_id);
CREATE INDEX idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX idx_org_memberships_owner ON org_memberships(organization_id) WHERE role = 'owner';

CREATE TRIGGER trigger_org_memberships_updated_at
    BEFORE UPDATE ON org_memberships
    FOR EACH ROW EXECUTE FUNCTION update_org_memberships_updated_at();

-- ============================================================================
-- 5. GROUPS
-- ============================================================================

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT,
    litellm_team_id TEXT,
    allowed_tiers TEXT[],
    monthly_budget NUMERIC(10, 2),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, name)
);

CREATE INDEX idx_groups_org ON groups(organization_id);

CREATE TABLE group_memberships (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);

-- ============================================================================
-- 6. SPACES
-- ============================================================================

CREATE TABLE spaces (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
    slug TEXT NOT NULL,
    context TEXT,
    context_document_ids TEXT[] DEFAULT '{}'::text[],
    color TEXT,
    icon TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    -- Space collaboration type
    space_type TEXT DEFAULT 'personal' CHECK (space_type IN ('personal', 'organization', 'project')),
    organization_id UUID, -- For org-scoped spaces
    -- Pinning
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_spaces_user ON spaces(user_id);
CREATE INDEX idx_spaces_order ON spaces(user_id, order_index);
CREATE INDEX idx_spaces_pinned ON spaces(user_id, is_pinned) WHERE deleted_at IS NULL AND is_pinned = true;

CREATE TABLE space_memberships (
    id TEXT PRIMARY KEY DEFAULT ('sm_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 7)),
    space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
    invited_by UUID REFERENCES users(id),
    is_pinned BOOLEAN DEFAULT false,
    display_alias VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Either user_id OR group_id, not both
    CONSTRAINT space_membership_target CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

CREATE INDEX idx_space_memberships_space ON space_memberships(space_id);
CREATE INDEX idx_space_memberships_role ON space_memberships(space_id, role);
CREATE INDEX idx_space_memberships_user_lookup ON space_memberships(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_space_memberships_pinned ON space_memberships(user_id, is_pinned) WHERE is_pinned = true;
CREATE UNIQUE INDEX idx_space_memberships_user ON space_memberships(space_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_space_memberships_group ON space_memberships(space_id, group_id) WHERE group_id IS NOT NULL;

CREATE TRIGGER space_membership_updated_at
    BEFORE UPDATE ON space_memberships
    FOR EACH ROW EXECUTE FUNCTION update_space_membership_timestamp();

-- ============================================================================
-- 7. AREAS (Focus Areas)
-- ============================================================================

-- New areas table (canonical)
CREATE TABLE areas (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    slug TEXT,
    context TEXT,
    context_document_ids TEXT[],
    color TEXT,
    icon TEXT,
    order_index INTEGER DEFAULT 0,
    is_general BOOLEAN DEFAULT false,
    is_restricted BOOLEAN NOT NULL DEFAULT false,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    -- General areas cannot be restricted
    CONSTRAINT chk_general_area_not_restricted CHECK (NOT (is_general = true AND is_restricted = true))
);

CREATE INDEX idx_areas_user_space ON areas(user_id, space_id);
CREATE INDEX idx_areas_is_restricted ON areas(space_id, is_restricted) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_areas_slug ON areas(space_id, slug, user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER areas_updated_at
    BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_areas_updated_at();

-- Legacy focus_areas table (for compatibility)
CREATE TABLE focus_areas (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    context TEXT,
    context_document_ids TEXT[],
    color TEXT,
    icon TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (space_id, name, user_id)
);

CREATE INDEX idx_focus_areas_space ON focus_areas(space_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_focus_areas_user ON focus_areas(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_focus_areas_order ON focus_areas(space_id, user_id, order_index) WHERE deleted_at IS NULL;

CREATE TRIGGER focus_areas_updated_at
    BEFORE UPDATE ON focus_areas
    FOR EACH ROW EXECUTE FUNCTION update_focus_areas_updated_at();

-- Area memberships for restricted areas
CREATE TABLE area_memberships (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    user_id TEXT,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Either user_id OR group_id, not both
    CONSTRAINT area_membership_xor CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

CREATE INDEX idx_area_memberships_area ON area_memberships(area_id);
CREATE INDEX idx_area_memberships_user ON area_memberships(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_area_memberships_group ON area_memberships(group_id) WHERE group_id IS NOT NULL;
CREATE UNIQUE INDEX idx_area_memberships_user_unique ON area_memberships(area_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_area_memberships_group_unique ON area_memberships(area_id, group_id) WHERE group_id IS NOT NULL;

-- ============================================================================
-- 8. CONVERSATIONS
-- ============================================================================

CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL DEFAULT 'New Chat',
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    pinned BOOLEAN NOT NULL DEFAULT false,
    summary JSONB,
    continued_from_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
    continuation_summary TEXT,
    refreshed_at TIMESTAMPTZ,
    team_id TEXT,
    space_id TEXT,
    area_id TEXT,
    task_id TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    last_viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at);
CREATE INDEX idx_conversations_team ON conversations(team_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_continued_from ON conversations(continued_from_id) WHERE continued_from_id IS NOT NULL;
CREATE INDEX idx_conversations_tags ON conversations USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_messages_gin ON conversations USING GIN(messages jsonb_path_ops);
CREATE INDEX idx_conversations_last_viewed ON conversations(user_id, last_viewed_at DESC NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_space_last_viewed ON conversations(user_id, space_id, last_viewed_at DESC NULLS LAST) WHERE deleted_at IS NULL AND space_id IS NOT NULL;

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. DOCUMENTS
-- ============================================================================

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    space_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    char_count INTEGER NOT NULL,
    page_count INTEGER,
    content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image')),
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    truncated BOOLEAN DEFAULT false,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'areas', 'space')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_space_id ON documents(user_id, space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_hash ON documents(user_id, content_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_filename_space ON documents(space_id, filename) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_updated ON documents(user_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_visibility ON documents(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_content_type ON documents(space_id, content_type) WHERE deleted_at IS NULL;

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_documents_updated_at();

-- Document sharing to areas
CREATE TABLE document_area_shares (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    shared_by TEXT NOT NULL,
    shared_at TIMESTAMPTZ DEFAULT now(),
    notifications_sent BOOLEAN DEFAULT false,
    UNIQUE (document_id, area_id)
);

CREATE INDEX idx_doc_shares_document ON document_area_shares(document_id);
CREATE INDEX idx_doc_shares_area ON document_area_shares(area_id);
CREATE INDEX idx_doc_shares_shared_by ON document_area_shares(shared_by);

-- ============================================================================
-- 10. TASKS
-- ============================================================================

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    space_id TEXT NOT NULL,
    area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'planning', 'completed', 'deferred')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
    color TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    due_date_type TEXT CHECK (due_date_type IN ('hard', 'soft')),
    estimated_effort VARCHAR(20),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    -- Source tracking
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('assist', 'meeting', 'chat', 'manual', 'document')),
    source_assist_id TEXT,
    source_conversation_id TEXT,
    linked_conversation_ids TEXT[] DEFAULT '{}'::text[],
    -- Subtask support
    parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    subtask_type TEXT DEFAULT 'conversation' CHECK (subtask_type IN ('conversation', 'action')),
    subtask_order INTEGER DEFAULT 0,
    -- Planning
    planning_data JSONB,
    approach_chosen_at TIMESTAMPTZ,
    stale_dismissed_at TIMESTAMPTZ,
    -- Context
    context_summary TEXT,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user_space ON tasks(user_id, space_id);
CREATE INDEX idx_tasks_user_space_id ON tasks(user_id, space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_active ON tasks(user_id, space_id, status) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_tasks_area ON tasks(area_id) WHERE area_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id, subtask_order) WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tasks_has_subtasks ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tasks_planning ON tasks(user_id, space_id) WHERE status = 'planning' AND deleted_at IS NULL;
CREATE INDEX idx_tasks_estimated_effort ON tasks(estimated_effort) WHERE estimated_effort IS NOT NULL;
CREATE INDEX idx_tasks_source_document ON tasks(source_assist_id) WHERE source_type = 'document' AND deleted_at IS NULL;

CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();

-- Related tasks (for task relationships)
CREATE TABLE related_tasks (
    id TEXT PRIMARY KEY,
    source_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL DEFAULT 'related' CHECK (relationship_type IN ('related', 'blocks', 'depends_on', 'informs')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source_task_id, target_task_id),
    CHECK (source_task_id != target_task_id)
);

CREATE INDEX idx_related_tasks_source ON related_tasks(source_task_id);
CREATE INDEX idx_related_tasks_target ON related_tasks(target_task_id);

-- Task-document links
CREATE TABLE task_documents (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    context_role TEXT NOT NULL DEFAULT 'reference' CHECK (context_role IN ('reference', 'input', 'output')),
    context_note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (task_id, document_id)
);

CREATE INDEX idx_task_documents_task ON task_documents(task_id);
CREATE INDEX idx_task_documents_document ON task_documents(document_id);

-- ============================================================================
-- 11. PAGES (TipTap Documents)
-- ============================================================================

CREATE TABLE pages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    area_id TEXT NOT NULL,
    task_id TEXT,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{"type": "doc", "content": []}'::jsonb,
    content_text TEXT,
    word_count INTEGER DEFAULT 0,
    page_type TEXT NOT NULL DEFAULT 'general' CHECK (page_type IN ('general', 'meeting_notes', 'decision_record', 'proposal', 'project_brief', 'weekly_update', 'technical_spec')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'area', 'space')),
    source_conversation_id TEXT,
    -- Lifecycle status (Phase 1: Page Lifecycle)
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shared', 'finalized')),
    finalized_at TIMESTAMPTZ,
    finalized_by TEXT,
    current_version INTEGER DEFAULT 1,
    -- Context integration (Phase 2: Page Context)
    in_context BOOLEAN NOT NULL DEFAULT false,
    -- Context-aware unlock (Phase 4: Polish)
    context_version_number INTEGER,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    -- Only finalized pages can be in context
    CONSTRAINT chk_context_requires_finalized CHECK (in_context = false OR status = 'finalized')
);

CREATE INDEX idx_pages_user ON pages(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_area ON pages(area_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_task ON pages(task_id) WHERE task_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_pages_updated ON pages(user_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_search ON pages USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content_text, ''))) WHERE deleted_at IS NULL;
-- Lifecycle indexes (Phase 1: Page Lifecycle)
CREATE INDEX idx_pages_status ON pages(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_finalized ON pages(area_id, finalized_at DESC) WHERE status = 'finalized' AND deleted_at IS NULL;
-- Context integration index (Phase 2: Page Context)
CREATE INDEX idx_pages_in_context ON pages(area_id) WHERE in_context = true AND status = 'finalized' AND deleted_at IS NULL;

CREATE TRIGGER pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_pages_updated_at();

-- Page versions
CREATE TABLE page_versions (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    content JSONB NOT NULL,
    content_text TEXT,
    title TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_versions_page ON page_versions(page_id);
CREATE INDEX idx_page_versions_created ON page_versions(page_id, created_at DESC);

-- Page-conversation links
CREATE TABLE page_conversations (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('source', 'discussion', 'reference')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (page_id, conversation_id, relationship)
);

CREATE INDEX idx_page_conversations_page ON page_conversations(page_id);
CREATE INDEX idx_page_conversations_conv ON page_conversations(conversation_id);

-- Page sharing
CREATE TABLE page_user_shares (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor', 'admin')),
    shared_by TEXT NOT NULL,
    shared_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_user_shares_page ON page_user_shares(page_id);
CREATE INDEX idx_page_user_shares_user ON page_user_shares(user_id);
CREATE UNIQUE INDEX idx_page_user_shares_unique ON page_user_shares(page_id, user_id);

CREATE TABLE page_group_shares (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor', 'admin')),
    shared_by TEXT NOT NULL,
    shared_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_group_shares_page ON page_group_shares(page_id);
CREATE INDEX idx_page_group_shares_group ON page_group_shares(group_id);
CREATE UNIQUE INDEX idx_page_group_shares_unique ON page_group_shares(page_id, group_id);

-- ============================================================================
-- 12. AUDIT & SYSTEM TABLES
-- ============================================================================

-- Audit events
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (event_type != '' AND resource_type != '' AND action != '')
);

CREATE INDEX idx_audit_events_user ON audit_events(user_id, created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_events_type ON audit_events(event_type, created_at DESC);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);

-- Email logs (updated with welcome and space_invite - migrations 039, 040)
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL CHECK (email_type IN ('password_reset', 'email_verification', 'team_invite', 'space_invite', 'notification', 'welcome')),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    sendgrid_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX idx_email_logs_org ON email_logs(org_id);
CREATE INDEX idx_email_logs_user ON email_logs(user_id);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at);

-- Password reset tokens (also used for welcome tokens - migration 039)
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    token_type TEXT NOT NULL DEFAULT 'reset' CHECK (token_type IN ('reset', 'welcome')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN password_reset_tokens.token_type IS 'Token purpose: reset (password reset, 1hr expiry) or welcome (new user, 7 day expiry)';

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at) WHERE used_at IS NULL;
CREATE INDEX idx_password_reset_tokens_type ON password_reset_tokens(token_type);

-- Password reset rate limiting
CREATE TABLE password_reset_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    attempted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_password_reset_attempts_email ON password_reset_attempts(email, attempted_at);
CREATE INDEX idx_password_reset_attempts_ip ON password_reset_attempts(ip_address, attempted_at) WHERE ip_address IS NOT NULL;

-- User ID mappings (for legacy ID migration)
CREATE TABLE user_id_mappings (
    legacy_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_id_mappings_user ON user_id_mappings(user_id);

-- ============================================================================
-- 13. ROUTING & ANALYTICS
-- ============================================================================

-- Model routing decisions
CREATE TABLE routing_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id UUID,
    provider VARCHAR(50) NOT NULL,
    conversation_turn INTEGER NOT NULL DEFAULT 1,
    selected_model VARCHAR(100) NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('simple', 'medium', 'complex')),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT,
    routing_time_ms REAL,
    query_length INTEGER,
    detected_patterns TEXT[],
    overrides TEXT[],
    request_succeeded BOOLEAN,
    response_tokens INTEGER,
    estimated_cost_millicents INTEGER
);

CREATE INDEX idx_routing_decisions_user ON routing_decisions(user_id, created_at DESC);
CREATE INDEX idx_routing_decisions_org ON routing_decisions(organization_id, created_at DESC);
CREATE INDEX idx_routing_decisions_model ON routing_decisions(selected_model, created_at DESC);
CREATE INDEX idx_routing_decisions_tier ON routing_decisions(tier, created_at DESC);
CREATE INDEX idx_routing_decisions_provider ON routing_decisions(provider, created_at DESC);
CREATE INDEX idx_routing_decisions_created ON routing_decisions(created_at DESC);

-- LLM usage tracking
CREATE TABLE llm_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
    model TEXT NOT NULL,
    request_type TEXT NOT NULL DEFAULT 'chat',
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    estimated_cost_millicents INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_llm_usage_org_date ON llm_usage(organization_id, created_at DESC);
CREATE INDEX idx_llm_usage_user_date ON llm_usage(user_id, created_at DESC);
CREATE INDEX idx_llm_usage_model ON llm_usage(organization_id, model, created_at DESC);

-- ============================================================================
-- 14. ARENA (Model Battles)
-- ============================================================================

CREATE TABLE arena_battles (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    prompt TEXT NOT NULL,
    models JSONB NOT NULL DEFAULT '[]'::jsonb,
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'streaming', 'complete', 'judging', 'judged')),
    title TEXT,
    pinned BOOLEAN NOT NULL DEFAULT false,
    user_vote TEXT,
    ai_judgment JSONB,
    team_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_arena_battles_user_created ON arena_battles(user_id, created_at DESC);
CREATE INDEX idx_arena_battles_status ON arena_battles(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_arena_battles_pinned ON arena_battles(user_id, pinned DESC, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_arena_battles_team ON arena_battles(team_id, created_at DESC) WHERE deleted_at IS NULL AND team_id IS NOT NULL;
CREATE INDEX idx_arena_battles_responses_gin ON arena_battles USING GIN(responses jsonb_path_ops);

CREATE TRIGGER update_arena_battles_updated_at
    BEFORE UPDATE ON arena_battles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE arena_battle_models (
    battle_id TEXT NOT NULL REFERENCES arena_battles(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (battle_id, model_id)
);

CREATE INDEX idx_battle_models_model ON arena_battle_models(model_id);

CREATE TABLE model_rankings (
    user_id UUID NOT NULL REFERENCES users(id),
    model_id TEXT NOT NULL,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,
    elo_rating NUMERIC(10, 2) NOT NULL DEFAULT 1500.00,
    total_battles INTEGER NOT NULL DEFAULT 0,
    avg_score NUMERIC(5, 2),
    user_wins INTEGER NOT NULL DEFAULT 0,
    user_losses INTEGER NOT NULL DEFAULT 0,
    ai_wins INTEGER NOT NULL DEFAULT 0,
    ai_losses INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, model_id)
);

CREATE INDEX idx_model_rankings_elo ON model_rankings(user_id, elo_rating DESC);

CREATE TRIGGER update_model_rankings_updated_at
    BEFORE UPDATE ON model_rankings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 15. GAME SCORES (Mini-game Leaderboards)
-- ============================================================================

CREATE TABLE game_scores (
    id TEXT PRIMARY KEY DEFAULT ('gs_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    level INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT game_scores_score_positive CHECK (score >= 0),
    CONSTRAINT game_scores_valid_game_type CHECK (game_type IN ('snake', 'wordle', 'tictactoe'))
);

CREATE INDEX idx_game_scores_org_leaderboard ON game_scores(org_id, game_type, score DESC);
CREATE INDEX idx_game_scores_user_best ON game_scores(user_id, game_type, score DESC);
CREATE INDEX idx_game_scores_recent ON game_scores(org_id, game_type, created_at DESC);
CREATE INDEX idx_game_scores_user_recent ON game_scores(user_id, created_at DESC);

-- ============================================================================
-- 16. INTEGRATIONS (OAuth Connections to External Services)
-- ============================================================================

-- User-level integration config (service type, status, config)
CREATE TABLE integrations (
    id TEXT PRIMARY KEY DEFAULT ('int_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disconnected',
    config JSONB DEFAULT '{}'::jsonb,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT integrations_service_type_check CHECK (service_type IN ('calendar', 'github', 'linear', 'jira', 'slack')),
    CONSTRAINT integrations_status_check CHECK (status IN ('disconnected', 'connecting', 'connected', 'error', 'expired')),
    CONSTRAINT integrations_owner_check CHECK (
        (user_id IS NOT NULL AND space_id IS NULL) OR
        (user_id IS NULL AND space_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_integrations_user_service ON integrations(user_id, service_type) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_integrations_space_service ON integrations(space_id, service_type) WHERE space_id IS NOT NULL;
CREATE INDEX idx_integrations_user ON integrations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_integrations_space ON integrations(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX idx_integrations_org ON integrations(org_id);

-- Encrypted OAuth tokens and API keys
CREATE TABLE integration_credentials (
    id TEXT PRIMARY KEY DEFAULT ('cred_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
    integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    encryption_tag TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    scope TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT credential_type_check CHECK (credential_type IN ('access_token', 'refresh_token', 'api_key'))
);

CREATE INDEX idx_integration_credentials_integration ON integration_credentials(integration_id);
CREATE INDEX idx_integration_credentials_expiring ON integration_credentials(expires_at)
    WHERE credential_type = 'access_token' AND expires_at IS NOT NULL;

-- Area-level activation and overrides for integrations
CREATE TABLE area_integrations (
    id TEXT PRIMARY KEY DEFAULT ('aint_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
    area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    overrides JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT area_integrations_unique UNIQUE (area_id, integration_id)
);

CREATE INDEX idx_area_integrations_area ON area_integrations(area_id);
CREATE INDEX idx_area_integrations_integration ON area_integrations(integration_id);

-- Audit trail for compliance and debugging
CREATE TABLE integration_logs (
    id TEXT PRIMARY KEY DEFAULT ('ilog_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
    integration_id TEXT REFERENCES integrations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    service_type TEXT NOT NULL,
    action TEXT NOT NULL,
    request_summary JSONB,
    response_summary JSONB,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT integration_logs_event_type_check CHECK (event_type IN ('connect', 'disconnect', 'refresh', 'tool_call', 'error', 'rate_limit')),
    CONSTRAINT integration_logs_status_check CHECK (status IN ('success', 'failure', 'rate_limited'))
);

CREATE INDEX idx_integration_logs_integration ON integration_logs(integration_id);
CREATE INDEX idx_integration_logs_user ON integration_logs(user_id);
CREATE INDEX idx_integration_logs_org ON integration_logs(org_id);
CREATE INDEX idx_integration_logs_recent ON integration_logs(created_at DESC)
    WHERE created_at > (NOW() - INTERVAL '7 days');

-- OAuth states for CSRF protection
CREATE TABLE oauth_states (
    id TEXT PRIMARY KEY DEFAULT ('oauth_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
    state TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    redirect_uri TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT oauth_states_service_type_check CHECK (service_type IN ('calendar', 'github', 'linear', 'jira', 'slack'))
);

CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expired ON oauth_states(expires_at);

-- ============================================================================
-- 17. SCHEMA MIGRATIONS TRACKING
-- ============================================================================

CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
);

-- Mark baseline versions (fresh install includes all migrations through V2)
INSERT INTO schema_migrations (version) VALUES
    ('040-fresh-install'),
    ('20260120_001_game_scores'),
    ('20260127_001_integrations_infrastructure'),
    ('20260128_001_page_lifecycle'),
    ('20260128_002_page_context');

-- ============================================================================
-- DONE!
-- ============================================================================
