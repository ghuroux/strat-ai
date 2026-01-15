# StratAI Context Management Strategy

> **Document Purpose:** Foundational architecture guide for implementing enterprise-grade context management across StratAI. This is moat-level work that will differentiate StratAI from generic chat interfaces.
>
> **Created:** January 2026
> **Status:** Strategic Planning
> **Based on:** Comprehensive research of 2025-2026 LLM memory/context innovations
>
> **Related Documents:**
> - [`context-loading-architecture.md`](./context-loading-architecture.md) — Technical architecture for HOW to load context (hybrid upfront + just-in-time via tool calling)
> - [`DOCUMENT_SHARING.md`](./DOCUMENT_SHARING.md) — Uploaded documents sharing model (Space storage, Area-level visibility)
> - [`DOCUMENT_SYSTEM.md`](./DOCUMENT_SYSTEM.md) — Pages system (created content at Area-level)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Foundations](#research-foundations)
3. [Organizational Knowledge Architecture](#organizational-knowledge-architecture)
4. [Current State Analysis](#current-state-analysis)
5. [Architecture Vision](#architecture-vision)
6. [Phase 1: Foundation](#phase-1-foundation)
7. [Phase 2: Active Memory](#phase-2-active-memory)
8. [Phase 3: Shared Context](#phase-3-shared-context)
9. [Phase 4: Organizational Intelligence](#phase-4-organizational-intelligence)
10. [UX Patterns](#ux-patterns)
11. [Technical Specifications](#technical-specifications)
12. [Success Metrics](#success-metrics)
13. [Risks & Mitigations](#risks-mitigations)
14. [Decision Log](#decision-log)

---

## Executive Summary

### The Opportunity

"Memory is becoming one of the key moats now that LLMs are getting commoditized." — Mem0 founder (raised $24M, Oct 2025)

The industry has shifted from "prompt engineering" to **context engineering** as the core discipline. StratAI's existing Space → Area → Task hierarchy already mirrors the hierarchical memory patterns that research shows are most effective. By building sophisticated context management into this structure, we create genuine differentiation that's difficult to replicate.

### The Vision

Transform StratAI from a chat interface with organizational features into **your organization's AI brain**—a system that:

1. **Remembers** what matters across sessions, areas, and spaces
2. **Learns** from every user interaction, building collective intelligence
3. **Shares** knowledge appropriately across teams and projects
4. **Evolves** its understanding as the organization grows
5. **Protects** sensitive information with governance controls
6. **Explains** what it knows and why (transparency and trust)

### The 10x Value Proposition

| AI Response Level | Context Type | Example Response to "Write a marketing email" |
|-------------------|--------------|----------------------------------------------|
| **Generic AI** | None | Generic marketing best practices |
| **Personal AI** | User memories | Matches your writing style |
| **Project AI** | Space/Area context | Knows the product you're marketing |
| **Team AI** | Group knowledge | Applies your team's messaging guidelines |
| **Organization AI** | Org-wide context | Uses brand voice, knows competitors, applies legal constraints, understands positioning |

**That progression from generic to organization-aware is a 10x difference in utility.**

### Strategic Differentiators

| Differentiator | Why It Matters | Competition Gap |
|----------------|----------------|-----------------|
| **Hierarchical Context** | Enterprise work is hierarchical | ChatGPT/Claude have flat memory |
| **Organizational Memory** | Institutional knowledge compounds | Personal assistants don't share context |
| **Temporal Awareness** | Audit trails, compliance needs | No competitor tracks "what we knew when" |
| **Visible Memory** | Trust through transparency | Most memory systems are black boxes |
| **Policy Governance** | Enterprise requirement | Consumer products can't enforce boundaries |
| **Network Effects** | More users = smarter AI for everyone | Single-user AI doesn't improve with team use |

---

## Research Foundations

### The Five Pillars of Modern Context Management

Based on comprehensive research of 2025-2026 innovations, five patterns emerge as foundational:

#### Pillar 1: Hierarchical Memory (Cognitive Architecture)

Human memory isn't flat—it's hierarchical. The most effective AI memory systems mirror this:

```
┌─────────────────────────────────────────────────────────────┐
│  WORKING MEMORY (In-Context)                                │
│  Current conversation, immediate task context               │
│  Lifespan: Single session                                   │
├─────────────────────────────────────────────────────────────┤
│  SHORT-TERM / EPISODIC MEMORY                               │
│  Recent interactions, specific experiences                  │
│  Lifespan: Days to weeks, then consolidates or decays       │
├─────────────────────────────────────────────────────────────┤
│  LONG-TERM / SEMANTIC MEMORY                                │
│  Extracted facts, user preferences, domain knowledge        │
│  Lifespan: Persistent, but can be updated/corrected         │
├─────────────────────────────────────────────────────────────┤
│  PROCEDURAL MEMORY                                          │
│  Learned rules, behavioral patterns, instructions           │
│  Lifespan: Persistent until explicitly changed              │
└─────────────────────────────────────────────────────────────┘
```

**Research Evidence:** MemoryOS achieved 48% F1 improvement with 3-tier hierarchy. The Synapse system showed +7.2 F1 with 95% token reduction through episodic-semantic consolidation.

**StratAI Mapping:**
- Working Memory → Current conversation in an Area
- Episodic Memory → Conversation history within an Area
- Semantic Memory → Area Notes, extracted facts, preferences
- Procedural Memory → Space-level instructions, system prompts

#### Pillar 2: Temporal Knowledge Graphs

The breakthrough insight from Zep/Graphiti: memory needs **bi-temporal** tracking.

```
┌─────────────────────────────────────────────────────────────┐
│                    TEMPORAL AWARENESS                        │
├─────────────────────────────────────────────────────────────┤
│  Event Time (t_valid)     │  When did this actually happen? │
│  Ingestion Time (t_known) │  When did we learn about it?    │
│  Validity End (t_invalid) │  When did this stop being true? │
└─────────────────────────────────────────────────────────────┘
```

**Why This Matters:**
- Point-in-time queries: "What did we know on December 1st?"
- Conflict resolution: Later information can update/invalidate earlier
- Audit trails: Enterprise compliance requires provenance
- Trust: Users can understand WHY the AI "knows" something

**Research Evidence:** Graphiti achieved 94.8% accuracy on DMR benchmark (vs 93.4% for MemGPT), with 90% latency reduction.

#### Pillar 3: Hybrid Retrieval + Reranking

Pure vector search isn't enough. Production systems require hybrid approaches:

```
┌─────────────────────────────────────────────────────────────┐
│                   HYBRID RETRIEVAL STACK                     │
├─────────────────────────────────────────────────────────────┤
│  1. BM25 (Sparse/Keyword)    → Exact matches, technical terms│
│  2. Dense Vectors (Semantic) → Meaning, synonyms, concepts   │
│  3. Graph Traversal          → Relationships, multi-hop      │
│  4. Reranking (Cross-encoder)→ Final relevance scoring       │
└─────────────────────────────────────────────────────────────┘
```

**Research Evidence:** Anthropic's Contextual Retrieval achieved 67% reduction in retrieval failures. With prompt caching, cost is just $1.02 per million tokens.

**The Formula:** `score = (0.5 × semantic) + (0.3 × keyword) + (0.2 × recency_decay)`

#### Pillar 4: Active Memory Management

Memory isn't just storage—it requires active curation:

```
┌─────────────────────────────────────────────────────────────┐
│              ACTIVE MEMORY LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│  EXTRACT  → Pull salient facts from conversations            │
│  EVALUATE → Compare against existing memories                │
│  DECIDE   → ADD / UPDATE / MERGE / FORGET                    │
│  DECAY    → Reduce importance of unused memories over time   │
└─────────────────────────────────────────────────────────────┘
```

**Research Evidence:** Mem0's approach (3 LLM calls: extract, evaluate, update) achieved 26% improvement over OpenAI, 91% lower latency, 90% token savings.

**Key Insight:** Memory should **decay** and **evolve**, not just accumulate. Stale memories pollute context.

#### Pillar 5: Context Compression

When approaching token limits, intelligent compression beats truncation:

**Techniques (ordered by effectiveness):**
1. **Summarization** → Condense verbose content
2. **Consolidation** → Merge related memories
3. **Distillation** → Extract principles, discard surface details
4. **Attention-based pruning** → Keep tokens the model actually attends to

**Research Evidence:** LLMLingua-2 achieves 3-6x compression with 95%+ accuracy retention. AttentionRAG shows 18% improvement over LLMLingua (training-free).

---

### What Commercial Products Get Right (and Wrong)

| Product | Key Pattern | Strength | Weakness |
|---------|-------------|----------|----------|
| **ChatGPT Memory** | Natural language management | "Remember that..." is intuitive | Black box, privacy concerns |
| **Claude Projects** | File-based context (CLAUDE.md) | Transparent, controllable | Manual sync, session resets |
| **Cursor** | @ symbols for surgical context | Precision control | Manual curation overhead |
| **Windsurf** | Automatic indexing | Zero friction | Less control, can miss context |
| **Notion AI** | Workspace-aware agents | Deep integration | Limited to Notion ecosystem |

**The UX Consensus:** Memory must be **visible and controllable**. Users need to see what AI "knows" and have granular control over it.

---

## Organizational Knowledge Architecture

> **The Big Idea:** When multiple users work in the same domain, they each discover valuable information. If these insights stay siloed, everyone must rediscover them. If they can flow upward into shared organizational context, the AI becomes smarter for everyone—creating genuine competitive advantage that compounds over time.

### Why This Is Not Over-Engineering

**Enterprise knowledge management is a $500B+ problem.** Companies hemorrhage institutional knowledge through:
- Employee turnover (knowledge walks out the door)
- Siloed teams (left hand doesn't know what right hand learned)
- Poor documentation (tribal knowledge never written down)
- Context switching (re-explaining to AI repeatedly)

**The difference between personal AI and organizational AI:**

| Scenario | Personal AI | Organizational AI |
|----------|-------------|-------------------|
| New hire joins | Starts from scratch | Inherits institutional knowledge |
| Employee leaves | Knowledge lost | Knowledge persists |
| Cross-team work | Re-explain everything | Context travels with you |
| Best practices | Each person rediscovers | Learned once, shared everywhere |

**This transforms StratAI from "chat with AI" into "your organization's AI brain."**

---

### The Knowledge Propagation Model

Knowledge flows through a hierarchy, with inheritance and appropriate boundaries:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     KNOWLEDGE PROPAGATION HIERARCHY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    ORGANIZATION CONTEXT                                │  │
│  │                                                                        │  │
│  │  Scope: All users in the organization                                 │  │
│  │  Contents:                                                             │  │
│  │   • Company-wide facts ("We use Azure, not AWS")                      │  │
│  │   • Brand guidelines and tone of voice                                │  │
│  │   • Compliance rules ("GDPR applies to all EU customer data")         │  │
│  │   • Strategic positioning ("We compete on quality, not price")        │  │
│  │   • Universal terminology and definitions                             │  │
│  │                                                                        │  │
│  │  Governance: Admin-approved only                                       │  │
│  │  Inheritance: Nothing (top level)                                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │      GROUP/TEAM CONTEXT         │  │      GROUP/TEAM CONTEXT         │  │
│  │      (Engineering)              │  │      (Marketing)                │  │
│  │                                 │  │                                 │  │
│  │  Scope: Team members            │  │  Scope: Team members            │  │
│  │  Contents:                      │  │  Contents:                      │  │
│  │   • Tech stack decisions        │  │   • Campaign guidelines         │  │
│  │   • Code standards              │  │   • Messaging frameworks        │  │
│  │   • Architecture patterns       │  │   • Competitor intelligence     │  │
│  │   • Dev tool preferences        │  │   • Target audience profiles    │  │
│  │                                 │  │                                 │  │
│  │  Governance: Team lead          │  │  Governance: Team lead          │  │
│  │  Inherits: Org context          │  │  Inherits: Org context          │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                    │                               │                        │
│                    ▼                               ▼                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        SPACE CONTEXT                                   │  │
│  │                    (Stratech Loyalty Project)                          │  │
│  │                                                                        │  │
│  │  Scope: Space members (may span teams)                                │  │
│  │  Contents:                                                             │  │
│  │   • Project-specific knowledge                                        │  │
│  │   • Decisions made and rationale                                      │  │
│  │   • Technical constraints and dependencies                            │  │
│  │   • Stakeholder preferences                                           │  │
│  │   • Project terminology                                               │  │
│  │                                                                        │  │
│  │  Governance: Space owner + contributors                                │  │
│  │  Inherits: Org + relevant Group contexts                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │        AREA CONTEXT             │  │        AREA CONTEXT             │  │
│  │        (API Design)             │  │        (Mobile App)             │  │
│  │                                 │  │                                 │  │
│  │  Scope: Area contributors       │  │  Scope: Area contributors       │  │
│  │  Contents:                      │  │  Contents:                      │  │
│  │   • Domain-specific facts       │  │   • Domain-specific facts       │  │
│  │   • Area decisions              │  │   • Area decisions              │  │
│  │   • Working agreements          │  │   • Working agreements          │  │
│  │                                 │  │                                 │  │
│  │  Governance: Area contributors  │  │  Governance: Area contributors  │  │
│  │  Inherits: Space + up           │  │  Inherits: Space + up           │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                    │                               │                        │
│                    ▼                               ▼                        │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │        USER CONTEXT             │  │        USER CONTEXT             │  │
│  │        (Personal)               │  │        (Personal)               │  │
│  │                                 │  │                                 │  │
│  │  Scope: Individual only         │  │  Scope: Individual only         │  │
│  │  Contents:                      │  │  Contents:                      │  │
│  │   • Personal preferences        │  │   • Personal preferences        │  │
│  │   • Working style               │  │   • Working style               │  │
│  │   • Private notes               │  │   • Private notes               │  │
│  │                                 │  │                                 │  │
│  │  ⛔ NOT inherited upward        │  │  ⛔ NOT inherited upward        │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Context Inheritance at Query Time

When a user sends a message, context is assembled from all applicable levels:

```
┌─────────────────────────────────────────────────────────────┐
│           CONTEXT ASSEMBLY (Query in Area)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User works in: Marketing Team → Product Launch Space → Messaging Area
│                                                              │
│  ASSEMBLED CONTEXT (highest to lowest priority):            │
│                                                              │
│  1. ORGANIZATION CONTEXT (always included)                  │
│     • Brand guidelines                                       │
│     • Compliance rules                                       │
│     • Company-wide facts                                     │
│                                                              │
│  2. GROUP CONTEXT (Marketing team)                          │
│     • Messaging frameworks                                   │
│     • Target audience profiles                               │
│     • Campaign guidelines                                    │
│                                                              │
│  3. SPACE CONTEXT (Product Launch)                          │
│     • Product positioning                                    │
│     • Launch timeline                                        │
│     • Key stakeholders                                       │
│                                                              │
│  4. AREA CONTEXT (Messaging)                                │
│     • Specific messaging decisions                           │
│     • A/B test results                                       │
│     • Approved copy                                          │
│                                                              │
│  5. USER CONTEXT (Personal)                                 │
│     • Writing style preferences                              │
│     • Personal productivity habits                           │
│                                                              │
│  6. CONVERSATION HISTORY                                    │
│     • Current session context                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### The Contribution Mechanism

How does knowledge flow upward? Three models, with a recommended hybrid approach:

#### Model 1: Explicit Sharing (Conservative)
```
User discovers fact → Clicks "Share to Space/Org" → Approval workflow → Published
```
**Pros:** Full control, no accidents, clear consent
**Cons:** Friction reduces contributions, knowledge stays siloed

#### Model 2: Implicit Bubbling (Progressive)
```
User memory gains high confidence + high usage → Auto-proposed for sharing → Admin review → Published
```
**Pros:** Organic knowledge growth, less friction
**Cons:** Requires good filtering, governance overhead

#### Model 3: Hybrid (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTRIBUTION FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER DISCOVERS FACT                                                         │
│  "The API uses OAuth 2.0 with PKCE"                                         │
│         │                                                                    │
│         ├────────────────────────────────────────────────────┐              │
│         │                                                    │              │
│         ▼                                                    ▼              │
│  ┌──────────────────┐                           ┌──────────────────┐        │
│  │  EXPLICIT SHARE  │                           │  AUTO-DETECTED   │        │
│  │                  │                           │                  │        │
│  │  User clicks     │                           │  System detects: │        │
│  │  "Share to       │                           │  • High confidence│        │
│  │   Space/Group"   │                           │  • Multiple users │        │
│  │                  │                           │    discovered     │        │
│  └────────┬─────────┘                           │  • Frequently     │        │
│           │                                     │    referenced     │        │
│           │                                     └────────┬─────────┘        │
│           │                                              │                  │
│           └──────────────────┬───────────────────────────┘                  │
│                              │                                               │
│                              ▼                                               │
│              ┌───────────────────────────────────┐                          │
│              │        PROPOSED MEMORIES          │                          │
│              │        (Pending Review)           │                          │
│              │                                   │                          │
│              │  Memory: "API uses OAuth 2.0      │                          │
│              │          with PKCE"               │                          │
│              │                                   │                          │
│              │  Proposed scope: Space            │                          │
│              │  Confidence: 0.92                 │                          │
│              │  Source: @developer_alex          │                          │
│              │  Supporting evidence: 3 convos    │                          │
│              │                                   │                          │
│              │  [✓ Approve] [✗ Reject] [✎ Edit] │                          │
│              └───────────────────────────────────┘                          │
│                              │                                               │
│                    [Owner/Admin approves]                                    │
│                              │                                               │
│                              ▼                                               │
│              ┌───────────────────────────────────┐                          │
│              │        SHARED CONTEXT             │                          │
│              │                                   │                          │
│              │  ✓ Visible to all Space members  │                          │
│              │  ✓ Attribution preserved          │                          │
│              │  ✓ Editable by owners             │                          │
│              │  ✓ Version history tracked        │                          │
│              │  ✓ Can be promoted to Group/Org   │                          │
│              └───────────────────────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Practical Example: Stratech Loyalty Project

Multiple team members work on the Stratech Loyalty project:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE ACCUMULATION EXAMPLE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WEEK 1: Developer Alex discovers                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  "The loyalty API uses OAuth 2.0 with PKCE for authentication"     │   │
│  │  "Rate limits are 100 requests/minute per client"                   │   │
│  │  "Points calculation uses floor(), not round()"                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  → Alex shares to Space → Approved → All team members benefit              │
│                                                                              │
│  WEEK 2: PM Sarah learns                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  "CEO is sensitive about churn metrics being shared externally"     │   │
│  │  "We're positioning against Competitor X on price"                  │   │
│  │  "Launch target is Q2, soft deadline"                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  → Sarah shares to Space → Approved → Now Alex's AI knows this too!        │
│                                                                              │
│  WEEK 3: Designer Mike establishes                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  "Brand colors must pass WCAG AA accessibility"                     │   │
│  │  "Mobile-first approach for all new features"                       │   │
│  │  "Use 'members' not 'users' in customer-facing copy"               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  → Mike shares to Space → Approved → Entire team aligned                   │
│                                                                              │
│  WEEK 4: New hire Jamie joins                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Jamie's AI ALREADY KNOWS:                                          │   │
│  │  ✓ Technical constraints (OAuth, rate limits)                       │   │
│  │  ✓ Business context (CEO sensitivities, positioning)                │   │
│  │  ✓ Design standards (accessibility, mobile-first)                   │   │
│  │  ✓ Terminology ("members" not "users")                             │   │
│  │                                                                      │   │
│  │  Jamie is productive from DAY ONE.                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  RESULT: Institutional knowledge compounds. The AI gets smarter             │
│  for everyone with each contribution.                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Conflict Resolution

When memories contradict each other, the system needs clear resolution:

```
┌─────────────────────────────────────────────────────────────┐
│                  CONFLICT RESOLUTION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SCENARIO: User A says "API uses v2"                        │
│            User B says "API uses v3"                        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  OPTION 1: TEMPORAL RESOLUTION (Default)                    │
│                                                              │
│    Memory A: "API uses v2"                                   │
│              valid_from: January 1, 2026                     │
│                                                              │
│    Memory B: "API uses v3"                                   │
│              valid_from: February 15, 2026                   │
│                                                              │
│    → B automatically supersedes A                            │
│    → A marked as historical (valid_to = Feb 15)             │
│    → Both preserved for audit trail                          │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  OPTION 2: ADMIN RESOLUTION (When flagged)                  │
│                                                              │
│    Conflict surfaced to Space/Group owner                    │
│    Owner reviews evidence from both contributors             │
│    Owner decides:                                            │
│    • Which is correct                                        │
│    • Or merges: "API migrated from v2 to v3 in Feb 2026"   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  OPTION 3: SCOPE RESOLUTION                                 │
│                                                              │
│    Memory A applies to: "Loyalty API"                       │
│    Memory B applies to: "Analytics API"                     │
│                                                              │
│    → Both valid, no conflict (different scopes)             │
│    → System learns to distinguish contexts                   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  OPTION 4: CONFIDENCE RESOLUTION                            │
│                                                              │
│    Memory A: confidence 0.6, single source                  │
│    Memory B: confidence 0.95, multiple confirmations        │
│                                                              │
│    → B takes precedence                                      │
│    → A demoted or flagged for review                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Privacy and Governance Controls

**Not everything should be shared.** The system needs robust guardrails:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRIVACY & GOVERNANCE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GUARDRAILS AT EVERY LEVEL                                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ORGANIZATION LEVEL (Global Admin)                                  │   │
│  │                                                                      │   │
│  │  • Define "never share" patterns                                    │   │
│  │    - PII (names, emails, phone numbers)                            │   │
│  │    - Credentials (API keys, passwords)                              │   │
│  │    - Financial data (salaries, revenue specifics)                   │   │
│  │                                                                      │   │
│  │  • Set default sharing policies                                     │   │
│  │    - "All extractions require approval" (conservative)              │   │
│  │    - "Facts auto-share, preferences stay personal" (balanced)      │   │
│  │                                                                      │   │
│  │  • Configure retention policies                                     │   │
│  │    - How long to keep audit logs                                    │   │
│  │    - When to archive old memories                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  GROUP LEVEL (User Admin)                                           │   │
│  │                                                                      │   │
│  │  • Control which org context is visible to group                    │   │
│  │  • Define group-specific sharing rules                              │   │
│  │  • Assign context approval roles                                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SPACE LEVEL (Space Owner)                                          │   │
│  │                                                                      │   │
│  │  • Mark Space as "private" (no upward propagation)                  │   │
│  │  • Control who can contribute to Space context                      │   │
│  │  • Review and approve proposed memories                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  USER LEVEL (Individual)                                            │   │
│  │                                                                      │   │
│  │  • Decide what to share (nothing automatic without consent)         │   │
│  │  • See what they've contributed                                     │   │
│  │  • Retract shared memories                                          │   │
│  │  • Opt out of memory extraction entirely                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  AUDIT EVERYTHING                                                           │
│  • Who shared what, when                                                    │
│  • Who approved/rejected proposed memories                                   │
│  • Who accessed shared context                                               │
│  • All modifications with before/after                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Integration with Admin Hierarchy

Based on the existing admin panel architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ADMIN PANEL INTEGRATION                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GLOBAL ADMIN PANEL                                                         │
│  ├── Organisation Setup                                                      │
│  │   └── [NEW] Organization Context Settings                                │
│  │       • Enable/disable organizational memory                              │
│  │       • Default sharing policies                                          │
│  │       • Sensitive topic filters (PII, credentials)                       │
│  │       • Context approval workflows                                        │
│  │       • Data retention settings                                           │
│  │                                                                          │
│  ├── Module Setup                                                           │
│  │   └── [NEW] Context Intelligence Module                                  │
│  │       • Enable/disable per organization                                   │
│  │       • Set context contribution quotas                                   │
│  │       • Configure extraction aggressiveness                               │
│  │       • Module-level guardrails                                           │
│  │                                                                          │
│  ├── User Setup                                                             │
│  │   └── [NEW] Context Permissions                                          │
│  │       • Who can approve org-level memories                                │
│  │       • Who can contribute to org context                                 │
│  │       • Per-user context visibility limits                                │
│  │                                                                          │
│  └── Billing                                                                │
│      └── [NEW] Context Usage Billing                                        │
│          • Memory storage costs                                              │
│          • Extraction API costs                                              │
│          • Per-org context limits                                            │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  USER ADMIN PANEL                                                           │
│  ├── Users                                                                  │
│  │   └── [NEW] User Context Settings                                        │
│  │       • Individual extraction preferences                                 │
│  │       • Contribution history                                              │
│  │       • Personal memory usage                                             │
│  │                                                                          │
│  ├── Groups                                                                 │
│  │   └── [NEW] Group Context                                                │
│  │       • Group-specific shared knowledge                                   │
│  │       • Group context owners/approvers                                    │
│  │       • Guardrails per group                                              │
│  │       • Inherited org context visibility                                  │
│  │                                                                          │
│  └── Module Setup                                                           │
│      └── [NEW] Context Module per Group                                     │
│          • Enable/disable context features                                   │
│          • Group-specific extraction rules                                   │
│          • Cross-group sharing permissions                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### The Business Case

**This changes the sales conversation:**

| Without Organizational Context | With Organizational Context |
|-------------------------------|----------------------------|
| "Pay per user for AI chat" | "Pay for your organization's AI brain that gets smarter over time" |
| Each user trains AI from scratch | New hires inherit institutional knowledge |
| Knowledge leaves with employees | Knowledge persists and compounds |
| Value is per-user | Network effects: more users = smarter AI for everyone |
| Easy to switch providers | Switching means losing accumulated knowledge |

**Positive lock-in:** The more an organization uses StratAI, the more valuable it becomes. This isn't vendor lock-in through technical barriers—it's value lock-in through accumulated intelligence.

---

## Current State Analysis

### What StratAI Has Today

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│  SPACES                                                      │
│  └─ Custom spaces with name, icon, color, context (text)    │
│     └─ AREAS                                                │
│        └─ Subdivisions with name, color, context notes      │
│           └─ TASKS                                          │
│              └─ Planning tasks with status, priority        │
│                 └─ CONVERSATIONS                            │
│                    └─ Chat history (localStorage)           │
├─────────────────────────────────────────────────────────────┤
│  DOCUMENTS (Space-level)                                     │
│  └─ Uploaded files with per-area activation toggles         │
├─────────────────────────────────────────────────────────────┤
│  SYSTEM PROMPT (Global)                                      │
│  └─ User-configurable via settings                          │
└─────────────────────────────────────────────────────────────┘
```

### Current Strengths

1. **Hierarchical structure exists** → Maps to cognitive memory model
2. **Area context notes** → Proto-semantic memory
3. **Documents system** → Knowledge base foundation
4. **Task system** → Natural episodic boundaries
5. **PostgreSQL 18** → Can support pgvector natively
6. **Space-level scoping** → Natural isolation boundaries
7. **Admin architecture planned** → Ready for org/group hierarchy

### Current Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| **localStorage for conversations** | Quota limits, no search, no persistence | Critical |
| **No semantic search** | Can't find relevant context | Critical |
| **Context is text blobs** | No structure, no relationships | High |
| **No memory extraction** | AI doesn't learn from conversations | High |
| **No temporal tracking** | Can't audit, can't version | Medium |
| **No cross-area memory** | Facts don't propagate appropriately | Medium |
| **No memory visibility** | Users can't see what AI "knows" | High |
| **No org/group structure** | Can't implement shared context | Medium |

### The Opportunity

StratAI's existing hierarchy is actually ahead of most competitors. The gap is in **making this hierarchy intelligent**—adding memory extraction, semantic search, temporal awareness, user control, and organizational knowledge sharing.

---

## Architecture Vision

### Target State Architecture (Full)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STRATAI COMPLETE CONTEXT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     ORGANIZATION CONTEXT LAYER                         │  │
│  │  • Organization-wide facts and rules                                  │  │
│  │  • Brand guidelines, compliance requirements                          │  │
│  │  • Universal terminology                                               │  │
│  │  • Governed by: Organization Admins                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │      GROUP CONTEXT LAYER        │  │      GROUP CONTEXT LAYER        │  │
│  │  • Team-specific knowledge      │  │  • Team-specific knowledge      │  │
│  │  • Departmental standards       │  │  • Departmental standards       │  │
│  │  • Governed by: Group Leads     │  │  • Governed by: Group Leads     │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                    │                               │                        │
│                    └───────────────┬───────────────┘                        │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        SPACE CONTEXT LAYER                             │  │
│  │  • Space-level instructions (procedural memory)                       │  │
│  │  • Shared documents (knowledge base)                                  │  │
│  │  • Cross-area facts (semantic memory, inherited down)                 │  │
│  │  • Team preferences (if shared space)                                 │  │
│  │  • Governed by: Space Owners                                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                    ┌───────────────┼───────────────┐                        │
│                    ▼               ▼               ▼                        │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐   │
│  │   AREA CONTEXT      │ │   AREA CONTEXT      │ │   AREA CONTEXT      │   │
│  │  • Area memories    │ │  • Area memories    │ │  • Area memories    │   │
│  │  • Active documents │ │  • Active documents │ │  • Active documents │   │
│  │  • Extracted facts  │ │  • Extracted facts  │ │  • Extracted facts  │   │
│  │  • Recent summaries │ │  • Recent summaries │ │  • Recent summaries │   │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘   │
│            │                       │                       │                │
│            ▼                       ▼                       ▼                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      TASK CONTEXT LAYER                                │  │
│  │  • Task-specific memories                                              │  │
│  │  • Subtask relationships                                               │  │
│  │  • Planning context and decisions                                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   USER CONTEXT LAYER (Private)                         │  │
│  │  • Personal preferences                                                │  │
│  │  • Working style                                                       │  │
│  │  • Private conversation history                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   CONVERSATION CONTEXT LAYER                           │  │
│  │  • Working memory (current session)                                    │  │
│  │  • Message history with embeddings                                     │  │
│  │  • Extracted ephemeral context                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                           MEMORY SERVICES                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │ Extraction │ │   Search   │ │ Evaluation │ │   Decay    │ │  Sharing   ││
│  │  Service   │ │  Service   │ │  Service   │ │  Service   │ │  Service   ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│                           STORAGE LAYER                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 18 + pgvector                                            │   │
│  │  • Organizations, Groups, Users (multi-tenant)                       │   │
│  │  • Conversations (messages, embeddings)                              │   │
│  │  • Memories (facts, relationships, temporal metadata, sharing)       │   │
│  │  • Documents (content, chunks, embeddings)                           │   │
│  │  • Audit logs (all context operations)                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Context Assembly at Query Time (Full)

```
┌─────────────────────────────────────────────────────────────┐
│          FULL CONTEXT ASSEMBLY PIPELINE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. IDENTIFY CONTEXT SCOPE                                   │
│     User → Groups → Organization                             │
│     Conversation → Task → Area → Space                       │
│                                                              │
│  2. COLLECT CANDIDATE CONTEXT (all levels)                  │
│     • Organization context (rules, guidelines)               │
│     • Group context (team knowledge)                         │
│     • Space context (project knowledge)                      │
│     • Area memories + active documents                       │
│     • Task context (if applicable)                           │
│     • User personal context                                  │
│     • Recent conversation history                            │
│     • Semantic search results for query                      │
│                                                              │
│  3. SCORE & RANK                                             │
│     score = (relevance × 0.4) +                              │
│             (scope_proximity × 0.3) +                        │
│             (recency × 0.2) +                                │
│             (importance × 0.1)                               │
│                                                              │
│     scope_proximity:                                         │
│       Area = 1.0, Space = 0.8, Group = 0.6, Org = 0.4       │
│                                                              │
│  4. COMPRESS IF NEEDED                                       │
│     • If total tokens > budget, summarize lower-priority     │
│     • Always include: Org rules, high-importance memories    │
│     • Compress: Older context, lower-relevance items         │
│                                                              │
│  5. ASSEMBLE FINAL CONTEXT                                   │
│     [System Prompt]                                          │
│     [Organization Context]                                   │
│     [Group Context]                                          │
│     [Space Context + Memories]                               │
│     [Area Context + Documents]                               │
│     [Task Context if applicable]                             │
│     [User Context]                                           │
│     [Conversation History]                                   │
│     [User Message]                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation

**Goal:** Migrate to server-side persistence, add semantic search, establish memory infrastructure.

**Duration:** Foundation work—implement before other features.

### 1.1 Database Schema Extensions

#### Conversations Table (migrate from localStorage)

```sql
-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    title TEXT,
    model TEXT NOT NULL,

    -- Metadata
    pinned BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,

    -- Continuation support
    continued_from_id UUID REFERENCES conversations(id),
    continuation_summary TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,

    -- Indexes for common queries
    CONSTRAINT valid_hierarchy CHECK (
        (space_id IS NULL AND area_id IS NULL AND task_id IS NULL) OR
        (space_id IS NOT NULL)
    )
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_space ON conversations(space_id);
CREATE INDEX idx_conversations_area ON conversations(area_id);
CREATE INDEX idx_conversations_task ON conversations(task_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
```

#### Messages Table

```sql
-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,

    -- Extended thinking support
    thinking TEXT,

    -- Attachments (JSONB for flexibility)
    attachments JSONB,

    -- Web search results
    sources JSONB,

    -- Error tracking
    error TEXT,

    -- Embedding for semantic search
    embedding vector(1536),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ordering
    sequence_num INTEGER NOT NULL
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, sequence_num);
CREATE INDEX idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

#### Memories Table

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Memories table - the core of our context system
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,

    -- Hierarchical scoping (all nullable for flexibility)
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

    -- Memory content
    content TEXT NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN (
        'fact',           -- Extracted fact about domain
        'preference',     -- User/team preference
        'instruction',    -- Learned behavior rule
        'summary',        -- Consolidated conversation summary
        'entity',         -- Named entity (person, project, etc.)
        'relationship',   -- Relationship between entities
        'guideline'       -- Organizational guideline/rule
    )),

    -- Visibility/sharing level
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN (
        'private',        -- Only creator can see
        'area',           -- Visible to area contributors
        'space',          -- Visible to space members
        'group',          -- Visible to group members
        'organization'    -- Visible to entire org
    )),

    -- Importance and decay
    importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,

    -- Temporal tracking (bi-temporal model)
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,

    -- Provenance
    source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    contributed_by_user_id TEXT NOT NULL,
    extraction_model TEXT,
    confidence FLOAT DEFAULT 0.8,

    -- Approval status (for shared memories)
    approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN (
        'pending',        -- Awaiting approval
        'approved',       -- Approved for sharing
        'rejected'        -- Rejected by approver
    )),
    approved_by_user_id TEXT,
    approved_at TIMESTAMPTZ,

    -- Embedding for semantic search
    embedding vector(1536),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_org ON memories(organization_id);
CREATE INDEX idx_memories_group ON memories(group_id);
CREATE INDEX idx_memories_space ON memories(space_id);
CREATE INDEX idx_memories_area ON memories(area_id);
CREATE INDEX idx_memories_task ON memories(task_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_visibility ON memories(visibility);
CREATE INDEX idx_memories_valid ON memories(valid_from, valid_to);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_memories_approval ON memories(approval_status);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Composite index for hierarchical queries
CREATE INDEX idx_memories_hierarchy ON memories(organization_id, group_id, space_id, area_id);
```

### 1.2 Implementation Checklist

- [ ] **Database Setup**
  - [ ] Create migration for conversations table
  - [ ] Create migration for messages table
  - [ ] Create migration for memories table
  - [ ] Enable pgvector extension
  - [ ] Create indexes

- [ ] **Embedding Service**
  - [ ] Add LiteLLM embedding endpoint
  - [ ] Create embedding service module
  - [ ] Add batch embedding support
  - [ ] Configure embedding model (text-embedding-3-small)

- [ ] **Conversation Migration**
  - [ ] Create server-side conversation store
  - [ ] Add API endpoints for CRUD operations
  - [ ] Migrate client-side store to use API
  - [ ] Handle localStorage → PostgreSQL migration
  - [ ] Remove localStorage dependency

- [ ] **Memory Search**
  - [ ] Implement semantic search
  - [ ] Add keyword search (full-text)
  - [ ] Implement hybrid search with RRF
  - [ ] Add hierarchical scope filtering

- [ ] **Basic Memory UI**
  - [ ] Add "Memory" section to Area's Context Panel
  - [ ] Show memories relevant to current area
  - [ ] Allow manual memory creation/editing/deletion
  - [ ] Show memory provenance

---

## Phase 2: Active Memory

**Goal:** Implement automatic memory extraction, evaluation, and lifecycle management.

**Prerequisite:** Phase 1 complete

### 2.1 Memory Extraction Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│              MEMORY EXTRACTION PIPELINE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INPUT: Last user message + assistant response               │
│                                                              │
│  1. EXTRACTION PROMPT                                        │
│     "Extract any facts, preferences, or instructions from    │
│      this exchange that would be useful to remember."        │
│                                                              │
│  2. CANDIDATE MEMORIES                                       │
│     [                                                        │
│       { type: "fact", content: "API uses OAuth 2.0" },      │
│       { type: "preference", content: "Prefers TypeScript" } │
│     ]                                                        │
│                                                              │
│  3. EMBEDDING GENERATION                                     │
│     Generate embeddings for each candidate                   │
│                                                              │
│  4. DUPLICATE CHECK                                          │
│     Search existing memories with similarity > 0.9           │
│     If match found → evaluate for UPDATE vs SKIP             │
│                                                              │
│  5. STORE                                                    │
│     Insert new memories with provenance                      │
│     Default visibility: 'private'                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Implementation Checklist

- [ ] **Memory Extraction**
  - [ ] Create extraction prompt templates
  - [ ] Implement post-conversation extraction hook
  - [ ] Add extraction toggle in settings
  - [ ] Background job for async extraction

- [ ] **Memory Evaluation**
  - [ ] Implement duplicate detection
  - [ ] Add LLM-based evaluation for edge cases
  - [ ] Create merge logic for related memories

- [ ] **Memory Lifecycle**
  - [ ] Implement decay function
  - [ ] Create consolidation service
  - [ ] Add cleanup for expired memories
  - [ ] Schedule periodic maintenance jobs

- [ ] **Context Assembly**
  - [ ] Implement scoring algorithm
  - [ ] Add token budget management
  - [ ] Create compression fallback
  - [ ] Integrate with chat API

- [ ] **Memory UI (Enhanced)**
  - [ ] Show extraction activity indicator
  - [ ] Add memory importance visualization
  - [ ] Enable manual importance adjustment
  - [ ] Show memory age and access frequency

---

## Phase 3: Shared Context

**Goal:** Enable Space-level and Area-level shared context with approval workflows.

**Prerequisite:** Phase 2 complete

### 3.1 Sharing Infrastructure

```sql
-- Memory sharing proposals (for approval workflow)
CREATE TABLE memory_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,

    -- What's being proposed
    proposed_visibility TEXT NOT NULL,
    proposed_scope_id UUID,  -- Space, Group, or Org ID depending on visibility

    -- Who proposed
    proposed_by_user_id TEXT NOT NULL,
    proposed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'withdrawn'
    )),

    -- Review details
    reviewed_by_user_id TEXT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Supporting evidence
    supporting_conversations JSONB,  -- References to conversations that confirm this memory
    confidence_score FLOAT
);

CREATE INDEX idx_proposals_memory ON memory_proposals(memory_id);
CREATE INDEX idx_proposals_status ON memory_proposals(status);
CREATE INDEX idx_proposals_scope ON memory_proposals(proposed_visibility, proposed_scope_id);
```

### 3.2 Contribution Flow

```
┌─────────────────────────────────────────────────────────────┐
│              SHARING WORKFLOW                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USER ACTION                                              │
│     • Clicks "Share to Space" on a memory                   │
│     • Or system auto-detects high-value candidate           │
│                                                              │
│  2. PROPOSAL CREATED                                         │
│     • Memory ID + proposed visibility + scope               │
│     • Supporting evidence gathered                          │
│     • Confidence score calculated                           │
│                                                              │
│  3. NOTIFICATION                                             │
│     • Space owner notified of pending proposal              │
│     • Shows in admin dashboard                              │
│                                                              │
│  4. REVIEW                                                   │
│     • Owner sees memory content + source + evidence         │
│     • Can approve, reject, or edit before approving         │
│                                                              │
│  5. PUBLICATION                                              │
│     • If approved: memory.visibility updated                │
│     • Audit log entry created                               │
│     • Memory now visible to all Space members               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Implementation Checklist

- [ ] **Sharing Infrastructure**
  - [ ] Create memory_proposals table
  - [ ] Add visibility column to memories
  - [ ] Implement proposal creation
  - [ ] Build approval workflow

- [ ] **UI for Sharing**
  - [ ] Add "Share" button to memory items
  - [ ] Create proposal review interface
  - [ ] Build pending proposals dashboard
  - [ ] Show shared memory attribution

- [ ] **Context Query Updates**
  - [ ] Update search to include shared memories
  - [ ] Add scope filtering to queries
  - [ ] Implement inheritance logic

- [ ] **Notifications**
  - [ ] Notify owners of new proposals
  - [ ] Notify contributors of approval/rejection
  - [ ] Show new shared memories to team

---

## Phase 4: Organizational Intelligence

**Goal:** Full organizational knowledge hierarchy with multi-tenant support.

**Prerequisite:** Phase 3 complete

### 4.1 Organization & Group Schema

```sql
-- Organizations (tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,

    -- Settings
    settings JSONB DEFAULT '{}',
    -- {
    --   "default_sharing_policy": "approval_required",
    --   "sensitive_patterns": ["SSN", "password"],
    --   "retention_days": 365
    -- }

    -- Billing
    plan TEXT DEFAULT 'free',
    billing_email TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups (teams/departments within org)
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,

    -- Settings (inherits from org, can override)
    settings JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User memberships
CREATE TABLE user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,

    -- Role within scope
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (
        'owner', 'admin', 'member', 'viewer'
    )),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_membership CHECK (
        (organization_id IS NOT NULL AND group_id IS NULL) OR
        (organization_id IS NOT NULL AND group_id IS NOT NULL)
    )
);

CREATE INDEX idx_memberships_user ON user_memberships(user_id);
CREATE INDEX idx_memberships_org ON user_memberships(organization_id);
CREATE INDEX idx_memberships_group ON user_memberships(group_id);
```

### 4.2 Audit Log

```sql
-- Comprehensive audit log for compliance
CREATE TABLE context_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was affected
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'memory', 'proposal', 'space', 'area', 'conversation'
    )),
    entity_id UUID NOT NULL,

    -- What happened
    action TEXT NOT NULL CHECK (action IN (
        'created', 'updated', 'deleted', 'accessed',
        'shared', 'unshared', 'proposed', 'approved', 'rejected',
        'exported', 'imported'
    )),

    -- Who did it
    actor_user_id TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'ai')),

    -- Context
    organization_id UUID REFERENCES organizations(id),
    group_id UUID REFERENCES groups(id),
    space_id UUID REFERENCES spaces(id),

    -- Details
    previous_value JSONB,
    new_value JSONB,
    metadata JSONB,  -- IP, user agent, etc.

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON context_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_org ON context_audit_log(organization_id);
CREATE INDEX idx_audit_user ON context_audit_log(actor_user_id);
CREATE INDEX idx_audit_created ON context_audit_log(created_at);
```

### 4.3 Organizational Context Service

```typescript
// src/lib/server/services/organizationalContext.ts

interface OrgContextQuery {
    userId: string;
    organizationId: string;
    groupIds: string[];
    spaceId?: string;
    areaId?: string;
    query: string;
}

export async function getOrganizationalContext(
    options: OrgContextQuery
): Promise<OrganizationalContext> {
    const { userId, organizationId, groupIds, spaceId, areaId, query } = options;

    // 1. Get org-level context (always included)
    const orgMemories = await sql`
        SELECT * FROM memories
        WHERE organization_id = ${organizationId}
        AND visibility = 'organization'
        AND approval_status = 'approved'
        AND (valid_to IS NULL OR valid_to > NOW())
        ORDER BY importance DESC
        LIMIT 20
    `;

    // 2. Get group-level context
    const groupMemories = await sql`
        SELECT * FROM memories
        WHERE group_id = ANY(${groupIds})
        AND visibility IN ('group', 'organization')
        AND approval_status = 'approved'
        AND (valid_to IS NULL OR valid_to > NOW())
        ORDER BY importance DESC
        LIMIT 20
    `;

    // 3. Get space-level context
    const spaceMemories = spaceId ? await sql`
        SELECT * FROM memories
        WHERE space_id = ${spaceId}
        AND visibility IN ('space', 'group', 'organization')
        AND approval_status = 'approved'
        AND (valid_to IS NULL OR valid_to > NOW())
        ORDER BY importance DESC
        LIMIT 20
    ` : [];

    // 4. Merge and dedupe by semantic similarity
    const allMemories = [...orgMemories, ...groupMemories, ...spaceMemories];
    const dedupedMemories = deduplicateBySimilarity(allMemories, 0.9);

    // 5. Score by relevance to query
    if (query) {
        const queryEmbedding = await generateEmbedding(query);
        return rankByRelevance(dedupedMemories, queryEmbedding);
    }

    return dedupedMemories;
}
```

### 4.4 Implementation Checklist

- [ ] **Multi-tenant Infrastructure**
  - [ ] Create organizations table
  - [ ] Create groups table
  - [ ] Create user_memberships table
  - [ ] Add org_id/group_id to existing tables
  - [ ] Implement row-level security

- [ ] **Organization Context**
  - [ ] Build org context query service
  - [ ] Add org context to assembly pipeline
  - [ ] Create org context management UI
  - [ ] Implement org-level approval workflow

- [ ] **Group Context**
  - [ ] Build group context inheritance
  - [ ] Add group context management
  - [ ] Create cross-group sharing rules
  - [ ] Implement group-level approvals

- [ ] **Admin Features**
  - [ ] Build org admin dashboard
  - [ ] Create context health metrics
  - [ ] Add audit log viewer
  - [ ] Implement data export

- [ ] **Compliance**
  - [ ] Complete audit logging
  - [ ] Add data retention policies
  - [ ] Implement GDPR export/delete
  - [ ] Create compliance reports

---

## UX Patterns

### Memory Visibility Principles

1. **Show What AI Knows**
   - Memory panel in each Area showing active memories
   - Distinguish personal vs shared memories
   - Provenance links to source conversations
   - Attribution to contributors

2. **Enable Control**
   - Edit any memory content
   - Adjust importance manually
   - Delete memories permanently
   - Pause memory extraction temporarily
   - Retract shared contributions

3. **Explain Influence**
   - When AI uses a memory, cite it
   - Show memory source level (personal/space/org)
   - Link citations to memory panel

### Memory Panel Design (Enhanced)

```
┌─────────────────────────────────────────────────────────────┐
│  CONTEXT PANEL                                    [×]       │
├─────────────────────────────────────────────────────────────┤
│  [Area Notes] [Documents] [Memories]                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏢 ORGANIZATION CONTEXT                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 "All customer data must comply with GDPR"        │   │
│  │    guideline · org-wide · approved by @admin        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  👥 TEAM CONTEXT (Engineering)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔧 "We use TypeScript for all new projects"         │   │
│  │    instruction · team · contributed by @lead        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📁 SPACE CONTEXT (Stratech Loyalty)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔐 "API uses OAuth 2.0 with PKCE"                   │   │
│  │    fact · shared · contributed by @alex             │   │
│  │    [View Source] [Edit]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🧠 YOUR MEMORIES (4 personal)                [+ Add]       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⭐ "Prefers concise code comments"                  │   │
│  │    preference · private · [Share to Space]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  📊 Context Health                                          │
│  • 3 org memories · 5 team · 8 space · 4 personal         │
│  • 2 pending proposals                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sharing Flow UI

```
┌─────────────────────────────────────────────────────────────┐
│  SHARE MEMORY                                     [×]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Memory: "API uses OAuth 2.0 with PKCE"                    │
│                                                             │
│  Share to:                                                  │
│  ○ This Area only (API Design)                             │
│  ● This Space (Stratech Loyalty)                           │
│  ○ My Team (Engineering)                                    │
│  ○ Entire Organization                                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ℹ️  This will be reviewed by the Space owner before       │
│     becoming visible to all 12 Space members.               │
│                                                             │
│  Supporting context (optional):                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Discovered while implementing login flow. See       │   │
│  │ conversation from Jan 5th for details.              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [Cancel]  [Submit for Review]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Specifications

### Embedding Model Selection

| Model | Dimensions | Cost | Use Case |
|-------|------------|------|----------|
| text-embedding-3-small | 1536 | $0.02/1M tokens | Default, good balance |
| text-embedding-3-large | 3072 | $0.13/1M tokens | Higher accuracy needs |
| Voyage-3 | 1024 | $0.06/1M tokens | Alternative if needed |

### Token Budget Allocation (Full Stack)

For a 128K context window with organizational context:

| Component | Budget | Notes |
|-----------|--------|-------|
| System Prompt | 2K | Base instructions |
| Organization Context | 4K | Org-wide rules, guidelines |
| Group Context | 4K | Team-specific knowledge |
| Space Context | 6K | Project knowledge |
| Area Memories | 6K | Domain-specific facts |
| Documents | 16K | ~8 chunks at 2K each |
| Conversation | 82K | Rolling history |
| Response | 8K | Max response buffer |

### Database Sizing Estimates (Full)

For 1,000 users across 10 organizations:

| Table | Estimate | Size |
|-------|----------|------|
| organizations | 10 | < 1 MB |
| groups | 50 | < 1 MB |
| user_memberships | 2,000 | < 5 MB |
| conversations | 50K | 50 MB |
| messages | 500K | 500 MB |
| memories (all levels) | 300K | 600 MB |
| memory_proposals | 10K | 10 MB |
| context_audit_log | 1M | 200 MB |

**Total estimated storage:** ~1.5 GB per 1,000 users

---

## Success Metrics

### Phase 1 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Query latency (p95) | < 200ms | Memory search |
| Embedding latency | < 100ms | Per text |
| Migration success | 100% | localStorage → DB |
| Search relevance | > 0.7 | Precision@10 |

### Phase 2 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Extraction accuracy | > 80% | Manual review sample |
| Memory utilization | > 30% | Memories used in context |
| Context relevance | > 0.8 | User feedback |
| Token efficiency | 2x | Same quality, fewer tokens |

### Phase 3 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sharing adoption | > 40% | Users who share memories |
| Approval rate | > 70% | Proposals approved |
| Shared memory usage | > 50% | Shared memories in context |
| Cross-pollination | > 3 | Avg shared memories per Space |

### Phase 4 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Org context coverage | > 80% | Spaces with org context |
| Knowledge retention | > 90% | Knowledge survives employee departure |
| Onboarding acceleration | 50% faster | Time to productivity for new hires |
| Context query performance | < 500ms | Full hierarchy query |

### Business Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Session continuity | +40% | Users returning to same Area |
| Context switches | -30% | Less re-explaining to AI |
| User satisfaction | +25% | Survey scores |
| Enterprise conversion | +30% | Org features as differentiator |
| Knowledge network effect | Measurable | More users = better AI for all |

---

## Risks & Mitigations

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Embedding costs scale poorly | High | Batch processing, caching, smaller model |
| pgvector performance at scale | Medium | Partitioning, dedicated vector DB if needed |
| Memory extraction hallucinations | High | Confidence thresholds, human review |
| Context window exhaustion | Medium | Aggressive compression, prioritization |
| Multi-tenant data leakage | Critical | Row-level security, thorough testing |

### Product Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users don't trust AI memory | High | Visibility, control, citations |
| Memory pollution (bad extractions) | High | Decay, user correction, confidence |
| Privacy concerns | High | Clear policies, consent, local options |
| Complexity overwhelms users | Medium | Progressive disclosure, good defaults |
| Low sharing adoption | Medium | Incentives, low friction, clear value |
| Approval bottlenecks | Medium | Auto-approval for high-confidence, delegation |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration data loss | Critical | Thorough testing, rollback plan |
| Background job failures | Medium | Retry logic, alerting, manual triggers |
| Compliance violations | High | Audit logging, retention policies |
| Organizational data sprawl | Medium | Governance tools, cleanup automation |

---

## Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-01 | PostgreSQL + pgvector | Simplicity, existing stack, sufficient scale | Pinecone, Weaviate, Qdrant |
| 2026-01 | text-embedding-3-small | Cost efficiency, good performance | text-embedding-3-large, Voyage |
| 2026-01 | Bi-temporal model | Enterprise compliance, audit needs | Simple timestamps |
| 2026-01 | LLM-based extraction | Flexibility, accuracy | Regex, NER, rules |
| 2026-01 | Hybrid search | Research shows 67% improvement | Semantic only |
| 2026-01 | Hierarchical inheritance | Mirrors org structure | Flat sharing |
| 2026-01 | Approval workflow for sharing | Trust, quality control | Auto-share all |
| 2026-01 | Org → Group → Space hierarchy | Matches enterprise structure | Simpler 2-level |
| 2026-01 | Temporal conflict resolution | Most intuitive, auditable | Voting, admin-only |

---

## Appendix: Research Sources

This strategy is based on comprehensive research of 2025-2026 innovations:

### Memory Architectures
- MemGPT/Letta: Virtual context management
- MemoryOS: 3-tier hierarchical memory (48% F1 improvement)
- Synapse: Episodic-semantic consolidation (95% token reduction)
- A-MEM: Self-organizing Zettelkasten-style memory

### Retrieval Systems
- Anthropic Contextual Retrieval: 67% failure reduction
- GraphRAG: Knowledge graph + RAG hybrid
- HopRAG: Multi-hop reasoning (76% accuracy improvement)
- ColBERT: Efficient reranking

### Commercial Products
- ChatGPT Memory: Natural language memory management
- Claude Projects: File-based context (CLAUDE.md pattern)
- Cursor/Windsurf: Developer context patterns
- Notion AI: Workspace-aware agents

### Academic Research
- LongRoPE: 2M token context extension
- Infini-attention: Compressive memory for infinite context
- EVICPRESS: KV-cache optimization (2.19x faster)
- Ring Attention: Distributed attention scaling

### Startups
- Mem0: $24M raised, AWS partnership, 26% accuracy improvement
- Zep/Graphiti: Temporal knowledge graphs, 94.8% DMR accuracy
- Supermemory: Google AI backing, universal memory API

---

## Implementation Roadmap Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION PHASES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: FOUNDATION                                                        │
│  ├─ Database migrations (conversations, messages, memories)                 │
│  ├─ Embedding service setup                                                 │
│  ├─ Conversation persistence migration                                      │
│  ├─ Basic memory search (semantic + keyword)                               │
│  └─ Memory UI in Context Panel                                             │
│                                                                              │
│  PHASE 2: ACTIVE MEMORY                                                     │
│  ├─ Memory extraction pipeline                                              │
│  ├─ Memory evaluation and deduplication                                     │
│  ├─ Decay and consolidation services                                        │
│  ├─ Context assembly service                                                │
│  └─ Enhanced memory UI (importance, provenance)                            │
│                                                                              │
│  PHASE 3: SHARED CONTEXT                                                    │
│  ├─ Sharing infrastructure (proposals, approvals)                          │
│  ├─ Space-level shared context                                              │
│  ├─ Sharing UI and workflows                                                │
│  ├─ Context inheritance queries                                             │
│  └─ Notification system                                                     │
│                                                                              │
│  PHASE 4: ORGANIZATIONAL INTELLIGENCE                                       │
│  ├─ Multi-tenant infrastructure (orgs, groups)                             │
│  ├─ Organization and group context layers                                   │
│  ├─ Full context assembly (all levels)                                     │
│  ├─ Admin dashboards and governance                                         │
│  └─ Compliance and audit features                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Immediate:** Review this document, validate organizational knowledge approach
2. **Phase 1 Start:** Database migrations, embedding service
3. **Parallel:** Design memory UI components
4. **Validation:** User testing of sharing concepts before Phase 3

---

*This document should be updated as implementation progresses and learnings emerge. The organizational knowledge architecture is foundational to StratAI's differentiation—building it right matters more than building it fast.*
