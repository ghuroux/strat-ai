# StratAI Product Vision

> *"You never change things by fighting the existing reality. To change something, build a new model that makes the existing model obsolete."*
> — Buckminster Fuller

---

## Executive Summary

**StratAI** is the Human Intelligence Layer for organizations—the conversational interface where people talk to their business and their business talks back.

We're not building another productivity app. We're building the missing piece that connects human decisions to business outcomes, creating an irreversible data flywheel that makes organizations continuously smarter.

### The One-Sentence Vision

> **Every decision captured. Every outcome measured. The loop closes. Intelligence compounds.**

### Why This Matters

Organizations generate two types of intelligence:
1. **Machine Intelligence** — Transaction data, customer behavior, operational metrics
2. **Human Intelligence** — Decisions, reasoning, context, strategy

Today, these streams are disconnected. Dashboards show numbers. Humans make decisions. But no one connects the decision TO the outcome. No one asks: "What did we decide? What happened? What should we do next time?"

StratAI closes this loop.

---

## Strategic Context: The StratGroup Ecosystem

StratAI is part of **StratGroup**'s vision to build programmable infrastructure for the digital economy.

### The StratGroup Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STRATGROUP ECOSYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ╔═══════════════════════════════════════════════════════════════════════╗ │
│   ║  STRATAI - Human Intelligence Layer (THIS PLATFORM)                    ║ │
│   ║  ┌─────────────────────────────────────────────────────────────────┐  ║ │
│   ║  │  "Talk to Your Business"                                        │  ║ │
│   ║  │                                                                 │  ║ │
│   ║  │  • Natural language interface to business intelligence          │  ║ │
│   ║  │  • Context hierarchy (Org → Space → Area → Task)                │  ║ │
│   ║  │  • Decision capture (reasoning, context, outcomes)              │  ║ │
│   ║  │  • Knowledge persistence (Pages, Meeting Notes)                 │  ║ │
│   ║  │  • Work tracking (Tasks from insights → execution)              │  ║ │
│   ║  │  • AI governance (who can ask what, model policies)             │  ║ │
│   ║  │  • Memory (AI remembers past conversations, decisions)          │  ║ │
│   ║  └─────────────────────────────────────────────────────────────────┘  ║ │
│   ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                    ↕                                         │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  STRATOS - Core Platform                                              │ │
│   │  • Single source of truth (enriched)                                  │ │
│   │  • Unified authorization & governance                                 │ │
│   │  • Consistent data model                                              │ │
│   │  • Intelligent routing & orchestration                                │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                    ↕                                         │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  STRATECH - Programmable Business OS                                  │ │
│   │  • AMS (Account Management) - Ledgers, balances, liability            │ │
│   │  • OMS (Offer Management) - Rules, contracts, incentives              │ │
│   │  • EMS (Entity Management) - Customers, suppliers, assets             │ │
│   │  • FinFlows - Low-code process orchestration                          │ │
│   │  • Boxed Solutions: Loyalty, Policy, Loans, Collections, Billing      │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                    ↕                                         │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  STRATFIN - Payment Rails                                             │ │
│   │  • Licensed PSP/TPPP/System Operator                                  │ │
│   │  • PCI-DSS, SOC 2 certified                                           │ │
│   │  • Transaction processing, payment orchestration                      │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                    ↕                                         │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  STRATHOST - Cloud Infrastructure                                     │ │
│   │  • AWS Partner, DevOps, Managed Services                              │ │
│   │  • Compliant, scalable infrastructure                                 │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### StratAI's Role in the Ecosystem

| Layer | Function | StratAI's Contribution |
|-------|----------|------------------------|
| **Human** | Decisions, context, reasoning | **Primary capture point** |
| **StratOS** | Governance, routing | Model policies, authorization |
| **StraTech** | Operational execution | Receives decisions, generates outcomes |
| **StratFin** | Financial flows | Transaction data for context |
| **StratHost** | Infrastructure | Runs on compliant cloud |

**The insight:** StratGroup has built the operational and machine intelligence layers. StratAI completes the stack by adding the human intelligence layer—where decisions are made, captured, and connected to outcomes.

