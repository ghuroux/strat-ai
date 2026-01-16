# PRD: Page Listing Access Control Fix

> **Status:** Ready for Implementation
> **Created:** 2026-01-16
> **Parent Task:** page-listing-access-fix
> **Effort:** ~1-1.5 hours

---

## 1. Introduction/Overview

This is a bug fix for the page listing functionality. When pages are shared with an area (`visibility = 'area'`), area members cannot see them in the list view because `findAll()` only checks `user_id` instead of using the full access control logic.

### Problem Statement

The `findAll()` method in `pages-postgres.ts` only returns pages where `user_id = ${userId}`. This ignores:
- Pages with `visibility = 'area'` in areas the user can access
- Pages with `visibility = 'space'` in spaces the user can access
- Pages with `visibility = 'private'` that have explicit user/group shares

### Why `findById()` Works

`findById()` correctly uses `canUserAccessPage()` which checks all access pathways, so users can view pages via direct link but not find them in lists.

---

## 2. Research Findings

**Similar patterns found:**
- `src/lib/server/persistence/areas-postgres.ts` - `findAllAccessible()` uses CTE pattern with UNION for multiple access paths
- `src/lib/server/persistence/page-sharing-postgres.ts` - `canAccessPage()` defines the 5 access pathways

**Applicable patterns:**
- CTE-based query for collecting accessible IDs before filtering
- postgres.js camelCase transformation for all column access
- Existing access control algorithm already documented in spec

---

## 3. Goals

- Fix page listing so users see all pages they have access to (not just ones they own)
- Apply same access control to `search()` and `count()` methods
- No database schema changes - query logic fix only
- Maintain existing behavior for page owners

---

## 4. User Stories

### US-001: Update findAll() with CTE-based access control

**Description:** As an area member, I want to see pages shared with my area in the page list so that I can access all pages I have permission to view.

**What to do:**
- Create `buildAccessiblePagesQuery()` helper that returns CTE SQL for accessible page IDs
- CTE includes 5 access paths: owner, user_share, group_share, area_visibility, space_visibility
- Update `findAll()` to use the CTE instead of simple `user_id` check
- Handle all filter combinations (areaId, pageType, taskId)

**Files:**
- `src/lib/server/persistence/pages-postgres.ts`

**Acceptance Criteria:**
- [ ] Create buildAccessiblePagesQuery() helper that returns CTE SQL for accessible page IDs
- [ ] CTE includes 5 access paths: owner, user_share, group_share, area_visibility, space_visibility
- [ ] Update findAll() to use the CTE instead of simple user_id check
- [ ] Owner still sees their own pages (Path 1 in UNION)
- [ ] Area member sees area-visible pages in areas they can access
- [ ] User with direct share sees private pages shared with them
- [ ] User in shared group sees private pages via group membership
- [ ] Space owner sees space-visible pages
- [ ] User does NOT see pages in areas they cannot access
- [ ] Filter by areaId still works correctly
- [ ] Filter by pageType still works correctly
- [ ] Filter by taskId still works correctly
- [ ] Deleted pages (deleted_at IS NOT NULL) are excluded
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

**Notes:**
- Reference `areas-postgres.ts` → `findAllAccessible()` for CTE pattern
- SQL solution is provided in the spec document

---

### US-002: Update search() with access control

**Description:** As a user, I want search to only return pages I can access so that search results respect sharing permissions.

**What to do:**
- Reuse `buildAccessiblePagesQuery()` helper from US-001
- Update `search()` to filter results through accessible pages CTE
- Preserve full-text search ranking

**Files:**
- `src/lib/server/persistence/pages-postgres.ts`

**Acceptance Criteria:**
- [ ] Reuse buildAccessiblePagesQuery() helper from US-001
- [ ] search() filters results through accessible pages CTE
- [ ] Search only returns pages user can access
- [ ] Search within specific area respects access control
- [ ] Full-text search functionality still works correctly
- [ ] Search ranking is preserved
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

**Dependencies:** US-001

---

### US-003: Update count() with access control

**Description:** As a user, I want page counts to reflect only pages I can access so that UI counters are accurate.

**What to do:**
- Reuse `buildAccessiblePagesQuery()` helper from US-001
- Update `count()` to use the CTE

