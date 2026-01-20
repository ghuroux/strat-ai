# Member Budget System

> **Status:** Design
> **Author:** Gabriel Roux
> **Created:** 2026-01-20
> **Related:** [PRICING_STRATEGY.md](./PRICING_STRATEGY.md), [MODEL_CONFIGURATION_SYSTEM.md](./MODEL_CONFIGURATION_SYSTEM.md)

## Overview

Enterprise-grade budget controls for org members, enabling cost governance without sacrificing productivity. The system provides:

1. **Hard caps** - $ limits per member per month
2. **Progressive restrictions** - Degrade gracefully by limiting model tiers as budget depletes
3. **Escalation workflows** - Members can request increases, admins approve/deny
4. **Budget scenarios** - Predefined templates for easy assignment

---

## Core Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Scope** | Per member per org | Single budget covers all Spaces in the org |
| **Reset period** | Monthly (calendar 1st) | Predictable, aligns with billing cycles |
| **Enforcement** | Hard stop at 100% | Clear boundary, no surprise overages |
| **Overage handling** | Allow in-flight completion | Request finishes, then block next request |
| **Notifications** | Email + in-app | Admins notified via both channels for escalations |
| **Member visibility** | Yes (Settings page) | Transparency encourages self-management |
| **Unlimited option** | Yes (as scenario) | Admins/executives need unrestricted access |

---

## Progressive Restrictions

The system uses **existing model tiers** (Basic, Standard, Premium) to progressively restrict access as budget depletes:

| Budget Used | Available Tiers | Effect |
|-------------|-----------------|--------|
| **0-49%** | Basic + Standard + Premium | Full access (per org settings) |
| **50-74%** | Basic + Standard | Premium blocked |
| **75-99%** | Basic only | Standard + Premium blocked |
| **100%** | None | Hard stop - all requests blocked |

**Key behaviors:**
- AUTO routing automatically respects restrictions (routes only to available tiers)
- Model selector shows unavailable models as disabled with tooltip explaining why
- Warning banners appear at each threshold transition

---

## Data Model

### Tables

```sql
-- Budget scenarios (templates)
CREATE TABLE budget_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),  -- NULL = system default

    name TEXT NOT NULL,
    description TEXT,

    -- Configuration
    budget_amount_cents INTEGER,  -- NULL = unlimited

    -- Restriction thresholds (defaults shown)
    threshold_1_percent INTEGER DEFAULT 50,   -- When to apply first restriction
    threshold_1_max_tier TEXT DEFAULT 'standard',  -- Max tier: 'basic', 'standard', 'premium'
    threshold_2_percent INTEGER DEFAULT 75,   -- When to apply second restriction
    threshold_2_max_tier TEXT DEFAULT 'basic',

    is_default BOOLEAN DEFAULT FALSE,  -- Auto-assign to new members
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member budget assignments
CREATE TABLE member_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    org_id UUID NOT NULL REFERENCES organizations(id),
    scenario_id UUID REFERENCES budget_scenarios(id),

    -- Override scenario budget (NULL = use scenario value)
    budget_amount_cents INTEGER,

    -- Current period tracking
    spent_amount_cents INTEGER NOT NULL DEFAULT 0,
    period_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),

    -- Status
    status TEXT NOT NULL DEFAULT 'active',
    -- Values: 'active', 'restricted_t1', 'restricted_t2', 'exhausted', 'escalated'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, org_id)
);

-- Escalation requests
CREATE TABLE budget_escalation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_budget_id UUID NOT NULL REFERENCES member_budgets(id),

    -- Request
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_amount_cents INTEGER,  -- NULL = "please increase" (admin decides)
    reason TEXT,

    -- Resolution
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'denied'
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    approved_amount_cents INTEGER,
    admin_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- Fast lookup for budget checks on every request
CREATE INDEX idx_member_budgets_user_org ON member_budgets(user_id, org_id);

-- Monthly reset job
CREATE INDEX idx_member_budgets_period ON member_budgets(period_start);

-- Admin dashboard: pending requests
CREATE INDEX idx_escalation_pending ON budget_escalation_requests(status)
    WHERE status = 'pending';

-- Admin dashboard: requests by org
CREATE INDEX idx_escalation_budget ON budget_escalation_requests(member_budget_id);
```

