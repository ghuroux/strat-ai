# Agentic Commerce Specification

> **Version**: 1.0.0
> **Status**: Approved for POC
> **Date**: 2026-01-21
> **Authors**: Gabriel Roux, Claude (Co-PM)

---

## Executive Summary

StratAI's Agentic Commerce enables users to search, compare, and purchase products from multiple e-commerce platforms directly within the chat interface. The AI handles product discovery, comparison, and purchase execution via browser automation.

**Core Value Proposition**: Natural language shopping with 1-click purchasing across multiple merchants.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Happy Path POC](#phase-1-happy-path-poc)
3. [Phase 2: Progressive Disclosure Module](#phase-2-progressive-disclosure-module)
4. [Phase 3: Authentication Strategy](#phase-3-authentication-strategy)
5. [User Experience Design](#user-experience-design)
6. [Technical Implementation](#technical-implementation)
7. [Error Handling](#error-handling)
8. [Test Plan](#test-plan)
9. [Security Considerations](#security-considerations)
10. [Future Roadmap](#future-roadmap)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────────────┐    │
│   │  StratAI    │      │    MCP      │      │    Playwright       │    │
│   │  Frontend   │◄────►│  Commerce   │◄────►│    Browser          │    │
│   │  (SvelteKit)│      │  Server     │      │    Automation       │    │
│   └─────────────┘      └──────┬──────┘      └──────────┬──────────┘    │
│         │                     │                        │               │
│         │              ┌──────┴──────┐         ┌───────┴───────┐      │
│         │              │ Credential  │         │   Merchant    │      │
│         │              │ Storage     │         │   Websites    │      │
│         │              │ (.env)      │         │ (Takealot,    │      │
│         │              └─────────────┘         │  Amazon)      │      │
│         │                                      └───────────────┘      │
│         │                                              │               │
│         │                                      ┌───────┴───────┐      │
│         └──────────────────────────────────────│   3D Secure   │      │
│                    (User approves in           │   (Bank App)  │      │
│                     banking app)               └───────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **StratAI Frontend** | `stratai-main/` | Chat UI, product cards, buy modal, user interactions |
| **MCP Commerce Server** | `mcp-commerce/` | Browser automation, purchase execution, status reporting |
| **Playwright Browser** | Managed by MCP | Actual navigation and form submission on merchant sites |
| **Credential Storage** | `.env.local` | Secure storage of merchant credentials |

---

## Phase 1: Happy Path POC

### Goal

Prove end-to-end purchase flow works with real transactions.

### Prerequisites

- User has Takealot account with default address and payment method
- User has Amazon account with default address and payment method
- Credentials stored in `.env.local`

### Flow

```
User searches "desktop speakers under R2000"
         │
         ▼
AI returns product grid (tiered by price)
         │
         ▼
User clicks "Buy" on product card
         │
         ▼
Confirmation modal appears
"Buy [Product Name] for R199 from Takealot?"
         │
         ▼
User confirms
         │
         ▼
Modal shows progress:
├── Adding to cart...
├── Proceeding to checkout...
└── Awaiting payment approval...
         │
         ▼
3D Secure prompt (user approves in banking app)
         │
         ▼
Success state with order reference
         │
         ▼
AI confirms in chat: "Your purchase is complete!"
```

### Deliverables

- [ ] `/buy` endpoint in MCP Commerce server
- [ ] Takealot purchase automation (Playwright)
- [ ] Amazon purchase automation (Playwright)
- [ ] Buy confirmation modal in StratAI
- [ ] Progress/status display
- [ ] Success/error states
- [ ] AI confirmation message (no user prompt in chat history)

---

## Phase 2: Progressive Disclosure Module

### Concept

A configurable "readiness checker" that validates user can complete purchase and guides them through setup if not.

### User Readiness Matrix

| Has Account? | Has Address? | Has Payment? | Can 1-Click? |
|--------------|--------------|--------------|--------------|
| ❌ No        | -            | -            | ❌           |
| ✅ Yes       | ❌ No        | -            | ❌           |
| ✅ Yes       | ✅ Yes       | ❌ No        | ❌           |
| ✅ Yes       | ✅ Yes       | ✅ Yes       | ✅           |

### Module Structure

```typescript
interface MerchantOnboarding {
  merchantId: 'takealot' | 'amazon' | string;

  // Requirements to check
  requirements: {
    accountLinked: boolean;
    hasDefaultAddress: boolean;
    hasDefaultPayment: boolean;
  };

  // Setup flows for missing requirements
  setupFlows: {
    linkAccount: SetupFlow;
    addAddress: SetupFlow;
    addPayment: SetupFlow;
  };

  // How to detect current state
  stateDetection: {
    method: 'api' | 'browser-check';
    checkEndpoint?: string;
  };
}

interface SetupFlow {
  title: string;
  description: string;
  action: 'redirect' | 'guided-browser' | 'in-app';
  targetUrl?: string;
  steps?: string[];
}
```

### Implementation Approach

1. Start with hardcoded "ready" state for POC (user's accounts are set up)
2. Add state detection via Playwright page inspection
3. Build setup flow UI for each missing requirement
4. Make per-merchant configurable

### Future: OAuth Account Linking

When OAuth becomes available (or we build our protocol), the progressive disclosure module will integrate with the account linking step to:
- Verify account is connected
- Check if defaults are configured
- Guide user through any missing setup

---

## Phase 3: Authentication Strategy

### Tiered Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION TIERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   TIER 1: OAuth (Best - use when available)                     │
│   ├── Amazon (supports OAuth)                                   │
│   ├── Future integrations with OAuth support                    │
│   └── User authorizes, we get tokens, never see credentials     │
│                                                                  │
│   TIER 2: Credential Vault (When OAuth unavailable)             │
│   ├── Takealot (no OAuth)                                       │
│   ├── Other SA merchants                                        │
│   ├── Encrypted at rest (AES-256)                              │
│   ├── User consent required                                     │
│   └── Easy revocation                                           │
│                                                                  │
│   TIER 3: StratAI Connect Protocol (Future)                     │
│   ├── Our own lightweight OAuth-like protocol                   │
│   ├── For merchants who want to join ecosystem                  │
│   └── Requires merchant adoption (post-PMF)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Credential Vault Design (Tier 2)

```
Storage:
├── Encrypted at rest (AES-256)
├── Encryption key derived from user's master password
└── We cannot read credentials without user present

Access:
├── Decrypted only at execution time
├── Never logged, never cached unencrypted
└── User can revoke anytime (instant deletion)

Transparency:
├── Clear consent flow
├── Show what's stored and when last used
└── Audit log of all purchase attempts

Liability:
├── Terms make clear user responsibility
└── 3D Secure = bank approval = limited liability
```

### POC Approach

For POC, use simple `.env.local` credential storage:

```bash
# .env.local (gitignored)

# Takealot
TAKEALOT_EMAIL=user@example.com
TAKEALOT_PASSWORD=password

# Amazon
AMAZON_EMAIL=user@example.com
AMAZON_PASSWORD=password
```

---

## User Experience Design

### Price Tier Display

When user specifies a budget (e.g., "under R2000"), display products in three tiers:

| Tier | Range | Badge | Color |
|------|-------|-------|-------|
| **Budget** | Bottom 33% of results | 🏷️ Budget Pick | Gray |
| **Sweet Spot** | Middle 33% of results | ⚖️ Best Value | Green |
| **Premium** | Top 33% within budget | ✨ Premium | Gold |

**Rationale**: Users asking for "under R2000" want to explore the range, not just see the cheapest options.

### Buy Flow UX

#### Step 1: Click "Buy"

Product card shows "Buy" button. On click:
- **No prompt added to chat history** (action happens in modal)
- Confirmation modal opens

#### Step 2: Confirmation Modal

```
┌─────────────────────────────────────────────────┐
│                                           [X]   │
│                                                 │
│   [Product Image]                               │
│                                                 │
│   Logitech Z150 Speakers                        │
│   R569 from Takealot                            │
│                                                 │
│   Delivery: 2-3 business days                   │
│   To: [Default Address Preview]                 │
│                                                 │
│   ┌─────────────────────────────────────────┐  │
│   │         Confirm Purchase                 │  │
│   └─────────────────────────────────────────┘  │
│                                                 │
│   Cancel                                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Step 3: Progress Display

Modal transforms to show progress:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   Purchasing Logitech Z150 Speakers             │
│                                                 │
│   ✅ Adding to cart                             │
│   ✅ Proceeding to checkout                     │
│   ⏳ Awaiting payment approval                  │
│                                                 │
│   ┌─────────────────────────────────────────┐  │
│   │  Check your banking app to approve      │  │
│   │  this R569 payment                      │  │
│   └─────────────────────────────────────────┘  │
│                                                 │
│   Timeout in: 2:45                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Step 4: Success State

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ✅ Purchase Complete!                         │
│                                                 │
│   Logitech Z150 Speakers                        │
│   R569 from Takealot                            │
│                                                 │
│   Order #: TL-2026012112345                     │
│   Expected delivery: Jan 23-24                  │
│                                                 │
│   [View on Takealot]    [Done]                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Step 5: AI Confirmation

After modal closes, AI posts message in chat:

> "Your purchase is complete! 🎉
>
> **Logitech Z150 Speakers** - R569
> Order #TL-2026012112345
>
> Expected delivery: Jan 23-24
>
> Is there anything else you'd like to shop for?"

**Important**: No user prompt appears in chat history for buy actions. The flow is:
1. User clicks Buy (UI action, not chat)
2. Modal handles the transaction
3. AI confirms completion as a system-initiated message

---

## Technical Implementation

### MCP Commerce Server Changes

#### New Endpoint: POST /buy

```typescript
interface BuyRequest {
  merchant: 'takealot' | 'amazon';
  productUrl: string;
  productId?: string;
}

interface BuyResponse {
  success: boolean;
  orderId?: string;
  orderUrl?: string;
  error?: string;
  errorCode?: 'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'PAYMENT_DECLINED' |
              'SESSION_EXPIRED' | 'TIMEOUT' | 'UNKNOWN';
  newPrice?: number; // If price changed
}
```

#### Status Updates (SSE or Polling)

```typescript
interface BuyStatus {
  step: 'adding_to_cart' | 'checkout' | 'awaiting_payment' | 'complete' | 'failed';
  message: string;
  progress: number; // 0-100
}
```

#### Playwright Automation

**Takealot Flow:**
1. Navigate to product URL
2. Click "Add to Cart"
3. Navigate to cart
4. Click "Checkout"
5. Verify address and payment method selected
6. Click "Place Order"
7. Detect 3D Secure redirect
8. Wait for 3D Secure completion (timeout: 3 minutes)
9. Capture order confirmation

**Amazon Flow:**
1. Navigate to product URL
2. Click "Add to Cart" or "Buy Now"
3. If "Buy Now", proceed directly
4. Else navigate to checkout
5. Verify address and payment
6. Click "Place your order"
7. Handle 3D Secure if prompted
8. Capture order confirmation

### StratAI Frontend Changes

#### Product Card Enhancement

Add `onBuy` handler to product cards:

```svelte
<ProductCard
  {product}
  onBuy={() => openBuyModal(product)}
/>
```

#### Buy Modal Component

New component: `BuyModal.svelte`

```typescript
interface BuyModalProps {
  product: Product;
  onConfirm: () => void;
  onCancel: () => void;
}

interface BuyModalState {
  step: 'confirm' | 'progress' | 'success' | 'error';
  currentAction?: string;
  orderId?: string;
  error?: string;
}
```

#### Chat Integration

After successful purchase, inject AI message without user prompt:

```typescript
// In chat store or message handler
function handlePurchaseComplete(order: OrderConfirmation) {
  addSystemMessage({
    role: 'assistant',
    content: formatPurchaseConfirmation(order),
    metadata: {
      type: 'purchase_confirmation',
      orderId: order.orderId,
      merchant: order.merchant
    }
  });
}
```

### File Changes Summary

**MCP Commerce (`mcp-commerce/`)**
```
src/
├── index.ts              # Add /buy endpoint
├── adapters/
│   ├── takealot.ts       # Add purchase flow
│   └── amazon.ts         # Add purchase flow
├── types.ts              # Add BuyRequest, BuyResponse types
└── buy/
    ├── executor.ts       # Purchase execution logic
    └── status.ts         # Status tracking
```

**StratAI (`stratai-main/`)**
```
src/lib/components/
├── commerce/
│   ├── BuyModal.svelte       # New: confirmation + progress modal
│   ├── ProductCard.svelte    # Update: add buy handler
│   └── ProductGrid.svelte    # Update: pass buy handler
src/lib/stores/
└── purchases.svelte.ts       # New: purchase state management
```

---

## Error Handling

| Scenario | Detection | User Message | Recovery |
|----------|-----------|--------------|----------|
| **Item out of stock** | Add-to-cart fails | "This item is no longer available." | Show similar products |
| **Price changed** | Price mismatch detected | "Price is now R619 (was R569). Continue?" | User confirms or cancels |
| **3D Secure timeout** | No approval within 3 min | "Payment not approved in time." | Offer retry |
| **3D Secure declined** | Bank rejection | "Payment declined by your bank." | Suggest checking card |
| **Session expired** | Login page detected | "Your [Merchant] session expired." | Re-authenticate flow |
| **Network error** | Request failure | "Connection lost. Order not placed." | Offer retry |
| **Unknown error** | Catch-all | "Something went wrong. No charge made." | Contact support link |

### Error Response Format

```typescript
interface BuyError {
  code: string;
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
  alternativeAction?: {
    label: string;
    action: () => void;
  };
}
```

---

## Test Plan

### Backend Tests (MCP Commerce Server)

| ID | Scenario | Setup | Action | Acceptance Criteria |
|----|----------|-------|--------|---------------------|
| **B1** | Takealot login | Valid credentials in .env | Call /buy endpoint | Browser session authenticated, no login page visible |
| **B2** | Takealot add to cart | Product URL | Execute add-to-cart | Cart count increases, product visible in cart |
| **B3** | Takealot checkout navigation | Item in cart | Navigate to checkout | Address & payment visible, correct total displayed |
| **B4** | Takealot stop before confirm | At checkout | Capture state | Screenshot saved + page URL contains `/checkout` |
| **B5** | Takealot full purchase | Complete flow | Click "Place Order" | Order ID returned in response, confirmation page URL captured |
| **B6** | Takealot out of stock | Unavailable product URL | Attempt add-to-cart | Error code `OUT_OF_STOCK`, message contains "unavailable" or "out of stock" |
| **B7** | Amazon login | Valid credentials | Call /buy endpoint | Authenticated session, account page accessible |
| **B8** | Amazon full purchase | Complete flow | Execute buy | Order ID returned in response |
| **B9** | 3D Secure detection | Purchase requiring 3D | Reach payment step | Status `awaiting_payment`, 3D Secure iframe/redirect detected |
| **B10** | 3D Secure timeout | No approval given | Wait 3 minutes | Error code `TIMEOUT`, order NOT placed, cart cleared or abandoned |
| **B11** | Price changed | Product with updated price | Compare at checkout | Error code `PRICE_CHANGED`, `newPrice` field populated with current price |
| **B12** | Session expired | Stale/expired cookies | Attempt any action | Error code `SESSION_EXPIRED`, clear message to re-authenticate |
| **B13** | Status updates stream | During purchase | Monitor SSE/polling | Receive sequential steps: `adding_to_cart` → `checkout` → `awaiting_payment` → `complete` |

### Frontend Tests (StratAI)

| ID | Scenario | Setup | Action | Acceptance Criteria |
|----|----------|-------|--------|---------------------|
| **F1** | Price tier display | Products across price range | Search "speakers under R2000" | Grid shows 🏷️ Budget / ⚖️ Best Value / ✨ Premium badges correctly distributed |
| **F2** | Buy button click | Product card visible | Click "Buy" button | Modal opens immediately, NO message added to chat history |
| **F3** | Modal confirmation state | Modal open | Observe modal content | Shows: product image, name, price, merchant logo, delivery estimate, "Confirm Purchase" button |
| **F4** | Modal progress state | User clicks confirm | Observe during purchase | Shows steps with ✅ (done) / ⏳ (in progress) indicators, "Check your banking app" message visible |
| **F5** | Modal success state | Purchase completes | Observe final modal | Shows: ✅ checkmark, order ID, expected delivery, "View on [Merchant]" link, "Done" button |
| **F6** | Modal error state | Purchase fails | Observe error modal | Shows: error icon, clear error message, "Try Again" and "Cancel" buttons |
| **F7** | AI confirmation message | Modal closed after success | Check chat panel | Assistant message appears with order summary, NO user prompt precedes it |
| **F8** | Cancel mid-purchase | Modal showing progress | Click X or "Cancel" | Modal closes, purchase aborted, no order placed, no chat message |
| **F9** | Price changed handling | Backend returns `PRICE_CHANGED` | Observe modal | Shows "Price is now R[new]. Continue?" with "Yes, buy at new price" / "Cancel" options |
| **F10** | Modal keyboard accessibility | Modal open | Press Escape | Modal closes (only in confirmation state, not during progress) |

### End-to-End Tests

| ID | Scenario | Flow | Acceptance Criteria |
|----|----------|------|---------------------|
| **E2E1** | Happy path - Takealot | Search → Click Buy → Confirm → 3D Secure → Done | Order placed, AI confirms in chat, order visible on Takealot account |
| **E2E2** | Happy path - Amazon | Search → Click Buy → Confirm → 3D Secure → Done | Order placed, AI confirms in chat, order visible on Amazon account |
| **E2E3** | Error recovery flow | Trigger error → See error modal → Click retry → Success | User recovers from error without leaving chat interface |
| **E2E4** | Multi-product session | Buy item A → Success → Buy item B → Success | Both orders placed, both confirmations in chat history |

### Test Data

**Suggested Test Items (cheap, easily returnable):**

| Merchant | Category | Price Range | Notes |
|----------|----------|-------------|-------|
| Takealot | Phone accessories (cables, cases) | R20-R50 | Easy to find, quick delivery |
| Takealot | Stationery (pens, notebooks) | R30-R80 | Low value, returnable |
| Amazon | Tech accessories | R50-R150 | Check .co.za availability |
| Amazon | Books (paperback) | R100-R200 | Easy returns |

**Out of Stock Test Items:**
- Search for discontinued products or limited editions
- Or temporarily use a product URL that's been delisted

### Test Execution Order

For POC validation, execute in this order:

1. **B1-B4**: Validate Takealot automation up to checkout (no purchase)
2. **F1-F3**: Validate frontend modal basics
3. **B5**: First real Takealot purchase (~R50 item)
4. **F4-F7**: Validate full frontend flow with real purchase
5. **E2E1**: Full end-to-end Takealot
6. **B7-B8**: Amazon automation + purchase
7. **E2E2**: Full end-to-end Amazon
8. **B6, B9-B12**: Error scenarios
9. **F8-F10**: Frontend error handling

---

## Testing Strategy

### Approach

**Automated** (Playwright): Everything up to 3D Secure approval
**Manual**: Bank app approval (3D Secure) - validated once per merchant during POC

This gives us repeatable validation of all code we control, while acknowledging the external bank approval step requires manual intervention.

### Test File Structure

```
mcp-commerce/
├── src/
│   └── ...
├── tests/
│   ├── takealot/
│   │   ├── login.spec.ts         # B1: Authentication
│   │   ├── add-to-cart.spec.ts   # B2: Add to cart
│   │   ├── checkout.spec.ts      # B3-B4: Checkout navigation
│   │   └── purchase.spec.ts      # B5: Full purchase (stops at 3D Secure)
│   ├── amazon/
│   │   ├── login.spec.ts         # B7: Authentication
│   │   └── purchase.spec.ts      # B8: Full purchase (stops at 3D Secure)
│   ├── errors/
│   │   ├── out-of-stock.spec.ts  # B6: Out of stock handling
│   │   ├── price-changed.spec.ts # B11: Price change detection
│   │   ├── session.spec.ts       # B12: Session expiry
│   │   └── timeout.spec.ts       # B10: 3D Secure timeout
│   └── status/
│       └── updates.spec.ts       # B13: Status streaming
│
└── playwright.config.ts

stratai-main/
├── tests/
│   └── commerce/
│       ├── price-tiers.spec.ts       # F1: Price tier badges
│       ├── buy-modal.spec.ts         # F2-F6: Modal states
│       ├── chat-confirmation.spec.ts # F7: AI message injection
│       └── error-flows.spec.ts       # F8-F10: Error handling
│
└── playwright.config.ts (existing)
```

### Playwright Configuration (MCP Commerce)

```typescript
// mcp-commerce/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000, // Longer timeout for purchase flows
  retries: 0,     // No retries - we want to see failures
  use: {
    headless: false,  // Watch the browser during POC
    slowMo: 500,      // Slow down for debugging
    screenshot: 'on', // Capture screenshots at each step
    video: 'on',      // Record video for debugging
  },
  projects: [
    {
      name: 'takealot',
      testMatch: /takealot\/.*.spec.ts/,
    },
    {
      name: 'amazon',
      testMatch: /amazon\/.*.spec.ts/,
    },
    {
      name: 'errors',
      testMatch: /errors\/.*.spec.ts/,
    },
  ],
});
```

### Running Tests

```bash
# Run all tests (headless: false so you can watch)
cd mcp-commerce
npx playwright test

# Run only Takealot tests
npx playwright test --project=takealot

# Run a specific test file
npx playwright test tests/takealot/checkout.spec.ts

# Run with UI mode (interactive debugging)
npx playwright test --ui
```

### Test Helpers

Common utilities for purchase flow tests:

```typescript
// tests/helpers/merchant.ts

export async function loginToTakealot(page: Page) {
  // Reusable login flow
}

export async function waitFor3DSecure(page: Page): Promise<boolean> {
  // Detect 3D Secure prompt, return true if detected
  // This is where automated tests STOP
}

export async function captureCheckoutState(page: Page) {
  // Screenshot + extract order details for verification
}
```

### 3D Secure Handling

Since 3D Secure requires manual bank approval:

```typescript
// In purchase tests
test('complete purchase up to 3D Secure', async ({ page }) => {
  // ... navigate to checkout, fill details ...

  // Click "Place Order"
  await page.click('[data-testid="place-order"]');

  // Wait for 3D Secure to appear
  const has3DSecure = await waitFor3DSecure(page);

  if (has3DSecure) {
    // STOP HERE - test passes if we reached 3D Secure
    console.log('✅ Reached 3D Secure - manual approval required');
    await page.screenshot({ path: 'screenshots/3d-secure-prompt.png' });

    // For actual purchase, uncomment and approve in bank app:
    // await page.waitForURL(/order-confirmation/, { timeout: 180000 });
  }

  expect(has3DSecure).toBe(true);
});
```

### Manual Validation Checklist

After automated tests pass, manually verify once per merchant:

- [ ] **Takealot 3D Secure**: Approve in bank app → Order confirmation page loads → Order appears in Takealot account
- [ ] **Amazon 3D Secure**: Approve in bank app → Order confirmation page loads → Order appears in Amazon account
- [ ] **AI Chat Confirmation**: After modal closes, AI message appears in chat with order details

### Test Artifacts

Tests should generate:

```
mcp-commerce/
└── test-results/
    ├── screenshots/
    │   ├── takealot-login.png
    │   ├── takealot-cart.png
    │   ├── takealot-checkout.png
    │   ├── takealot-3d-secure.png
    │   └── ...
    ├── videos/
    │   └── takealot-purchase.webm
    └── reports/
        └── test-report.html
```

---

## Security Considerations

### POC Phase

- Credentials in `.env.local` (gitignored)
- No credential logging
- HTTPS for all MCP Commerce endpoints
- Browser runs in controlled Playwright context

### Production Phase

- Encrypted credential vault (AES-256)
- User consent flow before storing
- Audit log of all purchase attempts
- Easy credential revocation
- Clear terms of service
- 3D Secure provides additional user approval layer

### What We Never Do

- Log credentials (even in debug mode)
- Store credentials unencrypted
- Make purchases without explicit user confirmation
- Cache payment information
- Skip 3D Secure when required by bank

---

## Future Roadmap

### Phase 2 Enhancements
- [ ] Progressive disclosure UI
- [ ] Per-merchant setup flows
- [ ] Account state detection

### Phase 3 Enhancements
- [ ] OAuth integration (Amazon)
- [ ] Credential vault with encryption
- [ ] User consent and management UI

### Future Features
- [ ] Purchase history in StratAI
- [ ] Price tracking and alerts
- [ ] Wishlist management
- [ ] Multi-item cart purchases
- [ ] Delivery tracking integration
- [ ] Returns/refunds initiation
- [ ] StratAI Connect protocol for merchants

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Price tiers (Budget/Sweet Spot/Premium) | More intuitive than flat price list | 2026-01-21 |
| Modal for buy flow (no chat prompt) | Cleaner UX, action-based not conversation-based | 2026-01-21 |
| AI confirms after modal | Preserves chat as record, no fake user prompts | 2026-01-21 |
| Tier 1/2/3 auth strategy | Pragmatic - OAuth when available, vault otherwise | 2026-01-21 |
| Real transactions for POC | Proves solid foundation, not just mockups | 2026-01-21 |
| Progressive disclosure as module | Reusable, per-merchant configurable | 2026-01-21 |

---

## Appendix: Merchant Selectors

See:
- `src/selectors/takealot.json`
- `src/selectors/amazon.json`

These contain CSS selectors for product pages, cart, checkout flows.

---

*Last updated: 2026-01-21*
