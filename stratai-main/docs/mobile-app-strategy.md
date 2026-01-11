# StratAI Mobile App Strategy

> **Document Purpose:** Product specification for StratAI's mobile companion app, focused on task capture and contextual AI access. This document defines scope, success criteria, and implementation approach.
>
> **Created:** January 2026
> **Status:** Strategic Planning
> **Approach:** Focused companion app, not full mobile port

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Rationale](#strategic-rationale)
3. [Scope Definition](#scope-definition)
4. [Target Users & Use Cases](#target-users--use-cases)
5. [Information Architecture](#information-architecture)
6. [Screen Specifications](#screen-specifications)
7. [User Flows](#user-flows)
8. [Platform Features](#platform-features)
9. [Technical Architecture](#technical-architecture)
10. [API Requirements](#api-requirements)
11. [Success Criteria](#success-criteria)
12. [Implementation Phases](#implementation-phases)
13. [Risks & Mitigations](#risks--mitigations)
14. [Open Questions](#open-questions)
15. [Decision Log](#decision-log)
16. [Appendix: Research Summary](#appendix-research-summary)

---

## Executive Summary

### The Product

**StratAI Capture** — A focused mobile companion app for task capture and contextual AI access.

This is explicitly NOT "StratAI Mobile" (a full port of the web experience). Instead, it's a purpose-built companion that excels at two things:

1. **Capture** — Quick task entry via text or voice, anywhere, anytime
2. **Context Check** — Fast Q&A with your curated AI context before meetings

### The Insight

Mobile and desktop serve different jobs:

| Platform | Primary Job | User State |
|----------|-------------|------------|
| **Desktop** | Deep work, planning, AI collaboration | Focused, seated, time available |
| **Mobile** | Capture ideas, quick reference | Moving, between meetings, time-constrained |

Trying to replicate the full desktop experience on mobile creates a compromised experience on both. Instead, we build each platform for its strengths.

### The Value Proposition

*"Quick capture. Instant context. Powered by your knowledge."*

- **Capture tasks and ideas anywhere** — Voice while driving, text while walking
- **Check your context before any meeting** — "What did we agree on with Johnson?"
- **Your AI, your knowledge, in your pocket** — All context curated on desktop, accessible on mobile

### Key Metrics (Success Criteria Summary)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Time to capture a task | < 10 seconds | Faster than opening Notes app |
| Context check response time | < 3 seconds to first token | Feels instant |
| Daily active users (of mobile) | 30%+ of web DAU | Companion adoption |
| Tasks captured on mobile | 40%+ of all tasks | Mobile is primary capture point |
| App Store rating | 4.5+ stars | Quality threshold |

---

## Strategic Rationale

### Why Mobile, Why Now

**Arguments FOR:**

1. **Task capture is inherently mobile** — Ideas come when you're away from your desk (shower, walk, meeting, bed at 2am)
2. **Context check is a mobile use case** — Prepping for a meeting happens in the hallway, not at your desk
3. **App Store presence = credibility signal** — "We have an app" matters for enterprise sales
4. **Competitive table stakes** — ChatGPT, Claude, Gemini all have mobile apps
5. **Ecosystem lock-in** — Tasks captured in StratAI stay in StratAI (vs. Apple Reminders)

**Arguments AGAINST (addressed by focused scope):**

| Concern | How Focused Scope Addresses It |
|---------|-------------------------------|
| Pre-revenue, expensive to maintain | Minimal surface area, 4-5 weeks vs 8-10 |
| Enterprise users work on desktop | App is companion, not replacement |
| Two platforms to support | Shared codebase via Capacitor |
| Apple's 15-30% cut | B2B via Custom Apps avoids IAP |
| App review delays | Utility app, not full AI chat (simpler review) |

### Why "Capture + Context" vs Full Mobile

| Full Mobile App | Capture + Context App |
|-----------------|----------------------|
| Chat interface with streaming | Quick Q&A only |
| Spaces/Areas navigation | Simple picker |
| Model selection | Default model |
| Arena | Not included |
| Document management | Not included |
| 8-10 weeks to build | 4-5 weeks to build |
| Complex App Store review | Simpler review (utility app) |
| High maintenance burden | Minimal maintenance |
| Unclear value prop | Crystal clear value prop |

### Competitive Positioning

| Competitor | Mobile Approach | StratAI Differentiation |
|------------|----------------|------------------------|
| ChatGPT | Full chat + voice + camera | We focus on YOUR context, not general AI |
| Claude | Full chat + artifacts | We integrate with task management |
| Todoist | Task capture, no AI | We have AI-powered context |
| Things 3 | Beautiful capture, no AI | We have AI-powered context |
| Notion | Everything app (complex) | We're focused and fast |

**Our niche:** The intersection of quick capture AND contextual AI that knows your work.

---

## Scope Definition

### Explicitly In Scope

| Feature | Description | Priority |
|---------|-------------|----------|
| Quick task capture | Text entry with Space/Area assignment | P0 |
| Voice capture | Speech-to-text for hands-free task entry | P0 |
| Space/Area picker | Select context for tasks and conversations | P0 |
| Context Check | Q&A within a Space/Area's curated context | P0 |
| Task list view | See and complete captured tasks | P1 |
| Home screen widgets | Quick capture from home screen | P1 |
| Siri Shortcuts | "Add task to StratAI..." | P1 |
| Push notifications | Task reminders (optional) | P2 |
| Due date picker | Optional due date on tasks | P2 |

### Explicitly Out of Scope (v1)

| Feature | Rationale | Future Consideration |
|---------|-----------|---------------------|
| Conversation browser | One thread per Area is enough for mobile | v2 if demand |
| Model selection | Default model; power users use desktop | v2 if demand |
| Task planning mode | Deep work belongs on desktop | Unlikely |
| Arena | Evaluation/learning belongs on desktop | Unlikely |
| Document upload/viewer | Add context on desktop | v2 if demand |
| New conversation creation | Continue existing thread naturally | Unnecessary |
| Complex task editing | Just title, Space/Area, due date | v2 if demand |
| Settings beyond basics | Account, default Space, notifications | Expand as needed |
| Offline AI responses | Requires on-device models | v3+ if market demands |

### The Discipline Test

Before adding any feature, ask:
1. Does this serve **capture** or **context check**?
2. Can this be done better on **desktop**?
3. Does this add **maintenance burden** disproportionate to value?

If the answer to #1 is "no" or #2/#3 is "yes," the feature doesn't belong in v1.

---

## Target Users & Use Cases

### Primary Personas

**1. The Mobile Capturer**
- Captures 5-10 tasks per day
- Ideas come during commute, walks, meetings
- Needs: Speed, voice input, minimal friction
- Quote: *"I just need to get this out of my head before I forget"*

**2. The Meeting Prepper**
- Has 4-6 meetings per day
- Needs context refresh before each meeting
- Checks context while walking between meetings
- Quote: *"What did we agree on last time? I have 2 minutes to remember"*

**3. The Task Reviewer**
- Checks task list in morning and evening
- Completes quick tasks during downtime
- Quote: *"What do I need to do today?"*

### Use Case Scenarios

#### Scenario 1: Driving Capture
```
Context: User is driving home, has an idea
Action: "Hey Siri, add task to StratAI: Follow up with Sarah about Q2 budget"
Result: Task created in default Space/Area, user never touched phone
Time: 5 seconds
```

#### Scenario 2: Pre-Meeting Context Check
```
Context: User walking to Johnson Industries meeting in 3 minutes
Action: Open app → Context → Client Projects → "What were the key decisions from our last meeting?"
Result: AI responds with summary from meeting notes
Time: 45 seconds
```

#### Scenario 3: Quick Task While Walking
```
Context: User walking to lunch, remembers something
Action: Open app (already on Capture) → Type "Review contract changes" → Add Task
Result: Task saved to last-used Space/Area
Time: 8 seconds
```

#### Scenario 4: Morning Task Review
```
Context: User commuting to work
Action: Open app → Tasks tab → Scan today's tasks
Result: Clear view of what needs to be done
Time: 20 seconds
```

#### Scenario 5: Voice Note in Meeting
```
Context: User in meeting, can't type
Action: Home screen widget → Voice → Whisper "Need to update pricing model"
Result: Task captured without disrupting meeting
Time: 5 seconds
```

---

## Information Architecture

### App Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         StratAI Capture                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │             │    │             │    │             │             │
│  │   CAPTURE   │    │   CONTEXT   │    │    TASKS    │             │
│  │   (Home)    │    │   (Areas)   │    │   (List)    │             │
│  │             │    │             │    │             │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│        │                  │                  │                      │
│        │                  │                  │                      │
│        ▼                  ▼                  ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ Text input  │    │ Space list  │    │ Task list   │             │
│  │ Voice input │    │ Area cards  │    │ Complete    │             │
│  │ Space/Area  │    │     │       │    │ Quick edit  │             │
│  │ Due date    │    │     ▼       │    │             │             │
│  │ Add button  │    │ ┌─────────┐ │    │             │             │
│  └─────────────┘    │ │ Context │ │    └─────────────┘             │
│                     │ │  Check  │ │                                 │
│                     │ │ (Chat)  │ │                                 │
│                     │ └─────────┘ │                                 │
│                     └─────────────┘                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Navigation Model

| Tab | Purpose | Entry Point |
|-----|---------|-------------|
| **Capture** | Quick task entry (home) | App opens here by default |
| **Context** | Space/Area list → Context Check | One tap to list, two taps to chat |
| **Tasks** | Task list with grouping | Review and complete tasks |

### Data Hierarchy

```
Spaces (from backend)
├── Work
│   ├── Areas
│   │   ├── Client Projects (context: 3 docs, 8 notes)
│   │   │   └── Conversation thread
│   │   ├── Q2 Planning (context: 2 docs, 15 notes)
│   │   │   └── Conversation thread
│   │   └── General
│   └── Tasks
│       ├── Review Q2 budget (due: today)
│       └── Call Sarah (due: this week)
└── Personal
    ├── Areas
    │   └── Home Renovation (context: 5 docs, 22 notes)
    │       └── Conversation thread
    └── Tasks
        └── Book contractor (no due date)
```

---

## Screen Specifications

### Screen 1: Capture (Home)

**Purpose:** Fast task entry with minimal friction

```
┌─────────────────────────────────────────┐
│  StratAI                           [●]  │ ← Profile avatar (settings)
├─────────────────────────────────────────┤
│                                         │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │  What needs to get done?        │   │ ← Placeholder text
│   │                                 │   │
│   │                                 │   │
│   │                                 │   │ ← Multi-line input, auto-focus
│   │                                 │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│         ┌──────────────────┐            │
│         │    🎤  Voice     │            │ ← Voice capture button
│         └──────────────────┘            │
│                                         │
│   ┌─────────────────┐ ┌──────────────┐  │
│   │ 💼 Work       ▼ │ │ 🎯 Clients ▼ │  │ ← Space/Area pickers
│   └─────────────────┘ └──────────────┘  │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  📅  No due date            ▼   │   │ ← Optional due date (collapsed)
│   └─────────────────────────────────┘   │
│                                         │
│         ┌──────────────────┐            │
│         │     Add Task     │            │ ← Primary CTA (prominent)
│         └──────────────────┘            │
│                                         │
├─────────────────────────────────────────┤
│   Capture    │    Context    │   Tasks  │ ← Bottom navigation
│      ●       │               │          │
└─────────────────────────────────────────┘
```

**Interaction Details:**

| Element | Behavior |
|---------|----------|
| Text input | Auto-focus on screen load, multi-line, large touch target |
| Voice button | Hold to record, release to transcribe, result populates input |
| Space picker | Dropdown/bottom sheet, remembers last selection |
| Area picker | Updates based on Space, remembers last selection |
| Due date | Collapsed by default, quick options (Today, Tomorrow, Next Week, Pick Date) |
| Add Task | Saves task, shows success toast, clears input, ready for next |
| Profile avatar | Opens settings (account, default Space, notifications) |

**States:**

| State | Appearance |
|-------|------------|
| Empty | Placeholder text visible, Add Task disabled |
| Has text | Add Task enabled (primary color) |
| Recording | Voice button pulsing, waveform animation |
| Saving | Add Task shows spinner |
| Success | Brief toast "Task added", input clears |
| Error | Toast with retry option |

---

### Screen 2: Context (Spaces & Areas)

**Purpose:** Navigate to Area for Context Check

```
┌─────────────────────────────────────────┐
│  Context                           [+]  │ ← Quick add task shortcut
├─────────────────────────────────────────┤
│                                         │
│  WORK                                   │ ← Space header (collapsible)
│  ┌─────────────────────────────────┐   │
│  │  🎯  Client Projects          → │   │
│  │  📄 3 docs • 📝 8 notes         │   │ ← Context indicators
│  │  "What were the key points..." │   │ ← Last message preview
│  │  2 hours ago                    │   │ ← Timestamp
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📊  Q2 Planning              → │   │
│  │  📄 2 docs • 📝 15 notes        │   │
│  │  "Summarize the budget..."      │   │
│  │  Yesterday                      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📁  General                  → │   │
│  │  📄 1 doc • 📝 3 notes          │   │
│  │  No recent conversation         │   │ ← Empty state
│  └─────────────────────────────────┘   │
│                                         │
│  PERSONAL                               │ ← Space header
│  ┌─────────────────────────────────┐   │
│  │  🏠  Home Renovation          → │   │
│  │  📄 5 docs • 📝 22 notes        │   │
│  │  "What's the contractor..."     │   │
│  │  3 days ago                     │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│   Capture    │    Context    │   Tasks  │
│              │       ●       │          │
└─────────────────────────────────────────┘
```

**Interaction Details:**

| Element | Behavior |
|---------|----------|
| Space header | Tap to collapse/expand, shows Area count |
| Area card | Tap to open Context Check for that Area |
| Context indicators | Shows doc count, note count (what AI knows) |
| Last message | Preview of most recent exchange |
| [+] button | Opens Capture screen with Space pre-selected |
| Arrow (→) | Visual affordance for navigation |

**Sorting:**
- Spaces: By recency of any Area activity
- Areas within Space: By recency of conversation activity

**Empty States:**

| Condition | Message |
|-----------|---------|
| No Spaces | "Set up your workspace on desktop first" |
| No Areas in Space | "Create Areas on desktop to organize your work" |
| Area has no context | Card shows "No documents or notes yet" |

---

### Screen 3: Context Check (Area Conversation)

**Purpose:** Q&A with AI using Area's curated context

```
┌─────────────────────────────────────────┐
│  ←  Client Projects               [⋮]  │ ← Back button, overflow menu
├─────────────────────────────────────────┤
│  📄 3 docs  •  📝 8 notes  •  ✅ 4 tasks │ ← Context summary bar
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  You                    2h ago  │   │
│   │  What were the key points from  │   │
│   │  the Johnson meeting last week? │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  AI                             │   │
│   │  Based on your meeting notes    │   │
│   │  from January 8th:              │   │
│   │                                 │   │
│   │  1. Budget approved at $45K     │   │
│   │  2. Timeline shifted to Q2      │   │
│   │  3. Sarah leading dev team      │   │
│   │  4. Follow-up scheduled Jan 22  │   │
│   │                                 │   │
│   │  The main concern raised was    │   │
│   │  resource availability during   │   │
│   │  the transition period...       │   │
│   └─────────────────────────────────┘   │
│                                         │
│            ┌─────────────┐              │
│            │ Load earlier│              │ ← Load more (subtle, optional)
│            └─────────────┘              │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  You                    1h ago  │   │
│   │  What's Sarah's contact info?   │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  AI                             │   │
│   │  Sarah Chen                     │   │
│   │  sarah.chen@johnson.co          │   │
│   │  +1 (555) 123-4567              │   │
│   └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │  Ask about Client Projects...   🎤 │ │ ← Input with voice
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Interaction Details:**

| Element | Behavior |
|---------|----------|
| Back button (←) | Returns to Context list |
| Context summary bar | Shows what AI has access to (docs, notes, tasks) |
| Message thread | Scrollable, most recent at bottom |
| Load earlier | Fetches older messages (not prominent) |
| Input field | Text entry with voice button |
| Voice button (🎤) | Hold to record question |
| Send (implicit) | Keyboard "Send" or tap input when has text |

**Streaming Response:**
- Typing indicator appears immediately
- Text streams in as received
- User can scroll while streaming
- No blocking UI during stream

**Overflow Menu (⋮):**
- "Open on Desktop" → Deep link to web app
- "Clear Conversation" → Resets thread (confirmation required)

**States:**

| State | Appearance |
|-------|------------|
| Loading Area | Skeleton UI |
| Empty conversation | "Ask anything about [Area Name]" prompt |
| Streaming response | Typing indicator → streaming text |
| Error | Inline error with retry button |
| Offline | "You're offline. Context check requires connection." |

---

### Screen 4: Tasks

**Purpose:** View and manage captured tasks

```
┌─────────────────────────────────────────┐
│  Tasks                             [+]  │ ← Quick add button
├─────────────────────────────────────────┤
│                                         │
│  TODAY                              (2) │ ← Section header with count
│  ┌─────────────────────────────────┐   │
│  │  ○  Review Q2 budget proposal   │   │ ← Checkbox + title
│  │     💼 Work → Q2 Planning       │   │ ← Breadcrumb
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  ○  Call Sarah re: timeline     │   │
│  │     💼 Work → Clients           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  THIS WEEK                          (2) │
│  ┌─────────────────────────────────┐   │
│  │  ○  Finalize pricing proposal   │   │
│  │     💼 Work → Clients           │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  ○  Book contractor site visit  │   │
│  │     🏠 Personal → Renovation    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  LATER                              (1) │
│  ┌─────────────────────────────────┐   │
│  │  ○  Quarterly review prep       │   │
│  │     💼 Work → Q2 Planning       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  CAPTURED                           (2) │ ← No due date
│  ┌─────────────────────────────────┐   │
│  │  ○  Research new CRM options    │   │
│  │     💼 Work → General           │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  ○  Look into solar panels      │   │
│  │     🏠 Personal → Renovation    │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│   Capture    │    Context    │   Tasks  │
│              │               │     ●    │
└─────────────────────────────────────────┘
```

**Interaction Details:**

| Element | Behavior |
|---------|----------|
| Checkbox (○) | Tap to complete (with animation), task moves to completed |
| Task row | Tap to open edit sheet |
| Breadcrumb | Shows Space → Area, uses Space color |
| [+] button | Opens Capture tab |
| Swipe left | Delete task (with confirmation) |
| Pull down | Refresh from server |

**Sections:**
| Section | Criteria |
|---------|----------|
| Today | Due date = today |
| This Week | Due date = this week (not today) |
| Later | Due date > this week |
| Captured | No due date |
| Completed | Hidden by default, toggle to show |

**Edit Sheet (on tap):**
```
┌─────────────────────────────────────────┐
│  Edit Task                         [✓]  │
├─────────────────────────────────────────┤
│                                         │
│  Title                                  │
│  ┌─────────────────────────────────┐   │
│  │ Review Q2 budget proposal       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Space                                  │
│  ┌─────────────────────────────────┐   │
│  │ 💼 Work                       ▼ │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Area                                   │
│  ┌─────────────────────────────────┐   │
│  │ 📊 Q2 Planning                ▼ │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Due Date                               │
│  ┌─────────────────────────────────┐   │
│  │ 📅 Today                      ▼ │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Delete Task             │   │ ← Destructive action
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

### Screen 5: Settings

**Purpose:** Account and app configuration

```
┌─────────────────────────────────────────┐
│  ←  Settings                            │
├─────────────────────────────────────────┤
│                                         │
│  ACCOUNT                                │
│  ┌─────────────────────────────────┐   │
│  │  👤  John Smith                 │   │
│  │      john@company.com           │   │
│  │      Company Inc.               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Sign Out                     → │   │
│  └─────────────────────────────────┘   │
│                                         │
│  DEFAULTS                               │
│  ┌─────────────────────────────────┐   │
│  │  Default Space                  │   │
│  │  💼 Work                      → │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Default Area                   │   │
│  │  📁 General                   → │   │
│  └─────────────────────────────────┘   │
│                                         │
│  NOTIFICATIONS                          │
│  ┌─────────────────────────────────┐   │
│  │  Task Reminders           [ON]  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ABOUT                                  │
│  ┌─────────────────────────────────┐   │
│  │  Version 1.0.0                  │   │
│  │  Open Source Licenses         → │   │
│  │  Privacy Policy               → │   │
│  │  Terms of Service             → │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## User Flows

### Flow 1: First Launch / Onboarding

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│   Welcome    │ ──▶ │    Login     │ ──▶ │   Capture    │
│   Screen     │     │   (Email +   │     │   (Home)     │
│              │     │   Password)  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Default    │
                     │   Space/Area │
                     │   Selection  │
                     └──────────────┘
```

**Welcome Screen Content:**
- App logo
- "Quick capture. Instant context."
- "Capture tasks anywhere. Access your AI context anytime."
- [Get Started] button

**Login:**
- Email + Password fields
- [Sign In] button
- "Don't have an account? Sign up on desktop"
- Biometric option after first login (Face ID / Touch ID)

**Default Selection:**
- "Choose your default workspace for quick capture"
- Space dropdown → Area dropdown
- [Start Capturing] button

---

### Flow 2: Quick Task Capture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│  Open App    │ ──▶ │  Type Task   │ ──▶ │  Add Task    │
│  (Capture)   │     │  (keyboard   │     │  (tap)       │
│              │     │   auto-up)   │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Success    │
                                          │   Toast      │
                                          │   (clear)    │
                                          └──────────────┘
```

**Time Target:** < 10 seconds from app open to task saved

---

### Flow 3: Voice Capture (In-App)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│  Open App    │ ──▶ │  Tap Voice   │ ──▶ │   Speak      │
│  (Capture)   │     │  Button      │     │   (record)   │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐     ┌──────────────┐
                                          │  Transcribe  │ ──▶ │  Add Task    │
                                          │  (auto)      │     │  (tap)       │
                                          └──────────────┘     └──────────────┘
```

**Time Target:** < 15 seconds from app open to task saved

---

### Flow 4: Voice Capture (Siri)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│  "Hey Siri,  │ ──▶ │   Siri       │ ──▶ │   Task       │
│   Add task   │     │   confirms   │     │   created    │
│   to StratAI │     │   creation   │     │   (default   │
│   ..."       │     │              │     │   Space)     │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Time Target:** < 5 seconds, hands-free

---

### Flow 5: Context Check

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│  Context     │ ──▶ │  Tap Area    │ ──▶ │  Ask         │
│  Tab         │     │  Card        │     │  Question    │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐     ┌──────────────┐
                                          │  AI Streams  │ ──▶ │  Continue    │
                                          │  Response    │     │  or Back     │
                                          └──────────────┘     └──────────────┘
```

**Time Target:** < 3 seconds from question to first token

---

### Flow 6: Task Completion

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│  Tasks       │ ──▶ │  Tap         │ ──▶ │  Animation   │
│  Tab         │     │  Checkbox    │     │  + Remove    │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Interaction:** Single tap, satisfying animation, task fades out

---

## Platform Features

### iOS Widgets

**Small Widget (2x2) — Quick Capture**
```
┌─────────────────────┐
│  StratAI            │
│                     │
│      [ + ]          │ ← Tap opens app to Capture
│                     │
│    Add Task         │
└─────────────────────┘
```

**Medium Widget (4x2) — Multi-Action**
```
┌─────────────────────────────────────────┐
│  StratAI                                │
│                                         │
│   [ + Task ]    [ 🎤 Voice ]    [ 💬 ]  │
│                                         │
│    Add Task       Voice       Context   │
└─────────────────────────────────────────┘
```

**Large Widget (4x4) — Tasks + Actions**
```
┌─────────────────────────────────────────┐
│  StratAI                     [ + Task ] │
├─────────────────────────────────────────┤
│  TODAY                                  │
│  ○  Review Q2 budget proposal           │
│  ○  Call Sarah re: timeline             │
│                                         │
│  CAPTURED                               │
│  ○  Research new CRM options            │
│  ○  Look into solar panels              │
├─────────────────────────────────────────┤
│   [ 🎤 Voice ]           [ 💬 Context ] │
└─────────────────────────────────────────┘
```

**Lock Screen Widget (iOS 16+)**
- Quick capture button
- Voice capture button

---

### Siri Shortcuts / App Intents

| Shortcut | Invocation | Action |
|----------|------------|--------|
| Add Task | "Add task to StratAI: [text]" | Creates task in default Space/Area |
| Ask Context | "Ask StratAI about [Area]" | Opens Context Check for Area |
| Today's Tasks | "What's on my StratAI today?" | Reads today's tasks aloud |
| Quick Capture | "Capture in StratAI" | Opens app to Capture screen |

**Shortcut Parameters:**
- Task text (required for Add Task)
- Area name (optional, for Ask Context)
- Space override (optional)

---

### Push Notifications

| Notification Type | Trigger | Content |
|-------------------|---------|---------|
| Task Reminder | Due date/time reached | "📋 [Task Title] is due" |
| Shared Context Update | Team member updates shared Area | "📄 [Person] updated [Area]" (future) |

**Notification Settings:**
- Task Reminders: On/Off
- Quiet Hours: Configurable
- Sound: System default or silent

---

### Android-Specific Features

**Home Screen Widgets:**
- Same three sizes as iOS
- Material You theming support

**Quick Settings Tile:**
- Single tap opens Capture
- Long press opens Context

**Share Sheet Integration:**
- "Send to StratAI" appears in share menu
- Selected text becomes task title

**App Shortcuts (long-press icon):**
- New Task
- Voice Capture
- Context Check

---

## Technical Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                         StratAI Capture                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Capacitor Shell                             │  │
│  │                    (iOS / Android)                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                │                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 SvelteKit SPA (adapter-static)                 │  │
│  │  ├── /capture         (home - task entry)                     │  │
│  │  ├── /context         (spaces/areas list)                     │  │
│  │  ├── /context/[spaceId]/[areaId]  (context check)             │  │
│  │  ├── /tasks           (task list)                             │  │
│  │  ├── /settings        (account, defaults)                     │  │
│  │  └── /login           (authentication)                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                │                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Capacitor Plugins                           │  │
│  │  ├── @capacitor/keyboard        (keyboard handling)           │  │
│  │  ├── @capacitor/push-notifications  (push)                    │  │
│  │  ├── @capacitor/haptics         (tactile feedback)            │  │
│  │  ├── @capacitor/app             (deep links, lifecycle)       │  │
│  │  ├── @capacitor/preferences     (local storage)               │  │
│  │  ├── @capacitor/speech          (voice input)                 │  │
│  │  └── @capacitor/status-bar      (styling)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                │                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Native Layer                                │  │
│  │  iOS:                                                          │  │
│  │  ├── WidgetKit (home screen widgets)                          │  │
│  │  ├── App Intents (Siri Shortcuts)                             │  │
│  │  └── Keychain (secure token storage)                          │  │
│  │                                                                │  │
│  │  Android:                                                      │  │
│  │  ├── App Widgets (home screen)                                │  │
│  │  ├── Shortcuts (quick actions)                                │  │
│  │  └── Keystore (secure token storage)                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    StratAI Backend (existing)                        │
├─────────────────────────────────────────────────────────────────────┤
│  Authentication:                                                     │
│  ├── POST /api/auth/login      (new - JSON login)                   │
│  ├── POST /api/auth/refresh    (new - token refresh)                │
│  └── POST /api/auth/logout     (new - token invalidation)           │
│                                                                      │
│  Tasks:                                                              │
│  ├── GET  /api/tasks           (list with filters)                  │
│  ├── POST /api/tasks           (create task)                        │
│  ├── GET  /api/tasks/[id]      (get task)                           │
│  ├── PATCH /api/tasks/[id]     (update task)                        │
│  ├── DELETE /api/tasks/[id]    (delete task)                        │
│  └── POST /api/tasks/[id]/complete  (mark complete)                 │
│                                                                      │
│  Spaces & Areas:                                                     │
│  ├── GET  /api/spaces          (list user's spaces)                 │
│  └── GET  /api/areas           (list areas with filters)            │
│                                                                      │
│  Context & Chat:                                                     │
│  ├── POST /api/chat            (SSE streaming)                      │
│  ├── GET  /api/conversations   (list conversations)                 │
│  └── GET  /api/conversations/[id]  (get conversation)               │
│                                                                      │
│  Utility:                                                            │
│  └── GET  /api/health          (new - connection test)              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Build Configuration

**Two Build Targets (same codebase):**

| Build | Adapter | Output | Purpose |
|-------|---------|--------|---------|
| Web | `@sveltejs/adapter-node` | Server-rendered app | Desktop/web users |
| Mobile | `@sveltejs/adapter-static` | Static SPA | Capacitor wrapper |

**Environment Detection:**
```typescript
// $lib/utils/platform.ts
export const isMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};
```

### Authentication Flow (Mobile)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Login Flow                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User enters credentials                                          │
│                     │                                                │
│                     ▼                                                │
│  2. POST /api/auth/login { email, password }                         │
│                     │                                                │
│                     ▼                                                │
│  3. Server validates, returns { token, refreshToken, user }          │
│                     │                                                │
│                     ▼                                                │
│  4. Store tokens in Keychain (iOS) / Keystore (Android)              │
│                     │                                                │
│                     ▼                                                │
│  5. All subsequent requests include: Authorization: Bearer <token>   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                         Token Refresh                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. API returns 401 (token expired)                                  │
│                     │                                                │
│                     ▼                                                │
│  2. POST /api/auth/refresh { refreshToken }                          │
│                     │                                                │
│                     ▼                                                │
│  3. Server returns new { token, refreshToken }                       │
│                     │                                                │
│                     ▼                                                │
│  4. Update stored tokens, retry original request                     │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                      Biometric Unlock                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. App launches, tokens exist in secure storage                     │
│                     │                                                │
│                     ▼                                                │
│  2. Prompt for Face ID / Touch ID                                    │
│                     │                                                │
│                     ▼                                                │
│  3. Success → unlock tokens → normal operation                       │
│     Failure → show login screen                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### SSE Streaming (Mobile)

```typescript
// Mobile SSE handling
async function streamChat(areaId: string, message: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      areaId,
      message,
      stream: true
    })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        handleStreamEvent(data);
      }
    }
  }
}
```

### Offline Handling

| Feature | Offline Behavior |
|---------|------------------|
| Task Capture | Queue locally, sync when online |
| Context Check | Show offline message, disable input |
| Task List | Show cached list, indicate stale |
| Task Completion | Queue locally, sync when online |

**Sync Queue:**
```typescript
interface QueuedAction {
  id: string;
  type: 'create_task' | 'complete_task' | 'update_task';
  payload: object;
  timestamp: number;
  retries: number;
}
```

---

## API Requirements

### New Endpoints Needed

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/auth/login` | POST | Mobile login | `{ email, password }` | `{ token, refreshToken, user }` |
| `/api/auth/refresh` | POST | Token refresh | `{ refreshToken }` | `{ token, refreshToken }` |
| `/api/auth/logout` | POST | Invalidate tokens | `{ refreshToken }` | `{ success: true }` |
| `/api/health` | GET | Connection test | — | `{ status: 'ok', timestamp }` |

### Existing Endpoints (Mobile-Ready)

| Endpoint | Method | Mobile Usage |
|----------|--------|--------------|
| `/api/tasks` | GET | List tasks (with filters) |
| `/api/tasks` | POST | Create task |
| `/api/tasks/[id]` | PATCH | Update task |
| `/api/tasks/[id]` | DELETE | Delete task |
| `/api/tasks/[id]/complete` | POST | Mark complete |
| `/api/spaces` | GET | List spaces |
| `/api/areas` | GET | List areas |
| `/api/chat` | POST | Context check (SSE) |
| `/api/conversations` | GET | Get conversation for Area |

### Backend Changes Required

| Change | File | Effort |
|--------|------|--------|
| Add `/api/auth/login` | `src/routes/api/auth/login/+server.ts` | 2 hours |
| Add `/api/auth/refresh` | `src/routes/api/auth/refresh/+server.ts` | 1 hour |
| Add `/api/auth/logout` | `src/routes/api/auth/logout/+server.ts` | 30 min |
| Add `/api/health` | `src/routes/api/health/+server.ts` | 30 min |
| Accept Bearer tokens | `src/hooks.server.ts` | 2 hours |
| Token generation utils | `src/lib/server/auth.ts` | 1 hour |

**Total Backend Effort:** ~7 hours

---

## Success Criteria

### Launch Criteria (Must Have for v1.0)

| Criteria | Measurement | Target |
|----------|-------------|--------|
| Core capture works | User can create task | 100% success rate |
| Voice capture works | Speech-to-text completes | < 3 second transcription |
| Context check works | AI responds with context | < 3 seconds to first token |
| Task sync works | Tasks appear on desktop | < 5 second sync |
| Auth works | Login succeeds | 100% success rate |
| No crashes | Crash-free sessions | > 99.5% |
| App Store approval | Apple approves | Approved without major changes |

### Success Metrics (Post-Launch)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Adoption** |||
| Download to signup conversion | > 50% | App analytics |
| Mobile DAU / Web DAU | > 30% | Analytics |
| Weekly active users (WAU) | > 60% of downloaders | Analytics |
| **Engagement** |||
| Tasks captured on mobile | > 40% of all tasks | Backend analytics |
| Context checks per user per day | > 2 | Backend analytics |
| Session duration | 1-3 minutes (focused) | Analytics |
| Sessions per day | > 3 | Analytics |
| **Quality** |||
| App Store rating | > 4.5 stars | App Store |
| Crash-free sessions | > 99.9% | Crashlytics |
| Time to capture task | < 10 seconds | User testing |
| Time to first token | < 3 seconds | Performance monitoring |
| **Retention** |||
| Day 1 retention | > 60% | Analytics |
| Day 7 retention | > 40% | Analytics |
| Day 30 retention | > 25% | Analytics |

### Quality Gates

| Gate | Criteria | Action if Failed |
|------|----------|------------------|
| Alpha | Core flows work, no critical bugs | Fix before beta |
| Beta (TestFlight) | All features work, < 5 minor bugs | Fix before release |
| Release Candidate | All bugs fixed, performance targets met | Fix before submission |
| App Store Submission | All launch criteria met | Fix and resubmit |

---

## Implementation Phases

### Phase 0: Backend Prep
**Duration:** 1-2 days

| Task | Effort | Owner |
|------|--------|-------|
| Add `/api/auth/login` endpoint | 2 hours | Backend |
| Add `/api/auth/refresh` endpoint | 1 hour | Backend |
| Add `/api/auth/logout` endpoint | 30 min | Backend |
| Modify `hooks.server.ts` for Bearer tokens | 2 hours | Backend |
| Add `/api/health` endpoint | 30 min | Backend |
| Test with Postman/curl | 1 hour | Backend |

**Deliverable:** Mobile-ready authentication

---

### Phase 1: Project Setup & Core Navigation
**Duration:** 3-4 days

| Task | Effort | Owner |
|------|--------|-------|
| Initialize Capacitor in project | 2 hours | Mobile |
| Configure `adapter-static` build | 2 hours | Mobile |
| Set up iOS project in Xcode | 2 hours | Mobile |
| Implement bottom navigation | 4 hours | Mobile |
| Create basic screen shells | 4 hours | Mobile |
| Implement auth flow (login screen) | 6 hours | Mobile |
| Secure token storage (Keychain) | 4 hours | Mobile |
| API client with auth headers | 4 hours | Mobile |

**Deliverable:** App navigates, authenticates, makes API calls

---

### Phase 2: Capture Screen
**Duration:** 4-5 days

| Task | Effort | Owner |
|------|--------|-------|
| Capture screen UI | 4 hours | Mobile |
| Space/Area picker components | 6 hours | Mobile |
| Keyboard handling | 4 hours | Mobile |
| Task creation API integration | 4 hours | Mobile |
| Success/error states | 3 hours | Mobile |
| Voice capture integration | 8 hours | Mobile |
| Offline queue for capture | 6 hours | Mobile |

**Deliverable:** Full task capture with text and voice

---

### Phase 3: Context Screen
**Duration:** 5-6 days

| Task | Effort | Owner |
|------|--------|-------|
| Context list UI (Spaces/Areas) | 6 hours | Mobile |
| Area cards with context indicators | 4 hours | Mobile |
| Context Check screen UI | 6 hours | Mobile |
| SSE streaming implementation | 8 hours | Mobile |
| Message display with streaming | 6 hours | Mobile |
| Voice input for questions | 4 hours | Mobile |
| Error handling and retry | 4 hours | Mobile |

**Deliverable:** Full Context Check with streaming

---

### Phase 4: Tasks Screen
**Duration:** 3-4 days

| Task | Effort | Owner |
|------|--------|-------|
| Tasks list UI with sections | 6 hours | Mobile |
| Task completion (checkbox) | 4 hours | Mobile |
| Task edit sheet | 6 hours | Mobile |
| Pull-to-refresh | 2 hours | Mobile |
| Swipe to delete | 3 hours | Mobile |
| Animations and polish | 4 hours | Mobile |

**Deliverable:** Full task list with CRUD

---

### Phase 5: Widgets & Shortcuts (iOS)
**Duration:** 4-5 days

| Task | Effort | Owner |
|------|--------|-------|
| WidgetKit setup | 4 hours | iOS Native |
| Small widget (quick capture) | 6 hours | iOS Native |
| Medium widget (multi-action) | 6 hours | iOS Native |
| Large widget (tasks + actions) | 8 hours | iOS Native |
| App Intents setup | 4 hours | iOS Native |
| "Add Task" Siri Shortcut | 4 hours | iOS Native |
| "Ask Context" Siri Shortcut | 4 hours | iOS Native |

**Deliverable:** Home screen widgets and Siri integration

---

### Phase 6: Polish & Testing
**Duration:** 4-5 days

| Task | Effort | Owner |
|------|--------|-------|
| Performance optimization | 8 hours | Mobile |
| Memory leak detection | 4 hours | Mobile |
| Crash reporting setup (Crashlytics) | 2 hours | Mobile |
| Analytics integration | 4 hours | Mobile |
| Accessibility audit | 6 hours | Mobile |
| Dark mode support | 4 hours | Mobile |
| Device testing (various iPhones) | 8 hours | QA |
| Bug fixes | 16 hours | Mobile |

**Deliverable:** Production-ready iOS app

---

### Phase 7: App Store Submission
**Duration:** 3-4 days

| Task | Effort | Owner |
|------|--------|-------|
| App Store assets (screenshots, preview) | 8 hours | Design |
| App Store description | 4 hours | Product |
| Privacy policy updates | 4 hours | Legal |
| AI disclosure implementation | 4 hours | Mobile |
| Age rating questionnaire | 2 hours | Product |
| TestFlight beta | 2 hours | Mobile |
| Beta testing (internal) | 16 hours | Team |
| App Store submission | 2 hours | Mobile |
| Review response (if needed) | Variable | Mobile |

**Deliverable:** App approved in App Store

---

### Phase 8: Android Port
**Duration:** 1-2 weeks (after iOS)

| Task | Effort | Owner |
|------|--------|-------|
| Android project setup | 4 hours | Mobile |
| Platform-specific fixes | 16 hours | Mobile |
| Android widgets | 12 hours | Android Native |
| Android shortcuts | 8 hours | Android Native |
| Device testing (various Androids) | 12 hours | QA |
| Google Play submission | 4 hours | Mobile |

**Deliverable:** App in Google Play Store

---

### Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Backend Prep | 1-2 days | 1-2 days |
| Phase 1: Setup & Navigation | 3-4 days | 4-6 days |
| Phase 2: Capture | 4-5 days | 8-11 days |
| Phase 3: Context | 5-6 days | 13-17 days |
| Phase 4: Tasks | 3-4 days | 16-21 days |
| Phase 5: Widgets (iOS) | 4-5 days | 20-26 days |
| Phase 6: Polish | 4-5 days | 24-31 days |
| Phase 7: App Store | 3-4 days | 27-35 days |
| **Total iOS** | **~5-6 weeks** ||
| Phase 8: Android | 1-2 weeks | 6-8 weeks total |

---

## Risks & Mitigations

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SSE streaming issues on mobile | High | Medium | Test early, have polling fallback |
| Capacitor plugin limitations | Medium | Low | Evaluate plugins in Phase 1 |
| Voice recognition accuracy | Medium | Low | Use platform APIs (iOS Speech) |
| Offline sync conflicts | Medium | Medium | Simple "last write wins" for v1 |
| Performance on older devices | Medium | Medium | Set minimum iOS 15 / Android 10 |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| App Store rejection | High | Medium | Follow guidelines strictly, AI disclosure |
| Low adoption | High | Medium | Tight scope, clear value prop |
| Feature creep | Medium | High | Stick to scope document, say no |
| Maintenance burden | Medium | Medium | Minimal surface area, shared code |

### Timeline Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| iOS widget complexity | Medium | Medium | Spike early, simplify if needed |
| App Store review delays | Medium | Medium | Submit with buffer time |
| Backend changes cascade | Low | Low | Keep changes minimal |

---

## Open Questions

### Product Questions

| Question | Options | Recommendation | Decision |
|----------|---------|----------------|----------|
| Default Space/Area on fresh install? | Ask user / Use first / Most recent | Ask during onboarding | TBD |
| Show completed tasks? | Hide / Show toggle / Separate tab | Hide with toggle in Settings | TBD |
| Task due date picker | Quick options / Full calendar / Both | Quick options (Today, Tomorrow, Next Week, Pick) | TBD |
| Biometric after every open? | Yes / Only after X minutes / Never | Only after 15 minutes idle | TBD |

### Technical Questions

| Question | Options | Recommendation | Decision |
|----------|---------|----------------|----------|
| State management | Svelte stores / Capacitor Preferences / Hybrid | Svelte stores + sync to Preferences | TBD |
| Offline storage | Capacitor Preferences / SQLite / IndexedDB | Capacitor Preferences (simple) | TBD |
| Push notification service | FCM only / APNs + FCM | FCM as unified layer | TBD |
| Analytics | Mixpanel / Amplitude / PostHog / Firebase | Firebase (free tier) | TBD |

### Design Questions

| Question | Options | Recommendation | Decision |
|----------|---------|----------------|----------|
| App icon | New design / Adapt web logo | New design (recognizable at small size) | TBD |
| Color theming | Follow system / App setting / Always dark | Follow system | TBD |
| Haptic feedback | Minimal / Liberal | Minimal (capture success, complete) | TBD |

---

## Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-01-11 | Focus on "Capture + Context" not full mobile | Faster to ship, clearer value prop, lower maintenance | Full mobile port |
| 2026-01-11 | Use Capacitor not React Native | Reuse existing SvelteKit codebase, 90%+ code sharing | React Native, Flutter, PWA |
| 2026-01-11 | iOS first, then Android | iOS users pay more, App Store presence matters for enterprise | Android first, simultaneous |
| 2026-01-11 | One conversation per Area | Simpler UX, matches mobile use case | Multiple conversations, conversation browser |
| 2026-01-11 | Context Check not Chat | Sets right expectations, avoids feature creep | Full chat experience |
| 2026-01-11 | SSE for streaming | Already implemented in backend, industry standard | WebSocket |
| 2026-01-11 | Bearer tokens for mobile auth | Standard pattern, works with Keychain | Cookie-based (problematic on mobile) |

---

## Appendix: Research Summary

### Mobile Development Approaches (January 2026)

| Approach | Maturity | Svelte 5 Support | Best For |
|----------|----------|------------------|----------|
| Capacitor | Production | Yes | Mobile-first from web codebase |
| Tauri Mobile | Mostly | Yes | Desktop-first with mobile |
| PWA | Yes | Yes | Simple apps, no App Store |
| Svelte Native | No | No | Wait for Svelte 5 support |
| React Native | Yes | N/A | Separate mobile codebase |

**Recommendation:** Capacitor for production mobile from SvelteKit.

### iOS App Store Requirements (January 2026)

**Key Requirements:**
1. **Guideline 5.1.2(i)** — Must disclose third-party AI providers explicitly
2. **Content moderation** — Filtering, reporting, blocking mechanisms
3. **Age rating** — Complete questionnaire by January 31, 2026
4. **External payments** — Allowed in US with single link (post-Epic ruling)

**AI App Specifics:**
- Consent modal before sending data to external AI
- Name providers in privacy policy
- Prepare for stress-testing by reviewers

### Competitor Analysis (January 2026)

| App | Strengths | Weaknesses | StratAI Opportunity |
|-----|-----------|------------|---------------------|
| ChatGPT | Voice mode, ecosystem | No task integration | Task + AI context |
| Claude | Clean design, artifacts | Limited mobile features | Focused capture |
| Todoist | Great capture, widgets | No AI | AI-powered context |
| Things 3 | Beautiful UX | No AI, no sync | AI + sync + context |

**StratAI's Niche:** Quick capture + contextual AI that knows your work.

### Backend Readiness

**Current State:** ~85% mobile-ready

**Blocking Issues (4-6 hours to fix):**
1. No mobile login endpoint
2. No Bearer token support
3. No token refresh mechanism

**Already Ready:**
- All task CRUD endpoints
- Spaces/Areas endpoints
- Chat endpoint with SSE streaming
- Stateless, horizontally scalable

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | StratAI Team | Initial specification |