---

## The Core Insight: Two Intelligence Streams

### The Problem

Organizations today have disconnected intelligence:

```
MACHINE INTELLIGENCE               HUMAN INTELLIGENCE
(StraTech, StratFin, etc.)         (Meetings, Conversations, etc.)

┌─────────────────────────┐        ┌─────────────────────────┐
│  Transactions           │        │  Decisions              │
│  Customer behavior      │        │  Strategy discussions   │
│  Operational metrics    │        │  Meeting outcomes       │
│  Patterns & predictions │        │  Reasoning & context    │
└───────────┬─────────────┘        └───────────┬─────────────┘
            │                                   │
            ▼                                   ▼
     ┌──────────────┐                   ┌──────────────┐
     │  Dashboards  │                   │  Lost in     │
     │  Reports     │                   │  email/Slack │
     │  ML Models   │                   │  forgotten   │
     └──────────────┘                   └──────────────┘
            │                                   │
            └───────────── DISCONNECTED ────────┘
```

**The result:**
- Dashboards show WHAT happened, not WHY decisions were made
- Decisions are made, but outcomes are never linked back
- New employees have no access to organizational reasoning
- The same mistakes get repeated because learnings aren't captured
- ML models predict, but can't explain what WORKED

### The Solution: Close the Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOSED LOOP INTELLIGENCE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   HUMAN STREAM                              MACHINE STREAM                   │
│   (StratAI captures)                        (StraTech/StratFin generates)    │
│                                                                              │
│   ┌─────────────────────┐                   ┌─────────────────────┐         │
│   │  Decisions made     │                   │  Customer behavior  │         │
│   │  Meeting outcomes   │                   │  Transactions       │         │
│   │  Strategy choices   │                   │  Operational data   │         │
│   │  Context & reasoning│                   │  Patterns           │         │
│   └──────────┬──────────┘                   └──────────┬──────────┘         │
│              │                                          │                    │
│              └──────────────────┬───────────────────────┘                    │
│                                 │                                            │
│                                 ▼                                            │
│                    ┌────────────────────────┐                                │
│                    │   CONNECTED            │                                │
│                    │   INTELLIGENCE         │                                │
│                    │                        │                                │
│                    │   Decision + Outcome   │                                │
│                    │   = LEARNING           │                                │
│                    └────────────────────────┘                                │
│                                 │                                            │
│                                 ▼                                            │
│                    ┌────────────────────────┐                                │
│                    │   SMARTER NEXT TIME    │                                │
│                    │                        │                                │
│                    │   "Last time you did   │                                │
│                    │    X, Y happened.      │                                │
│                    │    Consider Z?"        │                                │
│                    └────────────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Data Flywheel: Our Irreversible Moat

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE DATA FLYWHEEL                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                            │
│  │ 1. DECIDE    │  Employee makes a decision                                 │
│  │              │  "Let's adjust the loyalty earn rate by 15%"               │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                            │
│  │ 2. CAPTURE   │  StratAI records decision with context                     │
│  │              │  WHY: "Margin pressure from Q1"                            │
│  │              │  WHO: Marketing + Finance agreed                           │
│  │              │  WHAT: 15% reduction, effective April 1                    │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                            │
│  │ 3. EXECUTE   │  Action flows to operational systems                       │
│  │              │  StraTech campaign engine updated                          │
│  │              │  Change goes live                                          │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                            │
│  │ 4. MEASURE   │  StraTech/StratFin collects outcomes                       │
│  │              │  Redemption rate: -8%                                      │
│  │              │  Margin improvement: +3%                                   │
│  │              │  Churn impact: +0.2% (acceptable)                          │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                            │
│  │ 5. LEARN     │  System connects decision → outcome                        │
│  │              │  Pattern stored: "15% earn rate reduction =                │
│  │              │  good margin/churn trade-off in retail loyalty"            │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                            │
│  │ 6. RECOMMEND │  Next similar situation, AI suggests:                      │
│  │              │  "You faced similar margin pressure in Q1 2025.            │
│  │              │   You adjusted earn rate 15%, result: +3% margin,          │
│  │              │   acceptable churn. Consider similar approach?"            │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│         └─────────────────────► Back to DECIDE (smarter)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Becomes Irreversible

