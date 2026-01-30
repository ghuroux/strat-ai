# Automated Workflows

> **Status:** Vision / Design | **Priority:** Future (post-Context Management phase) | **Dependencies:** Skills (SKILLS.md), Integrations (INTEGRATIONS_ARCHITECTURE.md), Context Retrieval (AI_RETRIEVAL_ARCHITECTURE.md)

Enable users to create persistent, triggered AI workflows that operate within their Spaces and Areas — from pre-built Recipes to custom Automations, governed by enterprise policies.

**Strategic Position:** This is the natural evolution of Skills (behavioral programming) + Integrations (external actions) + Context (knowledge retrieval). Automated Workflows compose these three layers into persistent, triggered workflows that work on behalf of users.

**Key Design Principle:** Governed automation, not autonomous agents. Enterprise customers need predictability, auditability, and cost control. Every workflow runs within the existing Org → Space → Area permission model.

---

## Table of Contents

1. [Vision & Strategic Value](#1-vision--strategic-value)
2. [Core Concepts](#2-core-concepts)
3. [The Three Phases](#3-the-three-phases)
4. [Phase 0: Skills Foundation](#4-phase-0-skills-foundation)
5. [Phase 1: Recipes](#5-phase-1-recipes)
6. [Phase 2: Custom Automations](#6-phase-2-custom-automations)
7. [Phase 3: Persistent Agents (Future)](#7-phase-3-persistent-agents-future)
8. [Technical Architecture](#8-technical-architecture)
9. [Governance Model](#9-governance-model)
10. [Data Model](#10-data-model)
11. [UX Design](#11-ux-design)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Success Metrics](#13-success-metrics)
14. [Design Rationale](#14-design-rationale)
15. [Decision Log](#15-decision-log)

---

## 1. Vision & Strategic Value

### The Composition Insight

StratAI already has three distinct layers that, separately, provide significant value. Automated Workflows compose them:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    THE COMPOSITION MODEL                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   TODAY (Manual Composition)                                                     │
│   ──────────────────────────                                                     │
│                                                                                  │
│   User opens chat → Skills shape AI behavior → AI uses tools → User acts         │
│                                                                                  │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │  User    │ ──▶ │  Skills  │ ──▶ │  Tools   │ ──▶ │  Action  │              │
│   │  (chat)  │     │  (how)   │     │  (what)  │     │  (user)  │              │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘              │
│                                                                                  │
│   Human in the loop at every step. High quality, low leverage.                   │
│                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│   FUTURE (Automated Composition)                                                 │
│   ───────────────────────────────                                                │
│                                                                                  │
│   Trigger fires → Skills shape AI → AI retrieves context → AI takes action       │
│                                                                                  │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │ Trigger  │ ──▶ │  Skills  │ ──▶ │ Context  │ ──▶ │  Action  │              │
│   │  (when)  │     │  (how)   │     │  (know)  │     │  (do)    │              │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘              │
│                                                                                  │
│   Human sets it up once. Same quality, high leverage.                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### What This Is NOT

| This Is | This Is NOT |
|---------|-------------|
| Governed workflows with clear triggers and actions | Autonomous agents with open-ended goals |
| Pre-built Recipes users configure | A visual programming environment (Zapier/n8n clone) |
| AI workflows that use existing Skills + Tools | A new AI capability layer |
| Enterprise-governed automation | Unmonitored background processes |
| An evolution of existing features | A separate product surface |

### Value Proposition

| Stakeholder | Value |
|-------------|-------|
| **Users** | Repetitive knowledge work handled automatically — meeting prep, weekly digests, post-meeting processing |
| **Teams** | Consistent workflows applied automatically — no "someone forgot to write meeting notes" |
| **Org Admins** | Governed automation — every workflow runs within permissions, budgets, and audit trails |
| **StratAI** | Stickiness + differentiation — competitors offer chat; we offer persistent productivity |

### The Meeting Lifecycle Proof

The Meeting Lifecycle (see `MEETING_LIFECYCLE.md`) is already an automated workflow in disguise:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   MEETING LIFECYCLE = A WORKFLOW BEFORE WE HAD WORKFLOWS                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   TRIGGER        SKILL              CONTEXT           ACTION                     │
│   ───────        ─────              ───────           ──────                     │
│                                                                                  │
│   Meeting        Meeting Notes      Area context,     Create Page,              │
│   ends     ──▶   template     ──▶   attendees,   ──▶  assign Tasks,             │
│                  (guided creation)   past decisions    update Area memory         │
│                                                                                  │
│   This is exactly Trigger → Skill → Context → Action.                            │
│   Automated Workflows generalizes this pattern.                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Concepts

### Anatomy of a Workflow

Every workflow — whether a pre-built Recipe or a custom Automation — is composed of the same four primitives:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       WORKFLOW ANATOMY                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  1. TRIGGER (When)                                                        │  │
│   │  ─────────────────                                                        │  │
│   │  What causes the workflow to run.                                         │  │
│   │                                                                           │  │
│   │  • Time-based:   "Every Monday at 9am"                                    │  │
│   │  • Event-based:  "When a meeting ends"                                    │  │
│   │  • Data-based:   "When a page is finalized"                               │  │
│   │  • Manual:       "User clicks 'Run'"                                      │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                    │
│                              ▼                                                    │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  2. SKILL (How)                                                           │  │
│   │  ──────────────                                                           │  │
│   │  The behavioral instructions that shape how the AI operates.              │  │
│   │                                                                           │  │
│   │  • "Use the Meeting Notes methodology"                                    │  │
│   │  • "Follow the Financial Analysis skill"                                  │  │
│   │  • "Apply the Weekly Report format"                                       │  │
│   │                                                                           │  │
│   │  (Reuses existing Skills system — see SKILLS.md)                          │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                    │
│                              ▼                                                    │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  3. CONTEXT (Know)                                                        │  │
│   │  ─────────────────                                                        │  │
│   │  What the AI needs to know to do its job.                                 │  │
│   │                                                                           │  │
│   │  • Area context (notes, documents, active skills)                         │  │
│   │  • Trigger payload (meeting details, page content, etc.)                  │  │
│   │  • Retrieved knowledge (search results, expert lookups)                   │  │
│   │                                                                           │  │
│   │  (Reuses existing Context system — see CONTEXT_STRATEGY.md)               │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                    │
│                              ▼                                                    │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  4. ACTION (Do)                                                           │  │
│   │  ──────────────                                                           │  │
│   │  What the workflow produces or does.                                      │  │
│   │                                                                           │  │
│   │  • Internal:  Create Page, assign Task, update Area notes                 │  │
│   │  • External:  Send email, create calendar event, post to Slack            │  │
│   │  • Notify:    Send notification to user for review                        │  │
│   │                                                                           │  │
│   │  (Reuses existing Integrations — see INTEGRATIONS_ARCHITECTURE.md)        │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Workflow vs Skill vs Integration

These are complementary, not competing concepts:

| Concept | What It Is | Example |
|---------|-----------|---------|
| **Skill** | *How* the AI behaves (methodology, quality standards) | "Financial Analysis" — the framework for analyzing numbers |
| **Integration** | *What* external systems the AI can access (tools) | "Calendar" — the ability to read/write events |
| **Workflow** | *When* and *why* the AI acts (trigger + composition) | "Meeting Prep" — 1hr before a meeting, use Calendar + Area context + Meeting Prep skill to send a briefing |

A Workflow **uses** Skills and Integrations. It does not replace them.

### Workflow Scope

Workflows live at the **Area level** — they run within the context and permissions of a specific Area.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   Organization                                                                   │
│   └── Space: "Product Team"                                                      │
│       ├── Area: "Q1 Planning"                                                    │
│       │   ├── Recipe: Weekly Digest ✓ (active)                                   │
│       │   ├── Recipe: Meeting Prep ✓ (active)                                    │
│       │   └── Custom: "Post-standup task sync" ✓ (active)                        │
│       │                                                                          │
│       └── Area: "Feature Work"                                                   │
│           ├── Recipe: Post-Meeting Processor ✓ (active)                          │
│           └── Recipe: Weekly Digest ✗ (available but inactive)                   │
│                                                                                  │
│   Each workflow inherits the Area's:                                             │
│   • Context (notes, documents, skills)                                           │
│   • Permissions (who can access what)                                            │
│   • Integrations (which tools are available)                                     │
│   • Budget allocation (cost caps)                                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Three Phases

### Progressive Complexity

We build in phases, each adding user control while maintaining governance:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       PHASE PROGRESSION                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   PHASE 0: SKILLS FOUNDATION                                                     │
│   ────────────────────────────                                                   │
│   Prerequisite. Skills define "how" — no automation yet.                         │
│   Status: Design complete (SKILLS.md), implementation pending.                   │
│                                                                                  │
│   ┌─ User creates skills ──▶ AI follows methodologies in chat ─┐               │
│   │                                                               │               │
│   │   Value: Consistent AI behavior.                              │               │
│   │   Automation: None — user initiates every interaction.        │               │
│   └───────────────────────────────────────────────────────────────┘               │
│                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│   PHASE 1: RECIPES                                                               │
│   ────────────────                                                               │
│   Pre-built workflow templates. Users configure, not build.                      │
│   80% of the value, 20% of the complexity.                                       │
│                                                                                  │
│   ┌─ User activates Recipe ──▶ Trigger fires ──▶ AI runs ──▶ Output ─┐         │
│   │                                                                     │         │
│   │   Value: Automation without programming.                            │         │
│   │   User control: Toggle on/off, set preferences.                     │         │
│   │   Examples: Meeting Prep, Weekly Digest, Post-Meeting Processor.    │         │
│   └─────────────────────────────────────────────────────────────────────┘         │
│                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│   PHASE 2: CUSTOM AUTOMATIONS                                                    │
│   ───────────────────────────                                                    │
│   User-defined workflows. Trigger → Step(s) → Action.                            │
│   For power users who need domain-specific automation.                           │
│                                                                                  │
│   ┌─ User builds workflow ──▶ Trigger ──▶ AI Steps ──▶ Actions ─┐              │
│   │                                                                │              │
│   │   Value: Domain-specific automation.                           │              │
│   │   User control: Define triggers, steps, actions, conditions.   │              │
│   │   Example: "When repo has new PR, summarize changes,           │              │
│   │            check against Area decisions, post to Slack."       │              │
│   └────────────────────────────────────────────────────────────────┘              │
│                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│   PHASE 3: PERSISTENT AGENTS (Future — If Demand Warrants)                       │
│   ─────────────────────────────────────────────────────────                      │
│   Agents with memory, goals, and multi-step autonomy.                            │
│   Enterprise tier only. Heavy governance.                                        │
│                                                                                  │
│   ┌─ User defines agent ──▶ Agent runs continuously ──▶ Reports ─┐             │
│   │                                                                  │             │
│   │   Value: Continuous intelligence.                                │             │
│   │   User control: Goals, boundaries, approval gates.               │             │
│   │   Example: "Monitor competitive landscape, alert on changes."   │             │
│   └──────────────────────────────────────────────────────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Phase 0: Skills Foundation

> **Status:** Design complete. See [SKILLS.md](./SKILLS.md) for full specification.

### Why Skills Come First

Skills are the behavioral programming layer that all workflows depend on. Without Skills, workflows can only do generic AI completion. With Skills, workflows follow proven methodologies.

| Without Skills | With Skills |
|---------------|-------------|
| "Summarize this meeting" → generic summary | "Summarize this meeting" → follows Meeting Notes skill (decisions, actions, owners, deadlines) |
| "Prepare for tomorrow's meetings" → bullet points | "Prepare for tomorrow's meetings" → follows Meeting Prep skill (context, objectives, talking points, risks) |
| "Write a weekly digest" → rambling summary | "Write a weekly digest" → follows Weekly Digest skill (progress, blockers, next week, metrics) |

### Skills → Workflow Mapping

Every Recipe and Automation uses one or more Skills to define quality:

| Workflow | Primary Skill | What the Skill Adds |
|----------|--------------|---------------------|
| Meeting Prep | Meeting Preparation | Structured briefing: context, objectives, talking points, risks |
| Weekly Digest | Weekly Report | Consistent format: progress, blockers, next steps, metrics |
| Post-Meeting Processor | Meeting Notes | Extraction framework: decisions, action items, owners, deadlines |
| Task Status Update | Status Reporting | Concise updates: what changed, what's blocked, what's next |

### Implementation Notes

Skills implementation is documented in `SKILLS.md` — all schema, API, UI, and prompt integration details are specified there. Automated Workflows does not modify the Skills system; it consumes it.

**Key requirement for workflows:** Skills must be loadable by system processes (not just user chat sessions). The `getActiveSkillsForArea(areaId)` repository method already supports this pattern.

---

## 5. Phase 1: Recipes

### What is a Recipe?

A Recipe is a **pre-built workflow template** that StratAI provides. Users activate it in an Area, configure preferences, and it runs automatically.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       RECIPE ANATOMY                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  Recipe: Meeting Prep                                                     │  │
│   │                                                                           │  │
│   │  TRIGGER:  1 hour before each calendar event                              │  │
│   │  SKILL:    Meeting Preparation methodology                                │  │
│   │  CONTEXT:  Area notes + documents + meeting details + attendee history     │  │
│   │  ACTION:   Send briefing email to user                                    │  │
│   │                                                                           │  │
│   │  PREFERENCES (user-configurable):                                         │  │
│   │  • Lead time: [30min / 1hr / 2hr / morning-of]                            │  │
│   │  • Delivery: [email / in-app notification / both]                         │  │
│   │  • Include: [talking points / attendee context / both]                     │  │
│   │  • Filter: [all meetings / external only / tagged meetings]               │  │
│   │                                                                           │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│   User experience: Toggle ON → Set preferences → Done.                          │
│   No workflow building. No prompt writing. Just configuration.                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Starter Recipes (V1)

#### Recipe 1: Meeting Prep

**Purpose:** Prepare users for upcoming meetings with contextual briefings.

```
Trigger:     Time-based — X minutes before calendar event
Skill:       Meeting Preparation (platform skill)
Context:     Meeting details (title, attendees, agenda) +
             Area context (notes, documents, recent decisions) +
             Attendee history (past interactions in Area)
Action:      Send briefing email/notification to user
Preferences:
  - lead_time: 30min | 1hr | 2hr | morning_of (default: 1hr)
  - delivery: email | notification | both (default: email)
  - include_talking_points: boolean (default: true)
  - include_attendee_context: boolean (default: true)
  - filter: all | external_only | tagged (default: all)
```

**Example Output:**

```
📋 Meeting Briefing: Q1 Budget Review
   In 1 hour — 10:00 AM with Sarah Chen, Mike Torres, Lisa Park

   CONTEXT
   You last discussed Q1 budgets on Jan 15. Key decision: allocated
   $2.3M to infrastructure (see Area decision log). Sarah raised
   concerns about contractor spend — this may come up again.

   TALKING POINTS
   1. Infrastructure allocation status ($2.3M approved Jan 15)
   2. Contractor spend review (Sarah's concern from last meeting)
   3. Q2 planning timeline (per Area roadmap)

   ATTENDEE NOTES
   • Sarah Chen — Finance lead. Last interaction: Jan 15 budget review.
   • Mike Torres — Engineering. Owns infrastructure budget line.
   • Lisa Park — PMO. Tracking Q2 timeline.
```

#### Recipe 2: Weekly Digest

**Purpose:** Summarize weekly activity in an Area — what happened, what's next.

```
Trigger:     Time-based — every Monday at configured time
Skill:       Weekly Report (platform skill)
Context:     Area activity (conversations, pages created/updated, tasks
             completed/created, decisions made) for the past 7 days
Action:      Create draft Page in Area OR send email digest
Preferences:
  - day: monday | friday (default: monday)
  - time: user's timezone, HH:MM (default: 09:00)
  - delivery: page_draft | email | both (default: page_draft)
  - include_metrics: boolean (default: true)
  - include_next_week: boolean (default: true)
```

**Example Output:**

```
📊 Weekly Digest: Q1 Planning — Jan 20–26

PROGRESS
• Finalized infrastructure budget allocation ($2.3M)
• Completed contractor cost analysis (see "Contractor Review" page)
• 3 tasks completed, 2 new tasks created

DECISIONS MADE
• Infrastructure: approved $2.3M (Jan 15 budget review)
• Timeline: Q2 planning starts Feb 1 (per PMO alignment)

OPEN ITEMS
• Contractor spend review — awaiting Sarah's approval
• Vendor selection for monitoring tools — deadline Feb 5

NEXT WEEK
• Q2 planning kickoff (Feb 1)
• Vendor shortlist presentation (Feb 3)
• Budget review with leadership (Feb 5)
```

#### Recipe 3: Post-Meeting Processor

**Purpose:** After a meeting, extract decisions, action items, and update Area context.

```
Trigger:     Event-based — meeting ends (calendar event end time) OR
             manual trigger (user uploads transcript)
Skill:       Meeting Notes (existing guided creation template)
Context:     Meeting details + transcript (if available) +
             Area context (for relevance filtering)
Action:      Create draft Page (meeting minutes) +
             Create Tasks from action items (draft, pending user confirmation) +
             Propose Area note updates (decisions for context)
Preferences:
  - auto_create_tasks: boolean (default: false — propose, don't create)
  - auto_update_context: boolean (default: false — propose, don't update)
  - require_transcript: boolean (default: false — works without, better with)
  - notify_attendees: boolean (default: false)
```

**Key Design Decision:** Post-Meeting Processor defaults to **propose, not execute**. It creates drafts and suggestions for human review. Users who trust the workflow can enable auto-creation.

#### Recipe 4: Task Status Sync

**Purpose:** Periodic status update on open tasks in an Area.

```
Trigger:     Time-based — daily at configured time
Skill:       Status Reporting (platform skill)
Context:     Open tasks in Area + recent activity + due dates
Action:      Send status notification to Area owner +
             Flag overdue tasks
Preferences:
  - frequency: daily | twice_weekly | weekly (default: daily)
  - time: user's timezone, HH:MM (default: 08:00)
  - delivery: notification | email (default: notification)
  - include_overdue_warning: boolean (default: true)
```

#### Recipe 5: Decision Log Maintainer

**Purpose:** Monitor conversations for implicit decisions and propose adding them to Area context.

```
Trigger:     Event-based — after each conversation in the Area
Skill:       Decision Extraction (platform skill)
Context:     Conversation content + existing Area decisions (to avoid duplicates)
Action:      Propose decision additions to Area notes (notification to user)
Preferences:
  - sensitivity: low | medium | high (default: medium)
    Low = only explicit "we decided..." statements
    Medium = explicit + strong implications
    High = any directional statement
  - auto_add: boolean (default: false — always propose)
```

### Recipe Catalog UX

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   Area: Q1 Planning  >  Workflows                                 [+ Custom]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ACTIVE RECIPES                                                                 │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  🔄 Meeting Prep                              [ON]      [Configure]     │   │
│   │     Sends briefing 1hr before meetings                                  │   │
│   │     Last run: Today, 8:59 AM · Next: Tomorrow, 1:00 PM                 │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  📊 Weekly Digest                             [ON]      [Configure]     │   │
│   │     Creates summary every Monday at 9:00 AM                             │   │
│   │     Last run: Jan 27 · Next: Feb 3                                      │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   AVAILABLE RECIPES                                                              │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  📝 Post-Meeting Processor                                 [Activate]   │   │
│   │     Extracts decisions and action items after meetings                   │   │
│   │     Requires: Calendar integration                                      │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  ✅ Task Status Sync                                       [Activate]   │   │
│   │     Daily status updates on open tasks                                  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  💡 Decision Log Maintainer                                [Activate]   │   │
│   │     Proposes decisions from conversations for Area context              │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Phase 2: Custom Automations

### What is a Custom Automation?

A Custom Automation lets users define their own Trigger → Step(s) → Action workflow. This is for power users who need domain-specific workflows beyond what Recipes offer.

**Key constraint:** Custom Automations compose existing primitives. Users wire together triggers, skills, context sources, and actions — they don't write code or prompts.

### Automation Builder

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       AUTOMATION BUILDER                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Create Automation                                                     [X]      │
│                                                                                  │
│   Name: [Post-PR Summary to Slack                              ]                 │
│   Description: [When a PR is opened, summarize and post to Slack]                │
│                                                                                  │
│   ── TRIGGER ───────────────────────────────────────────────────────────────     │
│                                                                                  │
│   When:  [GitHub: Pull Request opened          ▼]                                │
│   Filter: Repository [frontend-app] Branch [main]                                │
│                                                                                  │
│   ── STEPS ─────────────────────────────────────────────────────────────────     │
│                                                                                  │
│   Step 1: [AI Analysis                         ▼]                                │
│   Skill:  [Code Review                         ▼]                                │
│   Prompt: "Summarize the PR changes. Focus on architectural impact               │
│            and potential risks. Reference relevant Area decisions."               │
│   Context: [✓ Area notes] [✓ Area documents] [✓ Trigger data]                    │
│                                                                                  │
│   [+ Add Step]                                                                   │
│                                                                                  │
│   ── ACTION ────────────────────────────────────────────────────────────────     │
│                                                                                  │
│   Then:  [Send Notification                    ▼]                                │
│   To:    [Area members                         ▼]                                │
│   Format: [Include AI summary + link to PR]                                      │
│                                                                                  │
│   ── GOVERNANCE ────────────────────────────────────────────────────────────     │
│                                                                                  │
│   Budget limit: [$0.50 per run               ]                                   │
│   Max runs/day: [10                          ]                                   │
│   Require approval: [✗ No — run automatically]                                   │
│                                                                                  │
│                                              [Cancel]  [Save & Activate]         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Available Primitives

#### Triggers

| Trigger Type | Examples | Source |
|-------------|---------|--------|
| **Time-based** | "Every Monday at 9am", "Daily at 5pm", "First of month" | Internal scheduler |
| **Calendar event** | "30min before meeting", "When meeting ends" | Calendar integration |
| **Page lifecycle** | "When page is finalized", "When page is shared" | Internal event |
| **Task lifecycle** | "When task is created", "When task is overdue" | Internal event |
| **Integration event** | "When PR is opened", "When issue is assigned" | Integration webhooks |
| **Manual** | "User clicks Run" | UI button |

#### AI Steps

| Step Type | What It Does |
|----------|-------------|
| **Analyze** | AI reads context and trigger data, produces analysis using a Skill |
| **Summarize** | AI creates a summary of provided content |
| **Extract** | AI extracts structured data (decisions, action items, entities) |
| **Draft** | AI creates a draft (email, page, report) |
| **Decide** | AI evaluates conditions and chooses a path (if/else branching) |

#### Actions

| Action | Target | Description |
|--------|--------|-------------|
| **Create Page** | Internal | Create a new Page in the Area (draft or shared) |
| **Create Task** | Internal | Create a Task with assignee |
| **Update Area Notes** | Internal | Append to Area context notes |
| **Send Notification** | Internal | In-app notification to user(s) |
| **Send Email** | Integration | Send via connected email (Microsoft Graph / SendGrid) |
| **Create Calendar Event** | Integration | Create meeting via Calendar integration |
| **Post Message** | Integration (future) | Post to Slack/Teams channel |

### Branching Logic

Custom Automations support simple conditional logic:

```
Trigger: Page finalized
  │
  ├─ IF page has decisions → Extract decisions → Propose Area note update
  │
  ├─ IF page has action items → Extract tasks → Create draft tasks
  │
  └─ ALWAYS → Send notification to Area members
```

**Constraint:** We support IF/ELSE branching on AI analysis output, not arbitrary programming logic. This keeps automations understandable and auditable.

---

## 7. Phase 3: Persistent Agents (Future)

> **Status:** Conceptual. Only build if Phase 1-2 demonstrate clear demand.

### What is a Persistent Agent?

A Persistent Agent goes beyond single-trigger workflows. It has:

- **Goals:** A defined objective it works toward over time
- **Memory:** State that persists across executions
- **Autonomy:** Can plan and execute multi-step strategies
- **Iteration:** Learns from outcomes and adjusts approach

### Example: Competitive Intelligence Agent

```
Goal:       "Monitor our competitive landscape and alert on significant changes"
Memory:     Known competitors, tracked products, baseline feature comparison
Triggers:   Daily scan + webhook on competitor website changes
Actions:    Search web for competitor news, compare to baseline, alert team
Governance: $5/day budget cap, weekly report to Space owner, all sources cited
```

### Why We Defer This

| Factor | Recipes/Automations | Persistent Agents |
|--------|-------------------|-------------------|
| **Predictability** | High — defined trigger, defined output | Low — emergent behavior |
| **Cost control** | Easy — single execution, known cost | Hard — iterative, unbounded |
| **Auditability** | Clear — trigger → steps → output | Complex — goal → strategy → multi-step |
| **Enterprise readiness** | Yes — governed, scoped, logged | Requires approval gates, kill switches |
| **Technical complexity** | Job queue + state machine | Full agent runtime with planning |
| **User trust** | High — "I set this up, it does this" | Lower — "I hope it does what I want" |

**The right time for Phase 3:** When enterprise customers on Phase 2 explicitly ask for it, and the context retrieval layer is mature enough to support reliable multi-step reasoning.

---

## 8. Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW EXECUTION ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   TRIGGER LAYER                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│   │  Scheduler   │  │  Event Bus   │  │  Webhooks    │  │  Manual      │       │
│   │  (cron)      │  │  (internal)  │  │  (external)  │  │  (UI)        │       │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│          │                 │                 │                 │                 │
│          └────────────────┼─────────────────┼─────────────────┘                 │
│                           │                 │                                    │
│                           ▼                 ▼                                    │
│   ORCHESTRATION LAYER                                                            │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │   │
│   │   │  Job Queue   │ ──▶ │  Executor    │ ──▶ │  State       │            │   │
│   │   │  (BullMQ)    │     │  Service     │     │  Manager     │            │   │
│   │   └──────────────┘     └──────┬───────┘     └──────────────┘            │   │
│   │                               │                                          │   │
│   │                               ▼                                          │   │
│   │   ┌──────────────────────────────────────────────────────────────────┐  │   │
│   │   │  GOVERNANCE CHECKS (before every step)                            │  │   │
│   │   │  • Permission: Does user/area have access?                        │  │   │
│   │   │  • Budget: Is there budget remaining?                             │  │   │
│   │   │  • Rate limit: Within execution limits?                           │  │   │
│   │   │  • Approval: Does this step need human approval?                  │  │   │
│   │   └──────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   EXECUTION LAYER                                                                │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                           │  │
│   │   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐             │  │
│   │   │ Context  │   │ Skills   │   │ LLM Call │   │ Actions  │             │  │
│   │   │ Loader   │   │ Loader   │   │          │   │ Runner   │             │  │
│   │   └──────────┘   └──────────┘   └──────────┘   └──────────┘             │  │
│   │                                                                           │  │
│   │   Reuses existing infrastructure:                                         │  │
│   │   • Context: getActiveSkillsForArea(), area notes, documents              │  │
│   │   • Skills: Skill prompt injection (SKILLS.md pattern)                    │  │
│   │   • LLM: Existing model routing + usage tracking                          │  │
│   │   • Actions: Integration tools, internal CRUD APIs                        │  │
│   │                                                                           │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│   LOGGING LAYER                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  workflow_executions table — full audit trail per run                      │  │
│   │  • trigger, steps, actions, tokens, cost, duration, status                │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Trigger System

#### Time-based Triggers (Phase 1)

For Recipes, the simplest reliable approach is a **persistent scheduler**.

**Option A: BullMQ with Redis (Recommended)**

```typescript
// Reliable job scheduling with retry, backoff, and persistence
import { Queue, Worker } from 'bullmq';

const workflowQueue = new Queue('workflows', { connection: redis });

// Schedule a Recipe
async function scheduleRecipe(
  workflowId: string,
  cron: string,   // e.g., '0 9 * * 1' (Monday 9am)
  timezone: string
): Promise<void> {
  await workflowQueue.add(
    'execute-workflow',
    { workflowId },
    {
      repeat: { pattern: cron, tz: timezone },
      jobId: `workflow:${workflowId}`,
    }
  );
}

// Worker processes jobs
const worker = new Worker('workflows', async (job) => {
  const { workflowId } = job.data;
  await workflowExecutor.execute(workflowId);
}, {
  connection: redis,
  concurrency: 5,  // Max parallel workflow executions
});
```

**Why BullMQ:**
- Persistent (survives restarts via Redis)
- Built-in retry with exponential backoff
- Cron scheduling with timezone support
- Concurrency control
- Job deduplication (prevents double execution)
- Already common in Node.js ecosystem

**Alternative: PostgreSQL-based scheduler**

If adding Redis is undesirable, a PostgreSQL-based approach using `pg_cron` or a polling pattern is viable for Phase 1:

```typescript
// Poll-based scheduler (no Redis dependency)
// Runs every minute, checks for due workflows
async function checkDueWorkflows(): Promise<void> {
  const due = await sql`
    SELECT w.* FROM workflows w
    WHERE w.is_active = true
    AND w.next_run_at <= NOW()
    AND w.id NOT IN (
      SELECT workflow_id FROM workflow_executions
      WHERE status = 'running'
    )
    ORDER BY w.next_run_at
    LIMIT 10
  `;

  for (const workflow of due) {
    await workflowExecutor.execute(workflow.id);
    await updateNextRunTime(workflow.id);
  }
}

// Run every 60 seconds
setInterval(checkDueWorkflows, 60_000);
```

**Recommendation:** Start with PostgreSQL polling for Phase 1 (no new infrastructure). Migrate to BullMQ when Phase 2 needs event-based triggers and higher throughput.

#### Event-based Triggers (Phase 2)

Internal events (page finalized, task created, meeting ended) use a simple event bus:

```typescript
// Internal event bus
type WorkflowEvent =
  | { type: 'page.finalized'; pageId: string; areaId: string }
  | { type: 'task.created'; taskId: string; areaId: string }
  | { type: 'meeting.ended'; eventId: string; areaId: string }
  | { type: 'conversation.ended'; conversationId: string; areaId: string };

class WorkflowEventBus {
  async emit(event: WorkflowEvent): Promise<void> {
    // Find workflows in this Area that match this trigger
    const workflows = await getActiveWorkflowsForTrigger(
      event.areaId,
      event.type
    );

    for (const workflow of workflows) {
      await workflowQueue.add('execute-workflow', {
        workflowId: workflow.id,
        triggerEvent: event,
      });
    }
  }
}

// Usage in existing code:
// pages-postgres.ts
async function finalizePage(pageId: string): Promise<void> {
  // ... existing finalization logic ...
  await workflowEventBus.emit({
    type: 'page.finalized',
    pageId,
    areaId: page.areaId,
  });
}
```

### Workflow Executor

The core execution engine — runs a workflow from trigger to completion:

```typescript
// src/lib/server/workflows/executor.ts

interface ExecutionContext {
  workflowId: string;
  executionId: string;
  triggerEvent?: WorkflowEvent;
  areaId: string;
  userId: string;  // The user who activated the workflow (for permissions)
}

class WorkflowExecutor {
  async execute(workflowId: string, triggerEvent?: WorkflowEvent): Promise<void> {
    const workflow = await getWorkflow(workflowId);
    const execution = await createExecution(workflowId);

    const ctx: ExecutionContext = {
      workflowId,
      executionId: execution.id,
      triggerEvent,
      areaId: workflow.areaId,
      userId: workflow.activatedBy,
    };

    try {
      // 1. Governance pre-check
      await this.checkGovernance(ctx, workflow);

      // 2. Load context
      const context = await this.loadContext(ctx, workflow);

      // 3. Execute steps
      let stepOutput: unknown = null;
      for (const step of workflow.steps) {
        stepOutput = await this.executeStep(ctx, step, context, stepOutput);
      }

      // 4. Execute actions
      for (const action of workflow.actions) {
        await this.executeAction(ctx, action, stepOutput);
      }

      // 5. Mark success
      await updateExecution(execution.id, {
        status: 'completed',
        completedAt: new Date(),
      });

    } catch (error) {
      await updateExecution(execution.id, {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
      });

      // Notify user of failure
      await notifyWorkflowFailure(ctx, error);
    }
  }

  private async checkGovernance(
    ctx: ExecutionContext,
    workflow: Workflow
  ): Promise<void> {
    // Check user still has Area access
    const hasAccess = await checkAreaAccess(ctx.userId, ctx.areaId);
    if (!hasAccess) throw new Error('User no longer has Area access');

    // Check budget
    const budget = await getWorkflowBudget(ctx.areaId);
    if (budget.remaining <= 0) throw new Error('Workflow budget exhausted');

    // Check rate limit
    const executions = await getRecentExecutions(ctx.workflowId, '1h');
    if (executions.length >= workflow.maxRunsPerHour) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async loadContext(
    ctx: ExecutionContext,
    workflow: Workflow
  ): Promise<WorkflowContext> {
    // Reuse existing context loading infrastructure
    const areaContext = await loadAreaContext(ctx.areaId);
    const skills = await getActiveSkillsForArea(ctx.areaId);
    const triggerData = ctx.triggerEvent
      ? await resolveTriggerData(ctx.triggerEvent)
      : null;

    return { areaContext, skills, triggerData };
  }

  private async executeStep(
    ctx: ExecutionContext,
    step: WorkflowStep,
    context: WorkflowContext,
    previousOutput: unknown
  ): Promise<unknown> {
    // Build prompt from skill + context + trigger data
    const prompt = buildStepPrompt(step, context, previousOutput);

    // Call LLM (reuses existing routing)
    const response = await callLLM({
      model: step.model || 'auto',  // Default to AUTO routing
      messages: [{ role: 'user', content: prompt }],
      // Skills injected into system prompt
      systemPrompt: buildWorkflowSystemPrompt(context.skills, step),
    });

    // Track usage
    await trackWorkflowUsage(ctx.executionId, response.usage);

    return response.content;
  }
}
```

### Model Selection for Workflows

Workflows use the existing AUTO model routing by default, but with workflow-aware hints:

| Workflow Step | Typical Complexity | Suggested Tier |
|--------------|-------------------|----------------|
| Extract decisions from transcript | Medium | Standard (Claude Haiku / GPT-4.1-mini) |
| Summarize meeting context | Low | Efficient (Gemini Flash / Haiku) |
| Analyze PR for architectural impact | High | Premium (Claude Sonnet / GPT-4.1) |
| Generate weekly digest | Medium | Standard |
| Status report | Low | Efficient |

**Cost optimization:** Recipes should default to the most cost-efficient model tier that produces acceptable quality. Users can override per-Recipe if needed.

---

## 9. Governance Model

### The Enterprise Differentiator

Every competitor can build "AI agents." Almost nobody solves: *How does an enterprise control what automated AI does, what data it accesses, and how much it costs?*

StratAI's existing governance infrastructure (Org → Space → Area, budgets, guardrails, audit logs) extends naturally to workflows.

### Permission Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW GOVERNANCE MODEL                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   WHO CAN DO WHAT                                                                │
│                                                                                  │
│   Org Admin                                                                      │
│   ├── Enable/disable workflow capability for the organization                    │
│   ├── Set org-wide workflow budget caps                                           │
│   ├── View all workflow execution logs                                            │
│   └── Approve "autonomous" workflow actions (Phase 3)                            │
│                                                                                  │
│   Space Owner / Admin                                                            │
│   ├── Enable/disable Recipes for the Space                                       │
│   ├── Set Space-level workflow budget                                             │
│   ├── View Space workflow execution logs                                          │
│   └── Create Custom Automations (Phase 2)                                        │
│                                                                                  │
│   Area Owner                                                                     │
│   ├── Activate/deactivate Recipes in their Area                                  │
│   ├── Configure Recipe preferences                                               │
│   ├── View Area workflow execution logs                                           │
│   └── Create Custom Automations for their Area (Phase 2)                         │
│                                                                                  │
│   Area Member                                                                    │
│   ├── Manually trigger workflows they have access to                             │
│   ├── View workflow outputs (pages, tasks created)                               │
│   └── ✗ Cannot create, configure, or deactivate workflows                        │
│                                                                                  │
│   Guest                                                                          │
│   └── ✗ No access to workflows                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Budget Controls

Workflows consume LLM tokens, which have real cost. The budget system prevents runaway spending:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW BUDGET HIERARCHY                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Organization Budget: $500/month for all automated workflows                    │
│   └── Space Budget: $100/month for this Space's workflows                        │
│       └── Area Budget: $25/month for this Area's workflows                       │
│           └── Workflow Budget: $5/day for this specific workflow                  │
│                                                                                  │
│   ENFORCEMENT:                                                                   │
│   • Every LLM call checks budget before execution                                │
│   • Exceeding budget → workflow paused, owner notified                           │
│   • Estimated cost shown before activation                                       │
│   • Usage attribution: workflow costs tracked separately from chat usage          │
│                                                                                  │
│   COST ESTIMATION:                                                               │
│   • Meeting Prep: ~$0.02-0.05 per run (context retrieval + summarization)        │
│   • Weekly Digest: ~$0.05-0.15 per run (activity scan + generation)              │
│   • Post-Meeting: ~$0.10-0.30 per run (transcript analysis + extraction)         │
│   • Custom Automation: varies (shown per-step estimate in builder)               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Audit Trail

Every workflow execution is fully logged:

```typescript
interface WorkflowExecution {
  id: string;
  workflowId: string;
  areaId: string;
  triggeredBy: string;      // 'scheduler' | 'event:page.finalized' | 'manual:userId'
  startedAt: Date;
  completedAt: Date | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'budget_exceeded';

  // Step-level detail
  steps: WorkflowStepExecution[];

  // Cost tracking
  totalTokensInput: number;
  totalTokensOutput: number;
  estimatedCostUsd: number;

  // Error tracking
  error: string | null;
  failedAtStep: number | null;
}

interface WorkflowStepExecution {
  stepIndex: number;
  stepType: 'analyze' | 'summarize' | 'extract' | 'draft' | 'decide';
  model: string;
  tokensInput: number;
  tokensOutput: number;
  durationMs: number;
  output: string;  // Truncated for storage
}
```

### Safety Mechanisms

| Mechanism | Purpose | Default |
|-----------|---------|---------|
| **Budget caps** | Prevent runaway cost | Per-org, per-space, per-area, per-workflow |
| **Rate limits** | Prevent execution storms | Max N runs per hour per workflow |
| **Propose, don't execute** | Human review for high-impact actions | Tasks and context updates proposed, not auto-created |
| **Kill switch** | Immediately stop a workflow | Area owner or Space admin can disable |
| **Execution timeout** | Prevent stuck workflows | 5-minute max per execution |
| **Error circuit breaker** | Stop after repeated failures | 3 consecutive failures → auto-pause + notify |
| **Scope boundaries** | Workflows can only access their Area's data | Enforced at context loading level |

---

## 10. Data Model

### Database Schema

```sql
-- ============================================================================
-- WORKFLOWS: Workflow definitions (Recipes and Custom Automations)
-- ============================================================================
CREATE TABLE workflows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recipe', 'custom')),

  -- Recipe source (NULL for custom)
  recipe_id TEXT,  -- e.g., 'meeting-prep', 'weekly-digest'

  -- Status
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'inactive'
    CHECK (status IN ('inactive', 'active', 'paused', 'error')),
  status_message TEXT,
  last_error TEXT,

  -- Trigger configuration
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('cron', 'event', 'manual')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  -- cron: { "pattern": "0 9 * * 1", "timezone": "America/New_York" }
  -- event: { "eventType": "page.finalized", "filter": { ... } }
  -- manual: {}

  -- Workflow definition
  steps JSONB NOT NULL DEFAULT '[]',
  -- [{ "type": "analyze", "skillId": "...", "prompt": "...", "model": "auto" }]

  actions JSONB NOT NULL DEFAULT '[]',
  -- [{ "type": "create_page", "config": { "status": "draft" } }]

  -- User preferences (for Recipes)
  preferences JSONB NOT NULL DEFAULT '{}',

  -- Governance
  budget_limit_per_run_usd NUMERIC(10,4),   -- Max cost per single execution
  budget_limit_daily_usd NUMERIC(10,4),     -- Max daily spend
  max_runs_per_hour INTEGER DEFAULT 10,
  max_runs_per_day INTEGER DEFAULT 50,
  requires_approval BOOLEAN DEFAULT false,

  -- Scheduling
  next_run_at TIMESTAMPTZ,

  -- Audit
  activated_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflows_area ON workflows(area_id);
CREATE INDEX idx_workflows_active ON workflows(is_active) WHERE is_active = true;
CREATE INDEX idx_workflows_next_run ON workflows(next_run_at)
  WHERE is_active = true AND trigger_type = 'cron';
CREATE INDEX idx_workflows_recipe ON workflows(recipe_id)
  WHERE recipe_id IS NOT NULL;

-- ============================================================================
-- WORKFLOW_EXECUTIONS: Execution history and audit trail
-- ============================================================================
CREATE TABLE workflow_executions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,

  -- Trigger info
  triggered_by TEXT NOT NULL,  -- 'scheduler', 'event:page.finalized', 'manual:userId'
  trigger_data JSONB,          -- Event payload or manual context

  -- Execution state
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'budget_exceeded')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Step-level detail
  step_executions JSONB DEFAULT '[]',
  -- [{ "stepIndex": 0, "model": "claude-haiku", "tokens": 1500, "durationMs": 2300, ... }]

  -- Outputs
  outputs JSONB,
  -- { "page_id": "...", "task_ids": ["..."], "notification_sent": true }

  -- Cost tracking
  total_tokens_input INTEGER DEFAULT 0,
  total_tokens_output INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) DEFAULT 0,

  -- Error tracking
  error TEXT,
  failed_at_step INTEGER,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wf_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_wf_executions_area ON workflow_executions(area_id);
CREATE INDEX idx_wf_executions_status ON workflow_executions(status);
CREATE INDEX idx_wf_executions_created ON workflow_executions(created_at);

-- ============================================================================
-- RECIPE_DEFINITIONS: Platform-provided Recipe templates
-- ============================================================================
-- Note: Recipe definitions live in code (src/lib/config/recipes/),
-- not in the database. This table tracks which recipes are available
-- and version information for update notifications.
--
-- See src/lib/config/recipes/ for the actual definitions.
```

### TypeScript Types

```typescript
// src/lib/types/workflows.ts

export type WorkflowType = 'recipe' | 'custom';
export type TriggerType = 'cron' | 'event' | 'manual';
export type WorkflowStatus = 'inactive' | 'active' | 'paused' | 'error';
export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'budget_exceeded';

export type StepType = 'analyze' | 'summarize' | 'extract' | 'draft' | 'decide';
export type ActionType =
  | 'create_page'
  | 'create_task'
  | 'update_area_notes'
  | 'send_notification'
  | 'send_email'
  | 'create_calendar_event';

// ── Trigger configs ────────────────────────────────────

export interface CronTriggerConfig {
  pattern: string;     // cron expression
  timezone: string;    // IANA timezone
}

export interface EventTriggerConfig {
  eventType: string;   // e.g., 'page.finalized'
  filter?: Record<string, unknown>;
}

export type TriggerConfig = CronTriggerConfig | EventTriggerConfig | Record<string, never>;

// ── Step definition ────────────────────────────────────

export interface WorkflowStep {
  type: StepType;
  skillId?: string;        // Skill to apply (optional)
  prompt: string;          // What to do with the context
  model?: string;          // Model override (default: 'auto')
  contextSources?: Array<'area_notes' | 'area_documents' | 'trigger_data' | 'previous_step'>;
}

// ── Action definition ──────────────────────────────────

export interface WorkflowAction {
  type: ActionType;
  config: Record<string, unknown>;
  condition?: string;      // Simple condition: 'always' | 'has_decisions' | 'has_action_items'
}

// ── Workflow ───────────────────────────────────────────

export interface Workflow {
  id: string;
  areaId: string;
  name: string;
  description: string;
  type: WorkflowType;
  recipeId: string | null;

  isActive: boolean;
  status: WorkflowStatus;
  statusMessage: string | null;
  lastError: string | null;

  triggerType: TriggerType;
  triggerConfig: TriggerConfig;

  steps: WorkflowStep[];
  actions: WorkflowAction[];
  preferences: Record<string, unknown>;

  // Governance
  budgetLimitPerRunUsd: number | null;
  budgetLimitDailyUsd: number | null;
  maxRunsPerHour: number;
  maxRunsPerDay: number;
  requiresApproval: boolean;

  // Scheduling
  nextRunAt: Date | null;

  // Audit
  activatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Execution ──────────────────────────────────────────

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  areaId: string;

  triggeredBy: string;
  triggerData: Record<string, unknown> | null;

  status: ExecutionStatus;
  startedAt: Date;
  completedAt: Date | null;

  stepExecutions: StepExecution[];
  outputs: Record<string, unknown> | null;

  totalTokensInput: number;
  totalTokensOutput: number;
  estimatedCostUsd: number;

  error: string | null;
  failedAtStep: number | null;

  createdAt: Date;
}

export interface StepExecution {
  stepIndex: number;
  stepType: StepType;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  durationMs: number;
  outputPreview: string;  // Truncated to ~500 chars
}

// ── Recipe definition (in code) ────────────────────────

export interface RecipeDefinition {
  id: string;              // e.g., 'meeting-prep'
  name: string;
  description: string;
  icon: string;            // Lucide icon name
  category: 'meetings' | 'reporting' | 'context' | 'tasks';

  // Requirements
  requiresIntegrations: string[];  // e.g., ['calendar']
  requiresSkills: string[];        // e.g., ['meeting-preparation']

  // Default configuration
  defaultTrigger: { type: TriggerType; config: TriggerConfig };
  defaultSteps: WorkflowStep[];
  defaultActions: WorkflowAction[];

  // User-configurable preferences
  preferenceSchema: {
    key: string;
    label: string;
    type: 'select' | 'boolean' | 'time' | 'number';
    options?: { value: string; label: string }[];
    default: unknown;
  }[];

  // Governance defaults
  defaultBudgetPerRun: number;
  defaultMaxRunsPerDay: number;

  // Versioning
  version: string;
}
```

---

## 11. UX Design

### Area Workflows Page

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   Area: Q1 Planning  >  Workflows                                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   [Active (2)]  [Available (3)]  [History]                                       │
│                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│   ACTIVE WORKFLOWS                                                               │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  🔄 Meeting Prep                                                        │   │
│   │  Recipe · Active since Jan 15                                           │   │
│   │                                                                          │   │
│   │  Sends briefing 1 hour before calendar events                           │   │
│   │  Last run: Today 8:59 AM (success) · Next: Tomorrow 1:00 PM            │   │
│   │  This month: 12 runs · $0.36 spent                                      │   │
│   │                                                                          │   │
│   │  [Configure]  [View History]  [Pause]                                   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  📊 Weekly Digest                                                        │   │
│   │  Recipe · Active since Jan 20                                           │   │
│   │                                                                          │   │
│   │  Creates weekly summary every Monday at 9:00 AM                         │   │
│   │  Last run: Jan 27 (success) · Next: Feb 3                               │   │
│   │  This month: 2 runs · $0.22 spent                                       │   │
│   │                                                                          │   │
│   │  [Configure]  [View History]  [Pause]                                   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Recipe Configuration Modal

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   Configure: Meeting Prep                                                 [X]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Sends a contextual briefing before your calendar events,                      │
│   including talking points, attendee context, and relevant                       │
│   Area decisions.                                                                │
│                                                                                  │
│   ── TIMING ────────────────────────────────────────────────────────────────     │
│                                                                                  │
│   Prep briefing:  ○ 30 min before                                                │
│                   ● 1 hour before                                                 │
│                   ○ 2 hours before                                                │
│                   ○ Morning of (8:00 AM)                                          │
│                                                                                  │
│   ── CONTENT ───────────────────────────────────────────────────────────────     │
│                                                                                  │
│   Include:  ☑ Talking points from Area context                                   │
│             ☑ Attendee context (past interactions)                                │
│             ☑ Relevant decisions from Area                                        │
│             ☐ Related open tasks                                                  │
│                                                                                  │
│   ── DELIVERY ──────────────────────────────────────────────────────────────     │
│                                                                                  │
│   Send via:  ● Email                                                             │
│              ○ In-app notification                                                │
│              ○ Both                                                               │
│                                                                                  │
│   ── FILTER ────────────────────────────────────────────────────────────────     │
│                                                                                  │
│   Meetings:  ● All meetings                                                      │
│              ○ External attendees only                                            │
│              ○ Meetings tagged with this Area                                     │
│                                                                                  │
│   ── COST ESTIMATE ─────────────────────────────────────────────────────────     │
│                                                                                  │
│   Estimated cost: ~$0.03 per briefing                                            │
│   With 5 meetings/week: ~$0.60/month                                             │
│   Budget limit: [$2.00/day                           ]                           │
│                                                                                  │
│                                         [Cancel]  [Save & Activate]              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Execution History

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   Meeting Prep · Execution History                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Today                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  ✅ 8:59 AM — Q1 Budget Review (10:00 AM)                               │   │
│   │     Duration: 3.2s · Tokens: 2,450 · Cost: $0.03                        │   │
│   │     Output: Email sent to user · [View briefing]                        │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   Yesterday                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  ✅ 12:00 PM — Sprint Planning (1:00 PM)                                │   │
│   │     Duration: 2.8s · Tokens: 1,890 · Cost: $0.02                        │   │
│   │     Output: Email sent to user · [View briefing]                        │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  ❌ 8:30 AM — Team Standup (9:00 AM)                                    │   │
│   │     Error: Calendar integration token expired                            │   │
│   │     [Retry] [View Details]                                              │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   This month: 12 runs · 10 success · 1 failed · 1 skipped                       │
│   Total cost: $0.36 · Avg duration: 3.1s                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Navigation Integration

Workflows appear in the Area sidebar, alongside existing Area features:

```
Area: Q1 Planning
├── Chat
├── Pages
├── Tasks
├── Context
├── Workflows (2 active)     ← NEW
└── Settings
```

---

## 12. Implementation Roadmap

### Phase 0: Skills Foundation

> **Prerequisite.** Must be completed before any workflow work.
> See [SKILLS.md](./SKILLS.md) for full implementation plan.

| Deliverable | Description |
|-------------|-------------|
| Skills database schema | `skills` + `area_skill_activations` tables |
| Skills CRUD API | Create, read, update, delete skills |
| Skills prompt integration | Inject skill summaries into system prompt |
| `read_skill` tool | AI tool to load full skill content |
| Skills UI | Space skills page + Area Context Panel section |
| Platform Skills Library | 4-6 curated skills (Meeting Notes, Financial Analysis, etc.) |

### Phase 1: Recipes

| Deliverable | Description |
|-------------|-------------|
| Workflow database schema | `workflows` + `workflow_executions` tables |
| Recipe definitions in code | `src/lib/config/recipes/` with 5 starter recipes |
| PostgreSQL-based scheduler | Polling loop for cron-triggered workflows |
| Workflow executor | Core execution engine: context → skill → LLM → action |
| Budget tracking | Per-workflow cost tracking, budget enforcement |
| Recipe catalog UI | Area Workflows page: browse, activate, configure |
| Recipe configuration modals | Per-recipe preference UI |
| Execution history UI | View past runs, status, cost |
| Email delivery action | Send workflow outputs via email |
| Notification action | In-app notification for workflow outputs |
| Page creation action | Create draft/shared Pages from workflow output |
| Task creation action | Create tasks from workflow extraction |

### Phase 2: Custom Automations

| Deliverable | Description |
|-------------|-------------|
| Automation builder UI | Trigger → Steps → Actions visual builder |
| Event bus | Internal event system for page/task/meeting lifecycle |
| Event-based triggers | Subscribe to internal events |
| Conditional logic | IF/ELSE branching on AI step output |
| BullMQ migration | Move from PostgreSQL polling to BullMQ for reliability |
| Integration actions | Send via Calendar, Email, future: Slack |
| Multi-step workflows | Chain multiple AI steps with data passing |

### Phase 3: Persistent Agents (If demand warrants)

| Deliverable | Description |
|-------------|-------------|
| Agent runtime | Goal-directed execution with planning |
| Agent memory | Persistent state across executions |
| Approval gates | Human-in-the-loop for high-impact actions |
| Agent monitoring | Real-time execution visibility |

### Infrastructure Dependencies

| Dependency | When Needed | Notes |
|-----------|-------------|-------|
| **Skills system** | Phase 0 | Must be implemented first |
| **Redis** | Phase 2 | For BullMQ job queue. Phase 1 uses PostgreSQL polling. |
| **Context retrieval tools** | Phase 1+ | `search_documents`, `search_pages` for rich context |
| **More integrations** | Phase 2 | GitHub, Slack for Custom Automation actions |

---

## 13. Success Metrics

### Phase 1 (Recipes)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Recipe activation rate** | 30% of Areas activate 1+ Recipe | Active workflows / total Areas |
| **Execution success rate** | >95% | Successful / total executions |
| **User satisfaction** | >4/5 | Post-execution feedback (optional) |
| **Cost per execution** | <$0.10 average | LLM cost tracking |
| **Time saved per user** | >30 min/week | Survey + usage correlation |

### Phase 2 (Custom Automations)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Custom workflow creation** | 10% of power users create 1+ | Custom workflows / active users |
| **Custom vs Recipe usage** | 30% custom | Custom executions / total |
| **Build-to-activate rate** | >70% | Activated / created workflows |
| **Average steps per workflow** | 2-3 | Workflow complexity indicator |

### Health Metrics (All Phases)

| Metric | Alert Threshold | Description |
|--------|----------------|-------------|
| **Error rate** | >5% | Failed executions in last hour |
| **Budget exceeded** | Any | Workflow hit budget cap |
| **Execution latency** | >30s p95 | Slow workflow detection |
| **Queue depth** | >100 | Backlog growing |

---

## 14. Design Rationale

### Why Recipes Before Custom Automations?

| Factor | Recipes First | Custom First |
|--------|--------------|-------------|
| **User effort** | Zero — toggle on, set preferences | High — design trigger, steps, actions |
| **Quality control** | StratAI ensures quality | User-dependent |
| **Support burden** | Low — known workflows | High — infinite combinations |
| **Adoption curve** | Gentle — "try this" | Steep — "build this" |
| **Data for Phase 2** | Recipes reveal what users actually want to automate | Guessing what builders need |

Recipes validate demand and inform Custom Automation design. Build for the 80% first.

### Why Area-Scoped, Not Space-Scoped?

1. **Context precision:** Areas have specific context (notes, documents, skills). A "Meeting Prep" workflow in the "Q1 Planning" Area produces very different briefings than in "Feature Work."
2. **Permission granularity:** Area owners control their workflows. Space-scoped would require Space admin for every change.
3. **Cost attribution:** Workflow costs attribute to specific work contexts, not broad Spaces.
4. **Existing pattern:** Integrations use Space-level config + Area-level activation. Workflows follow the same pattern — Recipes are available Space-wide, activated per-Area.

### Why PostgreSQL Polling Before BullMQ?

| Factor | PostgreSQL Polling | BullMQ (Redis) |
|--------|-------------------|----------------|
| **Infrastructure** | No new dependencies | Requires Redis |
| **Reliability** | Good for <100 workflows | Production-grade job processing |
| **Cron accuracy** | ±60 seconds (polling interval) | Exact timing |
| **Event triggers** | Not ideal | Native support |
| **Phase 1 needs** | ✅ Sufficient for Recipes | Over-engineered |
| **Phase 2 needs** | ❌ Not ideal for events | ✅ Required |

Start simple, upgrade when the system demands it.

### Why "Propose, Don't Execute" as Default?

Enterprise trust requires predictability. Users must trust that automated AI won't:
- Create tasks with wrong assignees
- Update Area context with incorrect decisions
- Send emails with wrong information

**Default:** Workflow outputs are proposals (draft pages, suggested tasks, notification with content). Users confirm before execution.

**Opt-in:** Users who trust a workflow can enable auto-execution for specific actions.

This mirrors the AI extraction pattern from Meeting Lifecycle: "AI suggests decisions/actions, humans confirm ownership."

---

## 15. Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Recipes before Custom Automations | 80% value at 20% complexity; validates demand before building builder | 2026-01-30 |
| Area-scoped workflows | Context precision, permission granularity, cost attribution; matches integration pattern | 2026-01-30 |
| PostgreSQL polling for Phase 1 | No new infrastructure; sufficient for cron-based Recipes; upgrade to BullMQ in Phase 2 | 2026-01-30 |
| Propose, don't execute (default) | Enterprise trust requires predictability; auto-execute is opt-in per action | 2026-01-30 |
| Skills as prerequisite | Workflows without Skills produce generic AI output; Skills define quality | 2026-01-30 |
| Five starter Recipes | Meeting Prep, Weekly Digest, Post-Meeting Processor, Task Status Sync, Decision Log Maintainer — covers common knowledge work patterns | 2026-01-30 |
| Workflow executor reuses existing infra | Context loading, skill injection, model routing, usage tracking — all exist; no new AI capability needed | 2026-01-30 |
| Skills use hybrid injection (not document pattern) | Skills are behavioral instructions (not reference material). Full content in system prompt → better adherence + prompt caching makes it cheaper after msg 3. See SKILLS.md Section 7. | 2026-01-30 |
| Budget hierarchy mirrors permission hierarchy | Org → Space → Area → Workflow; each level caps the one below | 2026-01-30 |
| Phase 3 (Persistent Agents) deferred | Requires mature context layer + proven demand from Phase 1-2; enterprise customers need predictability over autonomy | 2026-01-30 |
| Governance as differentiator | Everyone can build "agents"; almost nobody solves governed automation for enterprise | 2026-01-30 |

---

## Related Documents

- [SKILLS.md](./SKILLS.md) — Behavioral programming layer (Phase 0 prerequisite)
- [INTEGRATIONS_ARCHITECTURE.md](./INTEGRATIONS_ARCHITECTURE.md) — External action layer
- [CALENDAR_INTEGRATION.md](./CALENDAR_INTEGRATION.md) — First integration (Calendar tools for workflows)
- [CONTEXT_STRATEGY.md](../architecture/CONTEXT_STRATEGY.md) — Knowledge retrieval layer
- [AI_RETRIEVAL_ARCHITECTURE.md](../architecture/AI_RETRIEVAL_ARCHITECTURE.md) — How AI accesses org knowledge
- [MEETING_LIFECYCLE.md](../MEETING_LIFECYCLE.md) — Meeting Lifecycle (the "proof" workflow)
- [TASK_ASSIGNMENT.md](./TASK_ASSIGNMENT.md) — Task system (action target for workflows)
- [MEMBER_BUDGETS.md](../MEMBER_BUDGETS.md) — Budget system (governance foundation)
