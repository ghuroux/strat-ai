# StratAI Agent Guidelines

> **Purpose:** Long-term codebase memory for agents and developers. Contains patterns, decisions, and gotchas discovered during development.
>
> **When to update:** After discovering a reusable pattern, making an architectural decision, or finding a non-obvious gotcha.
>
> **Related:** See `agents/ralph/progress.txt` for current-feature memory.

---

## Codebase Patterns

### Pattern: postgres.js camelCase Transformation

**When to use:** Any database query using postgres.js

**Implementation:**
```typescript
// Database columns are snake_case, runtime properties are camelCase
// postgres.js automatically transforms column names

interface UserRow {
  id: string;
  userId: string;           // Database: user_id
  displayName: string | null;  // Database: display_name
  createdAt: Date;          // Database: created_at
}

// Access with camelCase (NOT snake_case)
const name = row.displayName ?? 'Unknown';  // Use ?? for nulls
```

**Anti-patterns to avoid:**
```typescript
// ❌ WRONG - returns undefined!
const userId = row.user_id;

// ❌ WRONG - empty string is falsy
const desc = row.description || 'default';

// ❌ WRONG - type doesn't match runtime
interface Row { user_id: string }
```

**See:** `DATABASE_STANDARDIZATION_PROJECT.md`

---

### Pattern: Conditional Column Fetch with CASE WHEN

**When to use:** Fetching related data only for certain rows (efficiency)

**Implementation:**
```sql
-- Only fetch owner info for spaces the user doesn't own
SELECT
  s.*,
  CASE WHEN s.user_id != ${userId}::uuid 
       THEN owner_user.first_name 
  END as owner_first_name,
  CASE WHEN s.user_id != ${userId}::uuid 
       THEN owner_user.display_name 
  END as owner_display_name
FROM spaces s
LEFT JOIN users owner_user ON s.user_id = owner_user.id
```

**Why:** Avoids fetching unnecessary data for rows that don't need it. 
Results in NULL for excluded rows (handled by `?? null` in rowTo* converter).

**See:** `spaces-postgres.ts` → `findAllAccessible`

---

### Pattern: Display Helper with Fallback Chain

**When to use:** UI display logic with multiple fallback levels

**Implementation:**
```typescript
// src/lib/utils/space-display.ts pattern
export function getDisplayName(item: Item, context: string): string {
  // Level 1: Primary condition
  if (item.ownerId === context) return item.name;
  
  // Level 2: Special case
  if (item.type === 'special') return item.name;
  
  // Level 3: Preferred field
  if (item.ownerFirstName) return `${item.name} (${item.ownerFirstName})`;
  
  // Level 4: Fallback field (extract from compound)
  if (item.ownerDisplayName) {
    return `${item.name} (${item.ownerDisplayName.split(' ')[0]})`;
  }
  
  // Level 5: Final fallback
  return item.name;
}
```

**See:** `src/lib/utils/space-display.ts`

---

### Pattern: Name Fallback

**When to use:** Displaying user names where display_name might be null

**Implementation:**
```sql
-- In SQL query
COALESCE(
    display_name, 
    CONCAT_WS(' ', first_name, last_name)
) as display_name
```

```typescript
// In TypeScript
const displayName = row.displayName ?? 
    [row.firstName, row.lastName].filter(Boolean).join(' ') || 
    'Unknown User';
```

---

### Pattern: Row Converter Functions

**When to use:** Every repository file that queries the database

**Implementation:**
```typescript
interface EntityRow {
  id: string;
  userId: string;
  nullableField: string | null;
  createdAt: Date;
}

function rowToEntity(row: EntityRow): Entity {
  return {
    id: row.id,
    userId: row.userId,
    nullableField: row.nullableField ?? null,  // Explicit null handling
    createdAt: row.createdAt
  };
}

// Usage
const rows = await sql<EntityRow[]>`SELECT * FROM entities WHERE id = ${id}`;
return rows.length > 0 ? rowToEntity(rows[0]) : null;
```

---

### Pattern: API Endpoint Structure

**When to use:** Creating new API endpoints

**Implementation:**
```typescript
// src/routes/api/entities/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  // 1. Auth check
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch resource
  const entity = await postgresEntityRepository.findById(params.id);
  
  // 3. Not found check
  if (!entity) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  // 4. Permission check (if needed)
  if (entity.userId !== locals.user.id) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // 5. Return data
  return json(entity);
};
```

---

### Pattern: CTE with Multiple UNIONs for Access Control

**When to use:** Complex visibility queries where access can come from multiple paths

