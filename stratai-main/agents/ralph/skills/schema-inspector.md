---
name: schema-inspector
description: "Query database schema docs for runtime shapes. Use when story involves database entities. Triggers on: migration, repository, table, column, entity, schema, database."
---

# Schema Inspector

## Purpose

Transform database schema into runtime-safe TypeScript interfaces. This skill ensures that all database code uses the correct camelCase property names as transformed by postgres.js.

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| **SCHEMA_REFERENCE.md** | `docs/database/SCHEMA_REFERENCE.md` | Auto-generated TypeScript interfaces for all tables. **Use this first** - it has ready-made interfaces! |
| **ENTITY_MODEL.md** | `docs/database/ENTITY_MODEL.md` | Authoritative entity definitions, relationships, access patterns. Section 12 has complete SQL schema. |
| **POSTGRES_JS_GUIDE.md** | `docs/database/POSTGRES_JS_GUIDE.md` | postgres.js patterns, null handling, query examples |
| **ACCESS_PATTERNS.md** | `docs/database/ACCESS_PATTERNS.md` | Common query patterns for each entity |

## When to Use

- Creating a new migration
- Writing a repository file
- Working with any database entities
- Adding columns to existing tables
- Writing queries with joins or aliases

## Process

1. **Extract entity/table names** from story description
2. **Check SCHEMA_REFERENCE.md first** - it has auto-generated TypeScript interfaces!
3. **For relationships/context**, refer to ENTITY_MODEL.md Section 12
4. **Flag nullable columns** that need `??` handling
5. **Identify relationships** and foreign keys

## The postgres.js Transformation Rule

**Database columns use snake_case. Runtime properties use camelCase.**

```
user_id        → userId
display_name   → displayName
created_at     → createdAt
is_restricted  → isRestricted
```

This transformation is automatic and unavoidable. Your TypeScript interfaces MUST match the runtime shape.

## Output Format

When inspecting an entity, produce output in this format:

```markdown
### Entity: [table_name]

**Database → Runtime Mapping:**

| Column (snake_case) | Property (camelCase) | Type | Nullable | Default |
|---------------------|----------------------|------|----------|---------|
| id | id | string (UUID) | NO (PK) | gen_random_uuid() |
| user_id | userId | string (UUID) | NO (FK) | - |
| display_name | displayName | string | YES ⚠️ | NULL |
| is_active | isActive | boolean | NO | true |
| created_at | createdAt | Date | NO | NOW() |

**TypeScript Interface:**

```typescript
interface [TableName]Row {
  id: string;
  userId: string;
  displayName: string | null;  // ⚠️ Nullable - use ??
  isActive: boolean;
  createdAt: Date;
}
```

**Required Null Handling:**

```typescript
// For nullable columns, always use ??
displayName: row.displayName ?? null,
// Or with a default value
displayName: row.displayName ?? 'Unknown',
```

**Relationships:**

- Foreign key to: users(id) ON DELETE CASCADE
- Referenced by: other_table(this_id)

**Common Access Patterns:**

- findById: `WHERE id = $1`
- findByUserId: `WHERE user_id = $1`
- findActive: `WHERE is_active = true`
```

## Example: Inspecting model_configurations

Given a story mentioning "model_configurations table", output:

