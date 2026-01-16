---
name: working-with-postgres
description: |
  Use when working with ANY database code: repositories (*-postgres.ts), queries, or migrations.
  MANDATORY for: Writing SQL queries, creating/modifying repositories, database schema work.
  READ THIS SKILL before database work - covers critical camelCase transformation pattern.
  Covers: postgres.js patterns, camelCase access, query building, transactions, migrations.
globs:
  - "src/lib/server/persistence/**/*-postgres.ts"
  - "src/lib/server/persistence/migrations/**/*.sql"
---

# Working with PostgreSQL

## CRITICAL: CamelCase Transformation

postgres.js **auto-transforms column names to camelCase**. This is the #1 source of bugs.

```typescript
// Database column: subtask_order
// JavaScript access: subtaskOrder (NOT subtask_order!)

// WRONG - will be undefined
const result = await sql`SELECT MAX(subtask_order) as max_order FROM tasks`;
const maxOrder = result[0]?.max_order; // undefined!

// CORRECT - use camelCase
const result = await sql`SELECT MAX(subtask_order) as max_order FROM tasks`;
const maxOrder = result[0]?.maxOrder; // works!
```

### Common Transformations

| SQL Column | JavaScript Property |
|------------|---------------------|
| `created_at` | `createdAt` |
| `user_id` | `userId` |
| `space_id` | `spaceId` |
| `parent_task_id` | `parentTaskId` |
| `subtask_order` | `subtaskOrder` |
| `due_date_type` | `dueDateType` |
| `max_order` (alias) | `maxOrder` |
| `total_count` (alias) | `totalCount` |

## Database Connection

```typescript
// src/lib/server/persistence/db.ts
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';

export const sql = postgres(DATABASE_URL);
```

## Repository Pattern

Each entity has a repository interface and PostgreSQL implementation:

```typescript
// src/lib/server/persistence/types.ts
export interface ItemRepository {
    findAll(userId: string, filter?: ItemFilter): Promise<Item[]>;
    findById(id: string, userId: string): Promise<Item | null>;
    create(input: CreateItemInput, userId: string): Promise<Item>;
    update(id: string, input: UpdateItemInput, userId: string): Promise<Item | null>;
    delete(id: string, userId: string): Promise<boolean>;
}
```

```typescript
// src/lib/server/persistence/items-postgres.ts
import type { ItemRepository } from './types';
import { sql } from './db';

export const postgresItemRepository: ItemRepository = {
    async findAll(userId, filter) {
        // Implementation
    },
    // ... other methods
};
```

## Transactions

Use transactions when multiple operations must succeed or fail together (data integrity).

```typescript
// Pattern: sql.begin(async (tx) => { ... })
await sql.begin(async (tx) => {
    // Use tx instead of sql for all operations
    
    // Insert main record
    const [battle] = await tx<BattleRow[]>`
        INSERT INTO battles (id, prompt, user_id)
        VALUES (${id}, ${prompt}, ${userId})
        RETURNING *
    `;
    
    // Insert related records
    for (const model of models) {
        await tx`
            INSERT INTO battle_models (battle_id, model_id)
            VALUES (${battle.id}, ${model.id})
        `;
    }
    
    // If any operation fails, entire transaction rolls back automatically
});
```

**When to use transactions:**
- Creating parent + child records (battle + models, space + general area)
- Updating multiple related tables
- Operations that must maintain referential integrity
- Complex business logic that spans multiple tables

**Error handling:**
```typescript
try {
    await sql.begin(async (tx) => {
        // Operations here
    });
} catch (error) {
    // Transaction rolled back automatically
    console.error('Transaction failed:', error);
    throw error; // Re-throw for API to return 500
}
```

**See**: `arena-postgres.ts` → `create()`, `recordBattleResult()`

## Query Patterns

### Basic SELECT

```typescript
// Simple query
const items = await sql<ItemRow[]>`
    SELECT * FROM items
    WHERE user_id = ${userId}
    AND deleted_at IS NULL
`;

// With ORDER BY
const items = await sql<ItemRow[]>`
    SELECT * FROM items
    WHERE user_id = ${userId}
    AND deleted_at IS NULL
    ORDER BY created_at DESC
`;
```

### Parameterized WHERE

```typescript
// Safe parameterization (prevents SQL injection)
const item = await sql<ItemRow[]>`
    SELECT * FROM items
    WHERE id = ${id}
    AND user_id = ${userId}
`;

// Array parameters with ANY
const statuses = ['active', 'pending'];
const items = await sql<ItemRow[]>`
    SELECT * FROM items
    WHERE status = ANY(${statuses})
`;
```

### JOINs and Related Data

Fetch related data in a single query instead of N+1 queries.