---

## Default Scenarios

System-provided scenarios (org_id = NULL):

| Name | Budget | 50% Threshold | 75% Threshold | Use Case |
|------|--------|---------------|---------------|----------|
| **Restricted** | $20/mo | Standard max | Basic max | Trial users, interns |
| **Standard** | $50/mo | Standard max | Basic max | Regular employees |
| **Power User** | $200/mo | Standard max | Basic max | Analysts, heavy users |
| **Unlimited** | NULL | None | None | Admins, executives |

Orgs can create custom scenarios with different thresholds and amounts.

---

## User Flows

### Flow 1: Normal Request (Under Budget)

```
1. User sends chat message
2. API calls getBudgetStatus(userId, orgId)
3. Check: Is budget unlimited (amount = NULL)?
   → Yes: Allow request
4. Check: spent >= budget?
   → Yes: Block with "Budget Exhausted" response
5. Check: Is selected model allowed at current threshold?
   → No: Block with "Model restricted" response
6. Allow request, execute LLM call
7. On completion: updateBudgetSpend(budgetId, costCents)
8. Check new percentage, update status if threshold crossed
```

### Flow 2: Progressive Restriction

```
1. User at 52% budget, selects Claude Opus (Premium)
2. System checks: 52% >= 50% threshold
3. Premium tier blocked → return error:
   "Premium models unavailable. Budget at 52% - try AUTO or Standard tier models."
4. User selects AUTO
5. AUTO routing filters to Basic + Standard models only
6. Request proceeds with Haiku (Standard tier)
```

### Flow 3: Budget Exhausted + Escalation

```
User Journey:
1. User at 98% sends request → completes (allows overage)
2. Now at 102% → next request blocked
3. User sees "Budget Exhausted" screen:
   - Current spend: $51.00 / $50.00
   - "Your monthly budget is exhausted. Resets Feb 1."
   - [Request Increase] button
4. User clicks button, enters reason: "Need to finish quarterly report"
5. Request submitted → status shown as "Pending"

Admin Journey:
1. Admin sees badge: "1 Budget Request" in sidebar
2. Admin receives email: "Gabriel Roux requested budget increase"
3. Opens Admin → Budgets → Requests tab
4. Sees request with:
   - User name, current spend, scenario
   - Usage history chart
   - Request reason
5. Clicks "Approve" → enters amount: $30
6. Optionally adds note: "Approved for Q1 close"

Resolution:
1. User's budget updated: $50 → $80 (or one-time extension)
2. User receives email: "Budget request approved (+$30)"
3. In-app notification
4. User can continue working
```

### Flow 4: Monthly Reset

Cron job runs on 1st of each month at 00:01 UTC:

```sql
UPDATE member_budgets
SET
    spent_amount_cents = 0,
    period_start = date_trunc('month', CURRENT_DATE),
    status = 'active',
    updated_at = NOW()
WHERE period_start < date_trunc('month', CURRENT_DATE);
```

Log reset count for audit trail.

---

## API Endpoints

### Member Endpoints

```
GET  /api/user/budget
     → Returns current budget status for authenticated user

POST /api/user/budget/escalation
     → Submit escalation request
     Body: { requestedAmountCents?: number, reason?: string }
```

### Admin Endpoints

```
# Scenarios
GET    /api/admin/budget-scenarios
POST   /api/admin/budget-scenarios
PUT    /api/admin/budget-scenarios/[id]
DELETE /api/admin/budget-scenarios/[id]

# Member Budgets
GET    /api/admin/member-budgets
       → List all member budgets with filters
PUT    /api/admin/member-budgets/[id]
       → Update member's budget/scenario
POST   /api/admin/member-budgets/[id]/reset
       → Manual reset for a member

# Escalation Requests
GET    /api/admin/budget-requests
       → List requests (filter: pending, resolved)
PUT    /api/admin/budget-requests/[id]
       → Approve/deny request
       Body: { status: 'approved'|'denied', approvedAmountCents?: number, notes?: string }
```

