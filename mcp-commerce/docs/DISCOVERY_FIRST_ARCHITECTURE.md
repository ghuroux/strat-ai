# Discovery-First Commerce Automation

## Overview

Replace brittle selector-based automation with a **discovery-first approach** where Claude agent explores and documents site behavior before Playwright automation is written.

**Core Insight:** We've been debugging blindly because we don't understand the sites. Discovery-first inverts this: AI explores → documents playbook → Playwright uses playbook.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Site Onboarding Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   DISCOVER   │───▶│   DOCUMENT   │───▶│   AUTOMATE   │     │
│   │ Claude Agent │    │  Playbook    │    │  Playwright  │     │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                    │                   │               │
│   - Navigate site       - playbook.json      - Uses playbook    │
│   - Take screenshots    - Login flow         - Known selectors  │
│   - Find elements       - Auth indicators    - Documented flows │
│   - Document flows      - Checkout steps     - Visual fallback  │
│                         - Screenshots                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why This Approach Scales

| Current (Brittle) | Discovery-First |
|-------------------|-----------------|
| Guess selectors, debug when broken | AI explores, documents what exists |
| Each site = custom debugging | Each site = same discover → document → automate |
| No visibility into site changes | Re-run discovery to detect changes |
| Brittle, breaks silently | Playbook = contract, validation possible |
| Knowledge lives in code | Knowledge lives in versioned JSON |

---

## Site Playbook Schema

```typescript
// /src/playbooks/types.ts

export interface SitePlaybook {
  // Metadata
  id: string;
  siteId: string;                    // 'takealot' | 'amazon'
  version: string;                   // Semver: "1.0.0"
  createdAt: string;
  updatedAt: string;

  // Site configuration
  baseUrl: string;

  // Authentication
  auth: {
    loginUrl: string;
    loggedInIndicators: ElementSelector[];   // Present when logged IN
    loggedOutIndicators: ElementSelector[];  // Present when logged OUT
    loginForm: {
      emailInput: ElementSelector;
      passwordInput: ElementSelector;
      submitButton: ElementSelector;
    };
    screenshots: {
      loggedIn: string;   // Filename
      loggedOut: string;
      loginPage: string;
    };
  };

  // User flows
  flows: {
    search: Flow;
    addToCart: Flow;
    checkout: Flow;
  };

  // Popup patterns to dismiss
  popups: PopupPattern[];
}

export interface ElementSelector {
  primary: string;              // Best CSS selector
  fallbacks: string[];          // Backup selectors
  visualDescription: string;    // "Green button saying Add to Cart"
  screenshot?: string;          // Screenshot with element highlighted
  boundingBox?: { x: number; y: number; width: number; height: number };
  confidence: number;           // 0-1 from discovery
}

export interface Flow {
  name: string;
  steps: FlowStep[];
  successIndicators: ElementSelector[];
  failureIndicators: ElementSelector[];
}

export interface FlowStep {
  id: string;
  action: 'navigate' | 'click' | 'type' | 'wait' | 'extract';
  target?: ElementSelector;
  value?: string;
  waitFor?: ElementSelector | number;
  onFailure: 'skip' | 'retry' | 'abort';
}

export interface PopupPattern {
  name: string;                 // "Cookie consent"
  detection: ElementSelector;
  dismissAction: {
    type: 'click' | 'key';
    target?: ElementSelector;
    key?: string;               // 'Escape'
  };
}
```

---

## File Structure