```typescript
// LEFT JOIN with conditional column selection
const spaces = await sql<SpaceRow[]>`
    SELECT
        s.*,
        -- Only fetch owner info for spaces user doesn't own
        CASE WHEN s.user_id != ${userId}::uuid
             THEN owner_user.first_name
        END as owner_first_name,
        CASE WHEN s.user_id != ${userId}::uuid
             THEN owner_user.display_name
        END as owner_display_name
    FROM spaces s
    LEFT JOIN users owner_user ON s.user_id = owner_user.id
    WHERE s.deleted_at IS NULL
`;
```

**INNER JOIN** - Only rows with matching records:
```typescript
// Get areas with their space names
const areas = await sql<AreaWithSpaceRow[]>`
    SELECT a.*, s.name as space_name
    FROM areas a
    INNER JOIN spaces s ON a.space_id = s.id
    WHERE a.user_id = ${userId}
`;
```

**Multiple JOINs**:
```typescript
// Get tasks with area and space info
const tasks = await sql<TaskDetailRow[]>`
    SELECT
        t.*,
        a.name as area_name,
        s.name as space_name
    FROM tasks t
    LEFT JOIN areas a ON t.area_id = a.id
    LEFT JOIN spaces s ON t.space_id = s.id
    WHERE t.user_id = ${userId}
`;
```

**See**: `spaces-postgres.ts` → `findAllAccessible()`, `usage-postgres.ts`

### CTEs (WITH clauses)

Use CTEs for complex access control queries or reusable subqueries.

```typescript
// Pattern: CTE with UNIONs for multiple access paths
const areas = await sql<AreaRow[]>`
    WITH accessible_ids AS (
        -- Path 1: User owns the space
        SELECT a.id
        FROM areas a
        JOIN spaces s ON a.space_id = s.id
        WHERE s.user_id = ${userId}
        
        UNION
        
        -- Path 2: User has explicit area membership
        SELECT am.area_id as id
        FROM area_memberships am
        WHERE am.user_id = ${userId}
        
        UNION
        
        -- Path 3: General areas in member spaces
        SELECT a.id
        FROM areas a
        JOIN spaces s ON a.space_id = s.id
        JOIN space_memberships sm ON s.id = sm.space_id
        WHERE a.is_general = true
          AND sm.user_id = ${userId}
    )
    SELECT a.*
    FROM areas a
    WHERE a.id IN (SELECT id FROM accessible_ids)
      AND a.deleted_at IS NULL
    ORDER BY a.created_at DESC
`;
```

**When to use CTEs:**
- Complex access control (multiple permission paths)
- Reusable subqueries referenced multiple times
- Improving query readability for complex logic
- Avoiding N+1 queries for hierarchical data

**Performance note:** CTEs are materialized once, then reused. More efficient than subqueries when result is used multiple times.

**See**: `areas-postgres.ts` → `findAllAccessible()`, `space-memberships-postgres.ts`, `AGENTS.md`

### INSERT with RETURNING

```typescript
const [item] = await sql<ItemRow[]>`
    INSERT INTO items (
        id, user_id, space_id, title, status, priority,
        created_at, updated_at
    ) VALUES (
        ${id}, ${userId}, ${spaceId}, ${title}, 'active', ${priority},
        NOW(), NOW()
    )
    RETURNING *
`;
```

### UPDATE with RETURNING

```typescript
const [item] = await sql<ItemRow[]>`
    UPDATE items SET
        title = ${title},
        priority = ${priority},
        updated_at = NOW()
    WHERE id = ${id}
    AND user_id = ${userId}
    AND deleted_at IS NULL
    RETURNING *
`;

// item will be undefined if no rows matched
if (!item) {
    return null; // Not found
}
```

### UPSERT (ON CONFLICT)

Insert or update if record already exists (idempotent operations).