**Implementation:**
```sql
-- findAllAccessible pattern: CTE with UNIONs for each access path
WITH accessible_ids AS (
  -- Path 1: User owns the resource
  SELECT id FROM areas WHERE user_id = $userId
  UNION
  -- Path 2: User has explicit membership
  SELECT area_id FROM area_memberships WHERE user_id = $userId
  UNION
  -- Path 3: User is in a group with access
  SELECT am.area_id FROM area_memberships am
  JOIN group_memberships gm ON am.group_id = gm.group_id
  WHERE gm.user_id = $userId
  UNION
  -- Path 4: Special case (e.g., General areas for space members)
  SELECT id FROM areas WHERE is_general = true AND ...
)
SELECT * FROM areas WHERE id IN (SELECT id FROM accessible_ids)
```

**See:** `areas-postgres.ts` → `findAllAccessible`

---

### Pattern: Reusable CTE Helper Functions

**When to use:** When the same CTE logic needs to be reused across multiple query methods (findAll, search, count)

**Implementation:**
```typescript
import type { PendingQuery, Row } from 'postgres';

/**
 * Build CTE query fragment for reuse across methods
 * Returns sql fragment, not executed query
 */
function buildAccessiblePagesCTE(userId: string): PendingQuery<Row[]> {
  return sql`
    accessible_pages AS (
      -- Path 1: User owns the resource
      SELECT p.id FROM pages p WHERE p.user_id = ${userId} AND p.deleted_at IS NULL
      UNION
      -- Path 2: Shared with user
      SELECT p.id FROM pages p
      JOIN page_user_shares pus ON p.id = pus.page_id
      WHERE pus.user_id = ${userId} AND p.deleted_at IS NULL
      -- ... more paths
    )
  `;
}

// Usage in findAll, search, count methods:
async function findAll(userId: string): Promise<Page[]> {
  const accessiblePagesCTE = buildAccessiblePagesCTE(userId);
  return sql<PageRow[]>`
    WITH ${accessiblePagesCTE}
    SELECT p.* FROM pages p
    WHERE p.id IN (SELECT id FROM accessible_pages)
    ORDER BY p.updated_at DESC
  `;
}

async function count(userId: string): Promise<number> {
  const accessiblePagesCTE = buildAccessiblePagesCTE(userId);
  const result = await sql`
    WITH ${accessiblePagesCTE}
    SELECT COUNT(*) as count FROM pages p
    WHERE p.id IN (SELECT id FROM accessible_pages)
  `;
  return parseInt(result[0]?.count || '0', 10);
}
```

**Benefits:**
- Single source of truth for access control logic
- Changes to access rules only need one update
- Consistent behavior across findAll, search, count
- Uses `IN (SELECT id FROM ...)` to avoid duplicates when multiple access paths match

**See:** `pages-postgres.ts` → `buildAccessiblePagesCTE()`

---

### Pattern: Defense-in-Depth for Business Rules

**When to use:** Critical invariants that must never be violated (e.g., "General area cannot be restricted")

**Implementation layers:**
```
Layer 1: Database Constraint (CHECK/UNIQUE)
    ↓ Cannot insert/update invalid state
Layer 2: Repository Validation (throw Error)
    ↓ Fails before SQL execution  
Layer 3: API Validation (return 400)
    ↓ Fail fast, clear error message
Layer 4: UI Prevention (hide/disable control)
    ↓ User cannot attempt invalid action
```

**Example:** General area protection
- DB: `CHECK (NOT (is_general = true AND is_restricted = true))`
- Repo: `throw new Error('General area cannot be restricted')`
- API: `return json({ error: '...' }, { status: 400 })`
- UI: `{#if !isGeneral} <Toggle /> {:else} <InfoMessage /> {/if}`

---

### Pattern: Intl API for Timezone and Date Formatting

**When to use:** Any timezone detection, validation, or date/time formatting

**Implementation:**
```typescript
// Detect browser timezone
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Returns: 'America/New_York', 'Europe/London', etc. (IANA format)

// Validate timezone string
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false; // RangeError thrown for invalid timezone
  }
}

// Format date with timezone
const formatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Africa/Johannesburg'
});
const dateStr = formatter.format(new Date()); // "Thursday, January 16, 2026"

// Extract specific parts (e.g., timezone name)
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Johannesburg',
  timeZoneName: 'long'
}).formatToParts(new Date());
const tzName = parts.find(p => p.type === 'timeZoneName')?.value;
// Returns: "South Africa Standard Time"
```

**Why:** Browser-native, no external libraries, works with IANA timezone database, consistent across platforms.

**See:** `src/lib/config/system-prompts.ts` → `getTemporalContext()`

---

### Pattern: PostgreSQL CHECK Constraints

**When to use:** Enforcing business rules at database level

**Implementation:**
```sql
-- Add constraint to existing table
ALTER TABLE areas
ADD CONSTRAINT chk_general_not_restricted
CHECK (NOT (is_general = true AND is_restricted = true));

-- With documentation
COMMENT ON CONSTRAINT chk_general_not_restricted ON areas IS
    'General areas must always be accessible. They cannot be restricted.';
```

**See:** Migration `033-general-area-protection.sql`

