# Phase B: Space Name Collision Fix

## Overview

When users are invited to other users' spaces, name collisions can occur. If User B has a "Work" space and User A invites them to their "Work" space, B now has TWO "Work" entries in navigation.

**Goal:** Display invited spaces with owner context to disambiguate: `{SpaceName} ({OwnerFirstName})`

---

## Current State

### Completed Prerequisites
- ✅ Phase 0: User schema has `first_name`/`last_name` columns (migration 030)
- ✅ Phase A: Space member management UI complete
- ✅ Backend: space_memberships table and APIs exist

### What's Missing
- Space type/interface doesn't include owner info for invited spaces
- No display name helper function for spaces
- Navigation shows raw space name without disambiguation

---

## Problem Statement

```
User B's Navigation Today:
[Work] [Research] [Work]
  ↑ B's own    ↑ B's own   ↑ A invited B to their "Work"

Which "Work" is which? 🤷
```

## Solution

```
User B's Navigation After Fix:
[Work] [Research] [Work (Sarah)]
  ↑ B's own    ↑ B's own   ↑ Sarah's space (invited)
```

---

## Technical Requirements

### 1. Database Query Changes

**File:** `src/lib/server/persistence/spaces-postgres.ts`

The `findAllForUser` query needs to return owner info for spaces where the user is NOT the owner:

```sql
SELECT 
  s.*,
  CASE 
    WHEN s.user_id != $userId THEN owner_user.first_name 
    ELSE NULL 
  END as owner_first_name,
  CASE 
    WHEN s.user_id != $userId THEN owner_user.display_name 
    ELSE NULL 
  END as owner_display_name
FROM spaces s
LEFT JOIN users owner_user ON s.user_id = owner_user.id::text
WHERE ...
```

### 2. Type Updates

**File:** `src/lib/types/spaces.ts`

Add owner info to Space interface:

```typescript
export interface Space {
  // ... existing fields ...
  
  // Owner info (only populated for invited spaces)
  ownerFirstName?: string | null;
  ownerDisplayName?: string | null;
}

export interface SpaceRow {
  // ... existing fields ...
  ownerFirstName: string | null;
  ownerDisplayName: string | null;
}
```

### 3. Display Helper Function

**File:** `src/lib/utils/space-display.ts` (new file)

```typescript
/**
 * Get the display name for a space, handling name collision disambiguation.
 * 
 * Rules:
 * - Owned spaces: just the name
 * - Invited spaces: "Name (OwnerFirstName)"
 * - Org spaces: just the name (no owner suffix)
 */
export function getSpaceDisplayName(
  space: Space, 
  currentUserId: string
): string {
  // Owned space - just the name
  if (space.userId === currentUserId) {
    return space.name;
  }
  
  // Organization space - just the name (special case)
  if (space.spaceType === 'organization') {
    return space.name;
  }
  
  // Invited space - "Name (OwnerFirstName)"
  if (space.ownerFirstName) {
    return `${space.name} (${space.ownerFirstName})`;
  }
  
  // Fallback to display name if first name not available
  if (space.ownerDisplayName) {
    const firstName = space.ownerDisplayName.split(' ')[0];
    return `${space.name} (${firstName})`;
  }
  
  return space.name;
}
```

### 4. Repository Updates

**File:** `src/lib/server/persistence/spaces-postgres.ts`

Update `rowToSpace` converter:

```typescript
function rowToSpace(row: SpaceRow): Space {
  return {
    // ... existing field mappings ...
    ownerFirstName: row.ownerFirstName ?? null,
    ownerDisplayName: row.ownerDisplayName ?? null,
  };
}
```

### 5. Component Updates

**File:** `src/lib/components/layout/Header.svelte` (or wherever space tabs are rendered)

Replace raw `space.name` with `getSpaceDisplayName(space, currentUserId)`:

```svelte
<script>
  import { getSpaceDisplayName } from '$lib/utils/space-display';
</script>

{#each spaces as space}
  <TabItem>
    {getSpaceDisplayName(space, currentUserId)}
  </TabItem>
{/each}
```

---

## Files to Create

| File | Description | Est. Lines |
|------|-------------|------------|
| `src/lib/utils/space-display.ts` | Display helper function | ~40 |

## Files to Modify

| File | Changes | Est. Effort |
|------|---------|-------------|
| `src/lib/types/spaces.ts` | Add ownerFirstName, ownerDisplayName | Small |
| `src/lib/server/persistence/spaces-postgres.ts` | Update query, rowToSpace | Medium |
| `src/lib/components/layout/Header.svelte` | Use getSpaceDisplayName | Small |
| `src/lib/stores/spaces.svelte.ts` | Ensure owner info passed through | Small |

---

## Acceptance Criteria

### Core Functionality
- [ ] Owned spaces display as just `{name}`
- [ ] Invited spaces display as `{name} ({ownerFirstName})`
- [ ] Organization spaces display as just `{name}` (no owner suffix)
- [ ] Fallback to first word of display_name if first_name is null

### Edge Cases
- [ ] Space with null owner first_name uses display_name fallback
- [ ] Very long names truncate appropriately in UI
- [ ] Special characters in owner names handled correctly

### Database
- [ ] spaces-postgres.ts query includes owner info JOIN
- [ ] Only fetch owner info for spaces user doesn't own (efficiency)
- [ ] Type interfaces match runtime shapes (camelCase)

### Quality Gates
- [ ] `npm run check` passes (TypeScript)
- [ ] `npm run lint` passes (ESLint)
- [ ] `npm run audit-db-access` shows 0 new violations

---

## Example Scenarios

### Scenario 1: Basic Disambiguation
```
Sarah owns: "Work", "Personal"
Mike owns: "Work", "Project Alpha"

Mike is invited to Sarah's "Work"

Mike's nav: [Work] [Project Alpha] [Work (Sarah)]
```

### Scenario 2: Org Space (No Suffix)
```
StraTech org has: "StraTech Group" (organization type)
Sarah owns: "Work"

Sarah is member of StraTech org space

Sarah's nav: [Work] [StraTech Group]
             ↑ no suffix   ↑ org space, no suffix
```

### Scenario 3: Missing First Name Fallback
```
Legacy user "John Smith" has no first_name (null), only display_name

Mike invited to John's "Research" space

Mike's nav: [Research (John)]  ← extracted from display_name
```

---

## Testing Notes

1. **Create test scenario:** Create two users with same space name
2. **Invite flow:** User A invites User B to their space
3. **Verify display:** B's nav shows `{name} ({A's firstName})`
4. **Verify owned unchanged:** A's nav still shows just `{name}`
5. **Test org spaces:** Org spaces should never show owner suffix

---

## Dependencies

- Phase 0 (User Schema) - Required: needs first_name column
- Phase A (Member Management) - Required: invitation flow must work

## Estimated Effort

**1 day** (as per master plan)

- Query changes: 2-3 hours
- Type updates: 1 hour
- Display helper: 1 hour
- Component updates: 1-2 hours
- Testing: 1-2 hours

---

## Related Documentation

- `docs/features/space-member-management-ui.md` - Master plan
- `docs/database/SCHEMA_REFERENCE.md` - spaces table, users table
- `docs/database/ENTITY_MODEL.md` - Space/User relationships

