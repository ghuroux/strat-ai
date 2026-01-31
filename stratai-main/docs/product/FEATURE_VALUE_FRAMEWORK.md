# Feature Value Framework

> **Document Purpose:** A scoring methodology that evaluates every StratAI feature by its contribution to the killer feature: the **governed organisational mind**. This framework qualifies existing features, prioritizes future investment, and provides the empirical proxy metric (OII) for measuring success.
>
> **Core Principle:** We are technology builders, but it is not technology that we sell. The product is the governed organisational mind. Everything else is scaffolding.
>
> **Created:** 31 January 2026
> **Status:** Baseline established — scores should be revisited quarterly
>
> **Related Documents:**
> - [`PRODUCT_VISION.md`](./PRODUCT_VISION.md) — Product vision and Data Flywheel
> - [`../architecture/CONTEXT_STRATEGY.md`](../architecture/CONTEXT_STRATEGY.md) — Context management architecture (closed-loop knowledge system)
> - [`../architecture/COGNITIVE_GOVERNANCE.md`](../architecture/COGNITIVE_GOVERNANCE.md) — Cognitive governance framework
> - [`../research/SKILLS_MARKET_RESEARCH.md`](../research/SKILLS_MARKET_RESEARCH.md) — Skills market research (Jan 2026)

---

## Table of Contents

