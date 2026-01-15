# PRD: Phase B - Space Name Collision Fix

> **Status:** ✅ COMPLETED
> **Completed:** 2026-01-15
> **Stories:** 5/5 complete
> **Feature:** Phase B: Space Name Collision Fix
> **Created:** 2026-01-15
> **Parent Task:** phase-b-space-name-collision
> **Estimated Effort:** 1 day

---

## 1. Introduction/Overview

When users are invited to other users' spaces, name collisions can occur. If User B has a "Work" space and User A invites them to their "Work" space, B now has TWO "Work" entries in navigation with no way to distinguish them.

**Goal:** Display invited spaces with owner context to disambiguate: `{SpaceName} ({OwnerFirstName})`

### Example

**Before:**
```
User B's Navigation: [Work] [Research] [Work]
                       ^                  ^
                       B's own            A's space (invited) - which is which?
```

**After:**
```
User B's Navigation: [Work] [Research] [Work (Sarah)]
                       ^                  ^
                       B's own            Sarah's space (invited) - clear!
```

---

## 2. Research Findings

**Similar patterns found:**
- `src/lib/server/persistence/spaces-postgres.ts` - Repository with `findAllAccessible()` pattern
- `src/lib/server/persistence/space-memberships-postgres.ts:242` - Owner info JOIN pattern
- `src/lib/utils/model-display.ts` - Display helper utility pattern
- `src/lib/types/spaces.ts` - Space/SpaceRow interfaces with postgres.js camelCase convention

**Prerequisites confirmed:**
- Migration 030 exists with `first_name` column on users table
- `findAllAccessible()` already returns spaces with `userRole` - owner info needs to be added

**Applicable patterns:**
- postgres.js camelCase transformation (snake_case -> camelCase)
- Row converter pattern with `??` null handling
- Utility function pattern for display logic

---

## 3. Goals

- Disambiguate space names in navigation for invited spaces
- Show owner context as `{SpaceName} ({OwnerFirstName})` for invited spaces
- Maintain current display for owned and organization spaces (just name)
- Follow existing postgres.js and type conventions

---

## 4. User Stories

### US-001: Add owner info to Space types

**Description:** As a developer, I need Space and SpaceRow interfaces to include owner info fields (ownerFirstName, ownerDisplayName) so they can be populated for invited spaces.

**What to do:**
- Add `ownerFirstName: string | null` to SpaceRow interface
- Add `ownerDisplayName: string | null` to SpaceRow interface
- Add optional nullable fields to Space interface
- Update rowToSpace converter to map new fields

**Files:**
- `src/lib/types/spaces.ts`

**Schema Context:**

| Column (snake_case) | Property (camelCase) | Type | Nullable |
|---------------------|----------------------|------|----------|
| owner_first_name | ownerFirstName | string | YES |
| owner_display_name | ownerDisplayName | string | YES |

**Acceptance Criteria:**
- [ ] SpaceRow interface includes ownerFirstName: string | null
- [ ] SpaceRow interface includes ownerDisplayName: string | null
- [ ] Space interface includes ownerFirstName?: string | null
- [ ] Space interface includes ownerDisplayName?: string | null
- [ ] rowToSpace function maps new fields with ?? null handling
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-002: Update findAllAccessible query to include owner info

**Description:** As a user viewing shared spaces, I need the findAllAccessible query to return owner info (first_name, display_name) for spaces where I am NOT the owner, so I can distinguish between same-named spaces.

**What to do:**
- Add LEFT JOIN to users table for owner info
- Use CASE WHEN to only fetch owner info for non-owned spaces (efficiency)
- Update all three "accessible" queries: findAllAccessible, findByIdAccessible, findBySlugAccessible

**Files:**
- `src/lib/server/persistence/spaces-postgres.ts`

**Query Pattern:**
```sql
SELECT
  s.*,
  CASE
    WHEN s.user_id != ${userId}::uuid THEN owner_user.first_name
    ELSE NULL
  END as owner_first_name,
  CASE
    WHEN s.user_id != ${userId}::uuid THEN owner_user.display_name
    ELSE NULL
  END as owner_display_name
FROM spaces s
LEFT JOIN users owner_user ON s.user_id = owner_user.id
WHERE ...
```

**Acceptance Criteria:**
- [ ] findAllAccessible query JOINs users table on s.user_id for owner info
- [ ] Query returns owner_first_name only when s.user_id != current userId (CASE WHEN)
- [ ] Query returns owner_display_name only when s.user_id != current userId (CASE WHEN)
- [ ] For owned spaces, ownerFirstName and ownerDisplayName are null (not fetched)
- [ ] Return shape includes ownerFirstName and ownerDisplayName (camelCase via postgres.js)
- [ ] findByIdAccessible also updated with same pattern
- [ ] findBySlugAccessible also updated with same pattern
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] npm run audit-db-access shows 0 violations (if script exists)

---

### US-003: Create getSpaceDisplayName utility function

**Description:** As a developer, I need a utility function that returns the appropriate display name for a space based on ownership (owned spaces show just name, invited spaces show 'Name (OwnerFirstName)').

**What to do:**
- Create new file `src/lib/utils/space-display.ts`
- Implement getSpaceDisplayName function with logic per spec
- Export the function

**Files:**
- `src/lib/utils/space-display.ts` (new file)

