-- Add 'prompt-runner' to game_scores game_type CHECK constraint
-- Enables the Prompt Runner endless runner game to save scores

-- Drop existing constraint
ALTER TABLE game_scores DROP CONSTRAINT IF EXISTS game_scores_valid_game_type;

-- Re-add with prompt-runner included
ALTER TABLE game_scores ADD CONSTRAINT game_scores_valid_game_type
    CHECK (game_type IN ('snake', 'wordle', 'tictactoe', 'prompt-runner'));

-- Record migration
INSERT INTO _migrations (name) VALUES ('20260131_003_prompt_runner_game_type')
ON CONFLICT (name) DO NOTHING;
