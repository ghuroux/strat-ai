# Phase 0.3: Spaces & Templates - Design Document

> This document captures the strategic thinking and design decisions for Phase 0.3.
> Created: 2024-12-13

---

## Executive Summary

Phase 0.3 introduces **Productivity Spaces** - contextual work environments that transform StratAI from "another AI chat" into a **productivity operating system**.

The key insight: **Templates are not shortcuts - they're invisible prompt engineering that makes AI novices into power users.**

---

## Table of Contents

1. [Philosophy & Vision](#philosophy--vision)
2. [The AI Novice Problem](#the-ai-novice-problem)
3. [Architecture](#architecture)
4. [Template System](#template-system)
5. [Working Context Model](#working-context-model)
6. [Enterprise Integration](#enterprise-integration)
7. [Database Schema](#database-schema)
8. [POC Scope](#poc-scope)
9. [Template Library](#template-library)
10. [UX Patterns](#ux-patterns)
11. [Future Vision](#future-vision)

---

## Philosophy & Vision

### Core Principle

> "Best practice way to do things, with a modern twist. With the technology available, things can be smarter, more intuitive, and reduce instead of increase cognitive load to get to an outcome."

### What Spaces Are NOT

- Folders for organizing chats
- Different themes/skins
- Simple categorization

### What Spaces ARE

- **Productivity environments** with specialized tools
- **Context accumulators** that get smarter over time
- **Invisible prompt engineering** that guides users to better outcomes
- **Data capture mechanisms** that build working memory

### The Flywheel

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   CAPTURE    │───▶│   CONTEXT    │───▶│  INTELLIGENCE│  │
│  │              │    │              │    │              │  │
│  │ Templates    │    │ Working      │    │ Temporal     │  │
│  │ Integrations │    │ Memory       │    │ Agents       │  │
│  │ Conversations│    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         ▲                                       │          │
│         │                                       │          │
│         │         ┌──────────────┐              │          │
│         └─────────│    VALUE     │◀─────────────┘          │
│                   │              │                         │
│                   │ Recommendations                        │
│                   │ Next Actions                           │
│                   │ Briefings                              │
│                   └──────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The more users engage with templates → the richer their context → the smarter the recommendations → the more value they get → the more they engage.

---

## The AI Novice Problem

### The Reality

Most enterprise users are **AI novices**. They:

- Don't know how to prompt effectively
- Don't understand context/projects/file uploads
- Type like Google searches ("meeting notes")
- Get frustrated when AI "doesn't understand"
- Give up and revert to old workflows

### Traditional AI Chat Experience

```
User: "meeting notes"

ChatGPT: "I'd be happy to help you with meeting notes! To assist
         you effectively, could you please provide:
         - The meeting topic
         - Key discussion points
         - Any decisions made
         - Action items..."

User: *overwhelmed, closes tab*
```

### The StratAI Approach

```
User clicks [📝 Meeting Summary]

StratAI: "Let's capture your meeting. What was it about?"

User: "roadmap planning"

StratAI: "Got it. Who was there? I'll track action items by person."

User: "sarah, mike, the PMs"

StratAI: "What were the key outcomes or decisions?"

User: "doing auth first, mike writing perf analysis by friday"

StratAI: *produces beautiful structured summary*
         *shows extracted action items for confirmation*

User: "This is exactly what I needed."
```

**The user never learned prompting.** They answered natural questions and got a power-user result.

### The "Invisible Power User" Vision

| What User Sees | What's Actually Happening |
|----------------|---------------------------|
| Helpful questions | Optimal context gathering |
| Simple form | Structured prompt construction |
| Nice output | Expert-level prompt execution |
| Extracted items | AI data extraction pipeline |

**Templates are prompt engineering made invisible.**

### Design Principles for Novices

1. **Never show a blank page** - Always have suggestions, templates, quick actions

2. **Ask, don't expect** - Proactively gather context through natural questions

3. **Smart defaults everywhere** - Model, format, tone, length all automatic

4. **Progressive revelation** - Simple surface, depth available for power users

5. **Contextual guidance** - Inline tips, not help docs

6. **Celebrate progress** - Build confidence through visible accomplishment

7. **Recover gracefully** - Unclear input → helpful routing, not errors

---

## Architecture

### Navigation Structure (POC)

```
/              → Chat (general purpose, context-free)
/spaces        → Spaces dashboard / selector
  /spaces/work     → Work space (primary)
  /spaces/research → Research space (secondary)
/arena         → Model Arena (unchanged)
```

### Future Navigation (Post 1.0)

```
/              → Intelligent home (briefing, quick actions)
/chat          → Quick chat (context-free)
/work          → Work space with embedded chat
/research      → Research space with embedded chat
/personal      → Personal space
/arena         → Model Arena
```

### Space Components

Each space contains:

1. **Dashboard** - Quick actions, context summary, recent activity
2. **Templates** - Space-specific template library
3. **Embedded Chat** - Chat that inherits space context
4. **Working Context View** - Action items, decisions, history
5. **Settings** - Space-specific preferences, default model

### Space Visual Differentiation

| Space | Accent Color | Icon | Tone |
|-------|--------------|------|------|
| Work | Blue | 💼 | Professional, structured |
| Research | Purple | 🔬 | Exploratory, thorough |
| Personal | Green | 🏠 | Casual, flexible |
| Random | Orange | 🎲 | Playful, experimental |

---

## Template System

### What Templates Contain

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;

  // Categorization
  space: SpaceType[];           // Which spaces show this
  category: TemplateCategory;   // For organization
  roles?: string[];             // Role-specific templates

  // Interaction pattern
  pattern: 'guided' | 'form' | 'dump' | 'quick';

  // The template definition
  steps?: ConversationStep[];   // For guided pattern
  fields?: FormField[];         // For form pattern
  inputPrompt?: string;         // For dump pattern

  // AI configuration
  systemPromptAddition: string;
  extractionSchema?: ExtractionSchema;
  suggestedModel?: string;

  // Output
  outputFormat: 'markdown' | 'structured' | 'email';

  // Metadata
  estimatedTime: string;        // "2-3 minutes"
  popularity?: number;          // For sorting
}

interface ExtractionSchema {
  actionItems?: boolean;
  decisions?: boolean;
  people?: boolean;
  dates?: boolean;
  custom?: CustomExtraction[];
}
```

### Template UX Patterns

#### Pattern 1: Guided Conversation

**Best for**: Complex capture where probing yields better results

**Examples**: Meeting Summary, Research Synthesis, Brainstorm Session

**Flow**:
```
AI asks question → User responds → AI asks follow-up → ... → AI produces output
```

**Pros**: Thorough, feels natural, extracts maximum context
**Cons**: More turns, higher friction for quick tasks

#### Pattern 2: Smart Form

**Best for**: Standardized inputs where structure is clear upfront

**Examples**: Weekly Status Update, Decision Log, Bug Report

**Flow**:
```
User sees form with labeled fields → Fills in sections → Submits → AI produces output
```

**Pros**: Fast, predictable, easy to scan
**Cons**: Can feel bureaucratic, less flexible

#### Pattern 3: Intelligent Dump

**Best for**: Unstructured content that needs organization

**Examples**: Raw Notes → Summary, Email Draft from Bullets, Document Review

**Flow**:
```
User pastes/types raw content → AI transforms into structured output
```

**Pros**: Lowest friction, works with existing content
**Cons**: Less structured input, AI does more interpretation

#### Pattern 4: Contextual Quick Action

**Best for**: Fast, single-purpose tasks leveraging existing context

**Examples**: "Email Sarah about X", "Create action item for Y"

**Flow**:
```
User types natural language → System uses context → Produces result
```

**Pros**: Fastest, leverages accumulated context
**Cons**: Requires existing context to be useful

### Template Quality Bar

Every template must pass these tests:

1. **Better than DIY** - Produces better results than freestyle prompting
2. **Reduces friction** - Fewer decisions, less thinking required
3. **Captures value** - Extracts structured data for future use
4. **Feels natural** - Interaction pattern matches the task type

---

## Working Context Model

### Entity Relationship Diagram

```
                    ┌─────────────────┐
                    │  User Profile   │
                    │  - Role         │
                    │  - Team         │
                    │  - Preferences  │
                    └────────┬────────┘
                             │ owns
                             ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     People      │◄│ Working Context │►│     Spaces      │
│   (contacts)    │ │                 │ │  (environments) │
└─────────────────┘ └────────┬────────┘ └─────────────────┘
        ▲                    │
        │          ┌─────────┼─────────┐
        │          ▼         ▼         ▼
        │   ┌──────────┐ ┌────────┐ ┌──────────┐
        └───│  Action  │ │Decisions│ │ Template │
            │  Items   │ │        │ │ Outputs  │
            └──────────┘ └────────┘ └──────────┘
```

### Core Entities

#### People (Contacts)

```typescript
interface Person {
  id: string;
  name: string;
  email?: string;
  role?: string;
  team?: string;
  relationship: 'self' | 'teammate' | 'stakeholder' | 'external';
  interactionCount: number;
  lastMentioned: Date;
}
```

People are extracted from template outputs and conversations. Over time, the system learns who the user works with frequently.

#### Action Items

```typescript
interface ActionItem {
  id: string;
  title: string;
  description?: string;

  // Ownership
  owner?: Person;           // Who created/owns this
  assignedTo?: Person;      // Who should do it

  // Timing
  dueDate?: Date;
  reminderAt?: Date;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  // Provenance
  source: {
    type: 'meeting' | 'email' | 'template' | 'manual' | 'integration';
    id: string;
    title: string;
  };

  // Context
  space: SpaceType;
  tags: string[];

  // Temporal
  createdAt: Date;
  completedAt?: Date;
}
```

Action items are the **atomic unit of "things to do"** and the highest-value extraction from templates.

#### Decisions

```typescript
interface Decision {
  id: string;
  title: string;
  description: string;
  rationale?: string;
  outcome?: string;

  // People
  decisionMaker?: Person;
  stakeholders: Person[];

  // Status
  status: 'proposed' | 'decided' | 'implemented' | 'revisited';
  decidedAt?: Date;

  // Provenance
  source: {
    type: 'meeting' | 'discussion' | 'template' | 'manual';
    id: string;
  };

  // Links
  relatedDecisions: string[];
}
```

Decisions are **institutional memory** - they answer "why did we do X?"

#### Template Outputs

```typescript
interface TemplateOutput {
  id: string;
  templateId: string;
  templateName: string;
  space: SpaceType;

  // The interaction
  conversationId: string;
  inputData: Record<string, any>;
  outputContent: string;

  // Extracted entities
  extractedActionItems: string[];
  extractedDecisions: string[];
  mentionedPeople: string[];
  extractedTopics: string[];

  createdAt: Date;
}
```

Template outputs are the **raw captures** that feed all other entities.

### The Working Memory Advantage

As context accumulates, interactions get dramatically smarter:

**Week 1:**
```
User: "Draft an email to Sarah about the deadline"
System: "Who is Sarah? What deadline?"
```

**Week 4:**
```
User: "Draft an email to Sarah about the deadline"
System: "I'll draft an email to Sarah Chen (Engineering Lead)
         about the API deadline from your Dec 10th standup:

         Subject: API Deadline Follow-up
         Hi Sarah,
         Following up on our discussion..."
```

Same input. Dramatically smarter output.

---

## Task Lifecycle (Central Hub)

> **Core Insight (December 2024)**: The "What's on your plate?" assist isn't just *a* template—it's the **central hub** of the productivity OS. Meeting notes, email drafts, decisions—they all ultimately feed into or pull from the task list.

### Why Tasks Are Central

Traditional productivity tools treat tasks as one feature among many. In StratAI, tasks are **the organizing principle**:

| Assist | Relationship to Tasks |
|--------|----------------------|
| What's on your plate? | Creates tasks from brain dump |
| Meeting Summary | Extracts action items → tasks |
| Decision Log | Creates follow-up tasks |
| Email Draft | Can reference tasks, may create tasks |
| Weekly Status | Pulls from completed tasks |

Every assist either **creates tasks**, **references tasks**, or **reports on tasks**.

### The Full Task Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TASK LIFECYCLE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ENTRY POINTS (how tasks appear)                                           │
│   ├── Brain dump ("What's on your plate?" assist)                           │
│   ├── Meeting extraction (Meeting Summary → action items)                   │
│   ├── Chat capture ("I need to write the spec")                             │
│   ├── Decision outcomes ("Decision made: You'll own the spec")              │
│   └── Manual add (click + in panel)                                         │
│                                                                             │
│   DAILY RHYTHM                                                              │
│   ├── Morning: AI greeting with task summary                                │
│   │            "Morning! 4 tasks, 1 priority, spec due Friday"              │
│   ├── During:  Focus mode, complete tasks, new ones appear                  │
│   │            AI knows current focus, helps with that task                 │
│   └── Evening: Review, defer, close out                                     │
│                                                                             │
│   OVER TIME                                                                 │
│   ├── Completed → history (what did I accomplish?)                          │
│   ├── Stale → surface ("this has been sitting for 2 weeks")                 │
│   └── Patterns → insights ("you always have meeting prep tasks")            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Task Schema

```typescript
interface Task {
  id: string;
  userId: string;
  space: SpaceType;

  // Content
  title: string;
  description?: string;

  // Status
  status: 'active' | 'completed' | 'deferred';
  priority: 'normal' | 'high';

  // Timing
  dueDate?: Date;
  dueDateType?: 'hard' | 'soft';  // Actual deadline vs. preference
  snoozedUntil?: Date;            // "Remind me next week"

  // Visual
  color: string;  // Auto-assigned from palette

  // Source tracking (for integrations)
  source: {
    type: 'assist' | 'meeting' | 'chat' | 'manual';
    assistId?: string;
    conversationId?: string;
    messageIndex?: number;
  };

  // Completion
  completedAt?: Date;
  completionNotes?: string;

  // Temporal
  lastActivityAt: Date;  // For stale detection
  createdAt: Date;
  updatedAt: Date;
}
```

### Focus Mode & Task Colors

Each task has an auto-assigned accent color. When focused on a task, the space subtly shifts to that color—a visual signal that context has changed.

**Color Palette** (rotating assignment):
```
1. Indigo   (#6366f1)    5. Violet   (#8b5cf6)
2. Teal     (#14b8a6)    6. Emerald  (#10b981)
3. Amber    (#f59e0b)    7. Cyan     (#06b6d4)
4. Rose     (#f43f5e)    8. Orange   (#f97316)
```

**What changes when focused**:
- Header shows focus indicator with task color
- Chat input border/ring uses task color
- Subtle background tint (very subtle)
- Smooth 300ms CSS transition on color change

```css
:root {
  --space-accent: #3b82f6;     /* Work blue */
  --task-accent: var(--space-accent);  /* Falls back to space */
}

.focused {
  --task-accent: #14b8a6;  /* Task's assigned color */
}
```

### The Daily Experience

**First Visit (no tasks):**
```
┌────────────────────────────────────────────────────────────────┐
│  Welcome to your Work space.                                   │
│                                                                │
│  What would you like help with?                                │
│                                                                │
│  [📋 What's on your plate?]  [📝 Meeting notes]                │
│  [✉️ Draft an email]         [💬 Just chat]                    │
└────────────────────────────────────────────────────────────────┘
```

**Return Visit (has tasks):**
```
┌────────────────────────────────────────────────────────────────┐
│  AI: "Morning! You've got 4 things on your plate:              │
│                                                                │
│       ⭐ Split payments spec (Friday - client waiting)         │
│       • Loyalty platform                                       │
│       • WorkOS setup                                           │
│       • Food for the Hungry proposal                           │
│                                                                │
│       The spec looks like today's priority.                    │
│       Ready to focus on that?"                                 │
│                                                                │
│       [Focus on spec] [See everything] [Different plan]        │
└────────────────────────────────────────────────────────────────┘
```

**Focus Mode Active:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  [Work]    🎯 Split payments spec ▼              [📋 4]    [⚙️]     │
│  ═══════════════════════════════════════════════ (amber accent)     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Chat continues with AI knowing the focus...                        │
│  AI: "Let's tackle the spec. What's the current status?"            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Due Dates: Non-Anxious Design

Due dates are important but dangerous. We avoid the "wall of red" that creates guilt and avoidance.

**Principles:**
1. **Optional, not required** - Not every task needs a deadline
2. **Natural language capture** - "by Friday", "next week", "end of month"
3. **Hard vs. soft** - Client deadline ≠ self-imposed goal
4. **Intelligent surfacing** - AI triages, doesn't just list

**Bad (creates anxiety):**
```
❌ OVERDUE (5)
⚠️ TODAY (3)
📅 THIS WEEK (2)
```

**Good (helpful, not overwhelming):**
```
Today's focus:
• Split payments spec (Friday deadline)
• Follow up with Sarah

Also on your plate:
• WorkOS setup
• Food for the Hungry proposal
```

The AI prioritizes intelligently and acknowledges reality: not everything gets done.

### Temporal Awareness (Future: Phase 0.3e)

The system will eventually understand time and proactively help:

**Day Detection:**
- New day → Fresh greeting with task summary
- Monday → Weekly review prompt
- Overdue items → "Heads up, 2 items slipped..."

**Stale Task Cleanup:**
```
AI: "Been a bit since we looked at some of these:

     • 'Research competitors' - 2 weeks, no activity
     • 'Update docs' - 10 days, no activity

     Still need these, or should we clean house?

     [Clean up my list] [They're still needed]"
```

**Guided Cleanup Flow:**
- AI walks through stale items one by one
- For each: [✓ Done] [📅 Reschedule] [🗑️ Remove]
- Summary at end: "All cleaned up!"

**Frequency Control:**
- Max 1 cleanup offer per week
- Don't nag if user skips
- User can disable entirely

### WorkingPanel Modes

The WorkingPanel adapts to context:

**CRUD Mode** (via header badge click):
```
┌─────────────────────────────┐
│ Your Tasks                  │
│ ─────────────────────────── │
│ ⭐ Split payments (Fri)     │
│    [✓] [✏️] [...]           │
│                             │
│ • WorkOS setup              │
│    [✓] [✏️] [...]           │
│                             │
│ [+ Add task]                │
└─────────────────────────────┘
```

**Focus Mode** (when focused on task):
```
┌─────────────────────────────┐
│ 🎯 Split payments spec      │
│ ─────────────────────────── │
│ Due: Friday (client)        │
│ Priority: High              │
│                             │
│ [✓ Done] [Add note] [Exit]  │
│ ─────────────────────────── │
│ Other tasks (3)         [▼] │
└─────────────────────────────┘
```

**Assist Mode** (during assist flow):
```
┌─────────────────────────────┐
│ Confirm Your Tasks          │
│ ─────────────────────────── │
│ ☑ Split payments spec       │
│ ☑ WorkOS setup              │
│ ☑ Loyalty platform          │
│                             │
│ [Looks right!] [Edit]       │
└─────────────────────────────┘
```

### Completion Flow

When completing a task:

**Quick tasks:** Simple celebration
```
[✓] → "Done! ✨"
```

**Substantial tasks:** Brief prompt
```
AI: "Done with the split payments spec!
     Any notes before I file it?"

     [No notes, just done] [Add a note]
```

Future enhancement: "Should we let Sarah know it's done?"

---

## Enterprise Integration

### The B2B Advantage

StratAI is positioned for enterprises needing AI governance. This means:

- **Rich user data from HR systems** - Role, team, manager, department
- **Known collaborators** - Org chart, team membership
- **Enterprise context** - Projects, tools, policies

We don't need to ask "who are you?" - we need to ask "what do you want to accomplish?"

### Expected Enterprise Data

```typescript
interface EnterpriseUserData {
  // Identity
  userId: string;
  email: string;
  displayName: string;

  // Role & Position
  title: string;           // "Senior Product Manager"
  role: string;            // "product_manager" (normalized)
  department: string;      // "Engineering"
  team: string;            // "Platform Team"

  // Hierarchy
  managerId?: string;
  directReports?: string[];

  // Enterprise Context
  location?: string;
  startDate?: Date;
  costCenter?: string;

  // Optional enrichment
  skills?: string[];
  projects?: string[];
}
```

### The "Spotify" Onboarding Approach

Instead of asking about the user (we already know), ask about their **activities**:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Welcome to StratAI, Guillaume                              │
│                                                             │
│  Based on your role as Product Manager, Engineering,        │
│  here are activities I can help with.                       │
│                                                             │
│  Select the ones you do regularly (pick 3-5):               │
│                                                             │
│  [📝 Summarize meetings]     [✉️ Draft emails]              │
│  [📊 Write status updates]   [📋 Track decisions]           │
│  [🔍 Research topics]        [📄 Review documents]          │
│  [💡 Brainstorm ideas]       [📈 Analyze data]              │
│  [📝 Write specs & docs]     [🎯 Plan projects]             │
│  [👥 Prep for 1:1s]          [📣 Create presentations]      │
│                                                             │
│  [Continue →]                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Based on selection:
- Prioritize space dashboard
- Surface relevant templates first
- Inform future recommendations
- Build activity profile

---

## Database Schema

Designed for extensibility - won't paint us into a corner.

```sql
-- =============================================================
-- USER & PROFILE
-- =============================================================

CREATE TABLE user_profiles (
  user_id VARCHAR(255) PRIMARY KEY,
  display_name VARCHAR(255),
  email VARCHAR(255),

  -- Role (from enterprise or self-reported)
  role VARCHAR(255),
  title VARCHAR(255),
  team VARCHAR(255),
  department VARCHAR(255),

  -- Onboarding
  selected_activities TEXT[],
  onboarding_completed BOOLEAN DEFAULT false,

  -- Preferences
  preferences JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- SPACES
-- =============================================================

CREATE TABLE user_spaces (
  user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),
  space VARCHAR(50) NOT NULL,

  -- Customization
  default_model VARCHAR(100),
  custom_system_prompt TEXT,
  pinned_template_ids TEXT[],

  -- Settings
  settings JSONB DEFAULT '{}',

  PRIMARY KEY (user_id, space)
);

-- =============================================================
-- WORKING CONTEXT: PEOPLE
-- =============================================================

CREATE TABLE context_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),

  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(255),
  team VARCHAR(255),

  relationship VARCHAR(50) DEFAULT 'external',
  -- 'self', 'teammate', 'stakeholder', 'external'

  interaction_count INT DEFAULT 0,
  last_mentioned_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, email)
);

CREATE INDEX idx_people_user ON context_people(user_id);

-- =============================================================
-- WORKING CONTEXT: ACTION ITEMS
-- =============================================================

CREATE TABLE context_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),

  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Ownership
  owner_id UUID REFERENCES context_people(id),
  assigned_to_id UUID REFERENCES context_people(id),

  -- Timing
  due_date DATE,
  reminder_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority VARCHAR(20),
  -- 'low', 'medium', 'high', 'urgent'

  -- Provenance
  source_type VARCHAR(50) NOT NULL,
  source_id UUID,
  source_title VARCHAR(255),

  -- Context
  space VARCHAR(50) NOT NULL,
  tags TEXT[],

  -- Timestamps
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_action_items_user_status ON context_action_items(user_id, status);
CREATE INDEX idx_action_items_due ON context_action_items(due_date)
  WHERE status = 'pending';
CREATE INDEX idx_action_items_space ON context_action_items(user_id, space);

-- =============================================================
-- WORKING CONTEXT: DECISIONS
-- =============================================================

CREATE TABLE context_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),

  title VARCHAR(500) NOT NULL,
  description TEXT,
  rationale TEXT,
  outcome TEXT,

  -- People
  decision_maker_id UUID REFERENCES context_people(id),
  stakeholder_ids UUID[],

  -- Status
  status VARCHAR(20) DEFAULT 'proposed',
  -- 'proposed', 'decided', 'implemented', 'revisited'
  decided_at DATE,

  -- Provenance
  source_type VARCHAR(50) NOT NULL,
  source_id UUID,

  -- Context
  space VARCHAR(50) NOT NULL,
  tags TEXT[],
  related_decision_ids UUID[],

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decisions_user ON context_decisions(user_id);
CREATE INDEX idx_decisions_space ON context_decisions(user_id, space);

-- =============================================================
-- TEMPLATE OUTPUTS
-- =============================================================

CREATE TABLE template_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id),

  template_id VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  space VARCHAR(50) NOT NULL,

  -- Link to conversation
  conversation_id UUID,

  -- Content
  input_data JSONB NOT NULL,
  output_content TEXT NOT NULL,

  -- Extracted entities (IDs)
  extracted_action_item_ids UUID[],
  extracted_decision_ids UUID[],
  mentioned_people_ids UUID[],

  -- For search/filtering
  extracted_topics TEXT[],

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_outputs_user ON template_outputs(user_id);
CREATE INDEX idx_template_outputs_space ON template_outputs(user_id, space);
CREATE INDEX idx_template_outputs_template ON template_outputs(template_id);

-- =============================================================
-- UPDATE CONVERSATIONS TABLE
-- =============================================================

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS space VARCHAR(50) DEFAULT 'work';

CREATE INDEX IF NOT EXISTS idx_conversations_space
  ON conversations(user_id, space);
```

### Schema Design Principles

1. **JSONB for extensibility** - `metadata` fields allow future extension without migrations
2. **Clear entity relationships** - Foreign keys where appropriate
3. **Indexed for temporal queries** - Due dates, status filters
4. **Space-aware throughout** - Every entity knows its space
5. **`source_type`/`source_id` pattern** - Any entity can reference any other

---

## POC Scope

### Goal

Demonstrate the vision without building everything. Show "glimpses of the future."

### POC Deliverables

#### 1. Space Foundation
- [x] `/spaces` route with space selector
- [x] Work space (primary)
- [x] Research space (secondary)
- [x] Visual differentiation (accent color, header, icon)
- [x] Space dashboard with quick actions

#### 2. Embedded Chat
- [x] Chat within each space
- [x] Chat inherits space context
- [x] Space-specific system prompt additions

#### 3. Template System
- [x] Template picker UI (quick actions + full browser)
- [x] Multiple UX patterns (guided, form, dump)
- [x] 6-8 templates for POC (see below)

#### 4. Extraction & Confirmation
- [x] AI extracts action items, decisions, people
- [x] User confirmation before saving
- [x] Edit capability before save

#### 5. Working Context View
- [x] Action items list (filterable by status, due date)
- [x] Recent template outputs
- [x] Basic stats ("3 open items, 2 completed this week")

#### 6. Context Badge
- [x] In header: "🔴 3 open items"
- [x] Click to expand/view
- [x] First glimpse of temporal awareness

#### 7. Light Onboarding
- [x] Activity selection (Spotify approach)
- [x] Personalized template recommendations

### POC Templates

| Template | Pattern | Space | Priority |
|----------|---------|-------|----------|
| Meeting Summary | Guided | Work | Must Have |
| Weekly Status Update | Form | Work | Must Have |
| Decision Log | Form | Work | Must Have |
| Research Synthesis | Guided | Research | Must Have |
| Quick Note → Structure | Dump | Both | Should Have |
| Email Draft | Guided | Work | Should Have |
| Brainstorm Session | Guided | Research | Nice to Have |
| Document Review | Dump | Both | Nice to Have |

### What POC Demonstrates

- ✅ Template → Structured Data pipeline works
- ✅ Working Context accumulates value
- ✅ Spaces feel like environments, not folders
- ✅ AI novices become power users invisibly
- ✅ Foundation for temporal agents is visible
- ✅ Path to integrations is clear

---

## Template Library

Complete template library for reference and future implementation.

### 📝 Meetings & Communication

| Template | Pattern | Spaces | Role-Specific | Extracts |
|----------|---------|--------|---------------|----------|
| Meeting Summary | Guided | Work | All | Action items, decisions, attendees |
| Meeting Prep | Form | Work | All | Agenda, questions, context |
| Email Draft | Guided | Work | All | Recipients, asks |
| Slack/Teams Message | Quick | Work | All | Tone, key points |
| Presentation Outline | Guided | Work | All | Structure, messages |
| Difficult Conversation Prep | Guided | Work | Managers | Talking points, responses |
| 1:1 Notes | Guided | Work | Managers | Topics, action items, follow-ups |

### 📊 Status & Reporting

| Template | Pattern | Spaces | Role-Specific | Extracts |
|----------|---------|--------|---------------|----------|
| Weekly Status Update | Form | Work | All | Accomplishments, blockers, plans |
| Progress Report | Form | Work | PM/Leads | Milestones, metrics, risks |
| Executive Summary | Dump | Work | All | Key points, recommendations |
| Stakeholder Update | Form | Work | PM | Audience-appropriate summary |
| Handoff Document | Guided | Work | All | Context, open items, contacts |
| Sprint Retrospective | Guided | Work | PM/Eng | What worked, improvements |

### 📋 Decisions & Tracking

| Template | Pattern | Spaces | Role-Specific | Extracts |
|----------|---------|--------|---------------|----------|
| Decision Log | Form | Work | All | Decision, rationale, stakeholders |
| Action Item Review | Context | Work | All | Status updates |
| Risk Assessment | Form | Work | PM/Leads | Risks, likelihood, mitigation |
| Change Request | Form | Work | PM | What, why, impact |
| Issue/Blocker Log | Quick | Work | All | Issue, impact, owner |
| Technical Decision Record | Form | Work | Engineers | Context, decision, consequences |

### 🔍 Research & Analysis

| Template | Pattern | Spaces | Role-Specific | Extracts |
|----------|---------|--------|---------------|----------|
| Research Synthesis | Guided | Research | All | Findings, sources |
| Competitive Analysis | Guided | Research | Product/Strategy | Comparisons |
| Document Review | Dump | Both | All | Summary, concerns, recommendations |
| Data Analysis Summary | Form | Research | Analysts | Findings, methodology, insights |
| Vendor Evaluation | Form | Work | All | Criteria, scores, recommendation |
| Root Cause Analysis | Guided | Work | Engineers | Problem, causes, solutions |
| Market Research Summary | Guided | Research | Product | Trends, opportunities |
| User Interview Notes | Guided | Research | Product/UX | Insights, quotes, patterns |
| Literature Review | Guided | Research | R&D | Sources, themes, gaps |
| Technical Exploration | Guided | Research | Engineers | Options, tradeoffs, recommendation |

### 💡 Creative & Planning

| Template | Pattern | Spaces | Role-Specific | Extracts |
|----------|---------|--------|---------------|----------|
| Brainstorm Session | Guided | Research | All | Ideas, themes, next steps |
| Problem Reframing | Guided | Research | All | Perspectives, approaches |
| Project Brief | Form | Work | PM | Scope, goals, constraints |
| Sprint Planning Notes | Form | Work | PM/Eng | Commitments, capacity, risks |
| Roadmap Summary | Dump | Work | PM | Timeline, dependencies |
| Goal Setting | Guided | Personal | All | Goals, metrics, plans |
| Feature Spec | Guided | Work | Product | Requirements, scope, acceptance |
| PRD Outline | Guided | Work | Product | Problem, solution, metrics |
| Architecture Decision Record | Form | Work | Engineers | Context, options, decision |

### 🎯 Role-Specific Templates

#### Project/Product Manager
| Template | Pattern | Extracts |
|----------|---------|----------|
| User Story Writing | Form | Stories, acceptance criteria |
| Customer Feedback Synthesis | Dump | Themes, quotes, recommendations |
| Release Notes Draft | Form | Features, fixes, known issues |
| Prioritization Matrix | Form | Items, scores, rankings |

#### Engineer
| Template | Pattern | Extracts |
|----------|---------|----------|
| Code Review Summary | Dump | Findings, suggestions |
| Incident Post-mortem | Guided | Timeline, cause, prevention |
| Bug Report | Form | Steps, expected, actual |
| System Design Notes | Guided | Requirements, approach, tradeoffs |

#### People Manager
| Template | Pattern | Extracts |
|----------|---------|----------|
| Performance Review Prep | Form | Achievements, growth, goals |
| Interview Debrief | Form | Assessment, recommendation |
| Team Retrospective | Guided | Themes, actions |
| Skip-Level Summary | Guided | Insights, concerns, actions |

#### Sales/Account Management
| Template | Pattern | Extracts |
|----------|---------|----------|
| Call Summary | Guided | Attendees, outcomes, next steps |
| Proposal Draft | Guided | Scope, pricing, differentiators |
| Account Review | Form | Status, opportunities, risks |
| Objection Handling Prep | Form | Objections, responses |
| Win/Loss Analysis | Guided | Factors, learnings |

#### Executive
| Template | Pattern | Extracts |
|----------|---------|----------|
| Board Update Draft | Form | Highlights, metrics, asks |
| Strategic Decision Brief | Guided | Context, options, recommendation |
| All-Hands Talking Points | Form | Messages, Q&A prep |
| Investor Update | Form | Metrics, milestones, needs |

### 🧘 Personal Productivity

| Template | Pattern | Spaces | Extracts |
|----------|---------|--------|----------|
| Daily Planning | Quick | Personal | Priorities, intentions |
| Weekly Review | Guided | Personal | Accomplishments, learnings |
| Learning Summary | Dump | Personal | Takeaways, applications |
| Career Reflection | Guided | Personal | Achievements, growth, goals |
| Reading Notes | Dump | Personal | Key points, quotes |

---

## UX Patterns

### Space Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  StratAI                        [Work ▼]  [🔴 3]  [☰]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Quick Actions                           [See All]  │   │
│  │                                                     │   │
│  │  [📝 Meeting Summary]  [📊 Status Update]           │   │
│  │  [📋 Decision Log]     [✉️ Draft Email]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Your Context                           [View All]  │   │
│  │                                                     │   │
│  │  🔴 3 action items due this week                    │   │
│  │  📅 2 meetings to summarize                         │   │
│  │  ✅ 5 items completed this week                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Recent Activity                                    │   │
│  │                                                     │   │
│  │  • Meeting: Q1 Roadmap Planning (2h ago)            │   │
│  │  • Decision: Auth before Perf (yesterday)           │   │
│  │  • Status: Week of Dec 9 (3 days ago)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💬 Ask anything or start a template...             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Extraction Confirmation UI

```
┌────────────────────────────────────────────────────────────┐
│  I found 3 action items in your meeting:                   │
│                                                            │
│  ☑️ Mike: Write performance analysis                       │
│     Due: Friday, Dec 15                                    │
│     [Edit]                                                 │
│                                                            │
│  ☑️ Sarah: Review auth spec                                │
│     Due: Next week                                         │
│     [Edit]                                                 │
│                                                            │
│  ☑️ You: Schedule follow-up meeting                        │
│     Due: Not specified                                     │
│     [Edit]                                                 │
│                                                            │
│  [✓ Save All]  [Save Selected]  [Skip]                     │
└────────────────────────────────────────────────────────────┘
```

### Activity Selection (Onboarding)

Show 9-12 activities, user selects 3-5:

**Suggested Activities:**
1. 📝 Summarize meetings
2. ✉️ Draft emails
3. 📊 Write status updates
4. 📋 Track decisions & actions
5. 🔍 Research topics
6. 📄 Review documents
7. 💡 Brainstorm ideas
8. 📈 Analyze data
9. 📝 Write specs & docs
10. 🎯 Plan projects
11. 👥 Prep for 1:1s
12. 📣 Create presentations

### Plain English → Smart Routing

```
User types: "help me with my meeting"

┌────────────────────────────────────────────────────────────┐
│  I can help with meetings. What would you like to do?      │
│                                                            │
│  [📝 Summarize a past meeting]                             │
│  [📋 Prepare for an upcoming meeting]                      │
│  [🔍 Find notes from a previous meeting]                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Future Vision

### Temporal Intelligence (Phase 0.6+)

Once working context accumulates, temporal agents can provide:

**Morning Briefing:**
```
Good morning, Guillaume.

TODAY'S FOCUS:
• 3 action items due today
• 2 meetings (standup at 10, roadmap review at 2)
• 1 decision pending your input (API versioning)

RECOMMENDED NEXT ACTION:
Review the "Q1 Roadmap" doc before your 2pm meeting.
Sarah added comments yesterday that need your response.

[Start Day]  [Show Details]  [Snooze 30min]
```

**Smart Reminders:**
- "The deadline for 'Finalize Q1 roadmap' is tomorrow"
- "You haven't summarized your Monday standup yet"
- "Sarah mentioned needing the perf analysis by Friday"

**Proactive Insights:**
- "I noticed recurring themes about 'deployment delays' in your last 5 meetings"
- "3 action items have been pending for over 2 weeks"

### External Integrations (Phase 0.5+)

**Pull-based with intent:**
- "Import my last week's meetings from Calendar"
- "Scan my inbox for action items"
- "Pull my Asana tasks for this sprint"

**Smart prompting:**
- User enters Work Space
- System: "Would you like me to check your calendar and Asana for today's priorities?"
- User consents → data pulled → context updated → briefing generated

**Integration Architecture:**
```
Gmail ─────────────┐
  - Team emails    │
  - Action items   │
                   │
Asana/Jira ────────┼──────▶  Working Context
  - Assigned tasks │           - Action items
  - Deadlines      │           - Deadlines
                   │           - Patterns
Calendar ──────────┤
  - Meetings       │
  - Availability   │
                   │
Slack/Teams ───────┘
  - Key messages
  - Decisions
```

### Collaboration (Phase 0.7+)

Since enterprises provide team data:
- Multiple people contribute to same meeting summary
- Action items assigned across team members
- Decisions notify stakeholders
- Team dashboards showing collective context
- Shared templates for teams

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12-13 | Spaces as environments, not folders | Enables productivity OS vision |
| 2024-12-13 | Templates as invisible prompt engineering | Solves AI novice problem |
| 2024-12-13 | Activity-based onboarding (Spotify approach) | Enterprise has user data, ask about intent |
| 2024-12-13 | Work + Research spaces for POC | Core use cases, shows flexibility |
| 2024-12-13 | Embedded chat in spaces from day 1 | Space without chat feels incomplete |
| 2024-12-13 | User confirmation for AI extraction | Trust but verify, builds confidence |
| 2024-12-13 | Context-free chat outside spaces | Spaces are opt-in productivity environments |
| 2024-12-13 | JSONB metadata fields in schema | Extensibility without migrations |
| 2024-12-16 | Tasks as central hub, not just a feature | All assists feed into/from tasks; build lifecycle before more templates |
| 2024-12-16 | AI greeting on return (not static dashboard) | "Let me do your work for you" feel, chat-first |
| 2024-12-16 | Task colors with focus mode shift | Visual context change when switching tasks (rotating 8-color palette) |
| 2024-12-16 | Due dates: hard vs. soft, non-anxious display | Avoid guilt/overwhelm; AI triages intelligently |
| 2024-12-16 | WorkingPanel visible only during flow | Chat is primary; panel via header badge for CRUD |
| 2024-12-16 | Header badge for quick task access | `📋 N` badge with dropdown, 2-click CRUD |
| 2024-12-16 | Temporal awareness in 0.3e (not 0.3c) | Day detection, stale cleanup deferred; focus on core lifecycle first |
| 2024-12-16 | Meeting Summary deferred to 0.3d | Tasks must be solid before assists inject into them |

---

## Next Steps

**Phase 0.3c: Task Lifecycle Foundation (NEXT)**
1. **Database**: Create `tasks` table with full schema
2. **API**: Task CRUD endpoints (`/api/tasks`)
3. **Store**: Task state management in Svelte store
4. **Greeting**: AI message for returning users with tasks
5. **Header Badge**: `📋 N` with dropdown quick-view
6. **Focus Mode**: Header indicator, color shift, system prompt injection
7. **WorkingPanel**: CRUD mode, focus mode (extend existing)
8. **Due Dates**: Optional capture, subtle display
9. **Completion**: Basic flow with optional notes

**Then Phase 0.3d**: Meeting Summary + Guided Conversation (with task integration)

---

*This document is a living artifact. Update as decisions are made and learnings emerge.*
*Last updated: December 16, 2024*
