# Smoke Test Plan

Comprehensive plan for end-to-end smoke test coverage of StratAI, organized in 3 phases by priority.

**Last updated:** 2026-01-31
**Current state:** 51 tests across 3 tiers (Phase 2 complete, Phase 3 partial)
**Infrastructure:** Playwright + tiered npm scripts + Ralph validation integration

---

## Test Tiers

| Tier | Purpose | On Failure |
|------|---------|------------|
| T1 Critical | App is usable at all | **ABORT** deployment |
| T2 Core | Key features work | **BLOCK** completion |
| T3 UX | Polish interactions | **WARN** only |

---

## Phase 0: Baseline (Complete)

32 existing tests established before this plan.

### T1 Critical (10 tests)
- Login page loads, login succeeds, logout redirects
- Main page loads, space page loads
- Session persists on protected routes, unauthenticated redirects
- API health: /api/spaces, /api/models, /api/conversations

### T2 Core (9 tests)
- Chat input visible + accepts text, send button enabled
- Space navigation, area section visible, create area button exists
- Model selector exists, header nav works, space switching, home link
- Task section exists

### T3 UX (13 tests)
- Settings panel open/close
- Modal open/close/escape/backdrop
- Sidebar toggle (mobile)
- User menu accessible
- Loading states, no horizontal overflow (desktop + mobile)
- Tab key focus

---

## Phase 1: Auth Hardening & Session Changes (Priority: NOW)

Tests for changes made in the bcrypt migration + legacy auth removal session.

### Prerequisites
- [x] Fix auth helper (`tests/smoke/helpers/auth.ts`) — admin path must fill username
- [x] Add `TEST_ADMIN_USERNAME` env var support
- [x] Clean up `.env.example` — remove stale ADMIN_PASSWORD / USER_TESTER_PASSWORD references

### New T1 Tests (7 tests)

| # | Test | What it validates |
|---|------|-------------------|
| 1 | `login with invalid credentials shows error` | Red error banner on wrong password |
| 2 | `forgot password page loads` | Recovery path accessible |
| 3 | `forgot password form submits` | Email submission shows confirmation |
| 4 | `settings page loads without errors` | Protected route, no JS errors |
| 5 | `admin overview page loads without errors` | Admin route, no JS errors |
| 6 | `admin members page loads without errors` | Admin route, no JS errors |
| 7 | `password reset API returns 200` | Auth API health |

### Notes
- Force password reset banner test deferred — requires a DB user in forced-reset state, which is complex for automated tests. Manual QA covers this.
- Bcrypt login is implicitly tested by the existing `login succeeds with valid credentials` test — all passwords are now bcrypt.

---

## Phase 2: Core Workflow Coverage (Complete ✓)

End-to-end tests for the main user workflows. These go beyond "element exists" to "workflow completes."

**Completed:** 2026-01-31 — 10 new T2 tests added to `tier2-core.spec.ts`

### T2 Tests Added (10 tests)

| # | Test | Flow |
|---|------|------|
| 1 | `chat message sends and gets streaming response` | Navigate to area → type message → send → wait for `.message-assistant` or stop button |
| 2 | `space creation flow completes` | `/spaces` → click Create Space → fill name → submit → redirect to new space |
| 3 | `area creation form submits successfully` | Space dashboard → click Create Area → fill name → submit → redirect to new area |
| 4 | `page creation in area completes` | Area → Pages → New Page → select Blank Document → fill title → create → editor loads |
| 5 | `context panel opens and closes` | Area chat → click Context toggle → panel visible → Escape → panel hidden |
| 6 | `conversation drawer opens and closes` | Area chat → click Conversations toggle → drawer visible → Escape → drawer hidden |
| 7 | `model selector changes model` | Area chat (no messages) → click AUTO → select different model → button text changes |
| 8 | `command palette opens and accepts search` | Any page → Cmd+K → palette opens → type query → Escape → palette closes |
| 9 | `error page shows recovery options on 404` | `/spaces/nonexistent-slug` → error page → click "All Spaces" → navigate to `/spaces` |
| 10 | `member invitation form submits` | Admin → `/admin/members` → Add User → fill form → Create User → modal closes |
| 11 | `smoke test space can be deleted` | `/spaces` → find Smoke Test Space → settings → Delete this space → confirm → redirect to `/spaces` |

