-- Migration: 20260120_001_game_scores
-- Description: Add game_scores table for org-wide mini-game leaderboards
-- Author: StratAI Team
-- Date: 2026-01-20
-- Rollback: DROP TABLE IF EXISTS game_scores;
-- ============================================================================

-- Game scores table for mini-game leaderboards (Snake, Wordle, TicTacToe)
CREATE TABLE IF NOT EXISTS game_scores (
    -- Primary key with prefixed ID for readability
    id TEXT PRIMARY KEY DEFAULT ('gs_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),

    -- Scope: user within org (for org-wide leaderboards)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Game identification
    game_type TEXT NOT NULL,  -- 'snake', 'wordle', 'tictactoe'

    -- Score data
    score INTEGER NOT NULL,
    level INTEGER,  -- Snake: level reached; null for other games

    -- Game metadata (flexible JSONB for game-specific data)
    -- Snake: {length: 45, apples: 12, time_ms: 120000}
    -- Wordle: {guesses: 4, word: "CRANE", hard_mode: false}
    -- TicTacToe: {opponent: "ai", moves: 5, first_move: true}
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT game_scores_score_positive CHECK (score >= 0),
    CONSTRAINT game_scores_valid_game_type CHECK (game_type IN ('snake', 'wordle', 'tictactoe'))
);

-- ============================================================================
-- Indexes for common query patterns
-- ============================================================================

-- Org-wide leaderboard: top scores by game type
-- Query: SELECT * FROM game_scores WHERE org_id = ? AND game_type = ? ORDER BY score DESC LIMIT 10
CREATE INDEX IF NOT EXISTS idx_game_scores_org_leaderboard
    ON game_scores(org_id, game_type, score DESC);

-- User's personal history/best per game
-- Query: SELECT * FROM game_scores WHERE user_id = ? AND game_type = ? ORDER BY score DESC
CREATE INDEX IF NOT EXISTS idx_game_scores_user_best
    ON game_scores(user_id, game_type, score DESC);

-- Recent scores (for weekly leaderboards)
-- Partial index only includes last 7 days - needs periodic reindex or date filtering in query
CREATE INDEX IF NOT EXISTS idx_game_scores_recent
    ON game_scores(org_id, game_type, created_at DESC)
    WHERE created_at > (NOW() - INTERVAL '7 days');

-- User lookup (for "my recent games" queries)
CREATE INDEX IF NOT EXISTS idx_game_scores_user_recent
    ON game_scores(user_id, created_at DESC);