**Files:**
- `src/lib/server/persistence/pages-postgres.ts`

**Acceptance Criteria:**
- [ ] Reuse buildAccessiblePagesQuery() helper from US-001
- [ ] count() filters through accessible pages CTE
- [ ] Count returns accurate number of accessible pages
- [ ] Count with areaId filter is accurate
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

**Dependencies:** US-001

---

### US-004: Manual testing and verification

**Description:** As a developer, I want to verify all access control scenarios work correctly so that the fix is complete.

**What to do:**
- Test all access scenarios in browser
- Verify both positive and negative cases
- Document results

**Acceptance Criteria:**
- [ ] Test: User A creates page, shares with area -> User B (area member) sees it in list
- [ ] Test: User A creates private page, shares with User B -> User B sees it in list
- [ ] Test: User A creates private page -> User B does NOT see it in list
- [ ] Test: User A creates page in restricted area -> User B (non-member) does NOT see it
- [ ] Test: Owner sees their own pages regardless of visibility setting
- [ ] Test: Deleted pages are not shown to anyone
- [ ] Test: Search respects all access control rules
- [ ] Test: Count reflects accessible pages only
- [ ] All tests pass manually in browser

**Dependencies:** US-001, US-002, US-003

---

## 5. Functional Requirements

- **FR-1:** `findAll()` must return pages the user owns OR has access to via sharing
- **FR-2:** `search()` must only search within pages the user can access
- **FR-3:** `count()` must only count pages the user can access
- **FR-4:** All access control pathways from `canAccessPage()` must be replicated in list queries

---

## 6. Non-Goals

- Changing the access control algorithm (already correct in `canAccessPage()`)
- Database schema changes
- Performance optimization beyond necessary query structure
- UI changes

---

## 7. Technical Considerations

### Access Control Algorithm (from spec)

| Priority | Condition | Permission Source |
|----------|-----------|-------------------|
| 1 | User owns page (`user_id = userId`) | owner |
| 2 | `visibility = 'private'` + direct user share | user_share |
| 3 | `visibility = 'private'` + group share | group_share |
| 4 | `visibility = 'area'` + user has area access | area |
| 5 | `visibility = 'space'` + user owns space | space |

### CTE Query Structure

```sql
WITH accessible_pages AS (
    -- Path 1: User owns the page
    SELECT p.id FROM pages p WHERE p.user_id = $userId AND p.deleted_at IS NULL
    UNION
    -- Path 2: Private page with direct user share
    SELECT p.id FROM pages p
    JOIN page_user_shares pus ON p.id = pus.page_id
    WHERE pus.user_id = $userId AND p.visibility = 'private' AND p.deleted_at IS NULL
    UNION
    -- Path 3: Private page with group share
    SELECT p.id FROM pages p
    JOIN page_group_shares pgs ON p.id = pgs.page_id
    JOIN group_memberships gm ON pgs.group_id = gm.group_id
    WHERE gm.user_id = $userId::uuid AND p.visibility = 'private' AND p.deleted_at IS NULL
    UNION
    -- Path 4: Area-visible page where user has area access
    -- (includes space owner, space member for open areas, direct area member)
    UNION
    -- Path 5: Space-visible page where user owns space
)
SELECT p.* FROM pages p
WHERE p.id IN (SELECT id FROM accessible_pages)
  AND p.area_id = $areaId  -- Optional filter
ORDER BY p.updated_at DESC
```

### Existing Indexes

The spec notes that indexes already exist on `user_id`, `area_id`, and `visibility` columns.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Performance regression from complex CTE | UNION is efficient; existing indexes support the query; same pattern used in areas-postgres.ts |
| Breaking existing behavior | Owners still see their pages via Path 1 in UNION; backward compatible |
| Missing edge cases | Access logic exactly matches existing `canAccessPage()` algorithm |

---

## 9. Related Documentation

- **Spec:** `docs/features/PAGE_LISTING_ACCESS_FIX.md`
- **Page Sharing Architecture:** `docs/features/page-sharing-permissions-audit.md`
- **Area Access Control:** `src/lib/server/persistence/area-memberships-postgres.ts`
- **CTE Pattern Reference:** `src/lib/server/persistence/areas-postgres.ts` → `findAllAccessible()`
