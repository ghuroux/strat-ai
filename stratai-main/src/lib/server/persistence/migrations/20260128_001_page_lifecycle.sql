-- Migration: 20260128_001_page_lifecycle
-- Description: Add page lifecycle status and finalization metadata
-- Author: Claude
-- Date: 2026-01-28
-- Rollback: ALTER TABLE pages DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS finalized_at, DROP COLUMN IF EXISTS finalized_by, DROP COLUMN IF EXISTS current_version;
-- ============================================================================

-- ============================================================================
-- Add status column with default 'draft'
-- Valid statuses: draft (working), shared (collaborative), finalized (locked)
-- ============================================================================
ALTER TABLE pages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- Add constraint for valid status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pages_status_check'
    ) THEN
        ALTER TABLE pages ADD CONSTRAINT pages_status_check
            CHECK (status IN ('draft', 'shared', 'finalized'));
    END IF;
END $$;

-- ============================================================================
-- Add finalization metadata columns
-- ============================================================================

-- When the page was finalized
ALTER TABLE pages ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- Who finalized the page (user_id as TEXT to match user_id column type)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS finalized_by TEXT;

-- Current version number (increments on each finalize)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- ============================================================================
-- Indexes for efficient querying
-- ============================================================================

-- Index for filtering by status (common query: "show all finalized pages")
CREATE INDEX IF NOT EXISTS idx_pages_status
    ON pages(status) WHERE deleted_at IS NULL;

-- Index for area context queries (finalized pages in an area, sorted by finalized time)
CREATE INDEX IF NOT EXISTS idx_pages_finalized
    ON pages(area_id, finalized_at DESC)
    WHERE status = 'finalized' AND deleted_at IS NULL;

-- ============================================================================
-- Migration complete
-- ============================================================================
