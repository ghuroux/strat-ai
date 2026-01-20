# postgres.js Guide for StratAI

## How Column Name Transformation Works

postgres.js is configured in `src/lib/server/persistence/db.ts` to automatically transform column names:

```typescript
export const sql = postgres(DATABASE_URL, {
    transform: {
        column: {
            to: postgres.fromCamel,  // JS camelCase → DB snake_case (INSERT/UPDATE)
            from: postgres.toCamel   // DB snake_case → JS camelCase (SELECT)
        }
    }
});
```

This means:

| Direction | From | To | Example |
|-----------|------|-----|---------|
| **SELECT results** | `user_id` | `userId` | Query returns camelCase |
| **INSERT/UPDATE values** | `userId` | `user_id` | Values converted to snake_case |

## Basic Example

```typescript
// Database column: user_id
// Runtime access: row.userId

const rows = await sql<UserRow[]>`SELECT user_id FROM users`;
console.log(rows[0].user_id);  // ❌ undefined
console.log(rows[0].userId);   // ✅ works
```

## Query Alias Transformation

Aliases are ALSO transformed:

```typescript
const rows = await sql`SELECT user_id AS owner_id FROM users`;
console.log(rows[0].owner_id);  // ❌ undefined
console.log(rows[0].ownerId);   // ✅ works
```

## Join Column Transformation

ALL columns in SELECT are transformed:

```typescript
const rows = await sql`
    SELECT
        u.id as user_id,
        s.name as space_name
    FROM users u
    JOIN spaces s ON u.id = s.user_id
`;
// Runtime shape: { userId, spaceName }
```

---

## Standard Patterns

### Pattern 1: Type-Safe Row Access

```typescript
// Define row interface matching runtime shape (camelCase)
interface UserRow {
    id: string;
    email: string;
    displayName: string | null;  // Nullable columns = | null
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
}

// Use typed query
const rows = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${id}`;
const user = rows[0];  // TypeScript knows shape
```

### Pattern 2: Nullable Column Handling

```typescript
// Database: display_name TEXT NULL
// Always provide fallback for nullable columns

const displayName = row.displayName ?? 'Unknown User';

// Or use COALESCE in query
const rows = await sql`
    SELECT COALESCE(display_name, 'Unknown') as display_name
    FROM users
`;
```

### Pattern 3: Name Fallback Pattern

```typescript
// Common pattern: display_name fallback to first_name + last_name
const rows = await sql`
    SELECT
        id,
        email,
        COALESCE(
            display_name,
            CONCAT_WS(' ', first_name, last_name)
        ) as display_name
    FROM users
`;
// Runtime: row.displayName (never null if first/last exist)
```

### Pattern 4: Row Converter Functions

```typescript
// Always use converter function for consistency
export function rowToUser(row: UserRow): User {
    return {
        id: row.id,
        email: row.email,
        displayName: row.displayName ?? null,
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
```

### Pattern 5: Join with Typed Result

```typescript
// Define interface for join result
interface MemberWithUser {
    id: string;
    spaceId: string;
    userId: string;
    role: string;
    userEmail: string;
    userDisplayName: string | null;
}

const rows = await sql<MemberWithUser[]>`
    SELECT
        sm.id,
        sm.space_id,
        sm.user_id,
        sm.role,
        u.email as user_email,
        COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name)) as user_display_name
    FROM space_memberships sm
    LEFT JOIN users u ON sm.user_id = u.id
    WHERE sm.space_id = ${spaceId}
`;

// Access: row.spaceId, row.userId, row.userEmail, row.userDisplayName
```

---

## Common Pitfalls

### Pitfall 1: Accessing snake_case

```typescript
// ❌ WRONG - returns undefined
const userId = row.user_id;

// ✅ CORRECT - postgres.js transformed it
const userId = row.userId;
```

### Pitfall 2: Type vs Runtime Mismatch

```typescript
// ❌ WRONG - type says snake_case but runtime is camelCase
interface UserRow {
    user_id: string;  // Type uses snake_case
}
const rows = await sql<UserRow[]>`SELECT user_id FROM users`;
const id = rows[0].user_id;  // Type allows it but returns undefined!

// ✅ CORRECT - type matches runtime
interface UserRow {
    userId: string;  // Type uses camelCase
}
```

### Pitfall 3: Missing Null Checks

```typescript
// ❌ WRONG - will error if display_name is NULL
const name = row.displayName.toUpperCase();

// ✅ CORRECT - handle null
const name = row.displayName?.toUpperCase() ?? 'UNKNOWN';
```

### Pitfall 4: Inline Type Definition with snake_case

```typescript
// ❌ WRONG - type doesn't match runtime
const rows = await sql<{ space_id: string; role: string }[]>`
    SELECT space_id, role FROM space_memberships
`;
return rows.map(r => ({ spaceId: r.space_id, role: r.role }));
// r.space_id is undefined!

// ✅ CORRECT - type matches runtime
const rows = await sql<{ spaceId: string; role: string }[]>`
    SELECT space_id, role FROM space_memberships
`;
return rows.map(r => ({ spaceId: r.spaceId, role: r.role }));
```

---

## Debugging Tips

### 1. Log the actual row shape

```typescript
const rows = await sql`SELECT * FROM users LIMIT 1`;
console.log('Row keys:', Object.keys(rows[0]));
console.log('Row:', rows[0]);
```

### 2. Check for undefined access

```typescript
const userId = row.user_id;
if (userId === undefined) {
    console.error('Accessed snake_case, should be camelCase!');
    console.log('Available keys:', Object.keys(row));
}
```

### 3. Use TypeScript strict mode

Enable these in `tsconfig.json`:
- `strictNullChecks` - catches nullable column issues
- `noUncheckedIndexedAccess` - safer array access

### 4. Run the audit script

```bash
npm run audit-db-access
```

This scans all `*-postgres.ts` files for snake_case violations.

---

## SQL Column Names

In SQL statements, you still use snake_case because that's what the database columns are named:

```typescript
// SQL uses snake_case (database column names)
await sql`
    INSERT INTO users (
        organization_id,    -- snake_case in SQL
        display_name,
        first_name
    ) VALUES (
        ${input.organizationId},  -- camelCase in JS
        ${input.displayName},
        ${input.firstName}
    )
`;

// SELECT results come back as camelCase
const rows = await sql`SELECT organization_id, display_name FROM users`;
// Access: rows[0].organizationId, rows[0].displayName
```

---

## Quick Reference

| Scenario | SQL | TypeScript |
|----------|-----|------------|
| Column name | `user_id` | `userId` |
| Alias | `AS owner_id` | `.ownerId` |
| Interface property | N/A | `userId: string` |
| Nullable column | `TEXT NULL` | `string \| null` |
| Access pattern | `SELECT user_id` | `row.userId` |

---

## See Also

- [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md) - Table schemas with runtime column names
- [ACCESS_PATTERNS.md](./ACCESS_PATTERNS.md) - More query patterns
- [db.ts](../../src/lib/server/persistence/db.ts) - Transform configuration