---

## UI Components

### 1. Member Settings → Budget Section

```
┌─────────────────────────────────────────────────┐
│ Your Budget                                     │
├─────────────────────────────────────────────────┤
│ Plan: Standard ($50/month)                      │
│                                                 │
│ ████████████████░░░░  $38.50 / $50.00          │
│                        77% used                 │
│                                                 │
│ ⚠️ Standard + Premium restricted (75% threshold)│
│    Only Basic tier models available             │
│                                                 │
│ Resets: February 1, 2026 (12 days)             │
│                                                 │
│ [Request Increase]                              │
└─────────────────────────────────────────────────┘
```

### 2. Model Selector (Restricted State)

```
┌─────────────────────────────────────────────────┐
│ Select Model                                    │
├─────────────────────────────────────────────────┤
│ ⚠️ Budget at 77% - Basic models only            │
├─────────────────────────────────────────────────┤
│ ○ AUTO - Smart Routing              [Basic]    │
│ ○ Claude 3.5 Haiku                  [Basic]    │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ 🔒 Claude Haiku 4.5                 [Standard] │
│ 🔒 GPT-5.2 Pro                      [Standard] │
│    "Available under 75% budget"                │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ 🔒 Claude Opus 4.5                  [Premium]  │
│ 🔒 Claude Sonnet 4.5                [Premium]  │
│    "Available under 50% budget"                │
└─────────────────────────────────────────────────┘
```

### 3. Budget Exhausted Screen

```
┌─────────────────────────────────────────────────┐
│                                                 │
│            💰 Budget Exhausted                  │
│                                                 │
│     You've used $51.00 of your $50.00 budget   │
│                                                 │
│     Your budget resets on February 1, 2026      │
│                                                 │
│     ┌─────────────────────────────────────┐    │
│     │ Need more? Request a budget increase │    │
│     │                                      │    │
│     │ Reason (optional):                   │    │
│     │ ┌──────────────────────────────────┐│    │
│     │ │ Working on quarterly report...   ││    │
│     │ └──────────────────────────────────┘│    │
│     │                                      │    │
│     │        [Request Increase]            │    │
│     └─────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4. Admin → Budgets Page

```
┌─────────────────────────────────────────────────────────────┐
│ Budgets                                      [+ New Scenario]│
├─────────────────────────────────────────────────────────────┤
│ ⚠️ 2 Pending Requests  [View Requests →]                     │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Scenarios] [Members] [Requests]                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SCENARIOS                                                   │
│ ┌──────────┬────────┬─────────────┬─────────────┬────────┐ │
│ │ Name     │ Budget │ 50% Cap     │ 75% Cap     │ Members│ │
│ ├──────────┼────────┼─────────────┼─────────────┼────────┤ │
│ │ Restricted│ $20   │ Standard    │ Basic       │ 2      │ │
│ │ Standard │ $50    │ Standard    │ Basic       │ 12     │ │
│ │ Power    │ $200   │ Standard    │ Basic       │ 3      │ │
│ │ Unlimited│ ∞      │ —           │ —           │ 2      │ │
│ └──────────┴────────┴─────────────┴─────────────┴────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. Admin → Budget Requests

```
┌─────────────────────────────────────────────────────────────┐
│ Budget Requests                                             │
├─────────────────────────────────────────────────────────────┤
│ Filter: [Pending ▼]                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Gabriel Roux                           Requested 2h ago ││
│ │ Current: $51.00 / $50.00 (Standard)                     ││
│ │                                                         ││
│ │ "Working on quarterly report, need to finish analysis"  ││
│ │                                                         ││
│ │ Usage this month: ████████████ $51                      ││
│ │ Avg monthly: $42                                        ││
│ │                                                         ││
│ │ [Approve ▼]  [Deny]                                     ││
│ │  └─ $20 / $50 / $100 / Custom                          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Email Templates

### Escalation Request (to Admin)

```
Subject: Budget increase request from Gabriel Roux

