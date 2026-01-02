# PostgreSQL Patterns (postgres.js)

This project uses `postgres.js` for database access. It has important behavioral quirks.

## Critical: CamelCase Transformation

postgres.js **automatically transforms** column names from snake_case to camelCase.

```typescript
// Query with snake_case column alias
const result = await sql<TaskRow[]>`
    SELECT
        id,
        task_title,
        MAX(subtask_order) as max_order
    FROM tasks
    WHERE parent_id = ${parentId}
`;

// Result: column names are camelCase!
const maxOrder = result[0]?.maxOrder;   // CORRECT
const maxOrder = result[0]?.max_order;  // WRONG - undefined!
```

### Common Mistakes

```typescript
// WRONG - column alias doesn't match access
const result = await sql`SELECT COUNT(*) as total_count...`;
console.log(result[0].total_count); // undefined!
console.log(result[0].totalCount);  // CORRECT

// WRONG - assuming raw column names
const row = await sql`SELECT created_at FROM tasks...`;
console.log(row.created_at);  // undefined!
console.log(row.createdAt);   // CORRECT
```

## JSONB Handling

postgres.js may return JSONB columns as either string or object. **Always check type**:

```typescript
function parseJsonb<T>(value: unknown): T | undefined {
    if (value === null || value === undefined) return undefined;

    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as T;
        } catch {
            console.error('Failed to parse JSONB string');
            return undefined;
        }
    }

    return value as T;
}

// Usage in row conversion
function dbRowToTask(row: TaskRow): Task {
    return {
        ...row,
        planningData: parseJsonb<PlanningData>(row.planningData),
        linkedConversationIds: parseJsonb<string[]>(row.linkedConversationIds) ?? []
    };
}
```

## JSONB Insertion

Do **NOT** use `JSON.stringify()` before `::jsonb` cast - postgres.js handles it:

```typescript
// CORRECT - postgres.js handles serialization
await sql`
    INSERT INTO conversations (id, messages, metadata)
    VALUES (${id}, ${messages}::jsonb, ${metadata}::jsonb)
`;

// WRONG - causes double-encoding
await sql`
    INSERT INTO conversations (id, messages)
    VALUES (${id}, ${JSON.stringify(messages)}::jsonb)
`;
// Results in: "[{\"role\":\"user\"...}]" instead of [{role: "user"...}]
```

## Repository Pattern

Each entity has a repository in `src/lib/server/persistence/`:

```typescript
// src/lib/server/persistence/types.ts
export interface TaskRepository {
    findAll(userId: string, filter?: TaskListFilter): Promise<Task[]>;
    findById(id: string, userId: string): Promise<Task | null>;
    create(input: CreateTaskInput, userId: string): Promise<Task>;
    update(id: string, input: UpdateTaskInput, userId: string): Promise<Task | null>;
    delete(id: string, userId: string): Promise<boolean>;
}

// src/lib/server/persistence/tasks-postgres.ts
export const postgresTaskRepository: TaskRepository = {
    async findAll(userId, filter) {
        // Implementation with proper camelCase handling
    }
};
```

## Row Type Definitions

Define types matching camelCase transformation:

```typescript
// src/lib/types/tasks.ts
export interface TaskRow {
    id: string;
    title: string;
    status: string;
    priority: string;
    // Note: camelCase even though DB column is snake_case
    parentTaskId: string | null;      // parent_task_id in DB
    subtaskOrder: number | null;      // subtask_order in DB
    areaId: string | null;            // area_id in DB
    sourceType: string;               // source_type in DB
    sourceConversationId: string | null;
    linkedConversationIds: string[];  // JSONB
    planningData: PlanningData | null; // JSONB
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
```

## Query Patterns

### Parameterized Queries (Safe)

```typescript
// CORRECT - parameterized (prevents SQL injection)
const tasks = await sql<TaskRow[]>`
    SELECT * FROM tasks
    WHERE user_id = ${userId}
    AND space_id = ${spaceId}
    AND deleted_at IS NULL
`;

// WRONG - string interpolation (SQL injection risk!)
const tasks = await sql`
    SELECT * FROM tasks WHERE user_id = '${userId}'
`;
```

### Dynamic WHERE Clauses

```typescript
async function findTasks(userId: string, filter?: TaskFilter): Promise<Task[]> {
    // Build query based on filter presence
    if (filter?.spaceId && filter?.status) {
        return await sql<TaskRow[]>`
            SELECT * FROM tasks
            WHERE user_id = ${userId}
            AND space_id = ${filter.spaceId}
            AND status = ANY(${filter.status})
            AND deleted_at IS NULL
        `;
    }

    if (filter?.spaceId) {
        return await sql<TaskRow[]>`
            SELECT * FROM tasks
            WHERE user_id = ${userId}
            AND space_id = ${filter.spaceId}
            AND deleted_at IS NULL
        `;
    }

    return await sql<TaskRow[]>`
        SELECT * FROM tasks
        WHERE user_id = ${userId}
        AND deleted_at IS NULL
    `;
}
```

### Soft Deletes

```typescript
// All entities use soft delete via deleted_at column
await sql`
    UPDATE tasks
    SET deleted_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
`;

// Always filter out deleted records
const tasks = await sql`
    SELECT * FROM tasks
    WHERE user_id = ${userId}
    AND deleted_at IS NULL
`;
```

## Schema Migration Pattern

Create schema files in `src/lib/server/persistence/`:

```sql
-- src/lib/server/persistence/tasks-schema.sql
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    priority TEXT NOT NULL DEFAULT 'normal',
    parent_task_id TEXT REFERENCES tasks(id),
    subtask_order INTEGER,
    -- JSONB columns
    linked_conversation_ids JSONB DEFAULT '[]',
    planning_data JSONB,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_space
    ON tasks(user_id, space_id)
    WHERE deleted_at IS NULL;
```

## File Reference

- `src/lib/server/persistence/db.ts` - Database connection
- `src/lib/server/persistence/types.ts` - Repository interfaces
- `src/lib/server/persistence/tasks-postgres.ts` - Task repository example
- `src/lib/server/persistence/*-schema.sql` - Schema definitions
