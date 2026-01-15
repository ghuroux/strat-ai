# StratAI: Work Operating System Vision

> A context-aware AI partner that understands how work actually happens.

---

## The Core Insight

StratAI isn't a chat interface—it's a **work operating system**. The innovation isn't the structure (calendar, tasks, projects)—it's the **intelligence layer** that makes work frictionless.

Most knowledge workers share the same daily pattern:
- Meetings drive the day
- Tasks accumulate between meetings
- Deep work happens in precious gaps
- Context switching is the constant tax

The goal: **Reduce context switching** (both physical navigation and mental load) while ensuring the right context flows automatically.

---

## The Components

### 1. Home / Command Center

When you log in, you see what matters *today*:

| Section | What it shows |
|---------|---------------|
| **Today's Meetings** | Calendar with AI-enriched intelligence attached |
| **Today's Tasks** | Actual tasks + AI-recommended priorities |
| **Needs Attention** | Follow-ups, stale items, upcoming deadlines |

This is the "start here" before diving into deep work. Not a space—a dashboard.

### 2. Meetings as First-Class Entities

Meetings aren't just calendar entries. They have a lifecycle:

```
PREP                    DURING                  FOLLOW-UP
─────────────────────   ─────────────────────   ─────────────────────
• AI research           • Live capture          • Outcomes recorded
• Previous notes        • Decision logging      • Action items created
• Attendee profiles     • Goal tracking         • Notes synthesized
• Your goals/intent                             • Follow-ups scheduled
```

**Intelligence layer:**
- An agent (or colleague) enriches meetings *before* they happen
- Research on attendees, company news, previous interactions
- Surface open action items and unresolved decisions
- You add your intent: "What I want to achieve"
- Outcomes flow into tasks automatically

### 3. Tasks with Context Assignment

Tasks aren't floating items. Every task belongs to a **context/domain**:

```
Task: "Write Q4 strategy document"
Context: Q4 Planning
Due: Friday
Related: [Competitor Analysis], [Last Quarter Review]
```

When you work on a task:
- The context comes with it
- Related documents are accessible
- Previous conversations are available
- The AI knows what you've been working on

**Creating tasks (chat-first):**
```
You: "I need to write the Q4 strategy document"
AI: "Got it. Should I link this to 'Q4 Planning'?"
You: "Yes, and I'll need last quarter's numbers"
AI: "I'll pull those in. When do you need this done?"
```

The task is created through conversation, not forms.

### 4. Contexts / Domains as Persistent Knowledge Containers

Contexts are living containers that accumulate:

| What accumulates | Example |
|------------------|---------|
| **Conversations** | All chats related to "Q4 Planning" |
| **Documents** | Strategy drafts, competitor analysis, financials |
| **Decisions** | "We decided to delay launch by 2 weeks" |
| **Action Items** | Tasks assigned to this context |
| **People** | Who's involved in this work |

When you enter a context, the AI *knows* the full history.

**Creating contexts (super simple):**

Not this:
> Settings → Manage Contexts → Add New → Fill Form → Save

This:
> "This doesn't fit anywhere" → "Create context: Q4 Planning" → Done

Or:
> AI: "This seems like a new thread. Create a context for it?"
> You: "Yes, call it Q4 Planning"

Context creation is a byproduct of working, not a setup step.

### 5. Spaces as Modes

Spaces are broad categories that set the tone:

| Space | Purpose | Tone |
|-------|---------|------|
| **Work** | Professional tasks, meetings, deliverables | Concise, action-oriented |
| **Research** | Exploration, learning, analysis | Thorough, multi-perspective |
| **Personal** | Private projects, personal growth | Supportive, no pressure |
| **Random** | Experiments, creative play | Playful, unconstrained |

Spaces contain contexts. You might have multiple contexts within Work:
- Q4 Planning
- Client X
- Hiring
- Product Launch

### 6. Chat as the Interaction Layer

Everything happens through conversation:

| Activity | How it happens |
|----------|----------------|
| Start a task | "I need to write the Q4 strategy doc" |
| Prep for meeting | "What should I know before the Johnson call?" |
| Capture outcome | "We decided to delay launch by 2 weeks" |
| Deep work | "Help me think through the pricing model" |
| Status update | "Generate my weekly update from this week's work" |