```markdown
### Entity: model_configurations

**Database → Runtime Mapping:**

| Column (snake_case) | Property (camelCase) | Type | Nullable | Default |
|---------------------|----------------------|------|----------|---------|
| model_id | modelId | string (TEXT) | NO (PK) | - |
| parameter_constraints | parameterConstraints | object (JSONB) | NO | '{}' |
| capabilities_override | capabilitiesOverride | object (JSONB) | NO | '{}' |
| enabled | enabled | boolean | NO | true |
| deprecated | deprecated | boolean | NO | false |
| deprecation_message | deprecationMessage | string | YES ⚠️ | NULL |
| notes | notes | string | YES ⚠️ | NULL |
| created_at | createdAt | Date | NO | NOW() |
| updated_at | updatedAt | Date | NO | NOW() |
| updated_by | updatedBy | string | YES ⚠️ | NULL |

**TypeScript Interface:**

```typescript
interface ModelConfigRow {
  modelId: string;
  parameterConstraints: object;
  capabilitiesOverride: object;
  enabled: boolean;
  deprecated: boolean;
  deprecationMessage: string | null;  // ⚠️ Nullable
  notes: string | null;               // ⚠️ Nullable
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;           // ⚠️ Nullable
}
```

**Required Null Handling:**

```typescript
function rowToModelConfig(row: ModelConfigRow): ModelConfig {
  return {
    modelId: row.modelId,
    parameterConstraints: row.parameterConstraints as ParameterConstraints,
    capabilitiesOverride: row.capabilitiesOverride as CapabilityOverrides,
    enabled: row.enabled,
    deprecated: row.deprecated,
    deprecationMessage: row.deprecationMessage ?? null,
    notes: row.notes ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
```

**Relationships:**

- No foreign keys (standalone configuration table)
- model_id matches keys in model-capabilities.ts

**Common Access Patterns:**

- findByModelId: `WHERE model_id = $1`
- findEnabled: `WHERE enabled = true`
- findAll: `SELECT * FROM model_configurations`
```

## Handling Joins

When queries join multiple tables, ALL columns from ALL tables are transformed:

```typescript
// Query with join
const rows = await sql`
  SELECT
    u.id as user_id,
    u.email as user_email,
    s.id as space_id,
    s.name as space_name
  FROM users u
  JOIN spaces s ON u.id = s.user_id
`;

// Runtime shape (camelCase for aliases too!)
interface JoinRow {
  userId: string;      // NOT user_id
  userEmail: string;   // NOT user_email
  spaceId: string;     // NOT space_id
  spaceName: string;   // NOT space_name
}
```

## Anti-Patterns to Flag

When reviewing code, flag these issues:

```typescript
// ❌ Flag: Snake_case access
row.user_id        // Should be: row.userId

// ❌ Flag: Type uses snake_case
interface Row {
  user_id: string;   // Should be: userId
}

// ❌ Flag: Missing null check on nullable column
row.displayName.toUpperCase()  // Should be: row.displayName?.toUpperCase()

// ❌ Flag: Wrong null handling
row.notes || 'default'  // Should be: row.notes ?? 'default'
```

## Using SCHEMA_REFERENCE.md (Fastest Path)

`SCHEMA_REFERENCE.md` is auto-generated and contains ready-to-use TypeScript interfaces:

```typescript
// Example from SCHEMA_REFERENCE.md - use these directly!
interface UsersRow {
    id: string | null;
    organizationId: string;
    email: string;
    username: string;
    displayName: string | null;  // ⚠️ Nullable
    passwordHash: string | null;
    status: string | null;
    lastLoginAt: Date | null;
    // ... etc
}
```

**Workflow:**
1. Search SCHEMA_REFERENCE.md for your table name
2. Copy the TypeScript interface
3. Check nullable fields (marked with `| null`)
4. Add `??` handling for all nullable fields in your code

## Keeping Schema Docs Updated

When you create a **new migration**:

1. **Run the schema generator** (if available):
   ```bash
   npm run generate-schema-docs
   ```

2. **Or manually update** `SCHEMA_REFERENCE.md`:
   - Add the new table section following the existing format
   - Include SQL column names, JS property names, types, and TypeScript interface

3. **Update ENTITY_MODEL.md** if adding:
   - New entities
   - New relationships between entities
   - New access patterns

4. **Log in AGENTS.md** any new patterns or gotchas discovered

**Note:** SCHEMA_REFERENCE.md header shows when it was last generated. If it's stale, regenerate before relying on it.

## Reference

- **TypeScript interfaces:** `docs/database/SCHEMA_REFERENCE.md` (auto-generated)
- **Entity definitions:** `docs/database/ENTITY_MODEL.md` Section 12
- **postgres.js patterns:** `docs/database/POSTGRES_JS_GUIDE.md`
- **Access patterns:** `docs/database/ACCESS_PATTERNS.md`
- **Standardization rules:** `docs/DATABASE_STANDARDIZATION_PROJECT.md`
- **Codebase patterns:** `AGENTS.md`

