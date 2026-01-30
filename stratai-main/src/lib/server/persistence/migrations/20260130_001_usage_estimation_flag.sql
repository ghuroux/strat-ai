-- Add is_estimated flag to llm_usage table
-- Tracks whether usage data came from the provider (false) or was estimated server-side (true)
-- Needed because LiteLLM doesn't reliably return usage in streaming for Anthropic/Gemini

ALTER TABLE llm_usage ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN NOT NULL DEFAULT false;
