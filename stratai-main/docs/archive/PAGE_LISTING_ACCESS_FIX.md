# Page Listing Access Control Fix

> **Status:** Bug Fix - Ready for Implementation
> **Created:** 2026-01-16
> **Related:** `docs/features/page-sharing-permissions-audit.md`
> **Effort:** ~1-1.5 hours

---

## Problem Statement

When a page is shared with an area (`visibility = 'area'`), area members **cannot see the page in their list view**. The page only appears if they have the direct link.

### Reproduction Steps

1. User A creates a page in Area X
2. User A sets page visibility to "area" (shares with area)
3. User B is a member of Area X
4. User B navigates to Area X → Pages
5. **Expected:** User B sees the shared page
6. **Actual:** User B sees empty list (or only their own pages)

### Root Cause

The `findAll()` method in `pages-postgres.ts` only returns pages where `user_id = ${userId}`:

```typescript
// Current implementation (lines 97-139)
rows = await sql<PageRow[]>`
    SELECT *
    FROM pages
    WHERE user_id = ${userId}   // ← ONLY shows pages user CREATED
        AND area_id = ${filter.areaId}
        AND deleted_at IS NULL
    ORDER BY updated_at DESC
`;
```

This ignores:
- Pages with `visibility = 'area'` in areas the user can access
- Pages with `visibility = 'space'` in spaces the user can access
- Pages with `visibility = 'private'` that have explicit user/group shares

### Why `findById()` Works

`findById()` correctly uses `canUserAccessPage()` which checks all access pathways:

```typescript
async findById(id: string, userId: string): Promise<Page | null> {
    const canAccess = await this.canUserAccessPage(userId, id);  // ✅ Checks sharing
    if (!canAccess) return null;
    // ...
}
```

---

## Access Control Rules

From `page-sharing-postgres.ts` → `canAccessPage()`:

| Priority | Condition | Permission | Source |
|----------|-----------|------------|--------|
| 1 | User is page owner (`user_id = userId`) | admin | owner |
| 2 | `visibility = 'private'` + direct user share | share permission | user_share |
| 3 | `visibility = 'private'` + group share | share permission | group_share |
| 4 | `visibility = 'area'` + user has area access | mapped from area role | area |
| 5 | `visibility = 'space'` + user owns space | editor | space |

**Area Role → Page Permission Mapping:**
- owner/admin/member/inherited → editor
- viewer → viewer

---

## Solution Design

### Approach: CTE-Based Query

Use a Common Table Expression (CTE) to identify all accessible page IDs, then join back to get full page data. This is the same pattern used in `areas-postgres.ts` → `findAllAccessible()`.

### SQL Query Structure

```sql
WITH accessible_pages AS (
    -- Path 1: User owns the page
    SELECT p.id
    FROM pages p
    WHERE p.user_id = $userId
      AND p.deleted_at IS NULL

    UNION

    -- Path 2: Private page with direct user share
    SELECT p.id
    FROM pages p
    JOIN page_user_shares pus ON p.id = pus.page_id
    WHERE pus.user_id = $userId
      AND p.visibility = 'private'
      AND p.deleted_at IS NULL

    UNION

    -- Path 3: Private page with group share
    SELECT p.id
    FROM pages p
    JOIN page_group_shares pgs ON p.id = pgs.page_id
    JOIN group_memberships gm ON pgs.group_id = gm.group_id
    WHERE gm.user_id = $userId::uuid
      AND p.visibility = 'private'
      AND p.deleted_at IS NULL

    UNION

    -- Path 4: Area-visible page where user has area access
    SELECT p.id
    FROM pages p
    JOIN areas a ON p.area_id = a.id
    LEFT JOIN spaces s ON a.space_id = s.id
    LEFT JOIN space_memberships sm ON s.id = sm.space_id AND sm.user_id = $userId
    LEFT JOIN area_memberships am ON a.id = am.area_id AND am.user_id = $userId
    WHERE p.visibility = 'area'
      AND p.deleted_at IS NULL
      AND a.deleted_at IS NULL
      AND (
          -- User owns the space
          s.user_id = $userId
          -- OR user has space membership (non-guest) for non-restricted areas
          OR (sm.user_id IS NOT NULL AND sm.role != 'guest' AND a.is_restricted = false)
          -- OR user has direct area membership
          OR am.user_id IS NOT NULL
          -- OR user created the area
          OR a.user_id = $userId
      )

    UNION

    -- Path 5: Space-visible page where user owns space
    SELECT p.id
    FROM pages p
    JOIN areas a ON p.area_id = a.id
    JOIN spaces s ON a.space_id = s.id
    WHERE p.visibility = 'space'
      AND s.user_id = $userId
      AND p.deleted_at IS NULL
      AND a.deleted_at IS NULL
      AND s.deleted_at IS NULL
)
SELECT p.*
FROM pages p
WHERE p.id IN (SELECT id FROM accessible_pages)
  AND p.area_id = $areaId  -- Optional filter
ORDER BY p.updated_at DESC
```

