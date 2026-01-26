-- Migration: 20260126_001_add_document_content_type
-- Description: Add content_type column to documents table for distinguishing text vs image documents
-- Author: Claude Code
-- Date: 2026-01-26
-- Rollback: ALTER TABLE documents DROP COLUMN IF EXISTS content_type;
-- ============================================================================

-- Add content_type column to distinguish text documents from images
-- Default is 'text' for backward compatibility with existing documents
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text';

-- Add CHECK constraint for valid content types
-- Using DO block to make constraint addition idempotent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'documents_content_type_check'
    ) THEN
        ALTER TABLE documents
        ADD CONSTRAINT documents_content_type_check
        CHECK (content_type IN ('text', 'image'));
    END IF;
END $$;

-- Create index for filtering by content type within a space
-- Partial index excludes deleted documents for efficiency
CREATE INDEX IF NOT EXISTS idx_documents_content_type
    ON documents(space_id, content_type)
    WHERE deleted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN documents.content_type IS 'Type of document content: text (extractable text) or image (base64 encoded for vision API)';
