---
name: writing-smoke-tests
description: |
  Use when implementing MAJOR features that need browser-based smoke tests.
  MANDATORY for: New user flows, authentication changes, navigation changes, modal/panel additions.
  READ THIS SKILL before creating Playwright tests.
  Covers: Test structure, tier classification, selectors, auth helpers, common patterns.
globs:
  - "tests/smoke/**/*.spec.ts"
  - "tests/smoke/helpers/*.ts"
---

# Writing Playwright Smoke Tests

## When to Write Smoke Tests

Write smoke tests for **major features** that:
- Involve user authentication flows
- Add new pages or routes
- Introduce modals, panels, or overlays
- Change navigation structure
- Add forms with server actions
- Implement real-time features (streaming, WebSockets)

**Don't write smoke tests for:**
- Backend-only changes (use unit tests)
- Minor styling tweaks
- Internal refactoring with no UI impact

## Test Directory Structure

```
tests/smoke/
├── helpers/
│   └── auth.ts              # Login/logout helpers
├── tier1-critical.spec.ts   # Must pass or ABORT deploy
├── tier2-core.spec.ts       # Must pass or BLOCK completion
└── tier3-ux.spec.ts         # Warn on fail, don't block
```

## Tier Classification

### Tier 1: Critical Path (Abort on Failure)

Tests that verify the app is **usable at all**:

| Test Type | Examples |
|-----------|----------|
| Authentication | Login succeeds, logout works, session persists |
| Page Loads | Home loads, space loads, no 500 errors |
| API Health | /api/spaces returns 200, /api/models returns 200 |

```typescript
// tier1-critical.spec.ts
test('login succeeds with valid credentials', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await loginAs(page, 'tester');

    // Should not be on login page
    await expect(page).not.toHaveURL(/\/login/);

    // No 500 errors
    await expect(page.locator('text=Error 500')).not.toBeVisible();

    // No JavaScript errors
    expect(errors).toHaveLength(0);
});
```

### Tier 2: Core Functionality (Block on Failure)

Tests that verify **key features work**:

| Test Type | Examples |
|-----------|----------|
| Chat | Input visible, send button works |
| Navigation | Header links work, space navigation works |
| CRUD | Create area button exists, task section visible |

```typescript
// tier2-core.spec.ts
test('send button exists and is enabled when there is text', async ({ page }) => {
    await page.goto('/');

    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill('Test message');

    // Use title attribute for icon-only buttons
    const sendButton = page.locator('button[title="Send message"]');
    await expect(sendButton).toBeVisible();
});
```

### Tier 3: UX Polish (Warn on Failure)

Tests for **nice-to-have interactions**:

| Test Type | Examples |
|-----------|----------|
| Modals | Opens on click, closes on Escape, closes on backdrop |
| Settings | Panel opens, preferences save |
| Mobile | Sidebar toggles, no horizontal overflow |
| Keyboard | Tab navigation, focus states |

```typescript
// tier3-ux.spec.ts
test('modal closes on Escape key', async ({ page }) => {
    // Navigate to trigger a modal
    await page.goto('/spaces/my-space');

    const createButton = page.locator('text=Create Area');
    if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip();  // Skip if user doesn't have permissions
        return;
    }

    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');

    await expect(modal).not.toBeVisible({ timeout: 3000 });
});
```

## Auth Helper Usage

```typescript
import { loginAs, logout, ensureLoggedIn } from './helpers/auth';

// Login as test user
await loginAs(page, 'tester');

// Login as admin
await loginAs(page, 'admin');

// Logout current user
await logout(page);

// Login only if not already logged in
await ensureLoggedIn(page, 'tester');
```

**Required environment variables:**
```bash
TEST_ADMIN_PASSWORD=your-admin-password
TEST_USER_PASSWORD=your-test-user-password
TEST_USER_USERNAME=tester
```

## Selector Best Practices

### Prefer Stable Selectors

```typescript
// ✅ GOOD - Stable, semantic selectors
page.locator('button[title="Send message"]')
page.locator('button[aria-label="Open settings"]')
page.locator('aside[aria-label="Space Settings"]')
page.locator('[role="dialog"]')
page.locator('a[href^="/spaces/"]')

// ❌ AVOID - Brittle selectors
page.locator('.btn-primary')  // Class names change
page.locator('div > div > button')  // Structure changes
page.locator('button:nth-child(3)')  // Order changes
```

### Handle Multiple Elements

