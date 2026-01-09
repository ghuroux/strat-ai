-- ============================================================
-- Migration 021: Add model tier assignments to organizations
-- ============================================================
-- Stores per-model tier assignments for each organization.
-- This allows fine-grained control over which models are
-- available at which tier (basic, standard, premium).
--
-- Format: { "model-id": "basic" | "standard" | "premium" | null }
-- - null means the model is disabled for this organization
-- - If a model is not in the mapping, it uses the default tier
--   (determined by the model's pricing/capabilities)
-- ============================================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS model_tier_assignments JSONB DEFAULT '{}';

COMMENT ON COLUMN organizations.model_tier_assignments IS
    'Per-model tier assignments. Keys are model IDs, values are tier names (basic/standard/premium) or null (disabled)';

-- ============================================================
-- NOTES
-- ============================================================
-- Default tier assignment logic (when not explicitly set):
--   - Premium: Models with pricing > $10/M output tokens
--   - Standard: Models with pricing $1-10/M output tokens
--   - Basic: Models with pricing < $1/M output tokens
--
-- This allows orgs to:
--   1. Move expensive models to lower tiers (democratize access)
--   2. Move cheap models to higher tiers (restrict access)
--   3. Disable specific models entirely (set to null)
-- ============================================================
