-- ============================================================
-- Migration 020: Add budget and model tier fields to organizations
-- ============================================================
-- Enables organization-level budget management and model tier control.
--
-- Fields added to organizations:
--   - allowed_tiers: Array of enabled model tiers (basic, standard, premium)
--   - monthly_budget: Optional spending limit in USD
--   - budget_alert_threshold: Percentage threshold for alerts (0-100)
--   - budget_hard_limit: Whether to block requests when budget exceeded
-- ============================================================

-- Add model tier control
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS allowed_tiers TEXT[] DEFAULT ARRAY['basic', 'standard', 'premium'];

-- Add budget fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(10,2);

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS budget_alert_threshold INTEGER DEFAULT 80;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS budget_hard_limit BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN organizations.allowed_tiers IS
    'Model tiers enabled for this organization (basic, standard, premium)';

COMMENT ON COLUMN organizations.monthly_budget IS
    'Monthly spending limit in USD, NULL means no limit';

COMMENT ON COLUMN organizations.budget_alert_threshold IS
    'Percentage threshold for budget alerts (default 80%)';

COMMENT ON COLUMN organizations.budget_hard_limit IS
    'If true, block requests when budget is exceeded';

-- ============================================================
-- NOTES
-- ============================================================
-- Groups can have more restrictive tier access than the org:
--   - groups.allowed_tiers must be a subset of organizations.allowed_tiers
--   - groups.monthly_budget enforced independently
--
-- Budget checking in chat:
--   1. Check org.monthly_budget (if set and budget_hard_limit = true)
--   2. Check user's groups' monthly_budget (most restrictive)
--   3. If over budget, return error or downgrade to cheaper model
-- ============================================================
