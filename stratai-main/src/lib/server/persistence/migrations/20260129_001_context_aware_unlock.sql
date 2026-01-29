-- Migration: Context-Aware Unlock
-- Phase 4: Page Lifecycle Polish
--
-- Adds context_version_number to pages table.
-- When unlocking a finalized page that's in AI context, the user can choose to
-- "pin" the finalized version for AI context while editing. This column stores
-- which version number the AI should use.
--
-- Invariant: context_version_number IS NOT NULL means "frozen version being served to AI
-- while page is being edited"
--
-- Rollback: ALTER TABLE pages DROP COLUMN IF EXISTS context_version_number;

ALTER TABLE pages ADD COLUMN IF NOT EXISTS context_version_number INTEGER;
