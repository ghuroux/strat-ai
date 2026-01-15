# Migration History

> Chronological list of database migrations with descriptions.

---

## Migration Index

| # | File | Date | Description |
|---|------|------|-------------|
| 002 | `002-space-id-migration.sql` | Jan 2 | Add space_id to tables for multi-space support |
| 003 | `003-planning-status.sql` | Jan 2 | Add planning status to tasks |
| 004 | `004-areas-general.sql` | Jan 2 | Create areas table with General area support |
| 005 | `005-areas-rename-migrate.sql` | Jan 2 | Rename focus_areas to areas, migrate data |
| 006 | `006-tasks-area-rename.sql` | Jan 2 | Update tasks to reference areas |
| 007 | `007-tasks-description.sql` | Jan 6 | Add description column to tasks |
| 008 | `008-task-stale-dismissed.sql` | Jan 6 | Add stale/dismissed status to tasks |
| 009 | `009-normalize-space-ids.sql` | Jan 7 | Normalize space ID format |
| 010 | `010-tasks-estimated-effort.sql` | Jan 7 | Add estimated_effort to tasks |
| 011 | `011-documents-space-id-normalize.sql` | Jan 7 | Normalize document space IDs |
| 012 | `012-fix-subtask-planning-status.sql` | Jan 8 | Fix subtask planning status inheritance |
| 013 | `013-task-approach-chosen.sql` | Jan 8 | Add approach_chosen to tasks |
| 014 | `014-conversation-last-viewed.sql` | Jan 8 | Add last_viewed_at to conversations |
| 015 | `015-foundation-tables.sql` | Jan 9 | Create organizations, users foundation |
| 016 | `016-user-id-uuid-migration.sql` | Jan 9 | Migrate user IDs from TEXT to UUID |
| 017 | `017-llm-usage.sql` | Jan 9 | Create llm_usage tracking table |
| 018 | `018-system-prompts.sql` | Jan 12 | Add system prompts support |
| 019 | `019-groups.sql` | Jan 12 | Create groups and group_memberships |
| 020 | `020-org-budget-tiers.sql` | Jan 12 | Add organization budgets and tiers |
| 021 | `021-model-tier-assignments.sql` | Jan 12 | Link models to tiers |
| 022 | `022-user-preferences.sql` | Jan 12 | Add user preferences column |
| 023a | `023-pages-system.sql` | Jan 12 | Create pages and page_versions tables |
| 023b | `023-routing-decisions.sql` | Jan 12 | Create routing_decisions table |
| 024 | `024-document-sharing.sql` | Jan 12 | Add document area-level sharing |
| 025 | `025-task-source-document.sql` | Jan 12 | Link tasks to source documents |
| 026 | `026-fix-general-areas.sql` | Jan 12 | Fix General area creation and handling |
| 027 | `027-area-sharing.sql` | Jan 13 | Create area_memberships table |
| 028 | `028-email-system.sql` | Jan 13 | Create email_logs table |
| 029 | `029-page-sharing-audit.sql` | Jan 13 | Add page sharing with audit support |
| 030 | `030-user-first-last-name.sql` | Jan 14 | Add first_name, last_name to users |
| 031 | `031-space-memberships.sql` | Jan 13 | Create space_memberships table |
| 032 | `032-backfill-org-spaces.sql` | Jan 13 | Backfill organization for existing spaces |

---

## Detailed Descriptions

### 002: Space ID Migration
- Added `space_id` column to tasks, documents, conversations
- Supports multi-space organization

### 003: Planning Status
- Added `planning_status` enum to tasks
- Values: 'pending', 'planning', 'approved', 'rejected'

### 004-005: Areas System
- Created `areas` table (renamed from focus_areas)
- Each space gets a "General" area by default
- Areas contain tasks and conversations

### 006-010: Task Enhancements
- Added task descriptions, estimated effort
- Normalized space ID references
- Fixed subtask inheritance

### 014: Conversation Tracking
- Added `last_viewed_at` for unread indicators

### 015-016: Foundation (Multi-tenancy)
- Created `organizations` table
- Created `users` table with UUID primary keys
- Migrated from TEXT user IDs to UUID

### 017: LLM Usage Tracking
- Created `llm_usage` table
- Tracks tokens, costs per request

### 019: Groups System
- Created `groups` table
- Created `group_memberships` table
- Groups can be assigned to spaces/areas

### 023: Pages System
- Created `pages` table for rich-text documents
- Created `page_versions` for history
- Created `page_conversations` for discussions

### 024: Document Sharing
- Added `visibility` column to documents
- Created `document_area_shares` table
- Granular area-level document sharing

### 027-029: Sharing Infrastructure
- Created `area_memberships` for area-level access
- Created `page_user_shares` and `page_group_shares`
- Added audit trail support

### 030: User Names
- Added `first_name`, `last_name` columns to users
- Used for display name fallback

### 031-032: Space Memberships
- Created `space_memberships` table
- Backfilled organization_id for existing spaces
- Supports multi-tenant space sharing

---

## Running Migrations

Migrations are run automatically by `setup-db.ts`:

```bash
npm run db:migrate
```

To run manually:

```bash
npx tsx scripts/setup-db.ts
```

---

## Adding New Migrations

1. Create file: `src/lib/server/persistence/migrations/XXX-description.sql`
2. Use next available number
3. Include both UP and DOWN if possible
4. Run `npm run generate-schema-docs` after adding

### Migration Template

```sql
-- Migration XXX: Description
-- Date: YYYY-MM-DD

-- UP
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);

-- DOWN (optional, for rollback reference)
-- ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;
-- DROP INDEX IF EXISTS idx_name;
```

---

## See Also

- [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md) - Current schema
- [RELATIONSHIPS.md](./RELATIONSHIPS.md) - Entity relationships

