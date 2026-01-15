# PRD: Phase A.1 - Area Visibility Fixes

> **Status:** ✅ COMPLETED
> **Completed:** 2026-01-15
> **Stories:** 6/6 complete
> **Parent Task ID:** phase-a1-area-visibility
> **Created:** 2026-01-15
> **Source Spec:** `stratai-main/docs/features/phase-a1-area-visibility-fixes.md`

---

## Introduction

When users are invited to spaces, they cannot see areas properly. This breaks the collaboration model and causes orphan data issues.

**Goal:** Fix area visibility so invited users can:
1. Always see the General area in any space they're a member of
2. See shared areas within their original space (not just in org view)

---

## Research Findings

**Similar Patterns Found:**
- `src/lib/server/persistence/areas-postgres.ts` - findAllAccessible CTE query pattern
- `src/lib/server/persistence/area-memberships-postgres.ts` - canAccessArea algorithm
- `src/lib/server/persistence/migrations/026-fix-general-areas.sql` - General area creation pattern
- `src/lib/server/persistence/migrations/027-area-sharing.sql` - area_memberships schema

**Key Findings:**
1. `findAllAccessible` query exists but is missing explicit `is_general` check for space members
2. Migration 026 creates missing General areas but doesn't add constraint preventing restriction
3. API endpoint allows `isRestricted=true` on General areas - no validation exists
4. `AreaAccessToggle.svelte` UI component doesn't check `isGeneral` before showing toggle
5. `areas-postgres.ts` update method has no guard against restricting General areas

**Applicable Patterns:**
- postgres.js camelCase transformation (snake_case columns -> camelCase properties)
- CTE query with multiple UNIONs for different access paths
- CHECK constraints for business rule enforcement at DB level

---

## Goals

- Ensure General areas are always visible to all space members
- Prevent General areas from being restricted (via UI, API, and database constraint)
- Fix shared areas to appear in their original space context for invited users
- Prevent orphan data when users delete areas

---

## User Stories

### US-001: Migration - Add General area protection constraint

**Description:** As a developer, I need a database migration to ensure General areas cannot be restricted and fix any existing misconfigured General areas.

**What to do:**
- Create migration `033-general-area-protection.sql`
- UPDATE any existing General areas with `is_restricted=true` to `false`
- Add CHECK constraint: `NOT (is_general = true AND is_restricted = true)`
- Add verification query

**Files:**
- `src/lib/server/persistence/migrations/033-general-area-protection.sql`

**Schema Context:**

| Column (snake_case) | Property (camelCase) | Type | Nullable |
|---------------------|----------------------|------|----------|
| is_general | isGeneral | boolean | NO |
| is_restricted | isRestricted | boolean | NO |

**Acceptance Criteria:**
- [ ] Migration 033-general-area-protection.sql created
- [ ] Any existing General areas with is_restricted=true are fixed to false
- [ ] CHECK constraint added: NOT (is_general = true AND is_restricted = true)
- [ ] Verification query shows 0 restricted General areas
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-002: Fix findAllAccessible query to include General areas

**Description:** As an invited user, I want to always see the General area in any space I'm a member of, so I have a fallback location for conversations.