### Design Decisions
- **Error test**: Uses 404 navigation (deterministic) instead of forced component error (fragile)
- **Search test**: Tests Command Palette (`Cmd+K`) which is the actual search/navigation feature
- **Chat test**: Uses `test.slow()` for LLM timeout; checks for response start, not content
- **Test data**: Uses `Date.now()` suffixes for created entities to avoid conflicts
- **Shared helper**: `navigateToArea()` function reused by 5 tests for consistent area navigation
- **Space cleanup**: Deletion test runs after creation test; prevents `MAX_CUSTOM_SPACES` (5) limit from blocking future creation tests

---

## Phase 3: Polish & Edge Cases (Partial ✓)

UX polish tests and less critical feature coverage.

**Completed:** 2026-01-31 — 3 new T3 tests added to `tier3-ux.spec.ts` (cherry-picked highest value)

### T3 Tests Added (3 tests)

| # | Test | Flow |
|---|------|------|
| 1 | `theme toggle persists preference` | Settings → Appearance → click different theme → reload → verify persisted |
| 2 | `arena page loads without errors` | `/arena` → verify "Model Arena" heading renders |
| 3 | `task creation from space dashboard completes` | Space dashboard → Add task → fill title → Create Task → modal closes |

### Remaining (not implemented — low priority)

| # | Test | Reason Deferred |
|---|------|-----------------|
| 1 | `toast notifications appear on errors` | Fragile — hard to trigger errors deterministically |
| 2 | `Snake game loads and is playable` | Low priority — fun feature, not core |
| 3 | `Wordle game loads and is playable` | Low priority — fun feature, not core |
| 4 | `second opinion panel toggle` | Needs investigation on current UI state |
| 5 | `calendar integration status` | Environment-dependent — will skip without calendar configured |

---

## Auth Helper Architecture

### Environment Variables

```bash
# Required for smoke tests
TEST_ADMIN_USERNAME=admin          # Admin username (defaults to 'admin')
TEST_ADMIN_PASSWORD=your-password  # Admin password (bcrypt in DB)
TEST_USER_USERNAME=tester          # Regular user username
TEST_USER_PASSWORD=your-password   # Regular user password (bcrypt in DB)
```

### Test User Setup

Both test users must exist in the database with bcrypt passwords:
```sql
-- Verify test users exist
SELECT username, email, role, status FROM users
WHERE username IN ('admin', 'tester') AND deleted_at IS NULL;
```

### Auth Helper Pattern

```typescript
// All paths fill username + password (no legacy env var bypass)
await page.fill('input[name="username"]', username);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
```

---

## Coverage Gap Summary

### After Phase 1 (37 tests total)
- Auth flows: **strong** — login, logout, invalid creds, forgot password, session
- Page loads: **strong** — home, space, settings, admin overview, admin members
- API health: **good** — 4 endpoints
- Core workflows: **weak** — no end-to-end flows yet

### After Phase 3 partial (51 tests total) ← Current
- Auth flows: **strong** — 17 T1 tests
- Page loads: **strong**
- API health: **good** — 4 endpoints
- Core workflows: **good** — 20 T2 tests (chat streaming, space/area/page creation + deletion, panels, model selection, command palette, error recovery, admin member invitation)
- UX polish: **good** — 14 T3 tests (settings, modals, sidebar, overflow, keyboard, theme persistence, arena, task creation)

---

## Running Tests

```bash
# All tiers
npm run test:smoke

# Individual tiers
npm run test:smoke:tier1    # Critical — abort on failure
npm run test:smoke:tier2    # Core — block on failure
npm run test:smoke:tier3    # UX — warn on failure

# Debug mode
npm run test:smoke:headed   # Visible browser
npm run test:smoke:ui       # Playwright UI

# Ralph validation (runs tiered with abort/block/warn logic)
agents/ralph/validation/smoke-test.sh
```

---

## Maintenance

When adding new features:
1. Check this plan for relevant Phase 2/3 tests to implement
2. Follow the tier classification from `.claude/skills/writing-smoke-tests/SKILL.md`
3. Use stable selectors (aria-labels, data-testid, title attributes)
4. Add `test.skip()` for permission-dependent features
5. Update this plan when phases complete
