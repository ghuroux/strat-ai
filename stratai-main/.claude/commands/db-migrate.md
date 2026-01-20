# Database Migration Commands

Run database schema migrations for StratAI.

## Quick Start

```bash
# Full database setup (schemas + all migrations)
npx tsx scripts/setup-db.ts

# With explicit DATABASE_URL
DATABASE_URL="postgres://user:pass@host:5432/dbname" npx tsx scripts/setup-db.ts
```

## What It Does

1. Tests database connection
2. Creates `schema_migrations` tracking table
3. Runs all base schemas (`*-schema.sql` files)
4. Runs all pending migrations in order
5. Verifies tables were created

## Fresh Install

For a completely new database, use the consolidated schema:

```bash
psql -d stratai -f fresh-install/schema.sql
psql -d stratai -f fresh-install/seed-data.sql  # Optional test data
```

## Migration History

| Version | Location | Notes |
|---------|----------|-------|
| V1 (002-040) | `migrations/_v1-baseline/` | Archived, not run on new migrations |
| V2 (YYYYMMDD_NNN_*) | `migrations/` | Current format |

New migrations use the `YYYYMMDD_NNN_description.sql` naming convention.

## Creating New Migrations

See `.claude/skills/database-migrations/SKILL.md` for:
- Migration file template
- Naming conventions
- Idempotency patterns
- Testing checklist
- Rollback planning

Quick example:

```sql
-- Migration: 20260120_001_game_scores
-- Description: Add game_scores table for mini-game leaderboards
-- Author: [Name]
-- Date: 2026-01-20
-- Rollback: DROP TABLE IF EXISTS game_scores;
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_scores (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Environment

The script reads `DATABASE_URL` from:
1. Environment variable (highest priority)
2. `.env` file in project root

Example `.env`:
```bash
DATABASE_URL=postgres://ghuroux@localhost:5432/stratai
```

## Troubleshooting

### Migration not applying

Check if already recorded:
```sql
SELECT * FROM schema_migrations WHERE version LIKE '20260120%';
```

### Need to re-run a migration

```sql
-- Remove from tracking (use with caution!)
DELETE FROM schema_migrations WHERE version = '20260120_001_game_scores';
```

Then run `npx tsx scripts/setup-db.ts` again.

### Connection issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check PostgreSQL is running
pg_isready -h localhost
```

## See Also

- `.claude/skills/database-migrations/SKILL.md` - Full migration guide
- `.claude/skills/working-with-postgres/SKILL.md` - Query patterns
- `fresh-install/schema.sql` - Complete schema for new databases