**What to do:**
- Add UNION clause to `findAllAccessible` CTE for General areas
- Ensure query checks space membership (owner OR space_memberships)
- General areas should be visible regardless of restriction settings (they can't be restricted anyway)

**Files:**
- `src/lib/server/persistence/areas-postgres.ts`

**Key Query Pattern:**
```sql
-- General areas visible to all space members
SELECT DISTINCT a.id
FROM areas a
JOIN spaces s ON a.space_id = s.id
LEFT JOIN space_memberships sm ON s.id = sm.space_id AND sm.user_id = $userId
WHERE a.space_id = $spaceId
  AND a.deleted_at IS NULL
  AND a.is_general = true
  AND (s.user_id = $userId OR sm.user_id IS NOT NULL)
```

**Acceptance Criteria:**
- [ ] findAllAccessible CTE query includes UNION for General areas visible to space members
- [ ] General area appears first in results (existing ORDER BY preserved)
- [ ] Query uses is_general = true condition correctly
- [ ] Invited users see General area in spaces they're members of
- [ ] Query still excludes guests from non-restricted areas (existing behavior)
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-003: Repository - Prevent restricting General areas

**Description:** As a system, I need to prevent General areas from being restricted at the repository layer, so the business rule is enforced consistently.

**What to do:**
- Add validation in `update()` method before applying changes
- Check if area is General and if `isRestricted=true` is being set
- Throw descriptive error matching existing pattern

**Files:**
- `src/lib/server/persistence/areas-postgres.ts`

**Code Pattern:**
```typescript
// In update() method, after existing isGeneral check for name
if (existing.isGeneral && updates.isRestricted === true) {
  throw new Error('General area cannot be restricted');
}
```

**Acceptance Criteria:**
- [ ] update() method checks if area.isGeneral before allowing isRestricted change
- [ ] Throws descriptive error: 'General area cannot be restricted'
- [ ] Error message matches existing pattern for 'Cannot rename the General area'
- [ ] Non-General areas can still be restricted normally
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-004: API - Validate General area restriction attempts

**Description:** As an API consumer, I want clear error responses when attempting to restrict a General area, so I understand why the operation failed.

**What to do:**
- Add validation in PATCH handler before calling repository
- Fetch area to check `isGeneral` flag
- Return 400 with clear error message

**Files:**
- `src/routes/api/areas/[id]/+server.ts`

**Code Pattern:**
```typescript
// In PATCH handler, after access check
if (body.isRestricted === true) {
  const existingArea = await postgresAreaRepository.findById(params.id, userId);
  if (existingArea?.isGeneral) {
    return json(
      { error: 'General area cannot be restricted' },
      { status: 400 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] PATCH endpoint checks if area is General when isRestricted=true is requested
- [ ] Returns 400 status with error message 'General area cannot be restricted'
- [ ] Error is handled before calling repository (fail fast)
- [ ] Normal restriction requests for non-General areas still work
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-005: UI - Hide access toggle for General areas

**Description:** As a user, I should not see the option to restrict a General area, so I'm not confused by an action that will fail.

**What to do:**
- Add `isGeneral` prop to `AreaAccessToggle`
- When `isGeneral=true`, hide toggle and show info message
- Update `ShareAreaModal` to pass `isGeneral` prop

**Files:**
- `src/lib/components/areas/AreaAccessToggle.svelte`
- `src/lib/components/areas/ShareAreaModal.svelte`

**UI Pattern:**
```svelte
{#if isGeneral}
  <div class="general-area-info">
    <Info size={16} />
    <p>The General area is always accessible to all space members.</p>
  </div>
{:else}
  <!-- existing toggle code -->
{/if}
```

**Acceptance Criteria:**
- [ ] AreaAccessToggle receives isGeneral prop
- [ ] When isGeneral=true, toggle is hidden and info message displayed
- [ ] Info message: 'The General area is always accessible to all space members.'
- [ ] ShareAreaModal passes isGeneral to AreaAccessToggle
- [ ] Non-General areas show toggle normally
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-006: Integration test - Invited user area visibility

**Description:** As a QA engineer, I need to verify all visibility scenarios work correctly end-to-end.

**What to do:**
- Test all scenarios from spec document
- Verify via browser testing
- Document results

**Test Scenarios:**

1. **Scenario 1: Invited User Sees General**
   - Setup: User A creates "Work" space, invites User B
   - Test: B opens "Work" space
   - Expected: B sees "General" area in the area list

2. **Scenario 2: Shared Area Appears in Original Space**
   - Setup: A creates restricted "Project X", shares with B via area_membership
   - Test: B opens "Work" space
   - Expected: B sees "General" and "Project X"

3. **Scenario 3: Area Deletion Works for Invited User**
   - Setup: B creates "My Area" in A's space with conversations
   - Test: B deletes "My Area"
   - Expected: Conversations move to General (which B can access)

4. **Scenario 4: Cannot Restrict General**
   - Test: A tries to restrict General area
   - Expected: API returns error, UI doesn't show toggle

**Acceptance Criteria:**
- [ ] Scenario 1: Invited user sees General area in invited space
- [ ] Scenario 2: User with area_membership sees shared area in original space
- [ ] Scenario 3: User can delete their own areas (conversations move to accessible General)
- [ ] Scenario 4: Cannot restrict General area via UI or API
- [ ] All test scenarios from spec document pass
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] Manual browser verification completed

---

## Non-Goals

- Modifying the Guest role behavior (they still only see explicitly shared areas)
- Changing the area deletion logic (conversations still move to General)
- Adding new area types or visibility levels
- Cross-space area visibility

---

## Technical Considerations

- **Database Constraint:** The CHECK constraint provides defense-in-depth at the DB level
- **Query Performance:** The additional UNION in findAllAccessible adds minimal overhead (is_general is indexed)
- **Backwards Compatibility:** Existing General areas remain accessible; migration fixes any misconfigured ones
- **postgres.js Convention:** All column access uses camelCase (isGeneral, isRestricted)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Existing restricted General areas in production | Migration fixes them automatically |
| Query performance degradation | is_general is already indexed; UNION is efficient |
| UI state desync after failed restriction | API validates before repository; clear error messages |

---

## Dependencies

- **Phase 0** (User Schema) - Not strictly required but helpful
- **Phase A** (Member Management) - Required for inviting users

---

## Estimated Effort

**Total: 0.5-1 day**

| Story | Effort |
|-------|--------|
| US-001 Migration | 1 hour |
| US-002 Query fix | 2-3 hours |
| US-003 Repository validation | 30 min |
| US-004 API validation | 30 min |
| US-005 UI changes | 1 hour |
| US-006 Testing | 2 hours |