### Methods to Update

| Method | Change |
|--------|--------|
| `findAll()` | Replace simple query with CTE-based access-aware query |
| `search()` | Add same access control (user can only search pages they can access) |
| `count()` | Add same access control (accurate count of accessible pages) |

---

## Implementation Plan

### Phase 1: Update `findAll()` (~30-45 mins)

**File:** `src/lib/server/persistence/pages-postgres.ts`

1. Create helper function `buildAccessiblePagesQuery()` that returns the CTE
2. Update `findAll()` to use the CTE
3. Handle filter combinations (areaId, pageType, taskId)
4. Ensure camelCase column access in results

**Acceptance Criteria:**
- [ ] User sees their own pages (existing behavior preserved)
- [ ] User sees area-visible pages in areas they can access
- [ ] User sees private pages explicitly shared with them
- [ ] User sees private pages shared via groups they belong to
- [ ] User does NOT see pages in areas they cannot access
- [ ] Filter by areaId still works
- [ ] Filter by pageType still works
- [ ] Filter by taskId still works
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

### Phase 2: Update `search()` (~15 mins)

Apply same CTE pattern to search queries.

**Acceptance Criteria:**
- [ ] Search only returns pages user can access
- [ ] Search within area respects access control
- [ ] Full-text search still works correctly

### Phase 3: Update `count()` (~10 mins)

Apply same CTE pattern to count queries.

**Acceptance Criteria:**
- [ ] Count returns accurate number of accessible pages
- [ ] Count with areaId filter is accurate

### Phase 4: Testing (~15 mins)

Manual testing scenarios:
1. User A creates page, shares with area → User B (area member) sees it
2. User A creates private page, shares with User B → User B sees it
3. User A creates private page → User B does NOT see it
4. User A creates page in restricted area → User B (non-member) does NOT see it

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/server/persistence/pages-postgres.ts` | Update `findAll()`, `search()`, `count()` |

**No migrations needed** - this is a query logic fix, not a schema change.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Performance regression | CTE with UNION is efficient; indexes exist on `user_id`, `area_id`, `visibility` |
| Breaking existing behavior | Owners still see their pages first (Path 1 in UNION) |
| Missing edge cases | Access logic matches existing `canAccessPage()` algorithm |

---

## Testing Checklist

- [ ] Owner sees their own pages
- [ ] Area member sees area-visible pages
- [ ] Non-area-member does NOT see area-visible pages
- [ ] User with direct share sees private page
- [ ] User in shared group sees private page
- [ ] User without share does NOT see private page
- [ ] Space owner sees space-visible pages
- [ ] Deleted pages are not shown
- [ ] Deleted areas' pages are not shown (except to owner)
- [ ] Search respects access control
- [ ] Count respects access control
- [ ] TypeScript compiles (`npm run check`)
- [ ] Linting passes (`npm run lint`)

---

## Related Documentation

- **Page Sharing Architecture:** `docs/features/page-sharing-permissions-audit.md`
- **Page Sharing Testing:** `docs/features/page-sharing-testing-plan.md`
- **Area Access Control:** `src/lib/server/persistence/area-memberships-postgres.ts`
- **Postgres Patterns:** `.claude/skills/stratai-conventions/POSTGRES.md`