**Implementation:**
```typescript
import type { Space } from '$lib/types/spaces';

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

**Acceptance Criteria:**
- [ ] New file created: src/lib/utils/space-display.ts
- [ ] Function signature: getSpaceDisplayName(space: Space, currentUserId: string): string
- [ ] Returns just space.name for owned spaces (space.userId === currentUserId)
- [ ] Returns just space.name for organization spaces (space.spaceType === 'organization')
- [ ] Returns 'Name (OwnerFirstName)' for invited spaces when ownerFirstName is available
- [ ] Falls back to first word of ownerDisplayName if ownerFirstName is null
- [ ] Returns just space.name as final fallback if no owner info available
- [ ] Function is exported
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-004: Update Header navigation to use display name helper

**Description:** As a user viewing the space navigation tabs, I need to see invited spaces displayed as 'Name (OwnerFirstName)' to distinguish them from my own spaces with the same name.

**What to do:**
- Import getSpaceDisplayName in Header.svelte
- Get current user ID from page data or userStore
- Replace space.name with getSpaceDisplayName(space, userId) in navigation tabs

**Files:**
- `src/lib/components/layout/Header.svelte`

**Acceptance Criteria:**
- [ ] Header.svelte imports getSpaceDisplayName from $lib/utils/space-display
- [ ] Header.svelte gets current user ID from page.data or userStore
- [ ] System space tabs use getSpaceDisplayName(space, currentUserId) instead of space.name
- [ ] Custom space tabs use getSpaceDisplayName(space, currentUserId) instead of space.name
- [ ] Owned spaces display as just the name (no parenthetical)
- [ ] Invited spaces display as 'Name (OwnerFirstName)'
- [ ] Organization spaces display as just the name
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] Manual verification: Create scenario with two 'Work' spaces from different users

---

### US-005: Update spacesStore to pass through owner info

**Description:** As a developer, I need the spacesStore to preserve owner info fields when receiving spaces from the API, so they are available to UI components.

**What to do:**
- Verify loadSpaces() spreads all API response fields including ownerFirstName and ownerDisplayName
- Ensure type safety for the new fields

**Files:**
- `src/lib/stores/spaces.svelte.ts`

**Notes:** The current implementation already spreads `...s` from the API response, so this may already work. This story ensures explicit verification and any necessary adjustments.

**Acceptance Criteria:**
- [ ] spacesStore.loadSpaces() preserves ownerFirstName from API response
- [ ] spacesStore.loadSpaces() preserves ownerDisplayName from API response
- [ ] Space objects in store include owner info when present
- [ ] getSystemSpaces() returns spaces with owner info
- [ ] getCustomSpaces() returns spaces with owner info
- [ ] getAllSpaces() returns spaces with owner info
- [ ] npm run check passes
- [ ] npm run lint passes

---

## 5. Functional Requirements

- FR-1: The system must display owned spaces as just `{name}`
- FR-2: The system must display invited personal spaces as `{name} ({ownerFirstName})`
- FR-3: The system must display organization spaces as just `{name}` (no owner suffix)
- FR-4: When owner first_name is null, the system must fall back to first word of display_name
- FR-5: The database query must only fetch owner info for non-owned spaces (efficiency)

---

## 6. Non-Goals

- Changing space display in other locations (Space Dashboard, Area pages) - only Header nav for this phase
- Renaming or deduplicating spaces - just visual disambiguation
- Adding owner info to owned spaces - only for invited spaces
- Cross-Space area visibility - separate concern

---

## 7. Technical Considerations

- **Database:** Uses postgres.js which auto-transforms snake_case to camelCase
- **Efficiency:** Only fetch owner info for spaces user doesn't own via CASE WHEN
- **Type Safety:** SpaceRow and Space interfaces must match runtime shapes
- **Fallback:** Handle legacy users who may not have first_name populated yet

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Legacy users without first_name | Fallback to first word of display_name |
| Very long owner names causing UI overflow | CSS truncation in space nav tabs |
| Special characters in names | Standard HTML escaping (Svelte handles this) |

---

## 9. Testing Notes

1. **Create test scenario:** Create two users with same space name ("Work")
2. **Invite flow:** User A invites User B to their "Work" space
3. **Verify display:** B's nav shows `Work (Sarah)` for A's space
4. **Verify owned unchanged:** A's nav still shows just `Work`
5. **Test org spaces:** Org spaces should never show owner suffix
6. **Test fallback:** Test with user who has null first_name but has display_name

---

## 10. Story Dependency Graph

```
US-001 (Types)
    |
    +---> US-002 (Query) ---+
    |                       |
    +---> US-003 (Utility) -+---> US-004 (Header)
                            |
                            +---> US-005 (Store)
```

**Suggested order:** US-001 -> US-002 -> US-003 -> US-005 -> US-004

---

## Appendix: Schema Context

### spaces table (existing)
| Column | Type | Note |
|--------|------|------|
| id | varchar | PK |
| user_id | uuid | FK to users |
| name | varchar | Space name |
| space_type | varchar | 'personal', 'organization', 'project' |
| ... | ... | ... |

### users table (existing)
| Column | Type | Note |
|--------|------|------|
| id | uuid | PK |
| first_name | varchar | Added in migration 030 |
| last_name | varchar | Added in migration 030 |
| display_name | varchar | Full name |
| ... | ... | ... |