```
/mcp-commerce/
  src/
    playbooks/
      types.ts              # Playbook TypeScript interfaces
      store.ts              # Load/save playbooks from disk
      validator.ts          # Validate playbook against live site

    discovery/
      agent.ts              # DiscoveryAgent (extends BrowserAgent)
      prompts.ts            # Claude prompts for discovery
      flows/
        auth.ts             # Discover authentication flow
        search.ts           # Discover search flow
        cart.ts             # Discover add-to-cart flow
        checkout.ts         # Discover checkout flow

    adapters/
      playbook-adapter.ts   # Generic adapter that reads from playbook
      takealot.ts           # Thin wrapper (site-specific overrides only)
      amazon.ts             # Thin wrapper

  playbooks/                # Playbook storage (versioned)
    takealot/
      v1.0.0/
        playbook.json
        screenshots/
          login-page.jpg
          logged-in-header.jpg
          logged-out-header.jpg
          add-to-cart-button.jpg
      current -> v1.0.0     # Symlink to active version

    amazon/
      v1.0.0/
        playbook.json
        screenshots/
      current -> v1.0.0
```

---

## Implementation Plan

### Phase 1: Foundation

**Goal:** Create playbook types and storage

1. Create `/src/playbooks/types.ts` - Full TypeScript interfaces
2. Create `/src/playbooks/store.ts` - Load/save playbooks
3. Create `/playbooks/` directory structure
4. Create initial Takealot playbook manually (baseline)

**Files to create:**
- `src/playbooks/types.ts`
- `src/playbooks/store.ts`
- `playbooks/takealot/v1.0.0/playbook.json`

### Phase 2: Discovery Agent

**Goal:** AI-powered site exploration

1. Create `/src/discovery/agent.ts` - DiscoveryAgent class
2. Create `/src/discovery/prompts.ts` - Discovery prompts for Claude
3. Implement auth flow discovery first (most critical)
4. Add `/discovery/start` and `/discovery/auth` endpoints

**Files to create:**
- `src/discovery/agent.ts`
- `src/discovery/prompts.ts`
- `src/discovery/flows/auth.ts`

### Phase 3: Playbook-Based Adapter

**Goal:** Adapters read from playbooks instead of hardcoded selectors

1. Create `PlaybookAdapter` base class
2. Refactor `TakealotAdapter` to extend `PlaybookAdapter`
3. Move all hardcoded selectors to playbook
4. Add visual fallback when selectors fail

**Files to modify:**
- `src/adapters/playbook-adapter.ts` (new)
- `src/adapters/takealot.ts` (refactor)
- `src/adapters/base.ts` (simplify)

### Phase 4: Full Discovery Flows

**Goal:** Discover all critical flows

1. Implement search flow discovery
2. Implement add-to-cart flow discovery
3. Implement checkout flow discovery
4. Add popup detection and documentation

### Phase 5: Validation & Maintenance

**Goal:** Keep playbooks up-to-date

1. Create validator to check playbook against live site
2. Create diff tool to compare playbook versions
3. Add scheduled validation
4. Add re-discovery when selectors break

---

## API Endpoints

```typescript
// Discovery
POST /discovery/start           // Start discovery session
POST /discovery/:id/auth        // Discover auth flow
POST /discovery/:id/search      // Discover search flow
POST /discovery/:id/cart        // Discover cart flow
POST /discovery/:id/checkout    // Discover checkout flow
POST /discovery/:id/complete    // Generate final playbook

// Playbooks
GET  /playbooks/:siteId         // List versions
GET  /playbooks/:siteId/current // Get active playbook
POST /playbooks/:siteId/validate // Validate against live site
```

---

## Critical Files

| File | Purpose |
|------|---------|
| `src/browser-agent.ts` | Existing Claude vision agent - DiscoveryAgent extends this |
| `src/adapters/takealot.ts` | 894 lines of brittle selectors - will use playbook instead |
| `src/selectors/takealot.json` | Current selector format - migration source |
| `src/types.ts` | Current SiteSelectors - new playbook types supersede |

---

## Verification

### Test 1: Playbook Loading
```bash
# After Phase 1
curl http://localhost:9223/playbooks/takealot/current
# Should return playbook JSON
```

### Test 2: Discovery Session
```bash
# After Phase 2
curl -X POST http://localhost:9223/discovery/start \
  -H "Content-Type: application/json" \
  -d '{"siteId": "takealot"}'

# Watch browser navigate and Claude analyze
# Should generate playbook with screenshots
```

