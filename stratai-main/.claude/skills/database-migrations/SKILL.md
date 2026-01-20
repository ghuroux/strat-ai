---
name: database-migrations
description: |
  Use when creating or modifying database migrations.
  MANDATORY for: New tables, schema changes, indexes, constraints.
  Covers: Migration naming, file structure, running migrations, testing, rollback planning.
globs:
  - "src/lib/server/persistence/migrations/*.sql"
---

# Database Migrations

## Naming Convention

**Format**: `YYYYMMDD_NNN_description.sql`

```
20260120_001_game_scores.sql
20260125_002_add_achievements.sql
20260125_003_user_streaks.sql
```

**Rules:**
- Date prefix (`YYYYMMDD`) provides chronological context
- Sequential number (`NNN`) within date prevents conflicts (001, 002, etc.)
- Descriptive suffix explains purpose (lowercase, underscores)
- Always `.sql` extension

**Why this format:**
- Natural alphabetical sorting = chronological order
- Date shows when migration was created
- Number handles multiple migrations on same day
- Description is human-readable at a glance

## Migration File Structure

Every migration must follow this template:

```sql
-- Migration: 20260120_001_game_scores
-- Description: Add game_scores table for mini-game leaderboards
-- Author: [Your name]
-- Date: 2026-01-20
-- Rollback: DROP TABLE IF EXISTS game_scores;
-- ============================================================================

-- Your SQL here
CREATE TABLE IF NOT EXISTS game_scores (
    -- ...
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_scores_example
    ON game_scores(column_name);
```

**Header requirements:**
1. `-- Migration:` - Must match filename (without .sql)
2. `-- Description:` - One-line summary
3. `-- Author:` - Who wrote it
4. `-- Date:` - When created (YYYY-MM-DD)
5. `-- Rollback:` - SQL to undo (for documentation)

## Idempotency

**All migrations MUST be idempotent** (safe to run multiple times):

```sql
-- GOOD - Idempotent
CREATE TABLE IF NOT EXISTS game_scores (...);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS score INTEGER;

-- BAD - Will fail on re-run
CREATE TABLE game_scores (...);  -- Error: already exists
CREATE INDEX idx_game_scores_user ON game_scores(user_id);  -- Error: already exists
ALTER TABLE users ADD COLUMN score INTEGER;  -- Error: already exists
```

### Pattern: Adding Columns

```sql
-- Add column if not exists (PostgreSQL 9.6+)
ALTER TABLE users ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Add column with constraints
ALTER TABLE users ADD COLUMN IF NOT EXISTS game_type TEXT;
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS chk_game_type
    CHECK (game_type IN ('snake', 'wordle', 'tictactoe'));
```

### Pattern: Creating Tables

```sql
CREATE TABLE IF NOT EXISTS game_scores (
    id TEXT PRIMARY KEY DEFAULT ('gs_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT game_scores_score_positive CHECK (score >= 0)
);
```

### Pattern: Creating Indexes

```sql
-- Simple index
CREATE INDEX IF NOT EXISTS idx_game_scores_user
    ON game_scores(user_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_game_scores_leaderboard
    ON game_scores(org_id, game_type, score DESC);

-- Partial index (with WHERE clause)
CREATE INDEX IF NOT EXISTS idx_game_scores_recent
    ON game_scores(org_id, game_type, created_at DESC)
    WHERE created_at > (NOW() - INTERVAL '7 days');
```

### Pattern: Modifying Constraints

```sql
-- Drop constraint if exists, then add
ALTER TABLE game_scores DROP CONSTRAINT IF EXISTS game_scores_valid_game_type;
ALTER TABLE game_scores ADD CONSTRAINT game_scores_valid_game_type
    CHECK (game_type IN ('snake', 'wordle', 'tictactoe', 'new_game'));
```

## Running Migrations

### Development

```bash
# Full setup (schemas + migrations)
npx tsx scripts/setup-db.ts

# Check migration status
npx tsx scripts/setup-db.ts --status
```

### Production

```bash
# Set DATABASE_URL for production
DATABASE_URL="postgres://user:pass@host:5432/dbname?sslmode=require" npx tsx scripts/setup-db.ts
```

### Manual (Single Migration)

```bash
# If you need to run just one migration
psql $DATABASE_URL -f src/lib/server/persistence/migrations/20260120_001_game_scores.sql
```

## Testing Checklist

Before committing a migration:

- [ ] **Runs clean** - No errors on fresh database
- [ ] **Idempotent** - Can run twice without error
- [ ] **Rollback documented** - Header includes rollback SQL
- [ ] **Indexes planned** - Common query patterns have indexes
- [ ] **Foreign keys cascaded** - ON DELETE behavior specified
- [ ] **Constraints validated** - CHECK constraints for enums/ranges
- [ ] **fresh-install updated** - `fresh-install/schema.sql` updated with new table

### Testing Steps

```bash
# 1. Run migration
npx tsx scripts/setup-db.ts

# 2. Verify table created
psql -d stratai -c "\d game_scores"

# 3. Test idempotency (run again)
npx tsx scripts/setup-db.ts

# 4. Test basic operations
psql -d stratai -c "INSERT INTO game_scores (user_id, org_id, game_type, score) VALUES ('...', '...', 'snake', 100) RETURNING *"
```

## Rollback Planning

**Rollbacks are manual, not automatic.** Always document the rollback SQL in the migration header.

### Safe Rollbacks

```sql
-- Adding a table - safe to drop
DROP TABLE IF EXISTS game_scores;

-- Adding a column - safe to drop
ALTER TABLE users DROP COLUMN IF EXISTS score;

-- Adding an index - safe to drop
DROP INDEX IF EXISTS idx_game_scores_user;
```

### Dangerous Rollbacks

```sql
-- CAUTION: Dropping columns loses data
ALTER TABLE users DROP COLUMN email;  -- DATA LOSS!

-- CAUTION: Dropping tables loses data
DROP TABLE game_scores;  -- DATA LOSS!

-- Consider: Rename instead of drop for safety
ALTER TABLE game_scores RENAME TO game_scores_backup_20260120;
```

### Rollback Procedure

1. **Stop the application** - Prevent new writes
2. **Backup first** - `pg_dump -t table_name > backup.sql`
3. **Run rollback SQL** - From migration header
4. **Verify** - Check schema and data
5. **Restart application**

## Common Patterns

### ID Generation

```sql
-- Prefixed IDs (for readability)
id TEXT PRIMARY KEY DEFAULT ('gs_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8))

-- UUID (for user-facing entities)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### Timestamps

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ  -- For soft deletes
```

### Soft Deletes

```sql
-- Add soft delete column
deleted_at TIMESTAMPTZ

-- Index for active records only
CREATE INDEX idx_game_scores_active ON game_scores(user_id) WHERE deleted_at IS NULL;
```

### Foreign Keys with Cascade

```sql
-- Cascade delete (child deleted when parent deleted)
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE

-- Set null (reference cleared when parent deleted)
area_id TEXT REFERENCES areas(id) ON DELETE SET NULL

-- Restrict (prevent deletion if children exist)
org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT
```

### JSONB Columns

```sql
-- Flexible metadata
metadata JSONB DEFAULT '{}'::jsonb

-- With GIN index for queries
CREATE INDEX idx_game_scores_metadata ON game_scores USING GIN(metadata);
```

## Directory Structure

```
src/lib/server/persistence/migrations/
├── _v1-baseline/                      # Archived v1 migrations (002-040)
│   ├── README.md                      # Archive documentation
│   └── *.sql                          # 40 archived migrations
├── 20260120_001_game_scores.sql       # V2 migrations here
└── (future migrations...)
```

**Note:** The `_v1-baseline/` directory is ignored by the migration runner. New migrations go in the parent `migrations/` directory.

## Fresh Install Updates

When creating a new table, **also update** `fresh-install/schema.sql`:

1. Add the complete CREATE TABLE statement
2. Add all indexes
3. Add any related tables (junction tables, etc.)
4. Update the version comment at the top

This ensures fresh installs get the complete schema without running 40+ migrations.

## Troubleshooting

### "relation already exists"

Migration isn't idempotent. Add `IF NOT EXISTS`:
```sql
CREATE TABLE IF NOT EXISTS game_scores (...);
```

### "column already exists"

Use PostgreSQL 9.6+ syntax:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS score INTEGER;
```

### Migration not running

1. Check if already in `schema_migrations` table
2. Check filename matches pattern (`YYYYMMDD_NNN_*.sql`)
3. Check file is in `migrations/` (not `_v1-baseline/`)

### Need to re-run a migration

```sql
-- Remove from tracking (use with caution)
DELETE FROM schema_migrations WHERE version = '20260120_001_game_scores';
```

Then run `npx tsx scripts/setup-db.ts` again.

## See Also

- `working-with-postgres/SKILL.md` - Query patterns, camelCase transformation
- `fresh-install/schema.sql` - Complete schema for new databases
- `docs/database/SCHEMA_REFERENCE.md` - Auto-generated schema documentation