Gabriel Roux has requested a budget increase for StraTech.

Current status:
- Scenario: Standard ($50/month)
- Spent: $51.00 (102%)
- Status: Exhausted

Reason provided:
"Working on quarterly report, need to finish analysis"

[Review Request →]
```

### Escalation Approved (to Member)

```
Subject: Your budget request was approved

Good news! Your budget increase request has been approved.

Details:
- Additional budget: $30.00
- New limit: $80.00 this month
- Admin note: "Approved for Q1 close"

You can now continue using StratAI.

[Open StratAI →]
```

### Escalation Denied (to Member)

```
Subject: Your budget request update

Your budget increase request has been reviewed.

Status: Not approved at this time

Admin note: "Please wait until monthly reset on Feb 1"

Your budget will automatically reset on February 1, 2026.

Questions? Contact your administrator.
```

---

## Implementation Phases

### Phase 1: Core Budget System
**Goal:** Basic $ cap with hard stop and escalation

- [ ] Create database tables and migrations
- [ ] Budget check middleware for chat API
- [ ] Cost tracking after LLM responses
- [ ] Monthly reset cron job
- [ ] Escalation request submission (member)
- [ ] Escalation review UI (admin)
- [ ] Email notifications (SendGrid integration)
- [ ] Member budget display in Settings

### Phase 2: Progressive Restrictions
**Goal:** Graceful degradation at thresholds

- [ ] Threshold calculation logic
- [ ] Model filtering based on budget status
- [ ] AUTO routing integration (respect restrictions)
- [ ] Model selector UI updates (disabled states)
- [ ] Warning banners at thresholds
- [ ] Budget status in chat header

### Phase 3: Budget Scenarios
**Goal:** Template-based budget assignment

- [ ] Scenario CRUD (admin UI)
- [ ] Default scenarios (system-level)
- [ ] Org-specific scenarios
- [ ] Apply scenario on member invite
- [ ] Bulk scenario assignment
- [ ] Scenario change for existing members

---

## Integration Points

### Existing Systems

| System | Integration |
|--------|-------------|
| **Model Tiers** | Reuse Basic/Standard/Premium tier definitions |
| **AUTO Routing** | Filter available models by budget status |
| **Usage Tracking** | Extend to track per-member costs |
| **SendGrid** | New email templates for escalations |
| **Admin Panel** | New "Budgets" section in sidebar |

### Future Considerations

- **Cost attribution by Space** - Track which Space consumed budget
- **Project budgets** - Budget at Space level, not just member level
- **Alerts at thresholds** - Email member at 50%, 75%, 90%
- **Budget forecasting** - "At current rate, you'll exhaust budget by..."
- **Team budgets** - Shared pool for a group of members

---

## Open Questions

1. **Escalation approval amount options** - Should admin pick from presets ($20/$50/$100) or enter custom amount? → Recommend: Both (presets + custom)

2. **One-time vs permanent increase** - Does approval add to current month only, or permanently increase scenario? → Recommend: One-time (current month only)

3. **Multiple pending requests** - Can user submit multiple requests? → Recommend: No, one pending at a time

4. **Budget inheritance** - If scenario is updated, do existing assignments update? → Recommend: Yes, unless member has custom override

---

## References

- [PRICING_STRATEGY.md](./PRICING_STRATEGY.md) - Overall pricing model
- [MODEL_CONFIGURATION_SYSTEM.md](./MODEL_CONFIGURATION_SYSTEM.md) - Model tiers and configuration
- [SENDGRID_EMAIL_INTEGRATION.md](./SENDGRID_EMAIL_INTEGRATION.md) - Email delivery system
