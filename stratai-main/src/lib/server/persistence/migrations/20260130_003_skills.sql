-- Migration: 20260130_003_skills
-- Description: Skills system — reusable AI instruction sets for Spaces and Areas
-- Phase: Skills Phase 1 (Schema & Backend)

-- ============================================================================
-- Skills table: methodology content attached to Space or Area
-- ============================================================================
CREATE TABLE skills (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    area_id TEXT REFERENCES areas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    activation_mode TEXT NOT NULL DEFAULT 'manual'
        CHECK (activation_mode IN ('always', 'trigger', 'manual')),
    triggers TEXT[],
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- A skill must belong to exactly one of Space or Area (XOR)
    CONSTRAINT skill_has_owner CHECK (
        (space_id IS NOT NULL AND area_id IS NULL) OR
        (space_id IS NULL AND area_id IS NOT NULL)
    )
);

-- Indexes for efficient lookup by owner
CREATE INDEX idx_skills_space ON skills(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX idx_skills_area ON skills(area_id) WHERE area_id IS NOT NULL;

-- ============================================================================
-- Area skill activations: which Space skills are active in which Areas
-- ============================================================================
CREATE TABLE area_skill_activations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_by TEXT NOT NULL,
    UNIQUE(area_id, skill_id)
);

CREATE INDEX idx_area_skill_activations ON area_skill_activations(area_id);

-- ============================================================================
-- Rollback plan:
-- DROP TABLE IF EXISTS area_skill_activations;
-- DROP TABLE IF EXISTS skills;
-- ============================================================================
