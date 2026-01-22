# Login Automation Learnings

> **Status:** Paused
> **Date:** 2026-01-22
> **Next Action:** Implement session persistence approach

---

## Summary

We attempted to automate Takealot login as part of the full purchase flow. Despite having a working discovery-first architecture that successfully found selectors, **login automation failed due to persistent popup interference**.

Current MVP: AI searches products → User clicks "Buy" → Opens retailer site in new tab (user completes purchase themselves).

---

## What We Built (Working)

| Component | Status | Notes |
|-----------|--------|-------|
| Discovery Agent | ✅ Working | AI explores sites, captures 70+ screenshots, generates playbooks |
| Playbook System | ✅ Working | Versioned JSON with selectors, confidence scores, fallbacks |
| Search Flow | ✅ Working | `commerce_search` finds products on Takealot/Amazon |
| Add to Cart | ✅ Working | Playwright verified `[data-ref="add-to-cart-button"]` works |
| Product Display | ✅ Working | ProductComparison renders in chat via SSE |
| **Login Flow** | ❌ Failed | Popup interference prevented completion |

---

## What Failed: Login Automation

### The Problem

```
Navigate to /account/login
        ↓
"NEVER MISS A DEAL" popup appears (newsletter signup)
        ↓
Attempts to dismiss fail
        ↓
Cannot interact with login form
```

### What We Tried

| Attempt | Code | Result |
|---------|------|--------|
| Click "NOT NOW" button | `button:has-text("NOT NOW")` | Closed entire page/modal |
| Click X button (SVG) | `button:has(svg path)` | Element not found or wrong element |
| Close by aria-label | `button[aria-label*="close"]` | Not found |
| Escape key | `page.keyboard.press('Escape')` | Inconsistent |
| Click at coordinates | `page.mouse.click(735, 235)` | Wrong position / popup moved |
| Direct navigation | Go straight to `/account/login` | Popup still appeared |

### Root Causes

1. **Unknown DOM structure** - We never captured what the popup actually looked like in the DOM
2. **Timing issues** - Popup loads asynchronously, timing varies
3. **No dismissal verification** - Didn't confirm popup was gone before proceeding
4. **Possible anti-bot** - Site may show different popups to automation

---

## Recommended Approaches for Next Iteration

### 1. Session State Persistence (Recommended First)

**Effort:** Low (30 min)
**Impact:** High - Completely bypasses login

```typescript
// setup-session.ts - Run ONCE manually
import { chromium } from 'playwright';

async function setupTakealotSession() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.takealot.com/account/login');

  console.log('👋 Please log in manually and dismiss any popups.');
  console.log('   Press Enter when you see your account name in the header...');

  // Wait for user to complete login
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // Verify logged in
  const accountElement = await page.$('[data-ref="account-menu"], .account-name, [href*="/account"]');
  if (!accountElement) {
    console.error('❌ Login verification failed. Please try again.');
    await browser.close();
    return;
  }

  // Save authenticated state
  const sessionPath = './sessions/takealot-auth.json';
  await context.storageState({ path: sessionPath });
  console.log(`✅ Session saved to ${sessionPath}`);
  console.log('   Future automation will skip login entirely.');

  await browser.close();
}

setupTakealotSession();
```

```typescript
// In adapter - load saved session
async function createAuthenticatedContext() {
  const sessionPath = './sessions/takealot-auth.json';

  if (existsSync(sessionPath)) {
    return await browser.newContext({
      storageState: sessionPath
    });
  }

  throw new Error('No saved session. Run setup-session.ts first.');
}
```

**Why this works:**
- User handles popups during one-time setup (they know how)
- Automation never sees login page again
- Session persists for weeks/months
- Zero popup complexity

---

### 2. Cookie Pre-seeding (For Popup Suppression)

**Effort:** Medium
**Impact:** Medium - Might suppress popups

```typescript
// Research needed: inspect cookies after manually dismissing popup
await context.addCookies([
  {
    name: 'newsletter_popup_dismissed',
    value: 'true',
    domain: '.takealot.com',
    path: '/'
  },
  {
    name: 'popup_shown_count',
    value: '5',
    domain: '.takealot.com',
    path: '/'
  }
]);
```