---

## Architectural Decisions

### Decision: Areas as Collaboration Unit

**Context:** Needed granular sharing without exposing entire Spaces

**Options considered:**
- Share entire Spaces (too coarse)
- Share individual items (too fine, complex permissions)
- Share Areas (natural grouping of related work)

**Rationale:** Areas provide a natural boundary for collaboration - they contain related conversations, tasks, and pages that make sense to share together.

**Consequences:**
- `area_memberships` table required for access control
- Access checks happen at area level, not space level
- Space membership is prerequisite for area access

---

### Decision: Documents at Space-level, Pages at Area-level

**Context:** Needed to distinguish between uploaded files and created content

**Options considered:**
- All content at Space level (cluttered, hard to organize)
- All content at Area level (duplicates uploaded docs across areas)
- Split: Documents at Space, Pages at Area

**Rationale:** 
- **Documents** (uploaded files) are often shared across multiple areas - storing at Space level prevents duplication
- **Pages** (created content like meeting notes) are born from area context and naturally belong there

**Consequences:**
- Documents activated per-area via `contextDocumentIds`
- Pages stored with `areaId` foreign key
- Different sharing models for each

---

### Decision: postgres.js with camelCase Standard

**Context:** postgres.js automatically transforms snake_case to camelCase

**Options considered:**
- Fight the transformation (complex, error-prone)
- Work with the transformation (natural TypeScript conventions)

**Rationale:** Working with the transformation aligns with TypeScript/JavaScript naming conventions and reduces friction.

**Consequences:**
- ALL row interfaces use camelCase
- ALL property access uses camelCase
- Type definitions must match runtime shapes
- See `DATABASE_STANDARDIZATION_PROJECT.md` for patterns

---

## Common Gotchas

### Gotcha: General Area Creation

**Issue:** General area must be created per-space, not per-user

**Symptom:** "General area not found" errors when accessing a new space

**Root cause:** Code was checking `user_id` instead of `space_id` when creating the General area

**Fix:** Check `space_id` when creating General area:
```typescript
// ✅ Correct
const generalArea = await sql`
  SELECT * FROM focus_areas 
  WHERE space_id = ${spaceId} AND name = 'General'
`;

// ❌ Wrong
const generalArea = await sql`
  SELECT * FROM focus_areas 
  WHERE user_id = ${userId} AND name = 'General'
`;
```

---

### Gotcha: isRestricted Flag Boolean Check

**Issue:** Boolean `false` is falsy, so `if (isRestricted)` doesn't distinguish between `false` and `undefined`

**Symptom:** Access control not working correctly for open (non-restricted) areas

**Root cause:** Truthy check on boolean that could legitimately be `false`

**Fix:** Use explicit comparison:
```typescript
// ✅ Correct
if (area.isRestricted === true) {
  // Only members can access
}

// ❌ Wrong
if (area.isRestricted) {
  // This fails when isRestricted is explicitly false
}
```

---

### Gotcha: Duplicate Owner in Member Lists

**Issue:** Space/area owner appearing twice in member lists

**Symptom:** Same user shown multiple times in membership UI

**Root cause:** Owner added implicitly AND as explicit member

**Fix:** Check existence before adding:
```typescript
// When adding owner to members list
const existingMember = members.find(m => m.userId === ownerId);
if (!existingMember) {
  members.unshift(ownerAsMember);
}
```

---

### Gotcha: JSONB Column Casting

**Issue:** JSONB columns come through as `object` type, need explicit casting

**Symptom:** TypeScript doesn't know the shape of JSONB data

**Fix:** Cast after retrieval:
```typescript
interface ModelConfigRow {
  parameterConstraints: object;  // Generic from postgres.js
}

// After retrieval, cast to specific type
const config = rowToModelConfig(row);
const constraints = config.parameterConstraints as ParameterConstraints;
```

---

## Quality Gates

Every change must pass these gates before commit:

```bash
npm run check           # TypeScript - 0 errors
npm run lint            # ESLint - 0 errors
npm run audit-db-access # DB patterns - 0 new violations
npm run test            # Tests - all pass
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Repository | `entity-postgres.ts` | `users-postgres.ts` |
| Types | `entity.ts` | `user.ts` |
| Components | `EntityName.svelte` | `UserProfile.svelte` |
| API routes | `+server.ts` in route folder | `api/users/[id]/+server.ts` |
| Migrations | `NNN-description.sql` | `030-model-configurations.sql` |

---

## Commit Message Convention

```
type(scope): description

- Bullet points for details
- Reference story ID if applicable
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples:
- `feat(api): add model configuration endpoints`
- `fix(members): resolve duplicate owner in list`
- `refactor(db): standardize camelCase access`

---

*Last updated: 2026-01-16 (Reusable CTE Helper Functions pattern added for Page Listing Access Control)*
*Maintainer: Development Team*