```typescript
// ✅ GOOD - Use .first() when multiple elements match
const sidebarToggle = page.locator('button[aria-label="Toggle sidebar"]').first();

// ✅ GOOD - Use .filter() for specificity
const sendButton = page.locator('button').filter({ hasText: /send/i });

// ❌ BAD - Strict mode violation if multiple match
const toggle = page.locator('button[aria-label="Toggle sidebar"]');
await toggle.click();  // Fails if 2+ elements match
```

### Check Visibility Safely

```typescript
// ✅ GOOD - Catch visibility check failures
if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
    await element.click();
}

// ✅ GOOD - Skip test if element not available
if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
    test.skip();
    return;
}
```

## Test Template: New Feature

When adding a major feature, create tests across all 3 tiers:

```typescript
// 1. Add Tier 1 test: Page loads
test('feature page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await loginAs(page, 'tester');
    await page.goto('/feature');

    await expect(page).toHaveURL(/\/feature/);
    await expect(page.locator('body')).not.toBeEmpty();
    expect(errors).toHaveLength(0);
});

// 2. Add Tier 2 test: Core interaction works
test('feature main action works', async ({ page }) => {
    await loginAs(page, 'tester');
    await page.goto('/feature');

    const actionButton = page.locator('button[title="Do Action"]');
    await expect(actionButton).toBeVisible();
    await actionButton.click();

    // Verify result
    await expect(page.locator('text=Action Complete')).toBeVisible();
});

// 3. Add Tier 3 test: UX polish
test('feature modal closes on escape', async ({ page }) => {
    await loginAs(page, 'tester');
    await page.goto('/feature');

    await page.locator('text=Open Modal').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
});
```

## Common Patterns

### Wait for Network Idle

```typescript
await page.goto('/');
await page.waitForLoadState('networkidle');
```

### Check for No Horizontal Overflow

```typescript
test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
});
```

### Test Form Submission

```typescript
test('form submits successfully', async ({ page }) => {
    await loginAs(page, 'tester');
    await page.goto('/create');

    await page.fill('input[name="title"]', 'Test Title');
    await page.fill('textarea[name="description"]', 'Test description');
    await page.click('button[type="submit"]');

    // Check for success indicator
    await expect(page.locator('text=Created successfully')).toBeVisible({ timeout: 5000 });
});
```

### Test Error States

```typescript
test('shows error on invalid input', async ({ page }) => {
    await loginAs(page, 'tester');
    await page.goto('/create');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator('text=Title is required')).toBeVisible();
});
```

## Running Tests

```bash
# All smoke tests
npm run test:smoke

# Specific tier
npm run test:smoke:tier1
npm run test:smoke:tier2
npm run test:smoke:tier3

# With visible browser (debugging)
npm run test:smoke:headed

# Interactive UI
npm run test:smoke:ui
```

## Checklist: Adding Smoke Tests

### Before Writing
- [ ] Is this a major feature? (auth, navigation, modals, new pages)
- [ ] Which tier(s) need tests?
- [ ] What selectors will be stable?

### Tier 1 (Critical)
- [ ] Page loads without errors
- [ ] No JavaScript console errors
- [ ] Authentication works if required
- [ ] API endpoints return 200

### Tier 2 (Core)
- [ ] Main user action works
- [ ] Key UI elements visible
- [ ] Navigation functions correctly
- [ ] Form submission works

### Tier 3 (UX)
- [ ] Modal/panel opens and closes
- [ ] Keyboard shortcuts work
- [ ] Mobile viewport works
- [ ] Loading states appear

### After Writing
- [ ] Tests pass locally: `npm run test:smoke`
- [ ] Tests skip gracefully when permissions missing
- [ ] No flaky tests (run 3x to verify)

## Debugging Failed Tests

### View Test Report
```bash
npx playwright show-report
```

### View Trace for Failed Test
```bash
npx playwright show-trace test-results/[test-folder]/trace.zip
```

### Run Single Test with Debug
```bash
npx playwright test -g "test name" --debug
```

### Check Error Context
Each failed test creates:
- `test-failed-1.png` - Screenshot at failure
- `video.webm` - Recording of the test
- `error-context.md` - DOM snapshot
- `trace.zip` - Full execution trace

## File Reference

**Existing tests to learn from:**
- `tests/smoke/tier1-critical.spec.ts` - Auth flow, page loads, API health
- `tests/smoke/tier2-core.spec.ts` - Chat, navigation, areas
- `tests/smoke/tier3-ux.spec.ts` - Settings panel, modals, mobile

**Configuration:**
- `playwright.config.ts` - Test configuration, browser setup, web server

**Ralph Integration:**
- `agents/ralph/validation/smoke-test.sh` - Tiered test runner for Ralph loop
