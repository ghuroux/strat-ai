---
name: pattern-library
description: "Reference patterns from DATABASE_STANDARDIZATION_PROJECT.md. Use when writing database code. Triggers on: repository, query, insert, update, delete, postgres, migration, sql."
---

# Pattern Library

## Purpose

Provide correct code templates for database operations. All patterns follow the postgres.js camelCase transformation rule and StratAI conventions.

## When to Use

- Creating a new repository file
- Writing database queries
- Creating migrations
- Implementing CRUD operations

---

## Migration Template

```sql
-- Migration: NNN-description.sql
-- Description: Brief description of what this migration does

-- Create table
CREATE TABLE IF NOT EXISTS table_name (
    -- Primary key (UUID)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    
    -- Required fields
    name TEXT NOT NULL,
    
    -- Optional fields (nullable)
    description TEXT,
    
    -- Boolean flags
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- JSONB for flexible data
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_table_user ON table_name(user_id);
CREATE INDEX IF NOT EXISTS idx_table_space ON table_name(space_id);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_unique_name 
    ON table_name(space_id, name);

-- Comments for documentation
COMMENT ON TABLE table_name IS 'Brief description of table purpose';
COMMENT ON COLUMN table_name.metadata IS 'Flexible JSON storage for extra data';
```

---

## Repository Template

```typescript
/**
 * Entity PostgreSQL Repository
 * 
 * @see DATABASE_STANDARDIZATION_PROJECT.md for patterns
 * @see AGENTS.md for codebase conventions
 */

import { sql } from './db';
import type { Entity, CreateEntityInput, UpdateEntityInput } from '$lib/types/entity';

/**
 * Row interface - MUST use camelCase (postgres.js transforms snake_case)
 * 
 * IMPORTANT: These property names match what postgres.js returns at runtime,
 * NOT the database column names.
 */
interface EntityRow {
  id: string;
  userId: string;           // Database: user_id
  spaceId: string;          // Database: space_id
  name: string;
  description: string | null;  // Nullable column - use ??
  isActive: boolean;
  metadata: object;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert database row to domain entity
 * 
 * Always use ?? for nullable columns to handle null explicitly.
 * Never use || as it treats empty string as falsy.
 */
function rowToEntity(row: EntityRow): Entity {
  return {
    id: row.id,
    userId: row.userId,
    spaceId: row.spaceId,
    name: row.name,
    description: row.description ?? null,  // ✅ Correct null handling
    isActive: row.isActive,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export const postgresEntityRepository = {
  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Entity | null> {
    const rows = await sql<EntityRow[]>`
      SELECT * FROM entities WHERE id = ${id}
    `;
    return rows.length > 0 ? rowToEntity(rows[0]) : null;
  },

  /**
   * Find all entities for a user
   */
  async findByUserId(userId: string): Promise<Entity[]> {
    const rows = await sql<EntityRow[]>`
      SELECT * FROM entities 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return rows.map(rowToEntity);
  },

  /**
   * Find all entities in a space
   */
  async findBySpaceId(spaceId: string): Promise<Entity[]> {
    const rows = await sql<EntityRow[]>`
      SELECT * FROM entities 
      WHERE space_id = ${spaceId}
      ORDER BY name ASC
    `;
    return rows.map(rowToEntity);
  },

  /**
   * Create new entity
   */
  async create(input: CreateEntityInput): Promise<Entity> {
    const [row] = await sql<EntityRow[]>`
      INSERT INTO entities (
        user_id, 
        space_id, 
        name, 
        description,
        is_active,
        metadata
      )
      VALUES (
        ${input.userId},
        ${input.spaceId},
        ${input.name},
        ${input.description ?? null},
        ${input.isActive ?? true},
        ${JSON.stringify(input.metadata ?? {})}
      )
      RETURNING *
    `;
    return rowToEntity(row);
  },

  /**
   * Update existing entity
   */
  async update(id: string, updates: UpdateEntityInput): Promise<Entity | null> {
    // Build dynamic update - only update provided fields
    const [row] = await sql<EntityRow[]>`
      UPDATE entities
      SET
        name = COALESCE(${updates.name ?? null}, name),
        description = COALESCE(${updates.description}, description),
        is_active = COALESCE(${updates.isActive ?? null}, is_active),
        metadata = COALESCE(${updates.metadata ? JSON.stringify(updates.metadata) : null}::jsonb, metadata),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? rowToEntity(row) : null;
  },

  /**
   * Delete entity
   */
  async delete(id: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM entities WHERE id = ${id}
    `;
    return result.count > 0;
  },

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const [row] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM entities WHERE id = ${id})
    `;
    return row.exists;
  }
};
```

