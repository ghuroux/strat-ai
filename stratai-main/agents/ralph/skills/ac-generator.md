---
name: ac-generator
description: "Generate acceptance criteria with all required gates. Use when creating stories. Triggers on: acceptance criteria, AC, story, user story, requirements, criteria."
---

# Acceptance Criteria Generator

## Purpose

Generate complete, verifiable acceptance criteria for user stories. Ensures all required quality gates are included and criteria are specific enough for automated verification.

## Rules

1. **ALL stories** get: `npm run check`, `npm run lint`
2. **DB stories** get: `npm run audit-db-access`, row interface example
3. **UI stories** get: browser verification instructions
4. **API stories** get: auth checks, status code expectations

## Quality Gates (Always Include)

```markdown
- [ ] `npm run check` passes (0 TypeScript errors)
- [ ] `npm run lint` passes (0 lint errors)
```

---

## Templates by Story Type

### Database Migration Story

```markdown
**Acceptance Criteria:**
- [ ] Migration file created: `NNN-description.sql`
- [ ] Table has correct columns:
  - `id` (UUID PRIMARY KEY)
  - `[column_name]` ([TYPE] [CONSTRAINTS])
  - `created_at` (TIMESTAMPTZ DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ DEFAULT NOW())
- [ ] Indexes created for common query patterns
- [ ] Foreign key constraints with appropriate ON DELETE behavior
- [ ] Migration runs without errors: `npm run db:migrate`
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
```

### Repository Story

```markdown
**Acceptance Criteria:**
- [ ] Repository file created: `entity-postgres.ts`
- [ ] Row interface uses camelCase (postgres.js transformation):
  ```typescript
  interface EntityRow {
    id: string;
    userId: string;           // NOT user_id
    displayName: string | null;  // Nullable column
    createdAt: Date;
  }
  ```
- [ ] Row converter function handles nullable columns with `??`:
  ```typescript
  function rowToEntity(row: EntityRow): Entity {
    return {
      id: row.id,
      userId: row.userId,
      displayName: row.displayName ?? null,
      createdAt: row.createdAt
    };
  }
  ```
- [ ] CRUD methods implemented: findById, findAll, create, update, delete
- [ ] Repository exported from `persistence/index.ts`
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm run audit-db-access` shows 0 violations in this file
```

### API Endpoint Story

```markdown
**Acceptance Criteria:**
- [ ] Endpoint created: `src/routes/api/[resource]/[id]/+server.ts`
- [ ] Auth check: Returns 401 if `!locals.user`
- [ ] Not found: Returns 404 if resource doesn't exist
- [ ] Permission check: Returns 403 if user lacks access
- [ ] Success: Returns 200 with correct response shape
- [ ] Request validation: Returns 400 for invalid input
- [ ] Response shape matches TypeScript types
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

**Test scenarios:**
- Unauthenticated request → 401
- Authenticated, resource exists, has access → 200 with data
- Authenticated, resource doesn't exist → 404
- Authenticated, resource exists, no access → 403
```

### UI Component Story

```markdown
**Acceptance Criteria:**
- [ ] Component created: `src/lib/components/[Name].svelte`
- [ ] Props interface defined with TypeScript
- [ ] Component renders correctly with sample data
- [ ] Loading state handled (if applicable)
- [ ] Error state handled (if applicable)
- [ ] Empty state handled (if applicable)
- [ ] Accessibility: proper ARIA labels, keyboard navigation
- [ ] Responsive: works on mobile (< 768px)
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] **Verify in browser:**
  - Use `take_snapshot` to verify element structure
  - Confirm text content appears correctly
  - Test interactions (clicks, inputs)
```

### UI Page Story

```markdown
**Acceptance Criteria:**
- [ ] Page created: `src/routes/[path]/+page.svelte`
- [ ] Load function fetches required data: `+page.server.ts`
- [ ] Auth guard: redirects if not authenticated
- [ ] Page renders with fetched data
- [ ] Loading state shown while fetching
- [ ] Error boundary handles failures
- [ ] SEO: appropriate title and meta tags
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] **Verify in browser:**
  - Navigate to page URL
  - Use `take_snapshot` to verify content structure
  - Confirm data displays correctly
```

### Service/Utility Story

```markdown
**Acceptance Criteria:**
- [ ] Service created: `src/lib/services/[name].ts`
- [ ] Public interface exported with TypeScript types
- [ ] Pure functions where possible (no side effects)
- [ ] Error cases handled and typed
- [ ] Unit tests cover main functionality
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
```

### Refactoring Story

```markdown
**Acceptance Criteria:**
- [ ] Refactoring complete without changing behavior
- [ ] All existing tests still pass
- [ ] No new TypeScript errors introduced
- [ ] No new lint errors introduced
- [ ] If DB code: no new `audit-db-access` violations
- [ ] Code is simpler/cleaner than before
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
```

### Bug Fix Story

```markdown
**Acceptance Criteria:**
- [ ] Root cause identified and documented
- [ ] Fix applied without side effects
- [ ] Regression test added to prevent recurrence
- [ ] Related code reviewed for similar issues
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Manual verification: [specific steps to verify fix]
```

---

## Writing Good Acceptance Criteria

### DO ✅

- Be specific and verifiable
- Include code examples for DB/API work
- Specify exact status codes and response shapes
- Include all quality gates
- Add browser verification for UI work

### DON'T ❌

- Use vague terms like "works correctly"
- Skip quality gates
- Forget null handling requirements
- Leave out auth/permission checks
- Omit browser verification for UI stories

---

## Examples

### Good AC

```markdown
- [ ] Column `model_id` is TEXT PRIMARY KEY (not UUID)
- [ ] Row interface uses `modelId` (camelCase, not `model_id`)
- [ ] Returns 401 if `!locals.user`
- [ ] Returns 404 if model not found
- [ ] `npm run audit-db-access` shows 0 violations
```

### Bad AC

```markdown
- [ ] Works correctly
- [ ] Handles errors
- [ ] Good UX
- [ ] Database is set up
```

---

## Browser Verification Instructions

For UI stories, include specific verification steps:

### Functional Testing (behavior)

```markdown
**Verify in browser:**
1. Navigate to [URL]
2. Use `take_snapshot` to capture accessibility tree
3. Verify element with text "[expected text]" exists
4. Click button "[button name]"
5. Verify [expected result]
```

### Visual Testing (appearance)

```markdown
**Verify in browser:**
1. Navigate to [URL]
2. Use `take_screenshot` to capture page
3. Verify layout matches design
4. Verify colors and styling are correct
```

---

## Reference

- **Quality gates:** `AGENT_WORKFLOW.md`
- **DB patterns:** `DATABASE_STANDARDIZATION_PROJECT.md`
- **Browser verification:** `agents/ralph/skills/dev-browser.md`

