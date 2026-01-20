# Database Access Patterns

> Standard patterns for database queries in StratAI. All patterns use postgres.js with automatic snake_case → camelCase transformation.

---

## Critical Rule

**Always use camelCase for property access:**

```typescript
// ❌ WRONG - returns undefined
const userId = row.user_id;

// ✅ CORRECT - postgres.js transforms to camelCase
const userId = row.userId;
```

---

## Pattern 1: Basic CRUD

### Find by ID

```typescript
interface UserRow {
    id: string;
    email: string;
    displayName: string | null;
    createdAt: Date;
}

async function findById(id: string): Promise<User | null> {
    const rows = await sql<UserRow[]>`
        SELECT * FROM users WHERE id = ${id}
    `;
    return rows.length > 0 ? rowToUser(rows[0]) : null;
}
```

### Create

```typescript
async function create(input: CreateUserInput): Promise<User> {
    const rows = await sql<UserRow[]>`
        INSERT INTO users (
            organization_id, email, username, display_name
        ) VALUES (
            ${input.organizationId},
            ${input.email},
            ${input.username},
            ${input.displayName}
        )
        RETURNING *
    `;
    return rowToUser(rows[0]);
}
```

### Update

```typescript
async function update(id: string, updates: UpdateUserInput): Promise<User | null> {
    // Option 1: Individual updates
    if (updates.displayName !== undefined) {
        await sql`
            UPDATE users 
            SET display_name = ${updates.displayName}
            WHERE id = ${id}
        `;
    }
    
    // Option 2: COALESCE for optional fields
    await sql`
        UPDATE users
        SET
            display_name = COALESCE(${updates.displayName ?? null}, display_name),
            updated_at = NOW()
        WHERE id = ${id}
    `;
    
    return findById(id);
}
```

### Delete (Soft)

```typescript
async function delete(id: string): Promise<boolean> {
    const result = await sql`
        UPDATE users
        SET deleted_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
    `;
    return result.count > 0;
}
```

---

## Pattern 2: Row Converters

Always use converter functions for consistency:

```typescript
interface SpaceRow {
    id: string;
    userId: string;
    name: string;
    slug: string;
    description: string | null;
    spaceType: 'personal' | 'organizational';
    createdAt: Date;
    updatedAt: Date;
}

function rowToSpace(row: SpaceRow): Space {
    return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        slug: row.slug,
        description: row.description ?? null,
        spaceType: row.spaceType,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}
```

---

## Pattern 3: Nullable Column Handling

### Option A: Handle in TypeScript

```typescript
// Interface declares nullable
interface UserRow {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
}

// Handle with nullish coalescing
const displayName = row.displayName ?? 'Unknown User';
const fullName = row.displayName ?? `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || 'Unknown';
```

### Option B: Handle in SQL

```typescript
const rows = await sql`
    SELECT
        id,
        email,
        COALESCE(display_name, CONCAT_WS(' ', first_name, last_name), 'Unknown') as display_name
    FROM users
    WHERE id = ${id}
`;
// Runtime: row.displayName is never null
```

---

## Pattern 4: Joins with Extended Types

```typescript
// Define extended type for join result
interface MemberWithUserRow extends SpaceMembershipRow {
    userEmail: string | null;
    userDisplayName: string | null;
    groupName: string | null;
}

async function getMembers(spaceId: string): Promise<MemberWithUser[]> {
    const rows = await sql<MemberWithUserRow[]>`
        SELECT
            sm.*,
            u.email as user_email,
            COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name)) as user_display_name,
            g.name as group_name
        FROM space_memberships sm
        LEFT JOIN users u ON sm.user_id = u.id
        LEFT JOIN groups g ON sm.group_id = g.id
        WHERE sm.space_id = ${spaceId}
    `;
    
    return rows.map(row => ({
        ...rowToMembership(row),
        user: row.userId ? {
            id: row.userId,
            email: row.userEmail!,
            displayName: row.userDisplayName
        } : undefined,
        group: row.groupId ? {
            id: row.groupId,
            name: row.groupName!
        } : undefined
    }));
}
```

---

## Pattern 5: Access Control Queries

### Check Access with CTE

```typescript
async function canAccessSpace(userId: string, spaceId: string): Promise<SpaceAccessResult> {
    const result = await sql<{
        isOwner: boolean;
        membershipRole: SpaceRole | null;
        groupRole: SpaceRole | null;
    }[]>`
        WITH space_info AS (
            SELECT id, user_id FROM spaces WHERE id = ${spaceId}
        ),
        direct_membership AS (
            SELECT role FROM space_memberships
            WHERE space_id = ${spaceId} AND user_id = ${userId}::uuid
        ),
        group_membership AS (
            SELECT sm.role
            FROM space_memberships sm
            JOIN group_memberships gm ON sm.group_id = gm.group_id
            WHERE sm.space_id = ${spaceId} AND gm.user_id = ${userId}::uuid
            ORDER BY CASE sm.role
                WHEN 'owner' THEN 1
                WHEN 'admin' THEN 2
                WHEN 'member' THEN 3
                WHEN 'guest' THEN 4
            END
            LIMIT 1
        )
        SELECT
            COALESCE(s.user_id = ${userId}::uuid, false) as is_owner,
            dm.role as membership_role,
            gm.role as group_role
        FROM space_info s
        LEFT JOIN direct_membership dm ON true
        LEFT JOIN group_membership gm ON true
    `;
    
    if (result.length === 0) {
        return { hasAccess: false, role: null, source: null };
    }
    
    const { isOwner, membershipRole, groupRole } = result[0];
    
    if (isOwner) return { hasAccess: true, role: 'owner', source: 'owner' };
    if (membershipRole) return { hasAccess: true, role: membershipRole, source: 'membership' };
    if (groupRole) return { hasAccess: true, role: groupRole, source: 'group' };
    
    return { hasAccess: false, role: null, source: null };
}
```

---

## Pattern 6: Pagination

```typescript
interface PaginationOptions {
    limit?: number;
    offset?: number;
    cursor?: string;
}

