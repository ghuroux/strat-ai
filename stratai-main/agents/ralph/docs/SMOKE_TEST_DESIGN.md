# Ralph Loop Smoke Test Design

## Overview

Automated smoke tests that run after each wave's TypeScript validation passes. These catch runtime/logic bugs that static analysis misses.

## Why We Need This

Phase 2 introduced two bugs that TypeScript couldn't catch:
1. **Login 500 error** - `?/default` is a reserved SvelteKit action name (runtime error)
2. **Settings button broken** - Modals placed inside `{:else if}` branch (logic error)

Both passed `npm run check` but broke the app at runtime.

## Test Categories

### 1. Critical Paths (Must Pass)
- [ ] App loads without console errors
- [ ] Login page renders
- [ ] Login form submits successfully
- [ ] Logout works
- [ ] Main chat page loads
- [ ] Space dashboard loads
- [ ] Settings panel opens (gear icon click)

### 2. Modal/Panel Functionality
- [ ] Space settings panel opens and closes
- [ ] Area modal opens (create area)
- [ ] Delete confirmation modals appear
- [ ] All modals close on Escape key
- [ ] All modals close on backdrop click

### 3. Core Interactions
- [ ] Send message button works
- [ ] New chat button works
- [ ] Navigation between spaces works
- [ ] Model selector dropdown opens

### 4. API Health
- [ ] GET /api/spaces returns 200
- [ ] GET /api/models returns 200
- [ ] GET /api/conversations returns 200

## Implementation Options

### Option A: Playwright E2E Tests (Recommended)

**Pros:**
- Real browser testing catches all runtime issues
- Can test actual user flows
- Runs headless in CI

**Cons:**
- Requires Playwright setup
- Slower (~30-60 seconds for smoke suite)
- Need test user credentials

**Example test:**

```typescript
// tests/smoke/login.spec.ts
import { test, expect } from '@playwright/test';

test('login flow works', async ({ page }) => {
  await page.goto('/login');

  // Check page loads without errors
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  // Fill and submit login form
  await page.fill('input[name="password"]', process.env.TEST_PASSWORD!);
  await page.click('button[type="submit"]');

  // Should redirect to home
  await expect(page).toHaveURL('/');

  // No console errors
  expect(errors).toHaveLength(0);
});

test('settings panel opens', async ({ page }) => {
  // Login first...
  await page.goto('/spaces/stratech-org');

  // Click settings gear
  await page.click('button[aria-label="Open settings"]');

  // Panel should be visible
  await expect(page.locator('aside[aria-label="Space Settings"]')).toBeVisible();
});
```

### Option B: API + DOM Smoke Tests (Lighter)

**Pros:**
- No browser needed
- Very fast (~5 seconds)
- Can run in Ralph's Node environment

**Cons:**
- Can't test actual UI interactions
- Limited to what we can check via API/fetch

**Example:**

```typescript
// agents/ralph/validation/smoke-test.ts
async function runSmokeTests(baseUrl: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Login page loads
  const loginRes = await fetch(`${baseUrl}/login`);
  results.push({
    name: 'Login page loads',
    passed: loginRes.ok && !loginRes.headers.get('x-sveltekit-error'),
    details: `Status: ${loginRes.status}`
  });

  // Test 2: API endpoints healthy
  const spacesRes = await fetch(`${baseUrl}/api/spaces`, {
    headers: { 'Cookie': sessionCookie }
  });
  results.push({
    name: 'Spaces API responds',
    passed: spacesRes.ok,
    details: `Status: ${spacesRes.status}`
  });

  return results;
}
```

### Option C: Hybrid (Recommended for Ralph)

1. **Quick API checks** after each wave (5 seconds)
2. **Full Playwright suite** at feature completion (60 seconds)

This gives fast feedback during development while ensuring full validation before merge.

## Integration with Ralph Loop

### In `orchestrator-prompt.md`:

```markdown
## Post-Wave Validation

After TypeScript check passes, run smoke tests:

1. Start dev server if not running
2. Run quick API smoke tests:
   - GET /login returns 200
   - POST /login with valid credentials succeeds
   - GET /api/spaces returns 200 (with session)
   - GET /api/models returns 200

3. If any fail, report failure and do NOT mark wave as complete

4. At feature completion, run full E2E smoke suite
```

### In `postflight.sh`:

```bash
# After npm run check passes
echo "Running smoke tests..."
npx tsx agents/ralph/validation/smoke-test.ts

if [ $? -ne 0 ]; then
  echo "❌ Smoke tests failed"
  exit 1
fi
echo "✅ Smoke tests passed"
```

## Test Credentials

For automated testing, need test user:
- Username: `smoke-test@stratai.local`
- Password: Set via `SMOKE_TEST_PASSWORD` env var
- Permissions: Basic member access

## Smoke Test Checklist (Manual Fallback)

If automation isn't ready, orchestrator can use this checklist:

```markdown
## Manual Smoke Test Checklist

Before marking feature complete, verify:

### Login/Auth
- [ ] Navigate to /login - page loads without errors
- [ ] Submit login form - redirects to home (no 500 error)
- [ ] Click Logout - redirects to login

### Navigation
- [ ] Click StratAI logo - goes to home
- [ ] Click space in nav - loads space dashboard
- [ ] Click area card - loads area chat

### Modals/Panels
- [ ] Click gear icon on space page - settings panel opens
- [ ] Click "Create Area" - modal opens
- [ ] Press Escape - modal/panel closes
- [ ] Click backdrop - modal/panel closes

### Chat
- [ ] Type message and send - message appears
- [ ] Model selector dropdown opens

If ANY fail, do not proceed with merge.
```

## Implementation Plan

### Phase 1: Manual Checklist (Immediate)
- Add checklist to orchestrator-prompt.md
- Orchestrator asks user to verify before completion

### Phase 2: API Smoke Tests (1-2 hours)
- Create `agents/ralph/validation/smoke-test.ts`
- Integrate into postflight.sh
- Tests: login page, API endpoints

### Phase 3: Playwright E2E (4-6 hours)
- Install Playwright
- Create smoke test suite
- Add to CI and Ralph validation
- Create test user

## Success Metrics

After implementation:
- Zero "works locally, breaks in prod" bugs
- Catch modal/routing bugs before merge
- < 60 second total validation time
