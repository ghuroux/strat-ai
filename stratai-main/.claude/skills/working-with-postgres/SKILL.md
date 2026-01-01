---
name: working-with-postgres
description: PostgreSQL database patterns and postgres.js gotchas for StratAI. Use when writing database queries, creating schemas, or debugging database issues.
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

1. **Column not found?** Check camelCase transformation
2. **JSONB undefined?** Check if it's returned as string
3. **Insert fails silently?** Add RETURNING * to see result
4. **Query returns empty?** Check deleted_at IS NULL filter

## File Reference

- `src/lib/server/persistence/db.ts` - Database connection
- `src/lib/server/persistence/types.ts` - Repository interfaces
- `src/lib/server/persistence/tasks-postgres.ts` - Example repository
- `src/lib/server/persistence/*-schema.sql` - Schema files