async function findAll(
    userId: string, 
    options: PaginationOptions = {}
): Promise<{ items: Task[]; hasMore: boolean }> {
    const limit = options.limit ?? 50;
    
    const rows = await sql<TaskRow[]>`
        SELECT * FROM tasks
        WHERE user_id = ${userId}
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
        OFFSET ${options.offset ?? 0}
    `;
    
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToTask);
    
    return { items, hasMore };
}
```

---

## Pattern 7: Upsert

```typescript
async function addMember(
    spaceId: string,
    userId: string,
    role: SpaceRole = 'member'
): Promise<SpaceMembership> {
    const id = generateMembershipId();
    
    const rows = await sql<SpaceMembershipRow[]>`
        INSERT INTO space_memberships (id, space_id, user_id, role)
        VALUES (${id}, ${spaceId}, ${userId}::uuid, ${role})
        ON CONFLICT (space_id, user_id) WHERE user_id IS NOT NULL
        DO UPDATE SET
            role = ${role},
            updated_at = NOW()
        RETURNING *
    `;
    
    return rowToMembership(rows[0]);
}
```

---

## Pattern 8: Counting

```typescript
async function getOwnerCount(spaceId: string): Promise<number> {
    const result = await sql<{ count: string }[]>`
        SELECT COUNT(*) as count
        FROM space_memberships
        WHERE space_id = ${spaceId} AND role = 'owner'
    `;
    return parseInt(result[0].count, 10);
}
```

---

## Pattern 9: Existence Check

```typescript
async function exists(id: string): Promise<boolean> {
    const result = await sql<{ exists: boolean }[]>`
        SELECT EXISTS(
            SELECT 1 FROM spaces WHERE id = ${id} AND deleted_at IS NULL
        ) as exists
    `;
    return result[0].exists;
}
```

---

## Pattern 10: JSONB Operations

```typescript
// Reading JSONB
interface UserRow {
    settings: Record<string, unknown> | null;
}

const settings = row.settings ?? {};

// Writing JSONB
await sql`
    UPDATE users
    SET settings = ${sql.json(newSettings)}
    WHERE id = ${id}
`;

// Merging JSONB
await sql`
    UPDATE users
    SET settings = COALESCE(settings, '{}'::jsonb) || ${sql.json(updates)}
    WHERE id = ${id}
`;
```

---

## Anti-Patterns to Avoid

### ❌ Using snake_case in property access

```typescript
// WRONG
const userId = row.user_id;  // undefined!

// CORRECT
const userId = row.userId;
```

### ❌ Type definition doesn't match runtime

```typescript
// WRONG
interface Row {
    user_id: string;  // Type is snake_case
}

// CORRECT
interface Row {
    userId: string;  // Type matches runtime (camelCase)
}
```

### ❌ Missing null handling

```typescript
// WRONG - will throw if null
const name = row.displayName.toUpperCase();

// CORRECT
const name = row.displayName?.toUpperCase() ?? 'UNKNOWN';
```

### ❌ Inline snake_case types

```typescript
// WRONG
const rows = await sql<{ space_id: string }[]>`...`;

// CORRECT
const rows = await sql<{ spaceId: string }[]>`...`;
```

---

## See Also

- [POSTGRES_JS_GUIDE.md](./POSTGRES_JS_GUIDE.md) - Column transformation details
- [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md) - Table schemas
- [RELATIONSHIPS.md](./RELATIONSHIPS.md) - Entity relationships



