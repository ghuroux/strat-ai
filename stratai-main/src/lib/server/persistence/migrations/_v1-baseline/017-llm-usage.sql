-- ============================================================
-- Migration 017: LLM Usage Tracking
-- ============================================================
-- Creates llm_usage table to track token consumption per LLM request.
-- Enables usage analytics, cost estimation, and team activity monitoring.
--
-- Features:
--   - Token tracking (prompt, completion, total)
--   - Cache statistics (Anthropic prompt caching)
--   - Cost estimation in millicents
--   - Multi-tenant (organization-scoped)
--   - Request type classification (chat, arena, second-opinion)
-- ============================================================

CREATE TABLE IF NOT EXISTS llm_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,

    -- Request metadata
    model TEXT NOT NULL,
    request_type TEXT NOT NULL DEFAULT 'chat', -- 'chat', 'arena', 'second-opinion'

    -- Token usage
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,

    -- Cache statistics (Anthropic prompt caching)
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,

    -- Estimated costs (in millicents for precision, e.g., 150 = $0.0015)
    estimated_cost_millicents INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes for common queries
-- ============================================================

-- Dashboard loads: org + time filter (most common query)
CREATE INDEX idx_llm_usage_org_date
    ON llm_usage(organization_id, created_at DESC);

-- User activity queries: specific user's usage over time
CREATE INDEX idx_llm_usage_user_date
    ON llm_usage(user_id, created_at DESC);

-- Model breakdown queries: usage by model within org
CREATE INDEX idx_llm_usage_model
    ON llm_usage(organization_id, model, created_at DESC);

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE llm_usage IS 'Token usage tracking per LLM request for analytics and cost monitoring';
COMMENT ON COLUMN llm_usage.request_type IS 'Type of request: chat (main chat), arena (model arena), second-opinion (comparison)';
COMMENT ON COLUMN llm_usage.cache_creation_tokens IS 'Tokens used to create new cache entries (Anthropic prompt caching)';
COMMENT ON COLUMN llm_usage.cache_read_tokens IS 'Tokens read from cache (90% cost savings)';
COMMENT ON COLUMN llm_usage.estimated_cost_millicents IS 'Estimated cost in millicents (1000 millicents = 1 cent)';
