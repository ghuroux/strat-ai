-- Migration: 023-routing-decisions
-- Description: Create table for AUTO model routing decision analytics
-- Created: 2026-01-11

-- ============================================
-- ROUTING DECISIONS TABLE
-- ============================================
-- Stores every AUTO mode routing decision for analytics.
-- Enables understanding routing behavior, cost savings, and tuning thresholds.

CREATE TABLE IF NOT EXISTS routing_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Context (who made the request)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id UUID,

    -- Request info
    provider VARCHAR(50) NOT NULL,  -- anthropic, openai, google
    conversation_turn INTEGER NOT NULL DEFAULT 1,

    -- Routing decision
    selected_model VARCHAR(100) NOT NULL,
    tier VARCHAR(20) NOT NULL,  -- simple, medium, complex
    score INTEGER NOT NULL,  -- 0-100 complexity score
    confidence REAL NOT NULL,  -- 0.0-1.0
    reasoning TEXT,
    routing_time_ms REAL,  -- How long routing took

    -- Analysis details (for debugging/tuning)
    query_length INTEGER,
    detected_patterns TEXT[],  -- code, math, creative, analysis, etc.
    overrides TEXT[],  -- thinking_enabled, low_confidence, cache_coherence, etc.

    -- Outcome (updated after response completes)
    request_succeeded BOOLEAN,
    response_tokens INTEGER,
    estimated_cost_millicents INTEGER,

    -- Constraints
    CONSTRAINT valid_tier CHECK (tier IN ('simple', 'medium', 'complex')),
    CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- ============================================
-- INDEXES
-- ============================================

-- Time-based queries (dashboard filtering)
CREATE INDEX IF NOT EXISTS idx_routing_decisions_created
    ON routing_decisions(created_at DESC);

-- Organization filtering
CREATE INDEX IF NOT EXISTS idx_routing_decisions_org
    ON routing_decisions(organization_id, created_at DESC);

-- User filtering
CREATE INDEX IF NOT EXISTS idx_routing_decisions_user
    ON routing_decisions(user_id, created_at DESC);

-- Tier distribution queries
CREATE INDEX IF NOT EXISTS idx_routing_decisions_tier
    ON routing_decisions(tier, created_at DESC);

-- Model selection queries
CREATE INDEX IF NOT EXISTS idx_routing_decisions_model
    ON routing_decisions(selected_model, created_at DESC);

-- Provider filtering
CREATE INDEX IF NOT EXISTS idx_routing_decisions_provider
    ON routing_decisions(provider, created_at DESC);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE routing_decisions IS 'AUTO mode routing decision log for analytics and tuning';
COMMENT ON COLUMN routing_decisions.tier IS 'Complexity tier: simple (Haiku), medium (Sonnet), complex (Opus)';
COMMENT ON COLUMN routing_decisions.score IS 'Complexity score 0-100 from query analysis';
COMMENT ON COLUMN routing_decisions.confidence IS 'Router confidence in the classification (0.0-1.0)';
COMMENT ON COLUMN routing_decisions.detected_patterns IS 'Patterns found in query: code, math, creative, analysis, etc.';
COMMENT ON COLUMN routing_decisions.overrides IS 'Rules that overrode the base tier: thinking_enabled, low_confidence, etc.';