Chat isn't separate from work—it's **how you do work**.

### 7. Agents as Emergent Automation

Agents aren't configured from scratch—they **emerge from patterns**.

The AI notices repeated behaviors:
- "You've done client call prep 20 times with the same steps"
- "Your weekly status pulls from the same sources"
- "You always research competitors before strategy sessions"

And suggests:
- "Want me to automate client call prep?"
- "Should I draft your weekly status every Monday?"
- "I can run competitor analysis whenever you start a strategy doc"

**The flywheel:**
```
Usage → Patterns → Suggestions → Automation → More Value → More Usage
```

Users don't build agents—they **discover** them through use.

---

## The Hierarchy

```
Home (Dashboard)
├── Today's Meetings (with intelligence)
├── Today's Tasks (actual + AI-recommended)
└── Needs Attention

Spaces (Work, Research, Personal, Random)
└── Contexts/Projects (lightweight containers)
    ├── Conversations (linked to context)
    ├── Documents/Artifacts
    ├── Tasks (assigned to this context)
    ├── Decisions (captured, linked)
    └── People (involved in this work)

Entities (first-class objects)
├── Meetings (lifecycle: prep → during → follow-up)
├── Tasks (status, context, due date)
├── People (profiles, relationships)
└── Decisions (captured from conversations)
```

---

## Design Principles

### 1. Context Flows, Not Navigates
The user shouldn't hunt for context. Based on where they are and what they're doing, the right context flows automatically.

### 2. Chat-First, Not Form-First
Create tasks through conversation. Capture decisions through conversation. The structure emerges from natural interaction.

### 3. Super Simple > Feature Rich
Creating a context should be one sentence. Starting a task should be one message. Complexity is hidden until needed.

### 4. Intelligence is Ambient
AI enrichment happens in the background. Meeting research appears before the meeting. Task recommendations surface when relevant. The user doesn't "invoke AI"—it's always there.

### 5. Automation is Earned
Don't offer automation day one. Let patterns emerge from usage. When automation is suggested, it's obviously valuable because it's based on actual repeated behavior.

### 6. Reduce Both Types of Context Switching
- **Physical** (navigation): Stay in one place, filter/overlay instead of navigate
- **Mental** (topic jumping): Group related work, carry context forward

---

## System Prompt Architecture

Context is composable and additive:

```
Platform Prompt (model-optimized base)
  + Space Prompt ("professional and concise" for Work)
    + Context Prompt ("here's the Q4 Planning background...")
      + Template Prompt ("extract action items in this format...")
```

Each layer adds specificity without replacing what came before.

---

## The 80% Validation

This isn't a niche workflow. The pattern is universal for knowledge workers:

| Activity | Frequency | Current Pain |
|----------|-----------|--------------|
| Meetings | Daily, multiple | Prep is manual, outcomes scattered |
| Tasks | Constant | Context switching, losing thread |
| Deep work | Precious hours | Interrupted, context is scattered |
| Status/Updates | Weekly+ | Tedious, pulling from multiple sources |

StratAI addresses the **universal struggle of modern work** with an intelligent layer.

---

## What This Enables

### Near-term (with Spaces + Templates)
- Focused environments for different types of work
- Structured starting points for common tasks
- Space-appropriate AI tone and guidance

### Mid-term (with Contexts + Entities)
- Persistent knowledge that accumulates
- Tasks and meetings as trackable objects
- Chat-first creation of work items
- Calendar integration with intelligent prep

### Long-term (with Home + Agents)
- Command center for the workday
- AI that learns your patterns
- Automation that emerges from usage
- True reduction in cognitive load

---

## Open Questions

1. **Calendar integration**: How deep? Read-only or bidirectional?
2. **Collaboration**: How do contexts/meetings work with colleagues?
3. **Entity extraction**: How aggressive should AI be in capturing decisions/tasks?
4. **Agent permissions**: What can agents do automatically vs. with approval?
5. **Mobile experience**: How does this translate to phone/tablet?

---

## Related Documents

- `PRODUCT_VISION.md` - Overall product strategy
- `PHASE-0.3-SPACES-DESIGN.md` - Spaces implementation details
- `BACKLOG.md` - Phased development plan

---

*Document created: 2024-12-14*
*Last updated: 2024-12-14*
