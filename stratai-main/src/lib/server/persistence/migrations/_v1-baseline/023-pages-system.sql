-- Pages System Migration
-- AI-native document creation (Confluence replacement)
-- Part of Phase 1: Foundation

-- ============================================================================
-- PAGES TABLE
-- User-created rich text documents within areas
-- ============================================================================
CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,  -- page_${timestamp}_${random}

    -- Ownership & Location
    user_id TEXT NOT NULL,
    area_id TEXT NOT NULL,  -- Pages MUST live in an area
    task_id TEXT,           -- Optional task association (soft reference)
    -- NOTE: No space_id column - derive from area.space_id

    -- Content
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',
    content_text TEXT,      -- Extracted for full-text search
    page_type TEXT NOT NULL DEFAULT 'general'
        CHECK (page_type IN ('general', 'meeting_notes', 'decision_record',
                             'proposal', 'project_brief', 'weekly_update', 'technical_spec')),

    -- Metadata
    visibility TEXT NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'shared')),
    source_conversation_id TEXT,  -- Soft reference (no FK)
    word_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for pages
CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pages_area ON pages(area_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pages_task ON pages(task_id) WHERE task_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(user_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_pages_search ON pages
    USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, '')))
    WHERE deleted_at IS NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pages_updated_at ON pages;
CREATE TRIGGER pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_pages_updated_at();

-- ============================================================================
-- PAGE_VERSIONS TABLE
-- Version history for pages
-- ============================================================================
CREATE TABLE IF NOT EXISTS page_versions (
    id TEXT PRIMARY KEY,      -- pv_${timestamp}_${random}
    page_id TEXT NOT NULL,    -- Soft reference to pages.id

    -- Content snapshot
    content JSONB NOT NULL,
    content_text TEXT,
    title TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,

    -- Metadata
    created_by TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    change_summary TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for page_versions
CREATE INDEX IF NOT EXISTS idx_page_versions_page ON page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_created ON page_versions(page_id, created_at DESC);

-- ============================================================================
-- PAGE_CONVERSATIONS TABLE
-- Links between pages and conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS page_conversations (
    id TEXT PRIMARY KEY,      -- pc_${timestamp}_${random}
    page_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,

    -- Relationship type
    relationship TEXT NOT NULL CHECK (relationship IN ('source', 'discussion', 'reference')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(page_id, conversation_id, relationship)
);

-- Indexes for page_conversations
CREATE INDEX IF NOT EXISTS idx_page_conversations_page ON page_conversations(page_id);
CREATE INDEX IF NOT EXISTS idx_page_conversations_conv ON page_conversations(conversation_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE pages IS 'User-created rich text documents for knowledge management';
COMMENT ON TABLE page_versions IS 'Version history for page content';
COMMENT ON TABLE page_conversations IS 'Junction table linking pages to conversations';
COMMENT ON COLUMN pages.content IS 'TipTap/ProseMirror JSON document structure';
COMMENT ON COLUMN pages.content_text IS 'Plain text extraction for full-text search';
COMMENT ON COLUMN pages.page_type IS 'Template type: general, meeting_notes, decision_record, proposal, project_brief, weekly_update, technical_spec';
COMMENT ON COLUMN pages.visibility IS 'Access level: private (owner only) or shared (team visible)';
COMMENT ON COLUMN page_conversations.relationship IS 'How conversation relates: source (created from), discussion (about page), reference (mentioned)';
