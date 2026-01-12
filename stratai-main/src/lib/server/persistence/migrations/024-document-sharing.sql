-- 024-document-sharing.sql
-- Document Sharing Phase 1: Add visibility and area-level sharing
--
-- This migration:
-- 1. Adds visibility column to documents table
-- 2. Creates document_area_shares junction table
-- 3. Migrates existing activated documents to visibility='space'
--
-- CRITICAL: Does NOT modify content, summary, or upload flow columns
-- See: docs/DOCUMENT_SHARING.md for full specification

-- ============================================================
-- STEP 1: ADD VISIBILITY COLUMN TO DOCUMENTS
-- ============================================================

-- Add column with safe default (all existing docs become private)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

-- Add check constraint separately for safety (handles existing data)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documents_visibility_check'
    ) THEN
        ALTER TABLE documents
        ADD CONSTRAINT documents_visibility_check
        CHECK (visibility IN ('private', 'areas', 'space'));
    END IF;
END $$;

-- ============================================================
-- STEP 2: CREATE DOCUMENT_AREA_SHARES TABLE
-- Note: Uses TEXT IDs to match current schema (documents.id, areas.id)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_area_shares (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,

    -- Attribution
    shared_by TEXT NOT NULL,  -- User ID who shared
    shared_at TIMESTAMPTZ DEFAULT NOW(),

    -- Notification tracking
    notifications_sent BOOLEAN DEFAULT FALSE,

    -- Unique constraint: one share entry per document-area pair
    UNIQUE(document_id, area_id)
);

-- ============================================================
-- STEP 3: CREATE INDEXES
-- ============================================================

-- Index for querying documents by visibility
CREATE INDEX IF NOT EXISTS idx_documents_visibility
    ON documents(visibility)
    WHERE deleted_at IS NULL;

-- Index for duplicate detection by filename within space
CREATE INDEX IF NOT EXISTS idx_documents_filename_space
    ON documents(space_id, filename)
    WHERE deleted_at IS NULL;

-- Indexes for document_area_shares
CREATE INDEX IF NOT EXISTS idx_doc_shares_document
    ON document_area_shares(document_id);

CREATE INDEX IF NOT EXISTS idx_doc_shares_area
    ON document_area_shares(area_id);

CREATE INDEX IF NOT EXISTS idx_doc_shares_shared_by
    ON document_area_shares(shared_by);

-- ============================================================
-- STEP 4: MIGRATE EXISTING DATA
-- Documents already activated in any focus_area become 'space' visibility
-- This preserves existing behavior - users can refine granularity later
-- ============================================================

-- Find documents that are currently activated in any area's context_document_ids
-- and upgrade them to space-level visibility
UPDATE documents d
SET visibility = 'space'
WHERE d.visibility = 'private'
  AND d.deleted_at IS NULL
  AND EXISTS (
      SELECT 1 FROM areas a
      WHERE a.space_id = d.space_id
        AND a.deleted_at IS NULL
        AND d.id = ANY(a.context_document_ids)
  );

-- ============================================================
-- STEP 5: DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN documents.visibility IS
    'Access scope: private (owner only), areas (specific areas via document_area_shares), space (all space members)';

COMMENT ON TABLE document_area_shares IS
    'Junction table for area-level document sharing when visibility=areas';

COMMENT ON COLUMN document_area_shares.shared_by IS
    'User ID who shared the document with this area';

COMMENT ON COLUMN document_area_shares.notifications_sent IS
    'Whether area members have been notified about this share';
