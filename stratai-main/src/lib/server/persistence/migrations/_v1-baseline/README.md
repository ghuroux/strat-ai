# V1 Baseline Migrations Archive

This directory contains **archived migrations** from StratAI v1.0 development (migrations 002-040).

## Purpose

These 39 migrations represent the complete database evolution from initial schema through the v1.0 release. They are preserved here for:

1. **Historical reference** - Understanding how the schema evolved
2. **Audit trail** - Compliance and debugging needs
3. **Fresh installs** - These migrations are NOT run on fresh installs (use `fresh-install/schema.sql` instead)
4. **Existing databases** - Already applied via `schema_migrations` tracking

## What's Here

| Range | Description |
|-------|-------------|
| 002-011 | Space/Area system foundation |
| 012-014 | Task system enhancements |
| 015-017 | Foundation tables, UUID migration, LLM usage |
| 018-022 | System prompts, groups, budgets, preferences |
| 023-029 | Pages system, document sharing, email |
| 030-040 | Space memberships, pinning, welcome tokens |

## V2 Migration System

New migrations use a different naming convention and live in the parent `migrations/` directory:

```
Format: YYYYMMDD_NNN_description.sql
Example: 20260120_001_game_scores.sql
```

See `.claude/skills/database-migrations/SKILL.md` for the new migration workflow.

## DO NOT

- **Do not modify** these archived migrations
- **Do not add** new migrations to this directory
- **Do not delete** - they document schema history

## Migration Runner Behavior

The migration runner (`scripts/setup-db.ts`) ignores this `_v1-baseline/` directory.
Only migrations in the parent `migrations/` directory are processed.