### Test 3: Playbook-Based Auth
```bash
# After Phase 3
# TakealotAdapter should:
# 1. Load playbook
# 2. Check loggedOutIndicators (finds "Login" link)
# 3. Navigate to loginUrl from playbook
# 4. Fill form using playbook selectors
# 5. Verify using loggedInIndicators
```

### Test 4: Full Purchase Flow
```bash
# After Phase 4
# Same /buy/stream endpoint, but now:
# - Auth check uses playbook indicators
# - Login uses playbook form selectors
# - Add-to-cart uses playbook flow
# - Checkout uses playbook flow
# - Visual fallback if selectors break
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Playbook as source of truth | Single versioned artifact; adapters become thin wrappers |
| Visual descriptions as fallback | When CSS selectors break, Claude finds by appearance |
| Screenshots per element | Change detection via visual diff; shows what was expected |
| Semver playbook versions | Can roll back; track evolution |
| Human validation in discovery | Critical elements (login, checkout) need confirmation |

---

## Future: Sector Patterns

> **Parking lot idea** - not implemented yet, but architecturally planned for.

The playbook system could extend to support different **sector patterns**:

| Sector | Typical Flows | Key Elements |
|--------|---------------|--------------|
| **E-commerce** | Search → Product → Cart → Checkout | Add to cart, cart icon, checkout button |
| **Flights** | Search → Results → Select → Passengers → Payment | Origin/dest, dates, passenger forms |
| **Events** | Browse → Event → Seats → Checkout | Seat map, ticket types, venue info |
| **Hotels** | Search → Results → Room → Guest → Payment | Check-in/out dates, room types, guest count |
| **Restaurants** | Search → Venue → Time → Party size → Confirm | Date/time picker, party size, table selection |

Each sector would have:
- **Sector-specific discovery prompts** (what to look for)
- **Expected flow templates** (what steps are typical)
- **Validation rules** (what must exist for this sector)

This enables: *"Add flysafair.co.za"* → Discovery knows it's flights → Uses flight pattern → Faster, more accurate discovery.

---

## How to Add a New Site

1. **Start Discovery Session**
   ```bash
   curl -X POST http://localhost:9223/discovery/start \
     -H "Content-Type: application/json" \
     -d '{"siteId": "newsite", "baseUrl": "https://newsite.com"}'
   ```

2. **Run Flow Discovery**
   - Claude navigates the site, takes screenshots
   - Documents selectors and visual descriptions
   - Creates initial playbook

3. **Review & Validate**
   - Human reviews generated playbook
   - Confirms critical selectors (login, checkout)
   - Approves or requests re-discovery

4. **Create Adapter Wrapper**
   ```typescript
   // src/adapters/newsite.ts
   import { PlaybookAdapter } from './playbook-adapter';

   export class NewsiteAdapter extends PlaybookAdapter {
     constructor(page: Page) {
       super(page, 'newsite');
     }

     // Only override if site needs special handling
   }
   ```

5. **Validate Periodically**
   ```bash
   curl -X POST http://localhost:9223/playbooks/newsite/validate
   ```

---

## Troubleshooting

### Playbook Not Loading
- Check file exists: `playbooks/{site}/current/playbook.json`
- Verify symlink: `ls -la playbooks/{site}/current`
- Check JSON validity: `jq . playbooks/{site}/current/playbook.json`

### Selectors Breaking
1. Run validation: `POST /playbooks/{site}/validate`
2. If failing, re-run discovery: `POST /discovery/start`
3. Compare with previous version
4. Update playbook or restore previous

### Discovery Stuck
- Check Claude API limits
- Verify browser session healthy
- Check site isn't blocking automation (CAPTCHA, rate limit)
- Review screenshots in discovery session

### Visual Fallback Not Working
- Ensure visual descriptions are specific
- Check screenshot quality (1280x800, JPEG 80%)
- Verify element is visible in viewport
- Add more distinctive visual cues
