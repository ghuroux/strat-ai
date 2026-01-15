# Database Documentation

This folder contains comprehensive documentation for StratAI's PostgreSQL database layer.

## Quick Links

| Document | Description |
|----------|-------------|
| [POSTGRES_JS_GUIDE.md](./POSTGRES_JS_GUIDE.md) | **Start here!** How postgres.js transforms column names |
| [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md) | Auto-generated TypeScript interfaces for all tables |
| [ENTITY_MODEL.md](./ENTITY_MODEL.md) | Authoritative entity definitions, relationships, access algorithms |
| [RELATIONSHIPS.md](./RELATIONSHIPS.md) | Entity relationships and access control |
| [ACCESS_PATTERNS.md](./ACCESS_PATTERNS.md) | Common query patterns and best practices |
| [MIGRATIONS_HISTORY.md](./MIGRATIONS_HISTORY.md) | Chronological migration log |

## Critical Rule

**Always use camelCase for database column access:**

```typescript
// WRONG - returns undefined!
const userId = row.user_id;

// CORRECT - postgres.js transforms columns to camelCase
const userId = row.userId;
```

## For Coding Agents

Before modifying any `*-postgres.ts` file:

1. Read [POSTGRES_JS_GUIDE.md](./POSTGRES_JS_GUIDE.md) to understand transformation
2. Check [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md) for table structure
3. Run `npm run audit-db-access` to verify your changes

## Validation Commands

```bash
# Check for snake_case violations
npm run audit-db-access

# Regenerate schema docs after migrations
npm run generate-schema-docs

# TypeScript type checking
npm run check
```

## File Structure

```
src/lib/server/persistence/
├── db.ts                    # Database connection with transform config
├── *-postgres.ts            # Repository files (22 total)
├── *-schema.sql             # Schema files
├── types.ts                 # Shared type definitions
└── migrations/              # Migration files (32 total)
    ├── 002-*.sql
    ├── ...
    └── 032-*.sql
```

## Keeping Docs Updated

When creating new migrations, update documentation:

| Change Type | Update Required |
|-------------|-----------------|
| New table | `SCHEMA_REFERENCE.md`, `ENTITY_MODEL.md` Section 12 |
| New columns | `SCHEMA_REFERENCE.md` (re-run generator) |
| New relationships | `ENTITY_MODEL.md`, `RELATIONSHIPS.md` |
| New access patterns | `ACCESS_PATTERNS.md` |
| Migration applied | `MIGRATIONS_HISTORY.md` |

**Regenerate SCHEMA_REFERENCE.md after migrations:**
```bash
npm run generate-schema-docs
```

**Note:** `SCHEMA_REFERENCE.md` header shows generation date. If stale, regenerate before relying on it for TypeScript interfaces.

## Related Documentation

- [DATABASE_STANDARDIZATION_PROJECT.md](../DATABASE_STANDARDIZATION_PROJECT.md) - Standardization project plan
- [AGENTS.md](../../AGENTS.md) - Codebase patterns and gotchas for agents
- [agents/ralph/skills/schema-inspector.md](../../agents/ralph/skills/schema-inspector.md) - Agent skill for schema inspection