```typescript
// Insert new record or update if exists
await sql`
    INSERT INTO conversations (
        id, title, messages, user_id, created_at, updated_at
    ) VALUES (
        ${id}, ${title}, ${sql.json(messages)}, ${userId}, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        messages = EXCLUDED.messages,
        updated_at = EXCLUDED.updated_at,
        deleted_at = NULL  -- Restore if soft-deleted
`;
```

**ON CONFLICT DO NOTHING** - Ignore duplicates:
```typescript
// Ensure model ranking exists (don't fail if already there)
await sql`
    INSERT INTO model_rankings (user_id, model_id, elo_rating)
    VALUES (${userId}, ${modelId}, 1500)
    ON CONFLICT (user_id, model_id) DO NOTHING
`;
```

**Conditional UPDATE** - Only update certain fields:
```typescript
await sql`
    INSERT INTO settings (user_id, key, value)
    VALUES (${userId}, ${key}, ${value})
    ON CONFLICT (user_id, key) DO UPDATE SET
        value = EXCLUDED.value
    WHERE settings.value != EXCLUDED.value  -- Only if changed
`;
```

**When to use UPSERT:**
- Idempotent API endpoints (safe to retry)
- Sync operations (restore soft-deleted records)
- Ensuring records exist before operations
- Upserting cached/derived data

**See**: `postgres.ts` → `create()` (conversations), `arena-postgres.ts` → `recordBattleResult()`

### Soft DELETE

```typescript
const result = await sql`
    UPDATE items SET
        deleted_at = NOW()
    WHERE id = ${id}
    AND user_id = ${userId}
    AND deleted_at IS NULL
`;

return result.count > 0;
```

### Aggregates

```typescript
// Remember: alias becomes camelCase!
const [{ totalCount }] = await sql<[{ totalCount: number }]>`
    SELECT COUNT(*)::int as total_count
    FROM items
    WHERE user_id = ${userId}
    AND deleted_at IS NULL
`;

// MAX with camelCase
const [{ maxOrder }] = await sql<[{ maxOrder: number | null }]>`
    SELECT MAX(subtask_order) as max_order
    FROM items
    WHERE parent_id = ${parentId}
`;
const nextOrder = (maxOrder ?? 0) + 1;
```

## JSONB Handling

### Reading JSONB

postgres.js may return JSONB as string or object. Always handle both:

```typescript
function parseJsonb<T>(value: unknown): T | undefined {
    if (value === null || value === undefined) return undefined;

    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as T;
        } catch {
            return undefined;
        }
    }

    return value as T;
}

// In row conversion
function rowToItem(row: ItemRow): Item {
    return {
        ...row,
        metadata: parseJsonb<ItemMetadata>(row.metadata),
        tags: parseJsonb<string[]>(row.tags) ?? []
    };
}
```

### Writing JSONB

Do NOT use JSON.stringify - postgres.js handles it:

```typescript
// CORRECT - postgres.js serializes automatically
await sql`
    INSERT INTO items (id, metadata)
    VALUES (${id}, ${metadata}::jsonb)
`;

// WRONG - causes double-encoding
await sql`
    INSERT INTO items (id, metadata)
    VALUES (${id}, ${JSON.stringify(metadata)}::jsonb)
`;
// Result: "{\"key\":\"value\"}" instead of {"key":"value"}
```

## Schema Migration

Create schema files in `src/lib/server/persistence/`:

```sql
-- src/lib/server/persistence/items-schema.sql
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    priority TEXT NOT NULL DEFAULT 'normal',

    -- JSONB columns
    metadata JSONB,
    tags JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_user_space
    ON items(user_id, space_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_status
    ON items(status)
    WHERE deleted_at IS NULL;
```

## TypeScript Row Types

Define types matching camelCase transformation:

```typescript
// src/lib/types/items.ts
export interface ItemRow {
    id: string;
    userId: string;           // user_id
    spaceId: string;          // space_id
    title: string;
    status: string;
    priority: string;
    metadata: ItemMetadata | null;  // JSONB
    tags: string[];                 // JSONB
    createdAt: Date;          // created_at
    updatedAt: Date;          // updated_at
    deletedAt: Date | null;   // deleted_at
}
```

## Debugging Tips

1. **Column not found?** Check camelCase transformation (most common issue)
2. **JSONB undefined?** Check if it's returned as string, use parseJsonb helper
3. **Insert fails silently?** Add RETURNING * to see result
4. **Query returns empty?** Check deleted_at IS NULL filter
5. **Transaction fails mysteriously?** Check all operations use `tx` not `sql`
6. **CTE returns wrong rows?** Verify UNION includes all access paths
7. **JOIN missing rows?** Use LEFT JOIN instead of INNER JOIN
8. **UPSERT not updating?** Check ON CONFLICT constraint name matches unique constraint

## Common Patterns Reference

| Pattern | When to Use | Example File |
|---------|-------------|--------------|
| Basic CRUD | Simple operations | `tasks-postgres.ts` |
| Transactions | Multi-step integrity | `arena-postgres.ts` |
| CTEs | Complex access control | `areas-postgres.ts` |
| JOINs | Related data fetching | `spaces-postgres.ts` |
| UPSERT | Idempotent operations | `postgres.ts` (conversations) |
| JSONB operations | Flexible schema | `postgres.ts` (messages) |
| Soft deletes | Recoverable deletion | All repositories |

## File Reference

- `src/lib/server/persistence/db.ts` - Database connection
- `src/lib/server/persistence/types.ts` - Repository interfaces
- `src/lib/server/persistence/tasks-postgres.ts` - Example repository
- `src/lib/server/persistence/*-schema.sql` - Schema files
