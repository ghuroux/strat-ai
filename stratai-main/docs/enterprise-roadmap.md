# StratAI Enterprise Roadmap

**Document Version:** 1.0
**Date:** January 2026
**Status:** Planning
**Timeline:** Internal pilot NOW → External launch within 1 month

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Target Architecture](#target-architecture)
4. [Module System: Model-Based Access](#module-system-model-based-access)
5. [Authentication Strategy](#authentication-strategy)
6. [SSO Analysis](#sso-analysis)
7. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
8. [Guardrails System](#guardrails-system)
9. [Usage Tracking & Billing](#usage-tracking--billing)
10. [Admin Panel Architecture](#admin-panel-architecture)
11. [LiteLLM Integration](#litellm-integration)
12. [Database Schema](#database-schema)
13. [Implementation Phases](#implementation-phases)
14. [Risk Assessment](#risk-assessment)
15. [Decision Log](#decision-log)

---

## Executive Summary

### The Vision

Transform StratAI from a single-tenant productivity tool into a multi-tenant B2B SaaS platform that enables enterprises to:

- **Govern AI access** through hierarchical organizations, groups, and users
- **Control costs** via budgets at every level (org, group, user, model tier)
- **Enforce policies** through layered guardrails
- **Track usage** for billing and compliance
- **Empower org admins** to self-manage their teams

### Timeline Reality Check

| Milestone | Target | What's Needed |
|-----------|--------|---------------|
| Internal Pilot | NOW | Auth, basic multi-tenancy, usage tracking |
| External Beta | +1 month | Org isolation, admin panels, billing foundation |
| Production | +3 months | Full billing, SSO, enterprise features |

**Critical path for 1-month external launch:**
1. Authentication (Week 1)
2. Multi-tenancy core (Week 2)
3. Usage tracking + Model access (Week 3)
4. Admin UI + Polish (Week 4)

---

## Current State

### What StratAI Has Today

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Spaces    │    │    Areas    │    │    Tasks    │        │
│  │             │    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │    Chat     │    │   Arena     │    │  Documents  │        │
│  │             │    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
│                          │                                      │
│                          ▼                                      │
│                   ┌─────────────┐                               │
│                   │   LiteLLM   │                               │
│                   │   (proxy)   │                               │
│                   └─────────────┘                               │
│                                                                 │
│  ❌ No authentication                                           │
│  ❌ No organizations/users                                      │
│  ❌ No usage tracking                                           │
│  ❌ No budgets/billing                                          │
│  ❌ No guardrails                                               │
│  ❌ No admin panels                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | SvelteKit + Svelte 5 | ✅ Production-ready |
| Styling | Tailwind CSS | ✅ Production-ready |
| Database | PostgreSQL 18 | ✅ Production-ready |
| LLM Routing | LiteLLM | ✅ Production-ready |
| Auth | None | ❌ Gap |
| Multi-tenancy | None | ❌ Gap |

---

## Target Architecture

### High-Level Vision

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          STRATAI PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      GLOBAL ADMIN PANEL                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │    Orgs    │  │  Modules   │  │   Users    │  │  Billing   │ │  │
│  │  │  (CRUD)    │  │  (Models)  │  │ (Profiles) │  │ (Overview) │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│            ┌───────────────────────┼───────────────────────┐           │
│            ▼                       ▼                       ▼           │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │   ORGANIZATION A │   │   ORGANIZATION B │   │   ORGANIZATION C │   │
│  │                  │   │                  │   │                  │   │
│  │  ┌────────────┐  │   │  ┌────────────┐  │   │  ┌────────────┐  │   │
│  │  │ Org Admin  │  │   │  │ Org Admin  │  │   │  │ Org Admin  │  │   │
│  │  │   Panel    │  │   │  │   Panel    │  │   │  │   Panel    │  │   │
│  │  └────────────┘  │   │  └────────────┘  │   │  └────────────┘  │   │
│  │        │         │   │        │         │   │        │         │   │
│  │  ┌─────┴─────┐   │   │  ┌─────┴─────┐   │   │  ┌─────┴─────┐   │   │
│  │  ▼           ▼   │   │  ▼           ▼   │   │  ▼           ▼   │   │
│  │ Groups    Users  │   │ Groups    Users  │   │ Groups    Users  │   │
│  │  │           │   │   │  │           │   │   │  │           │   │   │
│  │  └─────┬─────┘   │   │  └─────┬─────┘   │   │  └─────┬─────┘   │   │
│  │        ▼         │   │        ▼         │   │        ▼         │   │
│  │  ┌───────────┐   │   │  ┌───────────┐   │   │  ┌───────────┐   │   │
│  │  │  Model    │   │   │  │  Model    │   │   │  │  Model    │   │   │
│  │  │  Access   │   │   │  │  Access   │   │   │  │  Access   │   │   │
│  │  │ Tiers     │   │   │  │ Tiers     │   │   │  │ Tiers     │   │   │
│  │  └───────────┘   │   │  └───────────┘   │   │  └───────────┘   │   │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         LITELLM PROXY                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │   Orgs   │  │  Teams   │  │  V-Keys  │  │ Budgets  │        │  │
│  │  │  (sync)  │  │  (sync)  │  │  (sync)  │  │  (sync)  │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│            ┌───────────────────────┼───────────────────────┐           │
│            ▼                       ▼                       ▼           │
│     ┌─────────────┐         ┌─────────────┐         ┌─────────────┐   │
│     │  Anthropic  │         │   OpenAI    │         │   Bedrock   │   │
│     └─────────────┘         └─────────────┘         └─────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Entity Hierarchy

```
Platform (StratAI)
│
├── Global Admins (platform operators - us)
│   └── Can: manage all orgs, modules, global settings, view all billing
│
├── Modules (Model Tiers)
│   ├── Basic Tier (Haiku, GPT-4o-mini, Gemini Flash)
│   ├── Standard Tier (Sonnet, GPT-4o, Gemini Pro)
│   └── Premium Tier (Opus, GPT-4.5, o1, Gemini Ultra)
│
└── Organizations (customers)
    │
    ├── Org Admins (customer IT/managers)
    │   └── Can: manage users, groups, budgets, view org billing
    │
    ├── Groups (departments/teams)
    │   ├── Guardrails (inherited + custom)
    │   ├── Budget allocation
    │   └── Model tier access
    │
    └── Users (end users)
        ├── Profile (internal/external)
        ├── Guardrails (inherited + custom)
        ├── Personal budget
        └── Virtual key (LiteLLM)
```

---

## Module System: Model-Based Access

### Clarification: Modules = Model Access Tiers

Your modules are **model access packages**, not features. This simplifies the architecture significantly.

### Model Tier Definitions

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODEL TIERS (MODULES)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    BASIC TIER                           │   │
│  │  Cost: $                                                │   │
│  │  Use Case: High-volume, simple tasks                    │   │
│  │  ┌──────────────┬──────────────┬──────────────┐        │   │
│  │  │Claude Haiku  │ GPT-4o-mini  │ Gemini Flash │        │   │
│  │  │   3.5       │              │     2.0      │        │   │
│  │  └──────────────┴──────────────┴──────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   STANDARD TIER                         │   │
│  │  Cost: $$                                               │   │
│  │  Use Case: General productivity, balanced performance   │   │
│  │  ┌──────────────┬──────────────┬──────────────┐        │   │
│  │  │Claude Sonnet │   GPT-4o    │ Gemini Pro   │        │   │
│  │  │   4 / 4.5   │   / 4.5     │    2.0       │        │   │
│  │  └──────────────┴──────────────┴──────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   PREMIUM TIER                          │   │
│  │  Cost: $$$                                              │   │
│  │  Use Case: Complex reasoning, mission-critical          │   │
│  │  ┌──────────────┬──────────────┬──────────────┐        │   │
│  │  │Claude Opus   │   GPT-5.1   │   o1 / o3    │        │   │
│  │  │   4.5       │   / 5.2     │              │        │   │
│  │  └──────────────┴──────────────┴──────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tier Configuration

```typescript
interface ModelTier {
  id: string;
  name: string;
  slug: 'basic' | 'standard' | 'premium';
  description: string;
  bestUseCase: string;
  models: string[];           // Model IDs allowed in this tier
  basePrice: number;          // Monthly subscription component
  inputTokenRate: number;     // $ per 1M input tokens (markup over cost)
  outputTokenRate: number;    // $ per 1M output tokens
  isActive: boolean;
}

const MODEL_TIERS: ModelTier[] = [
  {
    id: 'tier_basic',
    name: 'Basic',
    slug: 'basic',
    description: 'High-volume, cost-effective AI for simple tasks',
    bestUseCase: 'Classification, summarization, simple Q&A, bulk processing',
    models: [
      'claude-3-5-haiku-20241022',
      'gpt-4o-mini',
      'gemini-2.0-flash'
    ],
    basePrice: 0,              // No base, pure consumption
    inputTokenRate: 0.50,      // $0.50 per 1M tokens (with margin)
    outputTokenRate: 2.00,
    isActive: true
  },
  {
    id: 'tier_standard',
    name: 'Standard',
    slug: 'standard',
    description: 'Balanced performance for everyday productivity',
    bestUseCase: 'Writing, analysis, coding assistance, research',
    models: [
      'claude-sonnet-4-20250514',
      'claude-3-7-sonnet-20250219',
      'gpt-4o',
      'gpt-4.5-preview',
      'gemini-2.0-pro'
    ],
    basePrice: 0,
    inputTokenRate: 4.00,
    outputTokenRate: 16.00,
    isActive: true
  },
  {
    id: 'tier_premium',
    name: 'Premium',
    slug: 'premium',
    description: 'Maximum capability for complex, mission-critical work',
    bestUseCase: 'Strategic analysis, complex reasoning, code architecture',
    models: [
      'claude-opus-4-5-20251101',
      'gpt-5.1',
      'gpt-5.2',
      'o1',
      'o3'
    ],
    basePrice: 0,
    inputTokenRate: 20.00,
    outputTokenRate: 80.00,
    isActive: true
  }
];
```

### Tier Access Flow

```
User Request: "Use Claude Opus 4.5"
         │
         ▼
┌─────────────────────────┐
│  Check User's Org Tiers │
│  Org subscribed to:     │
│  [Basic, Standard]      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Check User's Tier Access│
│ User allowed:           │
│ [Basic, Standard]       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Opus is Premium tier    │
│ User has: Standard max  │
│                         │
│ ❌ ACCESS DENIED        │
│ "Upgrade to Premium"    │
└─────────────────────────┘
```

### Model Selector Integration

The existing model selector needs to:
1. Show only models the user has access to
2. Group by tier with visual distinction
3. Show "locked" state for inaccessible tiers
4. Upsell: "Unlock Premium for advanced models"

```svelte
<!-- ModelSelector.svelte - Enhanced -->
{#each tiers as tier}
  <div class="tier-group" class:locked={!userHasAccess(tier)}>
    <h4>{tier.name} {#if !userHasAccess(tier)}🔒{/if}</h4>
    {#each tier.models as model}
      <button
        disabled={!userHasAccess(tier)}
        onclick={() => selectModel(model)}
      >
        {model.name}
      </button>
    {/each}
    {#if !userHasAccess(tier)}
      <button class="upgrade" onclick={() => requestUpgrade(tier)}>
        Unlock {tier.name}
      </button>
    {/if}
  </div>
{/each}
```

---

## Authentication Strategy

### The Decision: Auth0 vs Roll Your Own

Given your constraints:
- **Internal pilot:** NOW (50 users)
- **External launch:** 1 month
- **Enterprise features:** Eventually needed

#### Option A: Auth0

| Aspect | Analysis |
|--------|----------|
| **Time to implement** | 2-3 days for basic, 1 week for full integration |
| **Cost** | Free up to 7,500 MAU, then ~$23/month per 1000 MAU |
| **SSO/SAML** | Built-in, enterprise plan required (~$130/mo) |
| **MFA** | Built-in |
| **Password policies** | Built-in |
| **Social login** | Built-in |
| **Customization** | Limited, requires Universal Login customization |
| **Lock-in** | Moderate - can export users, but migration is work |
| **Security** | Enterprise-grade, SOC2 compliant |

#### Option B: Roll Your Own (with Lucia Auth or similar)

| Aspect | Analysis |
|--------|----------|
| **Time to implement** | 2-3 weeks for secure implementation |
| **Cost** | $0 (just development time) |
| **SSO/SAML** | Additional 2-4 weeks to implement |
| **MFA** | Additional 1-2 weeks to implement |
| **Password policies** | Need to implement |
| **Social login** | Need to implement each provider |
| **Customization** | Full control |
| **Lock-in** | None |
| **Security** | Your responsibility |

#### Recommendation: Auth0 for Now, Migration Path Later

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTH STRATEGY TIMELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NOW ──────────► MONTH 1 ──────────► MONTH 3+ ───────────►     │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────────┐   │
│  │  Auth0   │   │  Auth0   │   │  Evaluate:               │   │
│  │  Basic   │   │  + SSO   │   │  - Stay Auth0 Enterprise │   │
│  │  (Free)  │   │  (Paid)  │   │  - Migrate to own auth   │   │
│  └──────────┘   └──────────┘   │  - Migrate to Clerk      │   │
│                                 └──────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why Auth0 now:**
1. **Speed:** You can't afford 3 weeks on auth with a 1-month deadline
2. **Security:** Auth is the one thing you don't want to get wrong
3. **SSO-ready:** Enterprise customers will ask for it
4. **Free tier:** 7,500 MAU covers your pilot + early external

**Migration safety:**
- Auth0 stores minimal data (email, name, metadata)
- Core user data (orgs, permissions, usage) lives in YOUR database
- Migration means: export users, they reset passwords, done

### Auth0 Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTH FLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User                 StratAI                Auth0              │
│    │                    │                      │                │
│    │──── Login ────────►│                      │                │
│    │                    │──── Redirect ───────►│                │
│    │                    │                      │                │
│    │◄───────────────────┼──── Auth Page ───────│                │
│    │                    │                      │                │
│    │──── Credentials ───┼─────────────────────►│                │
│    │                    │                      │                │
│    │                    │◄─── JWT + Callback ──│                │
│    │                    │                      │                │
│    │                    │── Lookup/Create ──┐  │                │
│    │                    │   User in DB      │  │                │
│    │                    │◄──────────────────┘  │                │
│    │                    │                      │                │
│    │◄─── Session ───────│                      │                │
│    │                    │                      │                │
└─────────────────────────────────────────────────────────────────┘
```

### SvelteKit Auth0 Implementation

```typescript
// src/lib/server/auth.ts
import { Auth0Client } from '@auth0/auth0-spa-js';

const auth0Config = {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  redirectUri: process.env.AUTH0_CALLBACK_URL
};

// On successful Auth0 callback:
async function handleAuthCallback(auth0User: Auth0User) {
  // 1. Check if user exists in our DB
  let user = await db.users.findByEmail(auth0User.email);

  if (!user) {
    // 2. Create user in our system
    user = await db.users.create({
      email: auth0User.email,
      name: auth0User.name,
      auth0Id: auth0User.sub,
      // No org yet - will be assigned or invited
    });
  }

  // 3. Create session
  const session = await createSession(user.id);

  return { user, session };
}
```

### User Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ONBOARDING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCENARIO A: Invited User                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Invite  │─►│ Sign Up │─►│ Auth0   │─►│ Auto-   │           │
│  │ Email   │  │ Click   │  │ Create  │  │ Join Org│           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                 │
│  SCENARIO B: Self-Signup (if allowed)                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Sign Up │─►│ Auth0   │─►│ Create  │─►│ Assign  │           │
│  │ Page    │  │ Create  │  │ User    │  │ Default │           │
│  └─────────┘  └─────────┘  └─────────┘  │ Org/Tier│           │
│                                          └─────────┘           │
│                                                                 │
│  SCENARIO C: Internal Pilot                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │
│  │ Admin   │─►│ Bulk    │─►│ Users   │                        │
│  │ Creates │  │ Invite  │  │ Join    │                        │
│  │ Org     │  │ 50 Users│  │ via Link│                        │
│  └─────────┘  └─────────┘  └─────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## SSO Analysis

### When Do You Actually Need SSO?

| Customer Type | SSO Requirement | Why |
|---------------|-----------------|-----|
| Startups (<50 people) | Nice to have | They use Google Workspace SSO via Auth0 social |
| SMB (50-500 people) | Often required | IT wants centralized access control |
| Enterprise (500+) | Always required | Security policy, compliance, insurance |

### SSO Options

#### Option 1: Auth0 Enterprise SSO (~$130/month base)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTH0 ENTERPRISE SSO                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Customer's IdP              Auth0              StratAI         │
│  (Okta, Azure AD)                                               │
│       │                        │                   │            │
│       │◄── SAML/OIDC Config ───│                   │            │
│       │                        │                   │            │
│       │                        │                   │            │
│  User │──── Login ─────────────┼──────────────────►│            │
│       │                        │◄── Redirect ──────│            │
│       │◄── Redirect ───────────│                   │            │
│       │                        │                   │            │
│       │──── Auth ─────────────►│                   │            │
│       │◄── Assertion ──────────│                   │            │
│       │                        │──── JWT ─────────►│            │
│       │                        │                   │            │
│                                                                 │
│  Setup Time: ~2 hours per customer                              │
│  Your Work: Configure connection in Auth0 dashboard             │
│  Customer Work: Add StratAI as SAML app in their IdP           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Option 2: Build SAML Support (~3-4 weeks)

Not recommended given timeline. Only consider if:
- Auth0 costs become prohibitive (100+ enterprise customers)
- You need full control over the SSO experience
- You have dedicated security engineering capacity

### SSO Recommendation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SSO DECISION MATRIX                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: Internal Pilot (NOW)                                  │
│  └── No SSO needed                                              │
│  └── Use Auth0 free tier with email/password                    │
│  └── Optional: Google Workspace social login                    │
│                                                                 │
│  PHASE 2: External Beta (+1 month)                              │
│  └── Most early customers won't require SSO                     │
│  └── If asked: "SSO coming in 60 days"                         │
│  └── Focus on core product value                                │
│                                                                 │
│  PHASE 3: Enterprise Ready (+3 months)                          │
│  └── Upgrade to Auth0 Enterprise                                │
│  └── Offer SSO as enterprise feature                            │
│  └── Premium pricing includes SSO setup                         │
│                                                                 │
│  PHASE 4: Scale (+6 months)                                     │
│  └── Evaluate: Auth0 cost vs build own                          │
│  └── If >100 SSO customers, consider migration                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### SSO as Pricing Lever

Many B2B SaaS companies use SSO as an enterprise upsell:

| Tier | Auth | Price |
|------|------|-------|
| Starter | Email + Password | $X/user |
| Business | + Google/Microsoft SSO | $1.5X/user |
| Enterprise | + SAML/OIDC SSO | $2X/user |

This is a valid strategy - SSO costs you money (Auth0 fees, support time), so charging for it is reasonable.

---

## Multi-Tenancy Architecture

### Data Isolation Strategy

Every piece of user-generated data must be scoped to an organization:

```sql
-- BEFORE (single-tenant)
SELECT * FROM conversations WHERE user_id = $1;

-- AFTER (multi-tenant)
SELECT * FROM conversations
WHERE organization_id = $1 AND user_id = $2;
```

### Tables Requiring org_id

| Table | Current | Needs org_id |
|-------|---------|--------------|
| spaces | ✅ Has user context | ✅ Yes |
| areas | ✅ Has space_id | ✅ Yes (via space or direct) |
| conversations | ✅ Has area_id | ✅ Yes |
| messages | ✅ Has conversation_id | Via conversation |
| tasks | ✅ Has space_id | ✅ Yes |
| documents | ✅ Has space_id | ✅ Yes |

### Row-Level Security (PostgreSQL)

```sql
-- Enable RLS on all tenant tables
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- etc.

-- Policy: Users can only see their org's data
CREATE POLICY org_isolation ON spaces
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::uuid);

-- Set org context on each request
SET app.current_org_id = 'org_xxx';
```

### Organization Entity

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;                    // URL-friendly identifier

  // LiteLLM sync
  litellmOrgId: string | null;     // Created when org is created

  // Settings
  settings: {
    allowedTiers: ModelTierSlug[]; // ['basic', 'standard']
    defaultTier: ModelTierSlug;
    maxUsersPerGroup: number;
    requireMfa: boolean;
  };

  // Billing
  billingEmail: string;
  billingPlan: 'trial' | 'starter' | 'business' | 'enterprise';
  stripeCustomerId: string | null;

  // Limits
  monthlyBudget: number;
  currentMonthUsage: number;

  createdAt: Date;
  updatedAt: Date;
}
```

### Internal Pilot Organization Setup

For your 50-user internal pilot:

```typescript
const internalOrg: Organization = {
  id: 'org_internal',
  name: 'Our Company',
  slug: 'internal',
  settings: {
    allowedTiers: ['basic', 'standard', 'premium'], // Full access for testing
    defaultTier: 'standard',
    maxUsersPerGroup: 50,
    requireMfa: false
  },
  billingPlan: 'enterprise', // No billing, internal use
  monthlyBudget: 10000,       // $10k/month for testing
};
```

---

## Guardrails System

### Guardrail Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    GUARDRAIL INHERITANCE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GLOBAL (Platform)                                              │
│  └── "No generation of malware, weapons, illegal content"       │
│  └── Applies to ALL requests, cannot be overridden              │
│       │                                                         │
│       ▼                                                         │
│  ORGANIZATION                                                   │
│  └── "No discussion of competitor products"                     │
│  └── "All outputs must include company disclaimer"              │
│  └── Inherits global, can ADD restrictions                      │
│       │                                                         │
│       ▼                                                         │
│  MODEL TIER                                                     │
│  └── Basic: "Max 2000 tokens per response"                     │
│  └── Premium: "Allow extended thinking"                         │
│       │                                                         │
│       ▼                                                         │
│  GROUP                                                          │
│  └── Marketing: "Maintain brand voice guidelines"              │
│  └── Engineering: "Include code comments"                       │
│       │                                                         │
│       ▼                                                         │
│  USER (most specific)                                           │
│  └── Intern profile: "Flag for review if budget >$1"           │
│  └── Executive: "No restrictions beyond org level"              │
│                                                                 │
│  RESOLUTION: Union of all applicable rules                      │
│  CONFLICT: Most restrictive wins                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Guardrail Types

```typescript
type GuardrailType =
  | 'model_allowlist'      // Which models can be used
  | 'model_denylist'       // Which models are blocked
  | 'token_limit'          // Max tokens per request/response
  | 'rate_limit'           // Requests per time period
  | 'content_filter'       // Block certain topics/content
  | 'output_modifier'      // Add disclaimers, format requirements
  | 'budget_limit'         // Spending cap
  | 'time_restriction';    // Only allow during certain hours

interface Guardrail {
  id: string;
  name: string;
  description: string;
  type: GuardrailType;
  config: GuardrailConfig;

  // Scope
  level: 'global' | 'org' | 'tier' | 'group' | 'user';
  scopeId: string | null;  // null for global

  // Behavior
  action: 'block' | 'warn' | 'modify' | 'log';
  isActive: boolean;

  createdAt: Date;
}

// Example configs by type
type GuardrailConfig =
  | { type: 'model_allowlist'; models: string[] }
  | { type: 'token_limit'; maxInput: number; maxOutput: number }
  | { type: 'rate_limit'; requests: number; period: 'minute' | 'hour' | 'day' }
  | { type: 'content_filter'; blockedTopics: string[]; blockedPatterns: string[] }
  | { type: 'budget_limit'; amount: number; period: 'day' | 'week' | 'month' };
```

### Guardrail Enforcement Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Request                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ PRE-REQUEST GUARDRAILS (StratAI)        │                   │
│  │ ├── Model allowlist check               │                   │
│  │ ├── Token limit check                   │                   │
│  │ ├── Rate limit check                    │                   │
│  │ ├── Budget check                        │                   │
│  │ └── Content pre-filter                  │                   │
│  └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ LITELLM PROXY                           │                   │
│  │ ├── Budget enforcement (hard limit)     │                   │
│  │ ├── Rate limiting                       │                   │
│  │ └── Request logging                     │                   │
│  └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│  LLM Provider (Anthropic, OpenAI, etc.)                        │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ POST-RESPONSE GUARDRAILS (StratAI)      │                   │
│  │ ├── Content post-filter                 │                   │
│  │ ├── Output modifier (disclaimers)       │                   │
│  │ └── Usage logging                       │                   │
│  └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│  User Response                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### MVP Guardrails (Phase 1)

For internal pilot + early external, focus on:

1. **Model allowlist** - Which tiers users can access
2. **Budget limits** - Spend caps at org/user level
3. **Rate limits** - Prevent runaway usage

Advanced guardrails (content filtering, output modifiers) can wait.

---

## Usage Tracking & Billing

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USAGE TRACKING FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│  │ StratAI  │────►│ LiteLLM  │────►│ Provider │               │
│  │ Request  │     │  Proxy   │     │   API    │               │
│  └──────────┘     └────┬─────┘     └──────────┘               │
│                        │                                        │
│                        ▼                                        │
│                 ┌──────────────┐                                │
│                 │   LiteLLM    │                                │
│                 │  PostgreSQL  │                                │
│                 │  (spend_logs)│                                │
│                 └──────┬───────┘                                │
│                        │                                        │
│         ┌──────────────┴──────────────┐                        │
│         ▼                              ▼                        │
│  ┌──────────────┐              ┌──────────────┐                │
│  │   Polling    │      OR      │   Webhook    │                │
│  │   Service    │              │   Callback   │                │
│  │  (cron job)  │              │  (real-time) │                │
│  └──────┬───────┘              └──────┬───────┘                │
│         │                              │                        │
│         └──────────────┬───────────────┘                        │
│                        ▼                                        │
│                 ┌──────────────┐                                │
│                 │   StratAI    │                                │
│                 │  PostgreSQL  │                                │
│                 │(usage_records│                                │
│                 │   budgets)   │                                │
│                 └──────────────┘                                │
│                        │                                        │
│         ┌──────────────┼──────────────┐                        │
│         ▼              ▼              ▼                        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                  │
│  │  Budget   │  │ Analytics │  │  Billing  │                  │
│  │  Alerts   │  │ Dashboard │  │  Engine   │                  │
│  └───────────┘  └───────────┘  └───────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Usage Record Structure

```typescript
interface UsageRecord {
  id: string;

  // Attribution
  organizationId: string;
  groupId: string | null;
  userId: string;
  tierId: string;           // Which model tier

  // Request details
  model: string;            // Actual model used
  inputTokens: number;
  outputTokens: number;

  // Cost calculation
  providerCost: number;     // What we pay the provider
  billedAmount: number;     // What we charge the customer (with markup)

  // Reference
  litellmRequestId: string;
  conversationId: string | null;

  // Metadata
  endpoint: string;         // 'chat', 'arena', 'task_planning'
  createdAt: Date;
}
```

### Budget Tracking

```typescript
interface Budget {
  id: string;

  // Scope
  scopeType: 'org' | 'group' | 'user' | 'tier';
  scopeId: string;
  organizationId: string;   // Always set for org context

  // Limits
  limitAmount: number;
  limitPeriod: 'daily' | 'weekly' | 'monthly';

  // Current state
  currentUsage: number;
  periodStart: Date;
  periodEnd: Date;

  // Alerts
  alertThreshold: number;   // 0.8 = alert at 80%
  alertSent: boolean;

  // Behavior when exceeded
  hardLimit: boolean;       // true = block, false = warn only
}

// Budget check before request
async function checkBudget(userId: string, estimatedCost: number): Promise<BudgetCheckResult> {
  const budgets = await getBudgetsForUser(userId);

  for (const budget of budgets) {
    const remaining = budget.limitAmount - budget.currentUsage;

    if (remaining < estimatedCost && budget.hardLimit) {
      return { allowed: false, reason: `${budget.scopeType} budget exceeded` };
    }

    if (budget.currentUsage / budget.limitAmount > budget.alertThreshold && !budget.alertSent) {
      await sendBudgetAlert(budget);
    }
  }

  return { allowed: true };
}
```

### Billing Engine (Phase 2+)

For internal pilot, we just need tracking. Actual billing comes later:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BILLING PHASES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: Internal Pilot (NOW)                                  │
│  ├── Track all usage                                            │
│  ├── Store usage records                                        │
│  ├── Budget enforcement (for testing)                           │
│  └── Export usage reports (CSV/JSON)                            │
│                                                                 │
│  PHASE 2: External Beta (+1 month)                              │
│  ├── Usage dashboards                                           │
│  ├── Cost attribution reports                                   │
│  ├── Budget alerts                                              │
│  └── Manual invoicing (if needed)                               │
│                                                                 │
│  PHASE 3: Production (+3 months)                                │
│  ├── Stripe integration                                         │
│  ├── Automated invoicing                                        │
│  ├── Self-serve billing portal                                  │
│  └── Multiple billing models                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pricing Model Discovery

Use internal pilot to discover pricing:

```typescript
// After 1 month of internal usage, analyze:
interface PricingDiscoveryReport {
  // Usage patterns
  totalRequests: number;
  requestsByTier: Record<ModelTierSlug, number>;
  requestsByUser: Record<string, number>;
  peakUsageHours: number[];

  // Cost analysis
  totalProviderCost: number;
  costByTier: Record<ModelTierSlug, number>;
  costByUser: Record<string, number>;

  // Derived insights
  averageCostPerUser: number;
  averageCostPerRequest: number;
  powerUsersCount: number;       // Top 10% of usage
  lightUsersCount: number;       // Bottom 50%

  // Pricing suggestions
  suggestedPerSeatPrice: number; // Based on avg cost + margin
  suggestedTierPricing: Record<ModelTierSlug, number>;
}
```

---

## Admin Panel Architecture

### Route Structure

```
/app                          # Regular user routes
├── /                         # Dashboard
├── /spaces/[space]           # Space view
├── /arena                    # Model Arena
└── /settings                 # User settings

/admin                        # Global admin (platform operators)
├── /                         # Overview dashboard
├── /organizations            # All orgs
│   ├── /                     # List
│   ├── /new                  # Create org
│   └── /[id]                 # Org detail
│       ├── /                 # Overview
│       ├── /users            # Org users
│       ├── /billing          # Org billing
│       └── /settings         # Org settings
├── /modules                  # Model tiers
│   └── /[id]                 # Tier config
├── /users                    # All platform users
├── /billing                  # Platform billing overview
│   ├── /                     # Dashboard
│   ├── /usage                # Usage reports
│   └── /invoices             # All invoices
├── /guardrails               # Global guardrails
└── /settings                 # Platform settings

/org                          # Org admin (customer admins)
├── /                         # Org dashboard
├── /users                    # Manage org users
│   ├── /                     # List
│   ├── /invite               # Invite users
│   └── /[id]                 # User detail
├── /groups                   # Manage groups
│   ├── /                     # List
│   ├── /new                  # Create group
│   └── /[id]                 # Group detail
│       ├── /                 # Overview
│       └── /members          # Group members
├── /modules                  # Model tier access
│   └── /                     # Enable/disable, set budgets
├── /usage                    # Org usage reports
├── /billing                  # Org billing
│   ├── /                     # Current usage
│   └── /history              # Invoice history
└── /settings                 # Org settings
    └── /guardrails           # Org guardrails
```

### Internal Pilot Simplification

For internal pilot, we don't need full admin separation:

```
┌─────────────────────────────────────────────────────────────────┐
│              INTERNAL PILOT ADMIN APPROACH                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OPTION A: RBAC in Main App                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Same /app routes, but with role-based UI:              │   │
│  │                                                          │   │
│  │  role === 'admin' → Show "Manage Users" in sidebar      │   │
│  │  role === 'admin' → Show "Usage Reports" in sidebar     │   │
│  │  role === 'admin' → Show user management UI             │   │
│  │                                                          │   │
│  │  Benefits:                                               │   │
│  │  ├── Fastest to implement                                │   │
│  │  ├── No separate routes                                  │   │
│  │  └── Natural for small team                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  OPTION B: Settings Sub-Routes                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  /app/settings/team        → Manage org users           │   │
│  │  /app/settings/groups      → Manage groups              │   │
│  │  /app/settings/usage       → Usage reports              │   │
│  │  /app/settings/billing     → Billing (view only)        │   │
│  │                                                          │   │
│  │  Benefits:                                               │   │
│  │  ├── Organized, scalable                                 │   │
│  │  ├── Easy to gate by role                                │   │
│  │  └── Evolves into /org routes later                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  RECOMMENDATION: Option B                                       │
│  ├── Start with /app/settings/* for internal pilot             │
│  ├── Role-gate the settings sub-routes                         │
│  └── Extract to /org/* when external customers need isolation  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Admin UI Components Needed

For internal pilot MVP:

| Component | Priority | Description |
|-----------|----------|-------------|
| UserList | P0 | List org users with roles |
| InviteUser | P0 | Email invite flow |
| UserDetail | P1 | View/edit user, assign groups |
| GroupList | P1 | List groups |
| GroupCreate | P1 | Create group with users |
| UsageOverview | P0 | Org-wide usage charts |
| UserUsage | P1 | Per-user usage breakdown |
| TierAccess | P1 | Enable/disable tiers per group |

---

## LiteLLM Integration

### Sync Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    LITELLM SYNC STRATEGY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  StratAI (Source of Truth)          LiteLLM (Enforcement)      │
│  ┌─────────────────────┐           ┌─────────────────────┐     │
│  │                     │           │                     │     │
│  │  organizations ─────┼──────────►│  organizations      │     │
│  │                     │   sync    │                     │     │
│  │  groups ────────────┼──────────►│  teams              │     │
│  │                     │   sync    │                     │     │
│  │  users ─────────────┼──────────►│  end_users          │     │
│  │                     │   sync    │  + virtual_keys     │     │
│  │                     │           │                     │     │
│  │  budgets ───────────┼──────────►│  budget_limits      │     │
│  │                     │   sync    │                     │     │
│  └─────────────────────┘           └─────────────────────┘     │
│                                                                 │
│  SYNC TRIGGERS:                                                 │
│  ├── Org created → Create LiteLLM org                          │
│  ├── Group created → Create LiteLLM team                       │
│  ├── User added to org → Create virtual key                    │
│  ├── Budget changed → Update LiteLLM budget                    │
│  └── Tier access changed → Update key model access             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### LiteLLM API Integration

```typescript
// src/lib/server/litellm/client.ts

const LITELLM_BASE_URL = process.env.LITELLM_URL || 'http://localhost:4000';
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;

export class LiteLLMClient {
  // Organization management
  async createOrganization(org: { name: string; budget?: number }): Promise<LiteLLMOrg> {
    const response = await fetch(`${LITELLM_BASE_URL}/organization/new`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LITELLM_MASTER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organization_alias: org.name,
        max_budget: org.budget
      })
    });
    return response.json();
  }

  // Team management
  async createTeam(team: {
    name: string;
    organizationId: string;
    budget?: number
  }): Promise<LiteLLMTeam> {
    const response = await fetch(`${LITELLM_BASE_URL}/team/new`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LITELLM_MASTER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        team_alias: team.name,
        organization_id: team.organizationId,
        max_budget: team.budget
      })
    });
    return response.json();
  }

  // Virtual key management
  async createVirtualKey(params: {
    userId: string;
    teamId: string;
    models: string[];      // Allowed models based on tier
    budget?: number;
  }): Promise<LiteLLMKey> {
    const response = await fetch(`${LITELLM_BASE_URL}/key/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LITELLM_MASTER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: params.userId,
        team_id: params.teamId,
        models: params.models,
        max_budget: params.budget,
        duration: '1y'        // Rotate annually
      })
    });
    return response.json();
  }

  // Usage retrieval
  async getUsage(params: {
    startDate: Date;
    endDate: Date;
    organizationId?: string;
    teamId?: string;
    userId?: string;
  }): Promise<LiteLLMUsage[]> {
    const query = new URLSearchParams({
      start_date: params.startDate.toISOString(),
      end_date: params.endDate.toISOString(),
      ...(params.organizationId && { organization_id: params.organizationId }),
      ...(params.teamId && { team_id: params.teamId }),
      ...(params.userId && { user_id: params.userId })
    });

    const response = await fetch(
      `${LITELLM_BASE_URL}/spend/logs?${query}`,
      {
        headers: { 'Authorization': `Bearer ${LITELLM_MASTER_KEY}` }
      }
    );
    return response.json();
  }
}
```

### Request Flow with Virtual Keys

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST WITH VIRTUAL KEY                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User makes request in StratAI                               │
│     │                                                           │
│     ▼                                                           │
│  2. StratAI looks up user's virtual key                         │
│     │                                                           │
│     ▼                                                           │
│  3. StratAI calls LiteLLM with virtual key                      │
│     │                                                           │
│     │  POST /v1/chat/completions                                │
│     │  Authorization: Bearer <user_virtual_key>                 │
│     │  X-StratAI-User-Id: user_xxx                              │
│     │  X-StratAI-Org-Id: org_xxx                                │
│     │                                                           │
│     ▼                                                           │
│  4. LiteLLM validates:                                          │
│     ├── Key is valid                                            │
│     ├── Model is in key's allowed list                          │
│     ├── Budget not exceeded                                     │
│     └── Rate limit not exceeded                                 │
│     │                                                           │
│     ▼                                                           │
│  5. LiteLLM forwards to provider                                │
│     │                                                           │
│     ▼                                                           │
│  6. LiteLLM logs usage with full attribution:                   │
│     ├── organization_id                                         │
│     ├── team_id                                                 │
│     ├── user_id                                                 │
│     └── virtual_key_id                                          │
│     │                                                           │
│     ▼                                                           │
│  7. Response returned to user                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Complete Schema for Enterprise

```sql
-- ============================================================
-- AUTHENTICATION & IDENTITY
-- ============================================================

-- Users (StratAI's user table, not Auth0's)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,

    -- Auth0 reference
    auth0_id TEXT UNIQUE,

    -- Platform role
    platform_role TEXT DEFAULT 'user' CHECK (platform_role IN ('super_admin', 'user')),

    -- State
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MULTI-TENANCY
-- ============================================================

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,

    -- LiteLLM sync
    litellm_org_id TEXT UNIQUE,

    -- Settings
    settings JSONB DEFAULT '{
        "allowedTiers": ["basic", "standard"],
        "defaultTier": "standard",
        "maxUsersPerGroup": 100,
        "requireMfa": false
    }',

    -- Billing
    billing_email TEXT,
    billing_plan TEXT DEFAULT 'trial' CHECK (
        billing_plan IN ('trial', 'starter', 'business', 'enterprise')
    ),
    stripe_customer_id TEXT,

    -- State
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE org_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role within org
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

    -- LiteLLM virtual key for this user in this org
    virtual_key TEXT,
    virtual_key_id TEXT,  -- LiteLLM's key ID

    -- Profile assigned by org admin
    profile_id UUID REFERENCES user_profiles(id),

    -- User's tier access (can be more restrictive than org's tiers)
    allowed_tiers TEXT[] DEFAULT ARRAY['basic', 'standard'],

    -- Personal budget within org
    monthly_budget DECIMAL(10,2),

    -- State
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, user_id)
);

-- Groups (departments/teams within org)
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,

    -- LiteLLM sync
    litellm_team_id TEXT,

    -- Group-level settings
    allowed_tiers TEXT[] DEFAULT ARRAY['basic', 'standard'],
    monthly_budget DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

-- Group memberships
CREATE TABLE group_memberships (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role within group
    role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member')),

    joined_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (group_id, user_id)
);

-- User profiles (templates for user types)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,              -- "Internal Employee", "External Contractor"
    description TEXT,

    -- Default settings for this profile
    default_tiers TEXT[] DEFAULT ARRAY['basic'],
    default_guardrails JSONB DEFAULT '[]',

    -- Who can use this profile
    available_to TEXT DEFAULT 'all' CHECK (available_to IN ('all', 'internal', 'enterprise')),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODEL TIERS (MODULES)
-- ============================================================

-- Model tier definitions
CREATE TABLE model_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,       -- 'basic', 'standard', 'premium'
    description TEXT,
    best_use_case TEXT,

    -- Pricing
    base_price DECIMAL(10,2) DEFAULT 0,
    input_token_rate DECIMAL(10,6),  -- $ per 1M tokens
    output_token_rate DECIMAL(10,6),

    -- Models in this tier
    models TEXT[] NOT NULL,

    -- Display order
    sort_order INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization tier subscriptions
CREATE TABLE org_tier_access (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES model_tiers(id) ON DELETE CASCADE,

    enabled BOOLEAN DEFAULT true,
    monthly_budget DECIMAL(10,2),

    enabled_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (organization_id, tier_id)
);

-- ============================================================
-- GUARDRAILS
-- ============================================================

CREATE TABLE guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,

    -- Type and config
    type TEXT NOT NULL CHECK (type IN (
        'model_allowlist', 'model_denylist', 'token_limit',
        'rate_limit', 'content_filter', 'output_modifier',
        'budget_limit', 'time_restriction'
    )),
    config JSONB NOT NULL,

    -- Scope
    level TEXT NOT NULL CHECK (level IN ('global', 'org', 'tier', 'group', 'user')),
    scope_id UUID,  -- null for global, otherwise references the scoped entity

    -- Behavior
    action TEXT DEFAULT 'block' CHECK (action IN ('block', 'warn', 'modify', 'log')),
    priority INTEGER DEFAULT 0,  -- Higher = checked first

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USAGE & BILLING
-- ============================================================

-- Usage records (pulled from LiteLLM or captured directly)
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Attribution
    organization_id UUID NOT NULL REFERENCES organizations(id),
    group_id UUID REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    tier_id UUID REFERENCES model_tiers(id),

    -- Request details
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,

    -- Cost
    provider_cost DECIMAL(10,6) NOT NULL,
    billed_amount DECIMAL(10,6) NOT NULL,

    -- Reference
    litellm_request_id TEXT,
    conversation_id UUID,
    endpoint TEXT,  -- 'chat', 'arena', 'task_planning'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget tracking
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope
    scope_type TEXT NOT NULL CHECK (scope_type IN ('org', 'group', 'user', 'tier')),
    scope_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Limits
    limit_amount DECIMAL(10,2) NOT NULL,
    limit_period TEXT DEFAULT 'monthly' CHECK (limit_period IN ('daily', 'weekly', 'monthly')),

    -- Current state
    current_usage DECIMAL(10,2) DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    -- Alerts
    alert_threshold DECIMAL(3,2) DEFAULT 0.80,
    alert_sent BOOLEAN DEFAULT false,

    -- Behavior
    hard_limit BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices (for billing phase)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,

    -- Line items stored as JSONB
    line_items JSONB NOT NULL DEFAULT '[]',

    -- Status
    status TEXT DEFAULT 'draft' CHECK (
        status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')
    ),

    -- Stripe reference
    stripe_invoice_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- ============================================================
-- INVITATIONS
-- ============================================================

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target
    email TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Assignment
    role TEXT DEFAULT 'member',
    group_ids UUID[] DEFAULT ARRAY[]::UUID[],
    profile_id UUID REFERENCES user_profiles(id),

    -- Token
    token TEXT UNIQUE NOT NULL,

    -- State
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Tracking
    invited_by UUID REFERENCES users(id),
    accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_org_memberships_org ON org_memberships(organization_id);
CREATE INDEX idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX idx_groups_org ON groups(organization_id);
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_guardrails_level ON guardrails(level, scope_id) WHERE is_active = true;
CREATE INDEX idx_usage_records_org ON usage_records(organization_id, created_at);
CREATE INDEX idx_usage_records_user ON usage_records(user_id, created_at);
CREATE INDEX idx_budgets_scope ON budgets(scope_type, scope_id);
CREATE INDEX idx_invitations_token ON invitations(token) WHERE status = 'pending';

-- ============================================================
-- ROW-LEVEL SECURITY (for data isolation)
-- ============================================================

ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Example policy (implement after adding organization_id to these tables)
-- CREATE POLICY org_isolation ON spaces
--   FOR ALL
--   USING (organization_id = current_setting('app.current_org_id')::uuid);
```

### Migration Plan

```sql
-- Migration: Add organization_id to existing tables

-- Step 1: Add column (nullable initially)
ALTER TABLE spaces ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE areas ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE conversations ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE documents ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Step 2: Create default internal org
INSERT INTO organizations (id, name, slug, billing_plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Internal', 'internal', 'enterprise');

-- Step 3: Assign existing data to internal org
UPDATE spaces SET organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE areas SET organization_id = '00000000-0000-0000-0000-000000000001';
-- etc.

-- Step 4: Make column required
ALTER TABLE spaces ALTER COLUMN organization_id SET NOT NULL;
-- etc.
```

---

## Implementation Phases

### Phase 0: Preparation (Days 1-2)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 0: PREPARATION                                           │
├─────────────────────────────────────────────────────────────────┤
│  Duration: 2 days                                               │
│                                                                 │
│  Tasks:                                                         │
│  ├── Set up Auth0 account and configure app                    │
│  ├── Create database migration scripts                          │
│  ├── Set up internal organization in database                   │
│  ├── Configure LiteLLM master key                               │
│  └── Document environment variables needed                      │
│                                                                 │
│  Deliverables:                                                  │
│  ├── Auth0 configured with StratAI app                         │
│  ├── Migration scripts ready                                    │
│  └── .env.example updated                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 1: Authentication (Days 3-5)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: AUTHENTICATION                                        │
├─────────────────────────────────────────────────────────────────┤
│  Duration: 3 days                                               │
│                                                                 │
│  Tasks:                                                         │
│  ├── Implement Auth0 SvelteKit integration                     │
│  ├── Create login/logout flows                                  │
│  ├── Create user sync (Auth0 → StratAI DB)                     │
│  ├── Implement session management                               │
│  ├── Protect all routes                                         │
│  └── Create user settings page                                  │
│                                                                 │
│  Files:                                                         │
│  ├── src/lib/server/auth/auth0.ts                              │
│  ├── src/hooks.server.ts (auth middleware)                     │
│  ├── src/routes/auth/login/+page.svelte                        │
│  ├── src/routes/auth/callback/+server.ts                       │
│  └── src/routes/auth/logout/+server.ts                         │
│                                                                 │
│  Deliverables:                                                  │
│  ├── Users can log in via Auth0                                │
│  ├── Sessions persist across page loads                        │
│  └── Unauthenticated users redirected to login                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Multi-Tenancy Core (Days 6-10)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: MULTI-TENANCY CORE                                    │
├─────────────────────────────────────────────────────────────────┤
│  Duration: 5 days                                               │
│                                                                 │
│  Tasks:                                                         │
│  ├── Run database migrations (add org tables)                  │
│  ├── Add organization_id to existing tables                    │
│  ├── Implement organization service                            │
│  ├── Implement org membership service                          │
│  ├── Update all queries to include org context                 │
│  ├── Create LiteLLM organization on org create                 │
│  └── Create invitation system                                   │
│                                                                 │
│  Files:                                                         │
│  ├── src/lib/server/services/organizations.ts                  │
│  ├── src/lib/server/services/memberships.ts                    │
│  ├── src/lib/server/services/invitations.ts                    │
│  ├── src/lib/server/litellm/client.ts                          │
│  └── migrations/013-*.sql through 016-*.sql                    │
│                                                                 │
│  Deliverables:                                                  │
│  ├── Organizations exist in database                           │
│  ├── Users belong to organizations                             │
│  ├── Data isolated by organization                             │
│  └── LiteLLM orgs synced                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Model Tiers & Virtual Keys (Days 11-14)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: MODEL TIERS & VIRTUAL KEYS                            │
├─────────────────────────────────────────────────────────────────┤
│  Duration: 4 days                                               │
│                                                                 │
│  Tasks:                                                         │
│  ├── Create model tier definitions                             │
│  ├── Implement tier access checks                              │
│  ├── Generate virtual keys per user                            │
│  ├── Update model selector to show only accessible models      │
│  ├── Route requests through user's virtual key                 │
│  └── Test budget enforcement                                    │
│                                                                 │
│  Files:                                                         │
│  ├── src/lib/config/model-tiers.ts                             │
│  ├── src/lib/server/services/tier-access.ts                    │
│  ├── src/lib/server/services/virtual-keys.ts                   │
│  ├── src/lib/components/chat/ModelSelector.svelte (update)     │
│  └── src/routes/api/chat/+server.ts (update)                   │
│                                                                 │
│  Deliverables:                                                  │
│  ├── Model selector shows tier-appropriate models              │
│  ├── Requests use per-user virtual keys                        │
│  └── Budget enforcement works                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 4: Usage Tracking (Days 15-17)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: USAGE TRACKING                                        │
├─────────────────────────────────────────────────────────────────┤
│  Duration: 3 days                                               │
│                                                                 │
│  Tasks:                                                         │
│  ├── Create usage_records table                                │
│  ├── Implement usage logging after each request                │
│  ├── Create usage aggregation queries                          │
│  ├── Build usage dashboard component                           │
│  └── Add usage export (CSV)                                    │
│                                                                 │
│  Files:                                                         │
│  ├── src/lib/server/services/usage.ts                          │
│  ├── src/routes/api/usage/+server.ts                           │
│  ├── src/lib/components/admin/UsageDashboard.svelte            │
│  └── src/routes/app/settings/usage/+page.svelte                │
│                                                                 │
│  Deliverables:                                                  │
│  ├── All requests logged with full attribution                 │
│  ├── Usage visible in dashboard                                │
│  └── Export for pricing analysis                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 5: Basic Admin UI (Days 18-21)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5: BASIC ADMIN UI                                        │
├─────────────────────────────────────────────────────────────────┤
│  Duration: 4 days                                               │
│                                                                 │
│  Tasks:                                                         │
│  ├── Create settings/team route                                │
│  ├── Implement user list component                             │
│  ├── Implement invite user flow                                │
│  ├── Create group management UI                                │
│  ├── Add role management (admin/member)                        │
│  └── Implement tier access per user/group                      │
│                                                                 │
│  Files:                                                         │
│  ├── src/routes/app/settings/team/+page.svelte                 │
│  ├── src/routes/app/settings/groups/+page.svelte               │
│  ├── src/lib/components/admin/UserList.svelte                  │
│  ├── src/lib/components/admin/InviteUserModal.svelte           │
│  ├── src/lib/components/admin/GroupManager.svelte              │
│  └── src/lib/components/admin/TierAccessControl.svelte         │
│                                                                 │
│  Deliverables:                                                  │
│  ├── Admins can view and manage users                          │
│  ├── Admins can invite new users                               │
│  ├── Admins can create groups                                  │
│  └── Admins can control model access                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 6: Polish & Internal Launch (Days 22-25)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 6: POLISH & INTERNAL LAUNCH                              │
├─────────────────────────────────────────────────────────────────┤
│  Duration: 4 days                                               │
│                                                                 │
│  Tasks:                                                         │
│  ├── Bug fixes and edge cases                                  │
│  ├── Error handling and user feedback                          │
│  ├── Loading states and optimistic UI                          │
│  ├── Documentation for internal users                          │
│  ├── Bulk invite 50 internal users                             │
│  └── Monitor and fix issues                                     │
│                                                                 │
│  Deliverables:                                                  │
│  ├── Stable internal deployment                                │
│  ├── 50 users onboarded                                        │
│  └── Usage data flowing                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Timeline Summary

```
Week 1: Auth + Multi-tenancy foundation
Week 2: Model tiers + Virtual keys + Usage tracking
Week 3: Admin UI + Polish
Week 4: Internal pilot launch + Bug fixes

External beta: End of Week 4 / Start of Week 5
```

---

## Risk Assessment

### High Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth0 integration issues | Blocks all progress | Start with Auth0, have backup plan |
| LiteLLM sync complexity | Broken budgets/keys | Build robust sync with retries |
| Data migration errors | Lost user data | Backup before migration, test thoroughly |
| Timeline slip | Delayed external launch | Cut scope, not quality |

### Medium Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSO requests from early customers | Pressure to add quickly | Set expectations, offer later |
| Usage tracking gaps | Inaccurate billing data | Log everything, reconcile regularly |
| Performance with 50 users | Slow experience | Monitor from day 1, optimize |

### Low Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth0 cost increase | Higher OpEx | Monitor MAU, migrate if needed |
| LiteLLM breaking changes | Integration breaks | Pin versions, test upgrades |

---

## Decision Log

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Auth provider | Auth0, Clerk, Roll own | Auth0 | Speed to market, SSO-ready, free tier |
| Module definition | Features, Model tiers, Use-cases | Model tiers | Clearest billing, simplest implementation |
| Admin architecture | Separate app, Same app routes | Same app + RBAC | Faster, evolves naturally |
| LiteLLM sync | Shared DB, API sync, Event-driven | API sync | Clean separation, resilient |
| SSO timing | Now, Phase 2, Phase 3 | Phase 3 | Not needed for pilot, adds time |
| Data isolation | App-level, RLS, Separate DBs | RLS | Best balance of isolation and simplicity |

---

## Appendix A: Environment Variables

```bash
# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_CALLBACK_URL=http://localhost:5173/auth/callback

# LiteLLM
LITELLM_URL=http://localhost:4000
LITELLM_MASTER_KEY=sk-master-key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/stratai

# Stripe (Phase 3+)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## Appendix B: API Endpoints Needed

```
# Authentication
POST   /auth/login              → Redirect to Auth0
GET    /auth/callback           → Handle Auth0 callback
POST   /auth/logout             → Clear session

# Organizations
GET    /api/organizations       → List user's orgs (admin: all)
POST   /api/organizations       → Create org (admin only)
GET    /api/organizations/:id   → Get org details
PATCH  /api/organizations/:id   → Update org settings
DELETE /api/organizations/:id   → Deactivate org

# Memberships
GET    /api/organizations/:id/members     → List org members
POST   /api/organizations/:id/members     → Add member (invite)
PATCH  /api/organizations/:id/members/:id → Update member role/access
DELETE /api/organizations/:id/members/:id → Remove member

# Groups
GET    /api/organizations/:id/groups      → List org groups
POST   /api/organizations/:id/groups      → Create group
PATCH  /api/groups/:id                    → Update group
DELETE /api/groups/:id                    → Delete group
POST   /api/groups/:id/members            → Add member to group
DELETE /api/groups/:id/members/:userId    → Remove from group

# Invitations
POST   /api/invitations                   → Create invitation
GET    /api/invitations/:token            → Get invitation details
POST   /api/invitations/:token/accept     → Accept invitation

# Model Tiers
GET    /api/tiers                         → List all tiers
GET    /api/tiers/accessible              → List user's accessible tiers

# Usage
GET    /api/usage                         → Get usage (filtered by scope)
GET    /api/usage/export                  → Export usage CSV

# Budgets
GET    /api/budgets                       → Get budgets for scope
PATCH  /api/budgets/:id                   → Update budget
```

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-08 | 1.0 | Claude Code | Initial document |
