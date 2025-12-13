-- StratAI Arena Schema
-- PostgreSQL 18+ with JSONB for embedded data
-- Created: 2024-12

-- =====================================================
-- Arena Battles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS arena_battles (
    -- Primary key (text UUID for consistency with conversations)
    id TEXT PRIMARY KEY,

    -- Battle content
    prompt TEXT NOT NULL,

    -- Models participating (array of model objects)
    -- Each: {id, displayName, provider}
    models JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Full response content (FULL text, not truncated)
    -- Each: {id, modelId, content, thinking?, sources?, metrics?, error?, ...timing fields}
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Battle settings
    -- {webSearchEnabled, extendedThinkingEnabled, thinkingBudgetTokens, temperature, reasoningEffort, blindMode}
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Battle state
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'streaming', 'complete', 'judging', 'judged')),

    -- Battle metadata
    title TEXT,  -- Optional custom title (auto-generated from prompt if null)
    pinned BOOLEAN NOT NULL DEFAULT FALSE,

    -- User voting and AI judgment
    user_vote TEXT,  -- modelId of user's choice
    ai_judgment JSONB,  -- {winnerId, analysis, scores, criteria, timestamp}

    -- Multi-tenant fields
    user_id TEXT NOT NULL,
    team_id TEXT,  -- Future: team-level battles

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- Soft delete
);

-- =====================================================
-- Model Rankings Table (Elo-style)
-- =====================================================
CREATE TABLE IF NOT EXISTS model_rankings (
    -- Composite primary key: user + model
    user_id TEXT NOT NULL,
    model_id TEXT NOT NULL,

    -- Win/Loss/Tie counters
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,

    -- Elo-style rating (default 1500, like chess)
    elo_rating NUMERIC(10, 2) NOT NULL DEFAULT 1500.00,

    -- Additional stats for analytics
    total_battles INTEGER NOT NULL DEFAULT 0,
    avg_score NUMERIC(5, 2),  -- Average AI judge score (1-10)

    -- Track by vote type for deeper analysis
    user_wins INTEGER NOT NULL DEFAULT 0,
    user_losses INTEGER NOT NULL DEFAULT 0,
    ai_wins INTEGER NOT NULL DEFAULT 0,
    ai_losses INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, model_id)
);

-- =====================================================
-- Battle Participants Junction (for efficient model queries)
-- =====================================================
-- This enables queries like "all battles involving claude-sonnet"
CREATE TABLE IF NOT EXISTS arena_battle_models (
    battle_id TEXT NOT NULL REFERENCES arena_battles(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    position INTEGER NOT NULL,  -- 0-based position in battle

    PRIMARY KEY (battle_id, model_id)
);

-- =====================================================
-- Indexes
-- =====================================================

-- User's battles (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_arena_battles_user_created
    ON arena_battles(user_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Status-based queries (pending battles, etc.)
CREATE INDEX IF NOT EXISTS idx_arena_battles_status
    ON arena_battles(user_id, status)
    WHERE deleted_at IS NULL;

-- Team battles (future)
CREATE INDEX IF NOT EXISTS idx_arena_battles_team
    ON arena_battles(team_id, created_at DESC)
    WHERE deleted_at IS NULL AND team_id IS NOT NULL;

-- Pinned battles first, then by date
CREATE INDEX IF NOT EXISTS idx_arena_battles_pinned
    ON arena_battles(user_id, pinned DESC, created_at DESC)
    WHERE deleted_at IS NULL;

-- Model rankings leaderboard
CREATE INDEX IF NOT EXISTS idx_model_rankings_elo
    ON model_rankings(user_id, elo_rating DESC);

-- Model participation lookups
CREATE INDEX IF NOT EXISTS idx_battle_models_model
    ON arena_battle_models(model_id);

-- GIN index for response content search (future feature)
CREATE INDEX IF NOT EXISTS idx_arena_battles_responses_gin
    ON arena_battles USING GIN (responses jsonb_path_ops);

-- =====================================================
-- Triggers (reuse existing function from conversations)
-- =====================================================

-- Auto-update updated_at trigger for arena_battles
DROP TRIGGER IF EXISTS update_arena_battles_updated_at ON arena_battles;
CREATE TRIGGER update_arena_battles_updated_at
    BEFORE UPDATE ON arena_battles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at trigger for model_rankings
DROP TRIGGER IF EXISTS update_model_rankings_updated_at ON model_rankings;
CREATE TRIGGER update_model_rankings_updated_at
    BEFORE UPDATE ON model_rankings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE arena_battles IS 'Model Arena battles with full response content and judgments';
COMMENT ON TABLE model_rankings IS 'Per-user model performance rankings with Elo ratings';
COMMENT ON TABLE arena_battle_models IS 'Junction table for efficient model-to-battle lookups';

COMMENT ON COLUMN arena_battles.models IS 'Array of participating models: [{id, displayName, provider}]';
COMMENT ON COLUMN arena_battles.responses IS 'Full response content: [{id, modelId, content, thinking?, metrics?, sources?, error?, startedAt, completedAt, durationMs}]';
COMMENT ON COLUMN arena_battles.settings IS 'Battle configuration: {webSearchEnabled, extendedThinkingEnabled, thinkingBudgetTokens, temperature, reasoningEffort, blindMode}';
COMMENT ON COLUMN arena_battles.ai_judgment IS 'AI evaluation: {winnerId, analysis, scores: {modelId: score}, criteria: [], timestamp}';
COMMENT ON COLUMN model_rankings.elo_rating IS 'Elo-style rating starting at 1500, K-factor 32 for updates';
