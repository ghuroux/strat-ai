# Phase A.1: Area Visibility Fixes

## Overview

When users are invited to spaces, they cannot see areas properly. This breaks the collaboration model and causes orphan data issues.

**Goal:** Fix area visibility so invited users can:
1. Always see the General area in any space they're a member of
2. See shared areas within their original space (not just in org view)

---

## Current State (Bugs)

### Bug 1: General Area Invisible to Invited Users

```
Space Owner A creates "Work" space
  → General area auto-created
  
A invites User B to "Work" space
  → B has space_membership ✓
  → B opens "Work" space
  → B sees: NO AREAS! (General is invisible) ❌
```

**Root cause:** Area query likely filters by `user_id` or `created_by`, excluding areas the user didn't create.

### Bug 2: Shared Areas Only Visible in Org View

```
A shares "Project Alpha" area with B (via area_memberships)
  → B opens "Work" space
  → B sees: NO AREAS (or only areas B created) ❌
  → B opens "Organization" view
  → B sees: "Project Alpha" listed there ✓ (but disconnected from context)
```

**Root cause:** Same query issue - not checking `area_memberships` table.

### Bug 3: Deletion Orphan Risk

```
B creates "My Area" in A's space
B wants to delete "My Area"
  → System: "Conversations will move to General"
  → But B can't access General!
  → Deletion fails or creates orphans 💥
```

---

## Expected Behavior

### General Area Rule
> **The General area is ALWAYS accessible to ALL space members.**
> It cannot be restricted. It is the universal fallback for conversations.

### Shared Area Rule
> **Shared areas appear in their original space for the invited user.**
> The org view provides a cross-space summary, but primary access is in-context.

### Visibility Matrix

| Area Type | Space Owner | Space Member | Area Member | Non-Member |
|-----------|-------------|--------------|-------------|------------|
| General | ✅ See | ✅ See | ✅ See | ❌ No |
| Non-restricted | ✅ See | ✅ See | ✅ See | ❌ No |
| Restricted (shared) | ✅ See | ❌ No | ✅ See | ❌ No |
| Restricted (not shared) | ✅ See | ❌ No | ❌ No | ❌ No |

---

## Technical Requirements

### 1. Fix Area Query (Core Fix)

**File:** `src/lib/server/persistence/areas-postgres.ts` (or equivalent)

Current query (likely):
```sql
SELECT * FROM areas 
WHERE space_id = $spaceId 
AND user_id = $userId  -- ❌ BUG: Excludes areas user didn't create
AND deleted_at IS NULL
```

Fixed query:
```sql
SELECT DISTINCT a.* 
FROM areas a
LEFT JOIN area_memberships am ON a.id = am.area_id
WHERE a.space_id = $spaceId
  AND a.deleted_at IS NULL
  AND (
    -- User created this area
    a.created_by = $userId
    -- OR it's the General area (always visible to space members)
    OR a.is_general = true
    -- OR it's non-restricted (open to all space members)
    OR a.is_restricted = false
    -- OR user has explicit area membership
    OR am.user_id = $userId
    -- OR user's group has area membership
    OR am.group_id IN (SELECT group_id FROM group_memberships WHERE user_id = $userId)
  )
ORDER BY a.order_index, a.created_at
```

### 2. Enforce General Area Cannot Be Restricted

**File:** `src/lib/server/persistence/areas-postgres.ts`

In `updateArea` method:
```typescript
async updateArea(areaId: string, updates: Partial<Area>): Promise<Area | null> {
  const area = await this.findById(areaId);
  
  // Prevent restricting General area
  if (area?.isGeneral && updates.isRestricted === true) {
    throw new Error('General area cannot be restricted');
  }
  
  // ... rest of update logic
}
```

**File:** API endpoint for area updates

```typescript
// POST /api/areas/[id]
if (area.isGeneral && body.isRestricted === true) {
  return json(
    { error: 'General area cannot be restricted' },
    { status: 400 }
  );
}
```

### 3. UI: Hide Restrict Toggle for General Areas

**File:** Area settings component (wherever `is_restricted` toggle lives)

```svelte
{#if !area.isGeneral}
  <label>
    <input type="checkbox" bind:checked={isRestricted} />
    Restrict area (require explicit membership)
  </label>
{:else}
  <p class="info-text">
    The General area is always accessible to all space members.
  </p>
{/if}
```

### 4. Migration: Fix Existing General Areas

**File:** `src/lib/server/persistence/migrations/033-fix-general-areas.sql`

```sql
-- Ensure all General areas are not restricted
UPDATE areas 
SET is_restricted = false 
WHERE is_general = true 
  AND is_restricted = true;

-- Add check constraint to prevent future issues
ALTER TABLE areas ADD CONSTRAINT general_not_restricted
  CHECK (NOT (is_general = true AND is_restricted = true));

-- Ensure all spaces have a General area
-- (Create missing ones if any)
INSERT INTO areas (id, space_id, name, slug, is_general, is_restricted, created_by, user_id)
SELECT 
  'area_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 7),
  s.id,
  'General',
  'general',
  true,
  false,
  s.user_id,
  s.user_id
FROM spaces s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM areas a 
    WHERE a.space_id = s.id 
    AND a.is_general = true 
    AND a.deleted_at IS NULL
  );

COMMENT ON CONSTRAINT general_not_restricted ON areas IS 
  'General areas must always be accessible to all space members';
```

### 5. Type Updates

**File:** `src/lib/types/area.ts` (or equivalent)

Document the General area behavior:
```typescript
export interface Area {
  // ... existing fields ...
  
  /**
   * If true, this is the General area for the space.
   * General areas:
   * - Are always visible to all space members
   * - Cannot be restricted (is_restricted forced to false)
   * - Are the fallback for conversations when areas are deleted
   */
  isGeneral?: boolean;
}
```

