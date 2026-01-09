-- ============================================================
-- Migration 018: Add system_prompt to organizations and groups
-- ============================================================
-- Enables organization and group-level AI context/instructions
-- that are included in all conversations.
--
-- Context Hierarchy:
--   1. Organization (always included)
--   2. Group (additive, user may be in multiple)
--   3. Space (already exists: spaces.context)
--   4. Area (already exists: areas.context_notes)
-- ============================================================

-- Add to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Add to groups
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Comments
COMMENT ON COLUMN organizations.system_prompt IS
    'Organization-wide AI context/instructions included in all conversations for this org';

COMMENT ON COLUMN groups.system_prompt IS
    'Group-specific AI context/instructions for team members, additive to org prompt';

-- ============================================================
-- NOTES
-- ============================================================
-- Existing context fields (no changes needed):
--   - spaces.context
--   - areas.context_notes
--
-- Context assembly in chat:
--   1. Start with organization.system_prompt
--   2. Add all user's groups' system_prompts
--   3. Add current space.context (if in a space)
--   4. Add current area.context_notes (if in an area)
-- ============================================================