**Action needed:** Manually dismiss popup, inspect cookies in DevTools, identify which ones control popup display.

---

### 3. JavaScript Popup Blocker

**Effort:** Medium
**Impact:** High risk - Might break legitimate modals

```typescript
await page.addInitScript(() => {
  // Remove popups matching known patterns
  const observer = new MutationObserver(() => {
    const popups = document.querySelectorAll(
      '[class*="newsletter"], [class*="popup"], [class*="modal-overlay"]'
    );
    popups.forEach(el => {
      if (el.textContent?.includes('NEVER MISS A DEAL') ||
          el.textContent?.includes('Sign up for')) {
        el.remove();
        console.log('[Popup Blocker] Removed newsletter popup');
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
```

**Risk:** May accidentally remove the login modal itself.

---

### 4. Vision-Based Navigation (We Have This!)

**Effort:** Low - Already built in `browser-agent.ts`
**Impact:** High - Selector independent

```typescript
// Use existing BrowserAgent for popup handling
const agent = new BrowserAgent(page);

// Navigate to login
await page.goto('https://www.takealot.com/account/login');

// Let Claude handle the popup
const result = await agent.executeAction({
  type: 'click',
  description: 'Click the X button or close button to dismiss the newsletter popup'
});

// Then proceed with login
await agent.executeAction({
  type: 'type',
  selector: 'input[type="email"]',
  value: email
});
```

**Why we didn't try this:** We were using direct Playwright selectors instead of delegating to the vision agent.

---

### 5. Stealth Mode

**Effort:** Low
**Impact:** Unknown - Depends if anti-bot is the issue

```bash
npm install playwright-extra puppeteer-extra-plugin-stealth
```

```typescript
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

const browser = await chromium.launch();
// Now harder for sites to detect automation
```

---

### 6. Human-in-the-Loop Fallback

**Effort:** High (needs UI)
**Impact:** Guaranteed success for edge cases

```typescript
interface InterventionRequest {
  type: 'popup_detected' | 'captcha' | 'unknown_state';
  screenshot: string; // base64
  message: string;
}

async function requestHumanHelp(page: Page, reason: string): Promise<void> {
  const screenshot = await page.screenshot({ encoding: 'base64' });

  // Send to frontend via SSE
  sendSSE({
    type: 'intervention_needed',
    screenshot,
    message: `Automation stuck: ${reason}. Please help and click Continue.`
  });

  // Wait for user to signal completion
  await waitForUserContinue();
}
```

---

## File Structure for Implementation

```
mcp-commerce/
├── sessions/                    # Git-ignored, stores auth state
│   ├── takealot-auth.json
│   └── amazon-auth.json
├── scripts/
│   └── setup-session.ts         # One-time manual login
├── src/
│   ├── session-manager.ts       # Load/validate sessions
│   └── adapters/
│       └── takealot.ts          # Uses session if available
└── docs/
    └── LOGIN_AUTOMATION_LEARNINGS.md  # This file
```

---

## Priority Order for Next Session

1. **Session Persistence** - 30 min, highest impact, bypasses all popup issues
2. **Vision-Based Popup Handling** - We have the code, just need to wire it up
3. **Cookie Research** - 15 min of DevTools inspection might reveal easy win
4. **Stealth Plugin** - 5 min to try, might help if anti-bot is the issue

---

## Questions to Answer

- [ ] Does Takealot session expire? (Check cookie expiry)
- [ ] What cookies control the newsletter popup?
- [ ] Is the popup in an iframe or shadow DOM?
- [ ] Does stealth mode change what popups appear?
- [ ] Can we use Takealot's mobile site instead? (Often simpler)

---

## References

- `mcp-commerce/src/browser-agent.ts` - Vision-based automation (working)
- `mcp-commerce/src/test-login.ts` - Failed login attempts (for reference)
- `mcp-commerce/playbooks/takealot/` - Discovered selectors and screenshots
- Playwright storage state docs: https://playwright.dev/docs/auth