---

## Access Control Algorithm Update

**File:** Area access check (wherever `CanAccessArea` is implemented)

```typescript
function canAccessArea(userId: string, area: Area): AccessResult {
  // 1. General area = automatic access for space members
  if (area.isGeneral) {
    const spaceAccess = canAccessSpace(userId, area.spaceId);
    if (spaceAccess.granted) {
      return { 
        access: true, 
        level: 'member', 
        source: 'general_area' 
      };
    }
  }
  
  // 2. Non-restricted area = space access grants area access
  if (!area.isRestricted) {
    const spaceAccess = canAccessSpace(userId, area.spaceId);
    if (spaceAccess.granted) {
      return { 
        access: true, 
        level: spaceAccess.level, 
        source: 'space_inherited' 
      };
    }
  }
  
  // 3. Restricted area = check explicit membership
  const membership = getAreaMembership(userId, area.id);
  if (membership) {
    return { 
      access: true, 
      level: membership.role, 
      source: 'area_membership' 
    };
  }
  
  return { access: false };
}
```

---

## Files to Create

| File | Description | Est. Lines |
|------|-------------|------------|
| `migrations/033-fix-general-areas.sql` | Fix existing data + add constraint | ~30 |

## Files to Modify

| File | Changes | Est. Effort |
|------|---------|-------------|
| `src/lib/server/persistence/areas-postgres.ts` | Fix findAllForSpace query | Medium |
| `src/lib/server/persistence/focus-areas-postgres.ts` | Same fix if separate | Medium |
| Area update API endpoint | Prevent restricting General | Small |
| Area settings UI component | Hide restrict toggle for General | Small |
| `src/lib/types/area.ts` | Document isGeneral behavior | Small |

---

## Acceptance Criteria

### General Area Visibility
- [ ] Invited user can see General area in invited space
- [ ] General area appears in area list for all space members
- [ ] General area cannot have `is_restricted = true`
- [ ] UI hides/disables restrict toggle for General areas
- [ ] Migration fixes any existing restricted General areas

### Shared Area Visibility
- [ ] User with area_membership sees area in its original space
- [ ] Shared areas appear in space's area list (not just org view)
- [ ] Non-restricted areas visible to all space members
- [ ] Restricted areas only visible to those with explicit membership

### Area Deletion (Orphan Prevention)
- [ ] User can delete areas they created (even in invited spaces)
- [ ] Conversations move to General area (which they can access)
- [ ] No orphan conversations created

### Query Correctness
- [ ] Query checks: created_by OR is_general OR !is_restricted OR area_membership
- [ ] Query uses DISTINCT to avoid duplicates from JOINs
- [ ] Query respects deleted_at filters

### Quality Gates
- [ ] `npm run check` passes (TypeScript)
- [ ] `npm run lint` passes (ESLint)  
- [ ] `npm run audit-db-access` shows 0 new violations

---

## Test Scenarios

### Scenario 1: Invited User Sees General
```
Setup:
  - User A creates "Work" space (General auto-created)
  - A invites B to "Work"

Test:
  - B opens "Work" space
  
Expected:
  - B sees "General" area in the area list ✓
  - B can click into General and see conversations ✓
```

### Scenario 2: Shared Area Appears in Original Space
```
Setup:
  - User A creates "Work" space with areas: General, "Project X"
  - "Project X" is restricted
  - A invites B to "Work" space
  - A shares "Project X" with B (area_membership)

Test:
  - B opens "Work" space

Expected:
  - B sees: "General", "Project X" ✓
  - B does NOT see: any other restricted areas A hasn't shared
```

### Scenario 3: Area Deletion Works for Invited User
```
Setup:
  - User A creates "Work" space
  - A invites B to "Work"
  - B creates "My Area" in "Work"
  - B creates conversations in "My Area"

Test:
  - B deletes "My Area"

Expected:
  - B can delete the area ✓
  - Conversations move to General (which B can access) ✓
  - No orphan data created ✓
```

### Scenario 4: Cannot Restrict General
```
Setup:
  - User A creates "Work" space

Test:
  - A tries to set General area to restricted

Expected:
  - API returns error ✓
  - UI doesn't show restrict toggle for General ✓
  - Database constraint prevents if somehow bypassed ✓
```

---

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Space with no General area (legacy) | Migration creates one |
| General area was deleted | Migration/system recreates it |
| User in group with area access | Query includes group membership check |
| User removed from space | No longer sees General or any areas |
| Space owner leaves/deleted | General still accessible to remaining members |

---

## Dependencies

- **Phase 0** (User Schema) - Not strictly required but helpful
- **Phase A** (Member Management) - Required for inviting users

## Estimated Effort

**0.5-1 day**

- Query fix: 2-3 hours
- Migration: 1 hour
- API enforcement: 1 hour
- UI changes: 1 hour
- Testing: 2 hours

---

## Why This Must Be Phase A.1

This fix is **foundational** for collaboration:

1. **Blocks Phase B/C**: If users can't see areas, name collision and nav pinning don't matter
2. **Breaks invitations**: Inviting someone to a space is useless if they can't see anything
3. **Data integrity**: Orphan conversations could corrupt the system
4. **User trust**: "I was invited but can't see anything" is a terrible first experience

**Do this BEFORE Phase B (Name Collision) and Phase C (Nav Pinning).**

---

## Related Documentation

- `docs/features/space-member-management-ui.md` - Master plan
- `docs/database/ENTITY_MODEL.md` - Area access control (Section 6.4-6.5)
- `src/lib/server/persistence/area-memberships-postgres.ts` - Membership queries
- `AGENTS.md` - "Gotcha: General Area Creation" pattern

