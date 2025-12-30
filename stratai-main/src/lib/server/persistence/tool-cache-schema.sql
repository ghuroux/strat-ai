-- Tool Result Cache Schema
-- Caches tool results (like read_document) for token efficiency
-- Allows summaries to be used for subsequent turns instead of full content

CREATE TABLE IF NOT EXISTS tool_result_cache (
  id TEXT PRIMARY KEY,

  -- Scope
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- Tool identification
  tool_name TEXT NOT NULL,
  params_hash TEXT NOT NULL, -- Hash of input params for deduplication

  -- Content
  full_result TEXT NOT NULL, -- Complete tool output
  summary TEXT, -- Token-efficient summary for subsequent turns

  -- Metadata
  token_count INTEGER, -- Estimated token count of full result
  access_count INTEGER DEFAULT 1, -- How many times this was accessed

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour') -- 1 hour default TTL
);

-- Index for finding cached results by conversation and tool
CREATE INDEX IF NOT EXISTS idx_tool_cache_lookup
ON tool_result_cache(conversation_id, tool_name, params_hash)
WHERE expires_at > NOW();

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_tool_cache_expires
ON tool_result_cache(expires_at);

-- Function to update access tracking
CREATE OR REPLACE FUNCTION update_tool_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = NOW();
  NEW.access_count = NEW.access_count + 1;
  -- Extend TTL on access (refresh to 1 hour from now)
  NEW.expires_at = NOW() + INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function to remove expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_tool_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM tool_result_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