| Year | Decisions Captured | Outcomes Measured | Patterns Learned |
|------|-------------------|-------------------|------------------|
| 1 | 1,000 | 10,000 | 100 |
| 3 | 10,000 | 1,000,000 | 10,000 |
| 5 | 50,000 | 100,000,000 | 1,000,000 |

**After 5 years:**
- AI: "This exact scenario happened 12 times before. Here's what worked. Here's what didn't."
- Competitors can't replicate this. They don't have YOUR decisions + YOUR outcomes + YOUR learnings.

### The Moat Layers

| Layer | What It Is | Why Competitors Can't Copy |
|-------|-----------|----------------------------|
| **Decision History** | Every strategic choice captured | They don't have your reasoning |
| **Outcome Data** | Every measurable result | They don't have your customers |
| **Linked Pairs** | Decision → Outcome connections | Can't be created retroactively |
| **Pattern Library** | What works for YOUR business | Their ML doesn't know your context |
| **Organizational Memory** | Accumulated intelligence | Can't replicate years of learning overnight |

**Switching cost = losing your organizational brain.**

---

## The Strategic Sequence

### Phase 1: Build the Smartest Organization (Now)

**We are the first customer.** Build StratAI for StratGroup. Prove the value internally.

**Goal:** Every StratGroup employee becomes 10x more effective through AI that:
- Knows their context (role, projects, history)
- Prepares them for meetings (relevant information surfaced)
- Captures decisions (what was decided, why, by whom)
- Tracks actions (tasks from insights → execution)
- Learns over time (what worked, what didn't)

**Success metric:** Leadership says "I can't work without this."

### Phase 2: Sell Alongside StraTech Products (Next)

Every StraTech client gets offered StratAI:
- "Your team gets the same intelligence we use"
- Bundled or add-on pricing
- Proves value quickly (meeting prep, decision capture)

**Success metric:** 80% of StraTech clients adopt StratAI.

### Phase 3: Connect to StratOS (Future)

When clients connect to StratOS, the flywheel activates:
- Human decisions → StraTech operational systems
- StraTech outcomes → StratAI learning
- Loop closes. Intelligence compounds.

**The shift:** From selling PRODUCTS to selling OUTCOMES.

| Before | After |
|--------|-------|
| "Here's a loyalty platform" | "Your loyalty program will perform better" |
| "Here's payment processing" | "Your payments will optimize automatically" |
| Software license | Continuous intelligence partnership |
| One-time value | Compounding value |

---

## What We're Building

### Core Capabilities

#### 1. Conversational Intelligence
Talk to your business in natural language. Get context-aware answers.

```
USER: "Why did our revenue drop last month?"

STRATAI: "Based on your franchise data, I identified 3 factors:
  1. Competitor opened 2km away on March 15 (-8% foot traffic)
  2. Loyalty redemption spiked 40% (Easter campaign too generous?)
  3. The Easter campaign underperformed baseline by 12%

  Similar franchises that faced competitor openings recovered
  within 3 months by focusing on loyalty retention.

  Want me to show what worked for them?"
```

#### 2. Context Hierarchy
Organizational structure reflected in AI context:

```
Organization (StratGroup)
├── Space (StraTech Projects)
│   ├── Area (Nedbank SVS)
│   │   ├── Pages (Meeting Notes, Decisions)
│   │   ├── Tasks (Action Items)
│   │   └── Context (Project background, stakeholders)
│   └── Area (Spur Loyalty)
│       └── ...
├── Space (StratFin Operations)
│   └── ...
└── Space (Personal)
    └── ...
```

AI knows where you are in this hierarchy and provides relevant context.

#### 3. Decision Capture
Every significant decision recorded with:
- **What** was decided
- **Why** (reasoning, constraints, trade-offs)
- **Who** was involved
- **When** it was made
- **Outcome** (linked when measured)

#### 4. Knowledge Persistence
- **Pages:** Meeting notes, proposals, decisions, specs
- **Versions:** Full history of changes
- **Sharing:** Granular permissions (viewer/editor/admin)
- **Audit:** Who viewed, edited, shared what

#### 5. Work Tracking
- **Tasks:** From any source (meetings, insights, AI suggestions)
- **Subtasks:** Breakdown complex work
- **Focus Mode:** Context-rich AI assistance per task
- **Integration:** Sync with external systems (Jira, GitHub, etc.)

#### 6. AI Governance
- **Model Policies:** Which models are allowed, for whom
- **Usage Tracking:** Token usage, cost allocation
- **Audit Trails:** What was asked, what was answered
- **Guardrails:** Enterprise-appropriate responses

#### 7. Skills
- **Reusable AI methodologies:** Structured instruction sets (QBR prep, proposal writing, sprint retro)
- **Hierarchical activation:** Org → Space → Area inheritance
- **Integration-aware:** Skills can reference external tools (email send, Xero query, GitHub search)
- **Context-amplified:** Skill instructions + Area context = contextual expertise

### The Closed-Loop Knowledge System

The capabilities above aren't isolated features — they form a **closed-loop system** where each feature is simultaneously a context consumer and a context generator. This is the mechanism that makes the Data Flywheel (Section 4) operational.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              HOW THE FEATURES FEED EACH OTHER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Calendar ──▶ Meetings ──▶ Decisions + Actions                             │
│                                    │                                         │
│                                    ▼                                         │
│   Skills ──▶ Pages ◀── Tasks                                                │
│       │         │          │                                                 │
│       └─────────┼──────────┘                                                 │
│                 ▼                                                             │
│         Hierarchical Context (Space → Area)                                  │
│                 │                                                             │
│                 ▼                                                             │
│            AI Memory (learns, recalls, recommends)                           │
│                 │                                                             │
│       ┌─────────┼──────────┐                                                 │
│       ▼         ▼          ▼                                                 │
│   Integrations  Chat   Next Meeting (prep)                                  │
│                                                                              │
│   Every arrow is a context flow.                                             │
│   Every node is both consumer and producer.                                  │
│   The loop never stops. Intelligence compounds.                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example:** A user asks "Prepare me for tomorrow's budget review with Sarah."

| Feature | Contribution |
|---------|-------------|
| Calendar | Knows the meeting is at 2pm, Sarah is the attendee |
| Meeting Records | Last QBR with Sarah — she flagged Q4 spend concerns |
| Pages | "Q3 Budget Analysis" has the latest numbers |
| Tasks | 3 outstanding budget items assigned to you |
| Skills | "QBR Prep" skill structures agenda, talking points, risk flags |
| Integrations | Xero pulls current month actuals vs. forecast |
| Memory | Sarah prefers visual summaries; you like executive-first format |

No single feature achieves this. The combination does. And every interaction feeds back into the system, making the next response smarter.

> **See:** [`CONTEXT_STRATEGY.md`](../architecture/CONTEXT_STRATEGY.md) — "The Closed-Loop Knowledge System" section for technical architecture implications.

---

## Integration Strategy

### Principle: Simple Yet Powerful

Start with integrations that help build the smartest organization. Let adoption drive demand for more connections.

### Tier 1: Personal Productivity (Start Here)

| Integration | Pull | Push | Value |
|-------------|------|------|-------|
| **Calendar** | Meetings, attendees | Focus time blocks | Meeting prep, follow-up capture |
| **Email** | Action items, context | Meeting summaries | Surface hidden tasks |
| **Documents** | Search, reference | Generated summaries | Knowledge findability |

### Tier 2: Team Intelligence (Next)

| Integration | Pull | Push | Value |
|-------------|------|------|-------|
| **Slack/Teams** | Threads, decisions | Task updates | Real-time context capture |
| **Jira/Linear** | Sprint status, blockers | Tasks become tickets | Dev visibility |

### Tier 3: Business Intelligence (Later)

| Integration | Pull | Push | Value |
|-------------|------|------|-------|
| **Xero/Accounting** | Financial context | — | Decision context |
| **CRM** | Client relationships | Meeting notes | Relationship context |
| **StraTech** | Operational data | Decisions | **The Flywheel** |
| **StratFin** | Transaction data | — | Financial context |

### Technical Approach: MCP + OAuth

**Model Context Protocol (MCP)** is becoming the standard for AI ↔ Tool connections:
- Anthropic created it, OpenAI adopted it, Microsoft integrating
- We build MCP client layer, leverage ecosystem of servers
- Don't compete on integration count—compete on intelligence depth

---

## AI Onboarding & Education Philosophy

### Guiding Users Into AI

Not everyone is an AI native. StratAI meets users where they are:

1. **Templates reduce blank-page anxiety**
   - Meeting prep, decision capture, task breakdown
   - Pre-built prompts for common scenarios

2. **Progressive disclosure**
   - Start simple (chat, tasks)
   - Unlock advanced features as users grow

3. **Context does the heavy lifting**
   - AI knows your role, your projects, your history
   - Less prompting needed because AI has context

### Model Arena: Education & Optimization

| Purpose | Description |
|---------|-------------|
| **User Education** | Side-by-side model comparison demystifies AI |
| **Model Optimization** | Continuous benchmarking of model strengths |
| **Context Testing** | "Send to Arena" tests prompts with conversation context |
| **Smart Routing** | Data-driven model recommendations per use case |

---

## Development Philosophy

### Guiding Principles

1. **Dogfood First** — We are the first customer. Build for StratGroup's real needs.
2. **Baby Steps** — Small iterations focused on quality, not features.
3. **No Bloat** — Every line justified. Prefer removing code.
4. **Speed Matters** — Time to first token. UI responsiveness.
5. **Foundation First** — Bad interaction experience is a non-starter.
6. **Close the Loop** — Every feature should contribute to the flywheel.

### Quality Over Quantity

- Each feature must earn its place
- Technical debt addressed immediately
- Performance is a feature
- Security and governance are non-negotiable

---

## Development Roadmap

### Completed Phases

| Phase | Focus | Status |
|-------|-------|--------|
| 0.1 | LLM Interaction Integrity | ✅ Complete |
| 0.2 | Persistence & History | ✅ Complete |
| 0.3a | Space Navigation Foundation | ✅ Complete |
| 0.3b | Assists Framework | ✅ Complete |
| 0.3c | Task Lifecycle Foundation | ✅ Complete |
| 0.3c+ | Enhanced Focus Mode | ✅ Complete |
| 0.3d++ | Subtasks & Plan Mode | ✅ Complete |
| 0.3e | Task Dashboard | ✅ Complete |

### Current Phase: Context & Integration Foundation

| Priority | Item | Purpose |
|----------|------|---------|
| **Immediate** | Mobile responsiveness | Usability anywhere |
| **Immediate** | Global search UI | Find anything fast |
| **Immediate** | Comments & @mentions | Collaboration basics |
| **Short-term** | Calendar integration | Meeting prep, capture |
| **Short-term** | Email integration | Surface hidden tasks |
| **Medium-term** | Document search | Knowledge findability |

### Future Phases

| Phase | Focus | Outcome |
|-------|-------|---------|
| **Context Intelligence** | CONTEXT_STRATEGY.md implementation | Memory that compounds |
| **Integration Layer** | MCP client, OAuth flows | Connected intelligence |
| **Flywheel Activation** | StraTech connection | Decision → Outcome loop |
| **Collective Intelligence** | Cross-client patterns | Network effects |

---

## Technical Architecture

### Current Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | SvelteKit + Svelte 5 (runes) + Tailwind CSS |
| **LLM Routing** | LiteLLM proxy (multi-provider) |
| **Database** | PostgreSQL 18 |
| **Search** | PostgreSQL full-text + pgvector (planned) |
| **Auth** | WorkOS |
| **Deployment** | Docker Compose |
| **Cloud** | StratHost (AWS) |

### Architecture Principles

1. **Context-aware by design** — Every component understands organizational hierarchy
2. **Event-sourced decisions** — Decisions are immutable records with full context
3. **Integration-ready** — MCP client layer for tool connections
4. **Multi-model** — Not locked to single AI provider
5. **Enterprise-grade** — Audit trails, permissions, governance built-in

### Performance Priorities

1. Time to first token (streaming)
2. UI responsiveness during generation
3. Search speed (instant results)
4. Context loading (relevant, not slow)

---

## Success Metrics

### Phase 1: StratGroup Adoption (3-6 months)

| Metric | Target |
|--------|--------|
| Daily active users (StratGroup) | 100% of knowledge workers |
| Meeting prep usage | 80% of meetings |
| Decision capture rate | 50% of significant decisions |
| Leadership NPS | >50 |

### Phase 2: Client Adoption (6-12 months)

| Metric | Target |
|--------|--------|
| StraTech clients with StratAI | 80% |
| Time to value (new clients) | <1 week |
| Decision capture rate | 30% (growing) |
| Integration connections per client | 2+ |

### Phase 3: Flywheel Activation (12-24 months)

| Metric | Target |
|--------|--------|
| Decision → Outcome links | 50% of decisions |
| AI recommendations accepted | 40% |
| Collective intelligence patterns | 10,000+ |
| Client switching rate | <5% annually |

---

## The Outcome: From Products to Partnerships

### What We're Really Selling

| Traditional | StratAI-Enabled |
|-------------|-----------------|
| Software licenses | Organizational intelligence |
| Implementation projects | Continuous improvement |
| Support tickets | Proactive insights |
| Feature releases | Compounding value |

### The Value Proposition

> **"We don't just give you software. We make your organization continuously smarter.**
>
> Every decision your team makes gets captured. Every outcome gets measured. The loop closes. Intelligence compounds.
>
> After a year, your new marketing manager can ask: 'What loyalty strategies worked for us?'
>
> And the system answers: 'Based on 47 decisions your team made, here's what drove results. Here's what didn't. Here's what similar companies found.'
>
> That's not a product. That's a partnership. That's an outcome."

---

## References

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Development guidance, session context |
| `BACKLOG.md` | Feature backlog, priorities |
| `ENTITY_MODEL.md` | Data architecture |
| `docs/CONTEXT_STRATEGY.md` | Memory architecture (the moat) |
| `docs/CONFLUENCE_COMPETITIVE_ANALYSIS.md` | Competitive intelligence |
| `docs/DOCUMENT_SYSTEM.md` | Pages system |
| `docs/GUIDED_CREATION.md` | Template system |
| `docs/SPACE_MEMBERSHIPS.md` | Collaboration model |

---

## Appendix: The Collective Intelligence Vision

As StratAI scales across clients, anonymized patterns create network effects:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COLLECTIVE INTELLIGENCE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CLIENT A (Retail)         CLIENT B (Retail)         CLIENT C (Retail)     │
│   ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐   │
│   │ Decisions: 500  │       │ Decisions: 300  │       │ Decisions: 400  │   │
│   │ Outcomes: 50K   │       │ Outcomes: 30K   │       │ Outcomes: 40K   │   │
│   └────────┬────────┘       └────────┬────────┘       └────────┬────────┘   │
│            │                         │                         │            │
│            └─────────────────────────┼─────────────────────────┘            │
│                                      │                                       │
│                                      ▼                                       │
│                   ┌───────────────────────────────┐                          │
│                   │   ANONYMIZED AGGREGATE        │                          │
│                   │                               │                          │
│                   │   "Across retail clients,     │                          │
│                   │    15% earn rate adjustments  │                          │
│                   │    yield optimal margin/churn │                          │
│                   │    trade-off 73% of the time" │                          │
│                   └───────────────────────────────┘                          │
│                                                                              │
│   NEW CLIENT D gets Day 1 intelligence from collective patterns              │
│   without having to learn from scratch.                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

This is the "Collective Intelligence of all businesses" that creates winner-take-most dynamics in the market.

---

*Last Updated: January 2026*
*Current Focus: Building the Smartest Organization (StratGroup first)*
*Strategic Direction: Human Intelligence Layer → Data Flywheel → Irreversible Moat*