1. [The Killer Feature](#the-killer-feature)
2. [Scoring Methodology](#scoring-methodology)
3. [The Organisational Intelligence Index (OII)](#the-organisational-intelligence-index-oii)
4. [Feature Scorecard — Existing Features](#feature-scorecard--existing-features)
5. [Feature Scorecard — Planned Features](#feature-scorecard--planned-features)
6. [Master Ranking](#master-ranking)
7. [Strategic Analysis](#strategic-analysis)
8. [Feature Qualification Gate](#feature-qualification-gate)
9. [Weight Evolution](#weight-evolution)
10. [Appendix: Detailed Justifications](#appendix-detailed-justifications)

---

## The Killer Feature

### What We Sell

We do not sell a chat interface. We do not sell document management. We do not sell task tracking, calendar integration, or AI model access.

We sell a **governed organisational mind** — a system that captures, structures, connects, compounds, and governs organizational intelligence so that the entire organization thinks better over time.

Every individual feature is scaffolding that feeds this mind. Productivity, collaboration, and usability are **second-order effects**. They are how users experience value, but they are not the value itself.

### Why This Framing Matters

Without this framing:
- Feature decisions are driven by competitor parity ("Notion has X, so we need X")
- Roadmap is a grab-bag of user requests
- Differentiation erodes to "we're like ChatGPT but for teams"
- Investment is spread thin across unrelated capabilities

With this framing:
- Every feature must demonstrate its contribution to the organisational mind
- Roadmap is a coherent sequence of intelligence-building investments
- Differentiation is structural and compounding
- Investment concentrates on what makes the system irreplaceable

### The Governed Organisational Mind Has Five Properties

| Property | What It Means | Without It |
|----------|--------------|------------|
| **Captures** | Intelligence enters the system | Knowledge evaporates after meetings, chats, decisions |
| **Structures** | Intelligence is organized hierarchically | Flat context, no scoping, no authority awareness |
| **Connects** | Features feed each other through context | Isolated tools, no compounding |
| **Compounds** | Intelligence gets more valuable over time | Same value on day 1 and day 1000 |
| **Governs** | Intelligence maintains organizational coherence | High-quality chaos — locally brilliant, globally incoherent |

---

## Scoring Methodology

### Dimensions

Every feature is rated on 5 dimensions corresponding to the five properties of the governed organisational mind. Each dimension is scored 0-5.

#### 1. Captures (Weight: 20%)

Does this feature capture organizational intelligence that would otherwise be lost?

| Score | Meaning |
|-------|---------|
| 0 | Generates no organizational intelligence |
| 1 | Captures incidental metadata |
| 2 | Captures useful reference information |
| 3 | Captures some organizational knowledge |
| 4 | Captures significant decisions, reasoning, or commitments |
| 5 | Captures critical intelligence at the point of creation — irreplaceable if lost |

#### 2. Structures (Weight: 20%)

Does this feature organize intelligence within the hierarchy (Org → Space → Area → Task)?

| Score | Meaning |
|-------|---------|
| 0 | No hierarchy awareness |
| 1 | Trivially scoped (e.g., org-filtered) |
| 2 | Uses the hierarchy for basic scoping |
| 3 | Respects hierarchy for context and access |
| 4 | Deeply hierarchy-aware, context flows correctly through levels |
| 5 | Defines or enforces the hierarchy itself — authority boundaries, governance layers |

#### 3. Connects (Weight: 25%)

Does this feature participate in the closed loop — feeding context TO other features and consuming context FROM other features?

| Score | Meaning |
|-------|---------|
| 0 | Completely isolated |
| 1 | Tangentially related to other features |
| 2 | Consumes OR produces context (one direction) |
| 3 | Moderate bidirectional flow |
| 4 | Strong bidirectional flow — central to the loop |
| 5 | Hub feature — the loop does not function without this feature |

#### 4. Compounds (Weight: 20%)

Does this feature get more valuable as organizational intelligence accumulates?

| Score | Meaning |
|-------|---------|
| 0 | Identical value on day 1 and day 1000 |
| 1 | Marginally better with more data |
| 2 | Linearly better (more content = more useful, but not exponentially) |
| 3 | Noticeably better — accumulated intelligence improves quality |
| 4 | Significantly better — the feature transforms with accumulated context |
| 5 | Dramatically better — becomes irreplaceable as memory grows |

#### 5. Governs (Weight: 15%)

Does this feature support organizational coherence — constraints, friction detection, alignment?

| Score | Meaning |
|-------|---------|
| 0 | No governance dimension |
| 1 | Incidental governance (e.g., basic access control inherited from auth) |
| 2 | Supports some compliance or accountability |
| 3 | Active governance — enforces structure or quality |
| 4 | Strong governance — maintains institutional coherence |
| 5 | Core governance enabler — the system would be ungoverned without this |

### Weighted Score Formula

```
Score = (Captures × 0.20) + (Structures × 0.20) + (Connects × 0.25) + (Compounds × 0.20) + (Governs × 0.15)
```

Maximum possible score: **5.00**

### Why These Weights

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| Captures | 20% | Necessary but not sufficient — table stakes for the mind |
| Structures | 20% | The hierarchy IS the product architecture |
| **Connects** | **25%** | **The closed loop is the compounding mechanism — the flywheel** |
| Compounds | 20% | Long-term moat — what creates switching costs |
| Governs | 15% | Differentiator but earlier-stage — weight increases as governance matures |

Connects gets the highest weight because it measures participation in the closed-loop system. A feature that captures perfectly but doesn't connect to anything is a silo. The loop is what creates compounding value.

---

## The Organisational Intelligence Index (OII)

### Purpose

The OII is the **empirical proxy metric** for "is the governed organisational mind working?" It is composed of measurable signals from the system, each traceable to feature contributions.

### The Problem It Solves

You cannot directly measure "organisational mind quality." You also cannot reliably measure "productivity improvement" (too many confounders). You need a proxy that:
- Is measurable from system data (no surveys)
- Genuinely correlates with the mind working
- Is decomposable (features can measure their contribution)
- Sums meaningfully (contributions compose into the whole)

### OII Component Signals

| Signal | What It Measures | Proxy For | Features That Drive It |
|--------|-----------------|-----------|----------------------|
| **Capture Rate** | % of organizational events (meetings, decisions) that enter the system | Intelligence is being preserved | Meetings, Guided Creation, Pages, Tasks, Post-Meeting Capture |
| **Context Depth** | Average hierarchy levels contributing per AI interaction | The hierarchy is being used | Areas, Spaces, Chat, Context Transparency, Skills |
| **Loop Closure Rate** | % of decisions with outcomes tracked back | Learning is happening | Tasks, Pages, Memory System |
| **Cross-Feature Flow** | Average features contributing context per interaction | The loop is working | Chat (hub), Meetings, Pages, Tasks, Calendar, Integrations |
| **Governance Signal Rate** | Friction events surfaced / contradictions present | Coherence is maintained | Cognitive Governance, Page Audit Trail, Admin Console |
| **Knowledge Reuse Rate** | Past context referenced in new decisions | Intelligence is compounding | Memory System, Pages, Skills, Documents |

### OII Formula (Conceptual)

```
OII = (Capture Rate × w₁) + (Context Depth × w₂) + (Loop Closure × w₃) +
      (Cross-Feature Flow × w₄) + (Governance Signal × w₅) + (Knowledge Reuse × w₆)
```

Weights TBD after establishing baseline measurements. Initial equal weighting is recommended until we have data to calibrate.

### OII by Tier (Commercial Alignment)

| Tier | Expected OII | Why |
|------|-------------|-----|
| Free | Low (10-20) | Chat only, no hierarchy, no memory |
| Pro | Medium (30-50) | Hierarchy, basic memory, some integrations |
| Enterprise | High (60-80+) | Full governance, all features, maximum context density |

The OII naturally aligns with pricing tiers because higher tiers unlock more features that drive higher signal values. This means we're not selling features — we're selling OII improvement.

---

## Feature Scorecard — Existing Features

### Core Platform Features

| # | Feature | Cap | Str | Con | Cmp | Gov | **Score** |
|---|---------|-----|-----|-----|-----|-----|-----------|
| 1 | Chat & AI System | 3 | 4 | 5 | 4 | 3 | **3.90** |
| 2 | Spaces | 2 | 5 | 4 | 3 | 5 | **3.75** |
| 3 | Areas | 3 | 5 | 5 | 4 | 4 | **4.25** |
| 4 | Tasks | 4 | 4 | 4 | 3 | 3 | **3.65** |
| 5 | Pages | 4 | 4 | 4 | 4 | 3 | **3.85** |
| 6 | Documents | 2 | 3 | 3 | 2 | 2 | **2.55** |
| 7 | Meetings | 5 | 3 | 5 | 5 | 3 | **4.35** |
| 8 | Calendar Integration | 1 | 1 | 3 | 1 | 1 | **1.60** |

### Supporting & Administrative Features

| # | Feature | Cap | Str | Con | Cmp | Gov | **Score** |
|---|---------|-----|-----|-----|-----|-----|-----------|
| 9 | Skills | 4 | 4 | 4 | 4 | 3 | **3.85** |
| 10 | Context Transparency | 2 | 3 | 4 | 3 | 4 | **3.20** |
| 11 | Model Arena | 2 | 1 | 1 | 2 | 1 | **1.40** |
| 12 | Admin Console | 1 | 3 | 2 | 2 | 5 | **2.45** |
| 13 | Guided Creation | 5 | 4 | 5 | 4 | 3 | **4.35** |
| 14 | Search (Global) | 0 | 3 | 3 | 3 | 1 | **2.10** |
| 15 | Games | 0 | 1 | 0 | 0 | 0 | **0.15** |
| 16 | Usage Tracking | 1 | 3 | 1 | 2 | 4 | **2.00** |
| 17 | Auth & Members | 0 | 4 | 2 | 1 | 5 | **2.15** |
| 18 | Page Audit Trail | 3 | 4 | 2 | 4 | 5 | **3.40** |

---

## Feature Scorecard — Planned Features

These are scored on **design potential** — what they would achieve if built well.

| # | Feature | Cap | Str | Con | Cmp | Gov | **Score** |
|---|---------|-----|-----|-----|-----|-----|-----------|
| 19 | Context Intelligence / Memory | 5 | 5 | 5 | 5 | 4 | **4.85** |
| 20 | Cognitive Governance | 3 | 5 | 5 | 5 | 5 | **4.60** |
| 21 | Email Integration | 3 | 2 | 3 | 2 | 2 | **2.55** |
| 22 | GitHub Integration | 3 | 4 | 4 | 3 | 2 | **3.30** |
| 23 | Jira Integration | 3 | 4 | 4 | 3 | 2 | **3.30** |
| 24 | Comments & Discussions | 4 | 3 | 3 | 3 | 2 | **3.05** |
| 25 | Post-Meeting Capture Prompts | 5 | 4 | 5 | 4 | 3 | **4.30** |
| 26 | Confluence Import Tool | 2 | 2 | 2 | 1 | 1 | **1.75** |

### Identified Through Framework Analysis (Memory System Sub-Features)

These features emerged from a thought experiment: "what's missing from the OII signals?" They are likely sub-features of the Memory System (19) or standalone features built alongside/after it. Captured here to preserve optionality — specs to be built when Memory is being designed.

| # | Feature | Cap | Str | Con | Cmp | Gov | **Score** |
|---|---------|-----|-----|-----|-----|-----|-----------|
| 27 | Decision Registry | 5 | 5 | 5 | 5 | 5 | **5.00** |
| 28 | Retrospective Intelligence | 5 | 5 | 5 | 5 | 4 | **4.85** |
| 29 | Outcome Tracking | 5 | 4 | 5 | 5 | 4 | **4.70** |
| 30 | Onboarding Briefing | 3 | 5 | 5 | 5 | 3 | **4.30** |
| 31 | Knowledge Gap Detection | 4 | 4 | 4 | 4 | 3 | **3.85** |

---

## Master Ranking

All 31 features ranked by weighted score:

| Rank | Feature | Score | Status | Category |
|------|---------|-------|--------|----------|
| **1** | **Decision Registry** | **5.00** | **Identified** | **Atomic Unit of the Mind** |
| 2 | Context Intelligence / Memory | **4.85** | Planned | The Moat |
| **2** | **Retrospective Intelligence** | **4.85** | **Identified** | **Memory Made Legible** |
| **4** | **Outcome Tracking** | **4.70** | **Identified** | **Loop Closer** |
| 5 | Cognitive Governance | **4.60** | Planned | Coherence Engine |
| 6 | Meetings | **4.35** | Built | Intelligence Generator |
| 6 | Guided Creation | **4.35** | Built | Intelligence Capture |
| 8 | Post-Meeting Capture | **4.30** | Planned | Capture Accelerator |
| **8** | **Onboarding Briefing** | **4.30** | **Identified** | **Compound Proof** |
| 10 | Areas | **4.25** | Built | Working Context |
| 11 | Chat & AI System | **3.90** | Built | Interaction Layer |
| 12 | Pages | **3.85** | Built | Knowledge Store |
| 12 | Skills | **3.85** | Built | Methodology Layer |
| **12** | **Knowledge Gap Detection** | **3.85** | **Identified** | **Intelligence Gaps as Signal** |
| 15 | Spaces | **3.75** | Built | Structural Backbone |
| 16 | Tasks | **3.65** | Built | Commitment Tracker |
| 17 | Page Audit Trail | **3.40** | Built | Provenance |
| 18 | GitHub Integration | **3.30** | Planned | Technical Bridge |
| 18 | Jira Integration | **3.30** | Planned | Execution Bridge |
| 20 | Context Transparency | **3.20** | Built | Trust Layer |
| 21 | Comments & Discussions | **3.05** | Planned | Deliberation |
| 22 | Documents | **2.55** | Built | Reference Library |
| 22 | Email Integration | **2.55** | Planned | Communication Bridge |
| 24 | Admin Console | **2.45** | Built | Control Surface |
| 25 | Auth & Members | **2.15** | Built | Permission Layer |
| 26 | Search (Global) | **2.10** | Built | Navigation |
| 27 | Usage Tracking | **2.00** | Built | Cost Governance |
| 28 | Confluence Import | **1.75** | Planned | Migration Utility |
| 29 | Calendar Integration | **1.60** | Built | Scheduling Plumbing |
| 30 | Model Arena | **1.40** | Built | Education |
| 31 | Games | **0.15** | Built | Engagement |

> **Status key:** Built = shipped, Planned = designed with spec, **Identified** = captured through framework analysis (spec TBD, likely Memory sub-features)

### Score Distribution

```
5.0 ┤ ★ Decision Registry (5.00)
    │
4.5 ┤ ■ Memory (4.85)  ★ Retrospective (4.85)
    │ ★ Outcome Tracking (4.70)  ■ Governance (4.60)
4.0 ┤ ■■ Meetings/Guided (4.35)  ■ Post-Meeting (4.30)  ★ Onboarding (4.30)  ■ Areas (4.25)
    │
3.5 ┤ ■■ Chat/Pages/Skills (3.85-3.90)  ★ Knowledge Gaps (3.85)  ■ Spaces (3.75)  ■ Tasks (3.65)
    │ ■ Audit (3.40)  ■■ GitHub/Jira (3.30)  ■ Context (3.20)
3.0 ┤ ■ Comments (3.05)
    │
2.5 ┤ ■■ Docs/Email (2.55)  ■ Admin (2.45)
    │ ■ Auth (2.15)  ■ Search (2.10)  ■ Usage (2.00)
2.0 ┤
    │ ■ Confluence (1.75)  ■ Calendar (1.60)  ■ Arena (1.40)
1.5 ┤
    │
1.0 ┤
    │
0.5 ┤
    │ ■ Games (0.15)
0.0 ┤

★ = Identified through framework analysis (spec TBD)
■ = Built or Planned with spec
```

---

## Strategic Analysis

### 1. The Natural Tiers

The scores cluster into four natural tiers:

| Tier | Score Range | Features | What They Are |
|------|------------|----------|---------------|
| **Tier 1: The Mind** | 4.0+ | Decision Registry★, Memory, Retrospective★, Outcome Tracking★, Governance, Meetings, Guided Creation, Post-Meeting, Onboarding★, Areas | Features that ARE the governed organisational mind |
| **Tier 2: The System** | 3.0 - 3.99 | Chat, Pages, Skills, Knowledge Gaps★, Spaces, Tasks, Audit, Integrations, Context, Comments | Features that SUPPORT the mind |
| **Tier 3: The Infrastructure** | 1.5 - 2.99 | Documents, Email, Admin, Auth, Search, Usage, Confluence, Calendar | Features that ENABLE the mind |
| **Tier 4: The Peripheral** | < 1.5 | Arena, Games | Features that serve other purposes |

> ★ = Identified through framework analysis — spec TBD, likely Memory sub-features

**Implication:** Investment should flow top-down. Tier 1 features should receive disproportionate attention because they ARE the product. Tier 2 features should be refined to better serve Tier 1. Tier 3 features should be maintained but not over-invested. Tier 4 features should be honest about their role.

### 2. The Biggest Investment Gaps

The two highest-scoring features — Memory (4.85) and Cognitive Governance (4.60) — are **planned but not built**. This is simultaneously the biggest risk and the biggest opportunity:

- **Risk:** The core product is unfinished. Everything we've built is scaffolding for something that doesn't exist yet.
- **Opportunity:** We know exactly what to build next, and we know it's the highest-leverage investment.

### 3. The Flywheel Is Already Partially Working

The existing features form a partial loop:
```
Meetings (4.35) ──▶ Guided Creation (4.35) ──▶ Pages (3.85) + Tasks (3.65)
                                                      │
                                                      ▼
Areas (4.25) ──▶ Chat (3.90) ◀── Skills (3.85) ◀── Spaces (3.75)
```

What's missing is the feedback loop that closes this circuit:
```
Pages + Tasks + Chat ──▶ [MEMORY SYSTEM] ──▶ [GOVERNANCE] ──▶ Better Context ──▶ Better Chat
                              ↑                                        │
                              └────────────────────────────────────────┘
```

### 4. Meetings Are the Highest-Value Existing Feature

Meetings + Guided Creation (both 4.35) form the richest intelligence capture pipeline. This confirms the calendar → meeting → capture → context → AI → preparation loop is the correct flywheel to invest in. Post-Meeting Capture Prompts (4.30, planned) would further strengthen this.

### 5. Games Deserve Honest Positioning

Games score 0.15 — the lowest possible score above zero. This doesn't mean they should be removed. It means they serve a different purpose (engagement, culture, team bonding) that this framework doesn't measure. They should be evaluated on those dimensions separately.

The same applies to Model Arena (1.40) — it serves user education, which has value, but not through the lens of the governed organisational mind.

### 6. Governance Features Score Lower Because Governance Is Early

Admin Console (2.45), Auth (2.15), Usage Tracking (2.00), and Page Audit Trail (3.40) all score 4-5 on the Governs dimension but low on other dimensions. These are the skeleton of governance — necessary for the body to function, but not the intelligence itself. As the Cognitive Governance framework (4.60) gets built, these features will be upgraded to participate more actively in the intelligence loop.

### 7. Integrations Are Context Bridges, Not Core

GitHub (3.30), Jira (3.30), Email (2.55), and Calendar (1.60) all follow the same pattern: they connect StratAI to external systems. Their value is proportional to how well they feed the memory system and respect the governance framework. Without the core (Memory + Governance), they are just another integration layer. With the core, they become tributaries that make the organisational mind more comprehensive.

### 8. Highest-Leverage Improvements to Existing Features

| Feature | Current | Key Improvement | Potential |
|---------|---------|-----------------|-----------|
| Chat | 3.90 | Extract structured intelligence from conversations → Memory | 4.50+ |
| Tasks | 3.65 | Task completion → Memory (outcomes, learnings) | 4.20+ |
| Pages | 3.85 | Semantic linking between pages, cross-Area visibility | 4.30+ |
| Search | 2.10 | Capture search patterns as intelligence gaps, add semantic search | 3.50+ |
| Arena | 1.40 | Feed battle results into AUTO model routing | 2.50+ |
| Documents | 2.55 | Staleness scoring, automatic relevance ranking | 3.20+ |

---

## Feature Qualification Gate

### For New Features

Before any new feature enters the roadmap, it must pass this gate:

#### Minimum Qualification

| Criterion | Threshold |
|-----------|-----------|
| Weighted score | ≥ 2.5 |
| At least one dimension | ≥ 4 |
| Connects dimension | ≥ 2 (must participate in the loop) |

Features below 2.5 can still be built but must be justified on non-flywheel grounds (market capture, competitive response, engagement) and explicitly labeled as such.

#### Priority Classification

| Score Range | Priority | Investment Level |
|-------------|----------|-----------------|
| 4.0+ | Critical | Maximum investment — this IS the product |
| 3.0 - 3.99 | High | Solid investment — supports the core |
| 2.0 - 2.99 | Medium | Moderate investment — infrastructure and enablers |
| 1.0 - 1.99 | Low | Minimal investment — utility features |
| < 1.0 | Justify | Must justify existence on other grounds |

### For Existing Features

Existing features with low scores should be evaluated for:

1. **Upgrade potential** — Can the feature be enhanced to score higher? (See "Highest-Leverage Improvements" above)
2. **Infrastructure role** — Is the feature necessary plumbing that enables higher-scoring features? (Calendar enables Meetings)
3. **Non-flywheel value** — Does the feature serve a legitimate purpose outside the framework? (Games serve engagement)
4. **Removal candidate** — Is the feature genuinely adding nothing? (Rare, but possible)

---

## Weight Evolution

The dimension weights should evolve as the product matures:

### Current Weights (MVP Phase)

Focused on building the intelligence base:

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| Captures | 20% | Building the intelligence base |
| Structures | 20% | Architecture is set |
| **Connects** | **25%** | **The loop must work** |
| Compounds | 20% | Must demonstrate compounding early |
| Governs | 15% | Governance layer is early |

### Post-Memory Weights (After Phase 1-2 of Context Strategy)

Intelligence base exists; governance becomes more important:

| Dimension | Weight | Change |
|-----------|--------|--------|
| Captures | 15% | -5% — capture mechanisms are established |
| Structures | 20% | Stable |
| Connects | 25% | Stable |
| Compounds | 20% | Stable |
| **Governs** | **20%** | **+5% — governance layer is active** |

### Enterprise Weights (Mature Product)

All dimensions fully operational:

| Dimension | Weight | Change |
|-----------|--------|--------|
| Captures | 15% | Stable |
| Structures | 15% | -5% — hierarchy is established fact |
| Connects | 25% | Stable |
| **Compounds** | **25%** | **+5% — compounding IS the moat** |
| Governs | 20% | Stable |

### Rescoring Protocol

When weights change, all features should be rescored. Feature scores should also be updated when:
- A feature is significantly enhanced (e.g., Tasks get memory integration)
- A new feature changes how existing features connect (e.g., Memory changes everything)
- Quarterly review of alignment

---

## Appendix: Detailed Justifications

### Tier 1 Features (Score 4.0+)

#### Context Intelligence / Memory System — 4.85 (Planned)

The highest-scoring feature because it IS the moat. Every other feature either feeds into or draws from this system.

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 5 | Systematically converts ephemeral interactions into persistent organizational intelligence. Memory extraction, evaluation, bi-temporal model — this is the capture engine. |
| Structures | 5 | Hierarchical memory (Space → Area → Task) is intrinsic. Bi-temporal adds a second axis. Cross-space shared context respects boundaries while enabling propagation. |
| Connects | 5 | The central nervous system. Every feature feeds into it; every feature draws from it. The loop does not function without memory. |
| Compounds | 5 | The textbook definition. Day 1: empty. Day 365: the system knows reasoning patterns, recurring decisions, who knows what, why past choices were made. Irreplaceable. |
| Governs | 4 | Enables governance by providing the substrate. Cannot detect contradictions without remembering prior decisions. Scores 4 not 5 because governance enforcement is a downstream consumer, not intrinsic. |

#### Cognitive Governance Framework — 4.60 (Planned)

The coherence engine. Prevents "high-quality chaos."

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 3 | Captures governance metadata (constraints, escalation triggers, optimization targets) — rules about how the org thinks, not the raw intelligence itself. |
| Structures | 5 | The most hierarchy-aware feature. Defines what each level means, what authority it has, bidirectional flow between levels. |
| Connects | 5 | Consumes context from every level (to detect friction), produces constraints that shape every AI interaction. |
| Compounds | 5 | Learns where friction occurs, which constraints are challenged, which escalations resolve which ways. Gets smarter, not just more populated. |
| Governs | 5 | This IS governance. Constraint propagation, friction detection, escalation triggers, scope of authority. |

#### Meetings — 4.35 (Built)

The primary intelligence generator. Where organizations think out loud.

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 5 | The single richest capture point. Decisions, rationale, disagreements, commitments — routinely lost. Guided capture structures this at the source. |
| Structures | 3 | Associated with Areas (good), but meetings are cross-cutting. A strategic meeting might affect multiple Areas/Spaces. Current model forces single-Area scoping. |
| Connects | 5 | Most connected feature. Consumes calendar, area context, membership. Produces pages, tasks, decisions, attendee records. The flywheel's primary energy source. |
| Compounds | 5 | Meeting 1 captures decisions. Meeting 10's AI knows the history. After months: institutional memory of WHY decisions were made — most valuable, most commonly lost knowledge. |
| Governs | 3 | Creates accountability records. Does not yet enforce decision review, follow-up tracking, or cross-meeting contradiction detection. Potential is enormous. |

#### Guided Creation — 4.35 (Built)

The structured intelligence extraction mechanism.

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 5 | Card-based interview forces structured extraction of decisions, actions, attendees — information people would normally forget to record. Every session produces entities. |
| Structures | 4 | Created content properly scoped (Pages in Areas, Tasks assigned to members). Templates could be hierarchy-aware (adjust fields based on Area type). |
| Connects | 5 | Consumes context (AI pre-fills based on Area). Produces context (decisions feed memory, tasks become trackable, pages become documents). Central hub. |
| Compounds | 4 | AI suggestions improve with accumulated context ("based on last 12 QBRs, here are typical agenda items"). Templates themselves are static. |
| Governs | 3 | Enforces structured capture (governance of information quality). Decisions recorded with owners and dates. But optional, not enforced. |

#### Post-Meeting Capture Prompts — 4.30 (Planned)

The highest-leverage capture accelerator. Catches intelligence at peak freshness.

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 5 | Pure capture accelerator. Prompted immediately after meetings when intelligence is freshest. Meeting-as-task pattern ensures every meeting produces output. |
| Structures | 4 | Decisions and actions scoped to Areas. Attendees tied to memberships. Hierarchy respected for where outputs land. |
| Connects | 5 | Single captured meeting can generate: tasks, decisions, pages, context updates. Also consumes Area context for intelligent extraction. Highest-leverage capture-to-context conversion. |
| Compounds | 4 | System learns patterns: which meetings produce decisions, what actions recur. Prompts get smarter. Compounding is in downstream systems, not the capture mechanism itself. |
| Governs | 3 | Creates the audit trail governance needs. Human-confirms-AI pattern is a light governance gate. Does not yet check decisions against constraints at capture time. |

#### Decision Registry — 5.00 (Identified)

The only feature that scores perfect. Decisions are the atomic unit of the governed organisational mind.

Currently, decisions are buried as text inside meeting notes and pages — not queryable, not trackable, not linkable. A Decision entity would be a first-class object with: what was decided, why (rationale), who was involved, what it affects (linked Areas/Tasks), review date, and critically — outcome link (what happened as a result).

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 5 | Decisions are the single most valuable and most commonly lost form of organizational intelligence. Every meeting, every strategy discussion, every project pivot produces decisions that evaporate. A dedicated entity captures them at the point of creation with full context. |
| Structures | 5 | Decisions are inherently hierarchy-scoped — an Area-level decision operates within Space-level strategy, which operates within Org-level constraints. Decision authority maps directly to the governance hierarchy. Cross-Area decisions link to multiple contexts. |
| Connects | 5 | Decisions are the most connected entity possible. Produced by: meetings, chat, pages. Consumed by: governance (contradiction detection), memory (precedent search), tasks (execution), future meetings (context). Every feature either generates or is informed by decisions. |
| Compounds | 5 | Decision precedent is the ultimate compound asset. "This exact decision was made 3 times before. Here's what happened each time." After years, the decision registry becomes institutional case law — irreplaceable and impossible to recreate retroactively. |
| Governs | 5 | Decisions define what the organization has committed to. Decision authority (who made it, at what level) is governance metadata. Contradiction detection between decisions is the core governance check. Outcome tracking against decisions measures institutional coherence. |

**Implementation note:** Likely a sub-feature of the Memory System, or a standalone entity that Memory indexes. The decision→outcome link is what closes the Data Flywheel. Could emerge naturally from Guided Creation (meeting capture) if decisions are extracted as first-class entities rather than text in pages.

#### Retrospective Intelligence — 4.85 (Identified)

Automated periodic AI-generated synthesis per Area and Space. Institutional memory made legible without manual effort.

"This month in the Finance Area: 12 decisions captured, 8 tasks completed, 3 meetings with Client X. Key themes: budget pressure, vendor consolidation. Unresolved: the AWS vs Azure debate from Jan 15 meeting."

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 5 | The retrospective itself is captured intelligence — a synthesized view that no individual feature produces. It captures patterns, themes, and gaps that only become visible across features and over time. Nobody has to write it; the system generates it from accumulated context. |
| Structures | 5 | Generated per Area and per Space, respecting the full hierarchy. Space-level retrospectives aggregate across Areas. Org-level retrospectives aggregate across Spaces. Each level sees its own synthesis — the hierarchy working as intended. |
| Connects | 5 | Consumes from every feature (meetings, tasks, pages, decisions, chat patterns). Produces durable context that informs future AI interactions, governance checks, and onboarding. The ultimate cross-feature synthesis — it needs all features to produce a good retrospective. |
| Compounds | 5 | On day 30, the retrospective is sparse. On day 365, it's a rich narrative of how the Area evolved — decisions made, outcomes observed, themes that persisted, issues that were resolved. Year-over-year retrospectives become the organization's institutional biography. |
| Governs | 4 | Surfaces governance-relevant patterns: stale commitments, contradictory decisions, Areas drifting from Space strategy. Not a governance enforcement mechanism itself, but a powerful input to governance review. Scores 4 not 5 because it informs governance rather than enforcing it. |

**Implementation note:** Depends on the Memory System — retrospectives are generated from accumulated memories, decisions, and activity data. Could be triggered on a schedule (weekly/monthly/quarterly) or on-demand. Natural extension of the Memory System's query capabilities.

#### Outcome Tracking — 4.70 (Identified)

Proactive system that closes the decision→outcome loop. The "Measure" and "Learn" steps of the Data Flywheel.

30/60/90 days after a decision is captured, the system prompts: "You decided X. What happened? Did it work?" The answer creates the most valuable type of organizational intelligence: what works and what doesn't for THIS organization.

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 5 | Captures the rarest and most valuable intelligence: outcomes linked to decisions. Organizations capture decisions (sometimes). They almost never go back to measure what happened. This feature makes outcome capture as natural as decision capture. |
| Structures | 4 | Outcomes are scoped to the decisions they measure, which are scoped to Areas/Spaces. The hierarchy provides context for interpretation ("this outcome in the Finance Area"). Scores 4 not 5 because outcomes are primarily temporal (time-triggered), not hierarchy-driven. |
| Connects | 5 | Consumes: decisions (what to track), tasks (execution status), integrations (external data that may inform outcomes). Produces: decision-outcome pairs that feed memory, governance (was the decision sound?), and future recommendations. This is the mechanism that closes the loop. |
| Compounds | 5 | The compound effect is dramatic. Year 1: "You decided X, here's what happened." Year 3: "Decisions like this have been made 12 times. Here's the pattern of outcomes." This is where organizational intelligence transitions from recall to prediction. |
| Governs | 4 | Outcome data is governance evidence — did the decision process work? Were constraints followed? Were outcomes as predicted? Enables "governance effectiveness" measurement. Scores 4 not 5 because it provides evidence for governance, not governance rules. |

**Implementation note:** Requires the Decision Registry (decisions must be trackable entities) and the Memory System (outcomes must be stored and linked). The prompt mechanism could be simple: scheduled reminders tied to decision entities with review dates. The outcome capture itself could use Guided Creation patterns.

#### Onboarding Briefing — 4.30 (Identified)

One command: "Brief me." The AI generates a comprehensive package when a new member joins a Space or Area: key decisions, open tasks, important pages, who the key people are, current priorities, recent meeting outcomes, unresolved debates.

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 3 | The briefing itself is a generated artifact, not a capture mechanism. It does capture "what the system thinks is important about this context" which has meta-intelligence value. But its primary purpose is synthesis, not capture. |
| Structures | 5 | Deeply hierarchy-aware by nature. The briefing for an Area includes Area context + relevant Space context + applicable Org context. The quality of scoping IS the quality of the briefing. A well-structured hierarchy produces a well-structured briefing. |
| Connects | 5 | Consumes from every feature: pages (key documents), tasks (open work), meetings (recent outcomes), decisions (active commitments), skills (methodologies in use), members (who does what). The briefing is the ultimate read across all features. It is proof that the loop works. |
| Compounds | 5 | This is the purest compound test in the system. An empty Area produces an empty briefing. A 6-month-old Area with active use produces a 10-page institutional brain dump that would take a human weeks to compile. The briefing quality IS the OII made tangible. Day 1 vs Day 365 difference is the most visible of any feature. |
| Governs | 3 | The briefing respects access boundaries (only includes what the new member is authorized to see). It surfaces governance context (active constraints, decision authority structures). But it is not itself a governance mechanism. |

**Implementation note:** This feature requires very little new infrastructure — it's a specialized prompt that reads across existing features. The quality is gated entirely by the richness of accumulated context. Could be built as a "command" in chat (like an assist) once Memory and the core features have sufficient depth. This is also the best demo feature — it viscerally demonstrates the value of accumulated organizational intelligence.

#### Knowledge Gap Detection — 3.85 (Identified)

Turns the absence of information into intelligence. When users repeatedly ask questions the AI can't answer, or search for content that doesn't exist, these are signals about what the organization needs to know but hasn't captured.

"5 people in the Operations Space have asked about the data retention policy this month, but no authoritative document exists. Consider creating one."

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 4 | Captures a unique type of intelligence: organizational ignorance. Unanswered questions, failed searches, and repeated queries reveal what the organization SHOULD know but doesn't. This is intelligence about intelligence — meta-capture that guides future capture priorities. |
| Structures | 4 | Knowledge gaps are scoped to the hierarchy — a gap in the Finance Area is different from a gap in the Engineering Area. Space-level aggregation shows systemic gaps. The hierarchy gives gaps meaningful context (who needs this knowledge, where does it belong). |
| Connects | 4 | Consumes: search queries, unanswered AI questions, chat patterns. Produces: gap signals to Space/Area owners, suggested content creation, priority adjustments. Feeds the capture pipeline by identifying what SHOULD be captured. Bidirectional but narrower than hub features. |
| Compounds | 4 | More valuable as usage grows — patterns emerge only with sufficient query volume. A gap detected from 1 query is noise. A gap detected from 15 queries across 5 users is signal. The detection gets more confident and more useful over time. |
| Governs | 3 | Knowledge gaps can surface governance-relevant issues ("nobody knows the approval process for this" suggests a governance gap, not just a knowledge gap). But the feature itself is observational — it detects, it doesn't enforce. |

**Implementation note:** Can start simple — log search queries and AI "I don't have information about X" responses. Aggregate by Space/Area. Surface when count exceeds threshold. More sophisticated versions use semantic clustering ("these 8 questions are all asking about the same underlying topic"). Depends on Memory System for query logging and pattern detection.

#### Areas — 4.25 (Built)

The primary working context — where the organisational mind manifests daily.

| Dimension | Score | Key Reasoning |
|-----------|-------|---------------|
| Captures | 3 | Area notes capture working context. Skills capture methodology. But capture is manual. No automatic "what this Area has learned" from work done within it. |
| Structures | 5 | The primary working context unit. Inherits Space and Org context. Access control adds governance. Document activation gives precise AI scope control. |
| Connects | 5 | The richest connection point. Everything converges in an Area — Space context, org rules, documents, skills, tasks, pages, meetings. Where the governed mind manifests. |
| Compounds | 4 | A mature Area with months of accumulated context is dramatically more useful. The AI genuinely "knows" the work. Compounding is passive (more stuff) not active (synthesis). |
| Governs | 4 | Access control with roles. Document activation governs AI scope. Skills enforce methodology. No cross-level policy enforcement or conflict detection yet. |

### Tier 2 Features (Score 3.0 - 3.99)

| Feature | Score | One-Line Assessment |
|---------|-------|---------------------|
| Chat & AI | 3.90 | The interaction layer — how humans access the mind. Hub for the loop but captures little itself. |
| Pages | 3.85 | Durable knowledge store. Captures deliberate, reviewed knowledge. Needs semantic linking. |
| Skills | 3.85 | Institutional methodology layer. "How we do things here" encoded. Needs auto-activation and evolution. |
| Knowledge Gap Detection★ | 3.85 | Turns absence of information into signal. "Your team keeps asking about X but no source exists." |
| Spaces | 3.75 | Structural backbone and governance boundary. Static container — needs Space-level intelligence aggregation. |
| Tasks | 3.65 | Commitment tracker. Captures action items well. Task completion does not yet feed back into memory. |
| Audit Trail | 3.40 | Knowledge provenance. Valuable for compliance. Does not yet feed into AI context. |
| GitHub/Jira | 3.30 | Technical/execution bridges. Connect business reasoning to engineering work. Narrow domain connection. |
| Context Transparency | 3.20 | Trust layer. Makes the mind legible and steerable. Essential for adoption. |
| Comments | 3.05 | Deliberation layer. Captures reasoning behind decisions. Currently isolated from AI context. |

### Tier 3 Features (Score 1.5 - 2.99)

| Feature | Score | One-Line Assessment |
|---------|-------|---------------------|
| Documents | 2.55 | Reference library. External knowledge made available. Static, no staleness detection. |
| Email Integration | 2.55 | Communication bridge. High noise-to-signal. Value depends on tight scoping. |
| Admin Console | 2.45 | Control surface. Configures governance but doesn't build intelligence. |
| Auth & Members | 2.15 | Permission layer. Foundational governance. Infrastructure, not intelligence. |
| Search | 2.10 | Navigation. Currently retrieval-only. Should capture query patterns as intelligence gaps. |
| Usage Tracking | 2.00 | Cost governance. Consumption data, not organizational knowledge. |
| Confluence Import | 1.75 | Migration utility. One-time value. Important for market capture, not for the flywheel. |
| Calendar | 1.60 | Scheduling plumbing. Enabler for meetings. Utility connector. |

### Tier 4 Features (Score < 1.5)

| Feature | Score | One-Line Assessment |
|---------|-------|---------------------|
| Arena | 1.40 | User education. Could feed model routing but doesn't today. Value is in learning, not intelligence. |
| Games | 0.15 | Engagement/culture. No contribution to the organisational mind. Serves a different purpose entirely. |

---

*Last Updated: 31 January 2026*
*Next Review: After Context Intelligence Phase 1 implementation — all scores will shift*
*Methodology Owner: Gabriel Roux
