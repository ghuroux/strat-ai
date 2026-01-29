-- Migration: 20260128_002_page_context
-- Description: Add in_context column to pages for AI context integration
-- Phase 2 of Page Lifecycle: Context Integration
--
-- When a page is finalized, the owner can opt to add it to AI context.
-- The CHECK constraint ensures only finalized pages can be in context.
-- Unlocking a page automatically clears in_context (enforced by constraint).

-- Add in_context boolean column
ALTER TABLE pages ADD COLUMN IF NOT EXISTS in_context BOOLEAN NOT NULL DEFAULT false;

-- Only finalized pages can be in context
-- This constraint ensures data integrity: unlocking (status -> 'shared')
-- requires in_context = false, preventing stale context references.
ALTER TABLE pages ADD CONSTRAINT chk_context_requires_finalized
  CHECK (in_context = false OR status = 'finalized');

-- Partial index for efficient context queries:
-- "Give me all pages in context for this area"
CREATE INDEX IF NOT EXISTS idx_pages_in_context
  ON pages(area_id)
  WHERE in_context = true AND status = 'finalized' AND deleted_at IS NULL;

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('20260128_002_page_context')
  ON CONFLICT (version) DO NOTHING;