---

## Join Query Pattern

```typescript
/**
 * Query with join - ALL columns are camelCase in result
 */
interface EntityWithUserRow {
  // Entity columns
  id: string;
  name: string;
  
  // Joined user columns (aliased)
  userId: string;       // from: u.id as user_id
  userEmail: string;    // from: u.email as user_email  
  userDisplayName: string;  // from: COALESCE(...) as user_display_name
}

async function findWithUser(entityId: string): Promise<EntityWithUser | null> {
  const rows = await sql<EntityWithUserRow[]>`
    SELECT
      e.id,
      e.name,
      u.id as user_id,
      u.email as user_email,
      COALESCE(
        u.display_name, 
        CONCAT_WS(' ', u.first_name, u.last_name)
      ) as user_display_name
    FROM entities e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = ${entityId}
  `;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    user: {
      id: row.userId,
      email: row.userEmail,
      displayName: row.userDisplayName
    }
  };
}
```

---

## Access Control Pattern

```typescript
/**
 * Check if user can access entity
 * 
 * Access hierarchy: Owner > Direct Member > Group Member > Space Member (if not restricted)
 */
async function canAccess(userId: string, entityId: string): Promise<boolean> {
  const [result] = await sql<{ canAccess: boolean }[]>`
    SELECT EXISTS(
      SELECT 1 FROM entities e
      WHERE e.id = ${entityId}
      AND (
        -- Owner
        e.user_id = ${userId}
        
        -- Direct member
        OR EXISTS (
          SELECT 1 FROM entity_memberships em
          WHERE em.entity_id = e.id
          AND em.user_id = ${userId}
        )
        
        -- Group member
        OR EXISTS (
          SELECT 1 FROM entity_memberships em
          JOIN group_memberships gm ON em.group_id = gm.group_id
          WHERE em.entity_id = e.id
          AND gm.user_id = ${userId}
        )
      )
    ) as can_access
  `;
  return result.canAccess;
}
```

---

## API Endpoint Pattern

```typescript
// src/routes/api/entities/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresEntityRepository } from '$lib/server/persistence';

export const GET: RequestHandler = async ({ params, locals }) => {
  // 1. Auth check
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch resource
  const entity = await postgresEntityRepository.findById(params.id);
  
  // 3. Not found check
  if (!entity) {
    return json({ error: 'Entity not found' }, { status: 404 });
  }

  // 4. Permission check
  const canAccess = await postgresEntityRepository.canAccess(
    locals.user.id, 
    params.id
  );
  if (!canAccess) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // 5. Return data
  return json(entity);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = await request.json();
  
  const entity = await postgresEntityRepository.update(params.id, updates);
  if (!entity) {
    return json({ error: 'Entity not found' }, { status: 404 });
  }

  return json(entity);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await postgresEntityRepository.delete(params.id);
  if (!deleted) {
    return json({ error: 'Entity not found' }, { status: 404 });
  }

  return json({ success: true });
};
```

---

## Anti-Patterns (NEVER DO)

```typescript
// ❌ Snake_case access - returns undefined!
const id = row.user_id;
const name = row.display_name;

// ❌ Wrong null handling - empty string becomes 'default'
const desc = row.description || 'default';

// ❌ Type mismatch - compiles but fails at runtime
interface Row { 
  user_id: string;
  display_name: string | null;
}

// ❌ Missing null check on nullable column
const upper = row.displayName.toUpperCase();  // Error if null!

// ❌ Forgetting alias transformation
const rows = await sql`SELECT user_id as owner_id FROM users`;
console.log(rows[0].owner_id);  // undefined! Should be: rows[0].ownerId
```

---

## Correct Patterns (ALWAYS DO)

```typescript
// ✅ CamelCase access
const id = row.userId;
const name = row.displayName;

// ✅ Correct null handling with ??
const desc = row.description ?? 'default';

// ✅ Type matches runtime
interface Row { 
  userId: string;
  displayName: string | null;
}

// ✅ Safe null check
const upper = row.displayName?.toUpperCase() ?? 'UNKNOWN';

// ✅ Correct alias transformation
const rows = await sql`SELECT user_id as owner_id FROM users`;
console.log(rows[0].ownerId);  // Works!
```

---

## Reference

- **TypeScript interfaces:** `docs/database/SCHEMA_REFERENCE.md`
- **Entity model:** `docs/database/ENTITY_MODEL.md`
- **Full patterns:** `docs/DATABASE_STANDARDIZATION_PROJECT.md`
- **Codebase conventions:** `AGENTS.md`

