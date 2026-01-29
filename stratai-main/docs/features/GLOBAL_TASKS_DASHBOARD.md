# Global Tasks Dashboard

> **Your Day at a Glance: Tasks + Calendar + Intelligence**

The Global Tasks Dashboard is a cross-space, calendar-aware command center that answers the question every professional asks every morning: **"What do I need to do today, and do I have time to do it?"**

**Key Insight:** No tool today combines tasks AND calendar AND intelligence. Task apps don't know your calendar. Calendar apps don't know your deadlines. StratAI sees both — and reasons about the collision.

**Strategic Position:** This is the **entry point to the productivity flywheel**. Every interaction (completing tasks, capturing meeting decisions, triaging overdue work) enriches the context that makes StratAI smarter.

---

## Table of Contents

1. [Vision & Problem Statement](#1-vision--problem-statement)
2. [User Stories](#2-user-stories)
3. [Scope & Boundaries](#3-scope--boundaries)
4. [Information Architecture](#4-information-architecture)
5. [Wireframes](#5-wireframes)
6. [Hero Card Intelligence](#6-hero-card-intelligence)
7. [Calendar Integration](#7-calendar-integration)
8. [High-Volume User UX](#8-high-volume-user-ux)
9. [Data Model & API](#9-data-model--api)
10. [Component Architecture](#10-component-architecture)
11. [Navigation Changes](#11-navigation-changes)
12. [Implementation Phases](#12-implementation-phases)
13. [Acceptance Criteria](#13-acceptance-criteria)
14. [Design Decisions](#14-design-decisions)

---

## 1. Vision & Problem Statement

### The Problem

Today, StratAI users see tasks **scoped to a single space**:

```
/spaces/stratai/tasks     → Only StratAI tasks
/spaces/personal/tasks    → Only Personal tasks
```

This forces users to mentally aggregate work across spaces. A user with 5 spaces must visit 5 dashboards to answer "What should I do today?"

### The Solution

A global `/tasks` route that unifies all tasks across all spaces, interleaves calendar events, and uses temporal intelligence to surface what matters.

```
/tasks                    → Everything, organized by time
/tasks?space=stratai      → Filtered to one space (from "View all" link)
```

### The Moat: Capacity Analysis

The killer feature isn't the task list — it's the **intelligence layer** that analyzes your calendar against your deadlines:

> "You have 5 meetings today (4.5h). Your hard deadline 'Budget Review' is due tomorrow. You have ~2.5h of free time today. Tomorrow afternoon has 3h free — your best window this week."

No existing tool provides this analysis.

---

## 2. User Stories

### Core Stories

| # | As a... | I want to... | So that... |
|---|---------|-------------|------------|
| 1 | User | See all my tasks across all spaces in one view | I don't have to visit each space separately |
| 2 | User | See today's calendar events interleaved with tasks | I understand my full day at a glance |
| 3 | User | Get alerted when meetings conflict with deadlines | I can proactively reschedule or reprioritize |
| 4 | User | Filter by space/area/priority/status | I can focus on what matters right now |
| 5 | User | Create tasks from the global view with space assignment | I don't have to navigate away to add work |
| 6 | User | Click "View all" from a Space dashboard | I get the global view pre-filtered to that space |

### Power User Stories

| # | As a... | I want to... | So that... |
|---|---------|-------------|------------|
| 7 | Busy user (30+ meetings/week) | See a compact, scannable view that doesn't overwhelm | I can quickly find what needs attention |
| 8 | Multi-space user | Visually distinguish which space each task belongs to | I maintain context across workstreams |
| 9 | Manager | See the week overview with capacity analysis | I can plan my week realistically |
| 10 | User with overdue tasks | Get proactive triage suggestions | Nothing falls through the cracks |

---

## 3. Scope & Boundaries

### In Scope (V1)

- [x] Global `/tasks` route as top-level navigation
- [x] Cross-space task aggregation with space/area badges
- [x] Calendar event interleaving (live fetch, work week range)
- [x] Hero card with temporal intelligence and capacity analysis
- [x] View toggle: All / Tasks only / Calendar only
- [x] Filters: Space, Status, Priority
- [x] Task creation with space/area selector
- [x] "View all" from Space dashboard routes to `/tasks?space=X`
- [x] Stats row (completed today, streak, active, attention)
- [x] Recently completed section (cross-space)

### Out of Scope (Future)

- Calendar event creation from dashboard (use chat for this)
- Task assignment to others from global view (see TASK_ASSIGNMENT.md)
- Recurring task support
- Calendar persistence/sync (events fetched live)
- Week/month calendar view (this is a task dashboard, not a calendar app)
- Drag-and-drop task reordering
- Kanban/board view

### Dependencies

- **Calendar Integration** (CALENDAR_INTEGRATION.md) — User must have connected calendar for event interleaving
- **Task system** — Existing task CRUD, subtasks, planning mode

---

## 4. Information Architecture

### Task View Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL (/tasks)                                            │
│  "What do I need to do?" — All spaces, time-organized       │
│  Primary command center. Calendar-aware.                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SPACE (/spaces/[space]/tasks)                       │   │
│  │  "What's happening in this project?" — One space     │   │
│  │  Project manager view. Space-scoped.                 │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  AREA (inline in Area chat sidebar)            │  │   │
│  │  │  "Context while working" — One area            │  │   │
│  │  │  Reference, not a dashboard.                   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### URL Structure

| URL | View | Source |
|-----|------|--------|
| `/tasks` | All tasks, all spaces, with calendar | Nav icon click |
| `/tasks?space=stratai` | Filtered to StratAI space | "View all" from Space dashboard |
| `/tasks?space=stratai&area=product-dev` | Filtered to specific area | Deep link |
| `/spaces/[space]/tasks` | Space-scoped dashboard (unchanged) | Existing route |

### Information Density Layers

The dashboard uses **progressive disclosure** to manage cognitive load:

```
Layer 1: Hero Card        → "What needs my attention RIGHT NOW?"
Layer 2: Stats Row        → "How am I doing overall?"
Layer 3: Needs Attention  → "What's overdue or stale?" (always expanded)
Layer 4: Today            → "What's happening today?" (always expanded)
Layer 5: This Week        → "What's coming up?" (expanded if ≤ 8 items)
Layer 6: Later            → "What's on the horizon?" (collapsed by default)
Layer 7: Anytime          → "No deadline" (collapsed by default)
Layer 8: Completed        → "What did I finish?" (collapsed by default)
```

---

## 5. Wireframes

### 5.1 Standard View (Moderate Load)

A user with ~12 active tasks across 3 spaces, 4 meetings today:

```
┌─────────────────────────────────────────────────────────────────┐
│ [StratAI] [●StraTech] [●Personal] ... [⊞] [☑] [💬] [⚔Arena]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│            Tasks                                    + Add Task  │
│                                                                 │
│  ┌─ HERO CARD ─────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Good morning — 4 meetings and 3 tasks due today            ││
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────┐    ││
│  │  │  🔴 Quarterly budget review           Due today (hard)│    ││
│  │  │      StratAI · Product Development                   │    ││
│  │  └─────────────────────────────────────────────────────┘    ││
│  │                                                              ││
│  │  [Focus on this →]                                          ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ [All] [Tasks only] [Calendar only]   [All spaces ▼] [⚙]    ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│   ✓ 2 TODAY  ·  ☐ 12 ACTIVE  ·  🔥 3 STREAK                    │
│                                                                 │
│  ── TODAY (7) ─────────────────────────────────────────────────  │
│                                                                 │
│   🗓  09:00-09:30  Team standup                     [Join →]    │
│                    with Sarah, Mike, Jennifer                   │
│                                                                 │
│   ☐  Review auth PR                                Due today    │
│      StratAI · Product Development                              │
│                                                                 │
│   🗓  10:30-11:30  Client sync call                [Join →]     │
│                    with Alex Chen                               │
│                                                                 │
│   ☐  Quarterly budget review  🔴                    Due today    │
│      StratAI · Product Development                  (hard)      │
│                                                                 │
│   🗓  14:00-16:00  Sprint planning                 [Join →]     │
│                    with 8 attendees                              │
│                                                                 │
│   ☐  Send weekly update                            Due today    │
│      StratLoyalty · General                                     │
│                                                                 │
│   🗓  16:30-17:00  1:1 with manager                [Join →]     │
│                    with David Park                              │
│                                                                 │
│  ── THIS WEEK (5) ─────────────────────────────────────────────  │
│                                                                 │
│   🗓  Wed 09:00  Board prep meeting    2h           [Join →]    │
│   ☐  Next StratAI feature brainstorm      Sun (hard) · StratAI │
│   ☐  Ironman 70.3 training prep           Fri · Personal       │
│   ☐  Induction of new employees           Fri · Personal       │
│   ☐  Plan Q1 deliverables                 Sat · StratAI        │
│                                                                 │
│  ── LATER (3) ──────────────────────────────── ▸ collapsed ──── │
│                                                                 │
│  ── ANYTIME (4) ────────────────────────────── ▸ collapsed ──── │
│                                                                 │
│  ── RECENTLY COMPLETED ────────────────────────────────────────  │
│   ✓  Team capacity planning              Today · StraTech       │
│   ✓  Update user documentation           Today · Personal      │
│   View 6 more completed this month →                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 High-Volume View (Busy Executive)

A user with 30+ tasks across 5 spaces, 8 meetings today:

```
┌─────────────────────────────────────────────────────────────────┐
│ [StratAI] [●StraTech] [●Personal] ... [⊞] [☑] [💬] [⚔Arena]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│            Tasks                                    + Add Task  │
│                                                                 │
│  ┌─ HERO CARD (CAPACITY CRUNCH) ───────────────────────────────┐│
│  │                                                              ││
│  │  ⚠️ Tight day ahead                                          ││
│  │                                                              ││
│  │  8 meetings today (6h). Hard deadline tomorrow:             ││
│  │  "Board presentation". ~1.5h free time today.               ││
│  │                                                              ││
│  │  💡 Thursday afternoon has 3h free — best window this week.  ││
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────┐    ││
│  │  │  🔴 Board presentation           Due tomorrow (hard) │    ││
│  │  │      StraTech · Leadership                           │    ││
│  │  └─────────────────────────────────────────────────────┘    ││
│  │                                                              ││
│  │  [Focus on this now →]       [See free time →]              ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ [All] [Tasks only] [Calendar only]   [All spaces ▼] [⚙]    ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│   ✓ 0 TODAY  ·  ☐ 32 ACTIVE  ·  ⚠️ 5 ATTENTION                 │
│                                                                 │
│  ── NEEDS ATTENTION (5) ──────────────────────────── ⚠️ ────── │
│                                                                 │
│   🔴 Board presentation              Tomorrow (hard) · StraTech │
│   ⚠️  Client deliverable             3 days overdue · StratLoy  │
│   ⚠️  Q4 financial review            2 days overdue · StratFin  │
│   🕐 Vendor contract review          Stale (10 days) · StraTech │
│   🕐 Update security policy          Stale (14 days) · StraTech │
│                                                                 │
│      [Dismiss stale →]  [Triage all with AI →]                 │
│                                                                 │
│  ── TODAY (13) ────────────────────────────── 8 meetings ────── │
│                                                                 │
│   🗓  08:30-09:00  Morning briefing                [Join →]     │
│   🗓  09:00-09:30  Team standup                    [Join →]     │
│   ☐  Review PR #847                          Due today · StratAI│
│   🗓  10:00-11:00  Client onboarding call          [Join →]     │
│   🗓  11:00-11:30  Budget alignment                [Join →]     │
│   ☐  Approve vendor quote                    Due today · StraTech│
│   🗓  12:00-13:00  Leadership lunch                             │
│   🗓  13:30-14:30  Product review                  [Join →]     │
│   ☐  Send board update email                 Due today · StraTech│
│   🗓  15:00-16:00  Sprint planning                 [Join →]     │
│   ☐  Review team OKRs                        Due today · StratAI│
│   🗓  16:00-16:30  1:1 with CTO                   [Join →]     │
│   🗓  17:00-17:30  End-of-day sync                 [Join →]     │
│                                                                 │
│   Showing 13 of 13 items · 6h meetings · 1.5h free             │
│                                                                 │
│  ── THIS WEEK (14) ──────────────────── 12 meetings ─────────── │
│                                                                 │
│   Show first 5:                                                 │
│   🗓  Tue 09:00  Weekly strategy meeting  2h        [Join →]    │
│   ☐  Board presentation prep          Wed (hard) · StraTech    │
│   🗓  Tue 14:00  Design review          1h          [Join →]    │
│   ☐  Prepare Q1 roadmap              Thu · StratAI              │
│   🗓  Wed 10:00  Board meeting          3h          [Join →]    │
│                                                                 │
│   ▸ Show 9 more items                                           │
│                                                                 │
│  ── LATER (8) ──────────────────────────────── ▸ collapsed ──── │
│                                                                 │
│  ── ANYTIME (10) ───────────────────────────── ▸ collapsed ──── │
│                                                                 │
│  ── RECENTLY COMPLETED ────────────────────────────────────────  │
│   No completions today — busy day!                              │
│   View 12 completed this month →                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Space-Filtered View

When navigating from "View all" on the Personal space dashboard (`/tasks?space=personal`):

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│            Tasks                                    + Add Task  │
│                                                                 │
│  ┌─ HERO CARD ─────────────────────────────────────────────────┐│
│  │  Good morning — 2 tasks due today in Personal               ││
│  │  [Focus on this →]                                          ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ [All] [Tasks only] [Calendar only]   [Personal ▼] [⚙]      ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                       ↑         │
│                                            Pre-selected filter  │
│   ✓ 1 TODAY  ·  ☐ 10 ACTIVE  ·  🔥 3 STREAK                    │
│                                                                 │
│  ── TODAY (3) ─────────────────────────────────────────────────  │
│                                                                 │
│   🗓  09:00-09:30  Team standup                     [Join →]    │
│   ☐  Ironman 70.3 training log              Due today           │
│      General                          ← Area only (no Space)   │
│   ☐  Meal prep for the week                 Due today           │
│      General                                                    │
│                                                                 │
│  Note: Calendar events show regardless of space filter          │
│  (calendar is global — you need to see meetings in context)     │
│                                                                 │
│  ── THIS WEEK (4) ─────────────────────────────────────────────  │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Calendar-Only View

When toggle is set to "Calendar only":

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────┐│
│  │ [All] [Tasks only] [Calendar only ✓]   [All spaces ▼] [⚙]   ││
│  └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ── TODAY ── 4 meetings · 3.5h ─────────────────────────────────  │
│                                                                  │
│   🗓  09:00-09:30  Team standup                      [Join →]    │
│                    with Sarah, Mike, Jennifer                    │
│                                                                  │
│   🗓  10:30-11:30  Client sync call                  [Join →]    │
│                    with Alex Chen                                │
│                                                                  │
│   🗓  14:00-16:00  Sprint planning                   [Join →]    │
│                    with 8 attendees                               │
│                                                                  │
│   🗓  16:30-17:00  1:1 with manager                  [Join →]    │
│                    with David Park                               │
│                                                                  │
│  ── THIS WEEK ── 8 meetings ────────────────────────────────────  │
│                                                                  │
│   🗓  Tue 09:00-11:00  Weekly strategy meeting       [Join →]    │
│   🗓  Wed 10:00-13:00  Board meeting                 [Join →]    │
│   🗓  Wed 14:00-15:00  Design review                 [Join →]    │
│   🗓  Thu 09:00-09:30  Team standup                  [Join →]    │
│   🗓  Thu 11:00-12:00  Product sync                  [Join →]    │
│   ...                                                            │
│                                                                  │
│  ── SUMMARY ────────────────────────────────────────────────────  │
│   This week: 12 meetings · 14.5h · Busiest day: Wednesday (6h)  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.5 Tasks-Only View

When toggle is set to "Tasks only" — identical to current Space task dashboard behavior but cross-space:

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────┐│
│  │ [All] [Tasks only ✓] [Calendar only]   [All spaces ▼] [⚙]   ││
│  └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ── NEEDS ATTENTION (2) ─────────────────────────────────────── │
│   🔴 Board presentation              Tomorrow (hard) · StraTech  │
│   ⚠️  Client deliverable             3 days overdue · StratLoy   │
│                                                                  │
│  ── TODAY (4) ──────────────────────────────────────────────────  │
│   ☐  Review PR #847                  Due today · StratAI         │
│   ☐  Approve vendor quote            Due today · StraTech        │
│   ☐  Send board update email         Due today · StraTech        │
│   ☐  Review team OKRs               Due today · StratAI          │
│                                                                  │
│  (Clean task-focused view without calendar noise)                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Hero Card Intelligence

The hero card is the most valuable component — it performs **analysis** across calendar and tasks to surface proactive insights.

### 6.1 Priority Cascade

The hero card evaluates conditions in priority order and displays the **highest priority match**:

| Priority | Condition | Hero Message | Actions |
|----------|-----------|-------------|---------|
| **P1** | Meeting starting in ≤15 min | "Team standup starts in 12 minutes" | [Join →] [Prepare with AI →] |
| **P2** | Capacity crunch (meetings >60% of day + hard deadline within 2 days) | "⚠️ Tight day ahead — 6h meetings, hard deadline tomorrow" | [Focus on this now →] [See free time →] |
| **P3** | Overdue tasks exist (hard deadline passed) | "⚠️ 2 tasks overdue" | [Triage →] |
| **P4** | Meeting ended ≤30 min ago | "Your client call just ended" | [Capture decisions →] |
| **P5** | Monday morning (before noon) | "Start of a new week — 14 tasks, 12 meetings ahead" | [Plan your week →] |
| **P6** | High priority task due today | "High priority: Budget review is due today" | [Focus →] |
| **P7** | Stale tasks detected (7+ days no activity) | "3 tasks haven't moved in 7+ days" | [Clean up →] |
| **P8** | All tasks completed for today | "🎉 All caught up! 2 meetings later today." | — |
| **P9** | Default | "Good [morning/afternoon/evening] — X tasks active, Y meetings today" | — |

### 6.2 Capacity Crunch Detection

The flagship intelligence feature. Analyzes meeting load against task deadlines:

```typescript
interface DayAnalysis {
    date: Date;
    meetingCount: number;
    meetingMinutes: number;
    freeMinutes: number;      // workday (8h) minus meetings
    meetingLoadPercent: number; // meetingMinutes / 480
}

interface CapacityCrunch {
    type: 'capacity_crunch';
    today: DayAnalysis;
    criticalTasks: GlobalTask[];    // Hard deadlines within 2 days
    bestWindow: {                    // Best free time this week
        date: Date;
        freeHours: number;
    } | null;
}

function detectCapacityCrunch(
    events: CalendarEvent[],
    tasks: GlobalTask[]
): CapacityCrunch | null {
    const workdayMinutes = 8 * 60;
    const today = analyzeDay(events, new Date());

    const upcomingHardDeadlines = tasks.filter(t =>
        t.dueDateType === 'hard' &&
        t.status === 'active' &&
        isWithinDays(t.dueDate, 2)
    );

    // Crunch = heavy meetings + approaching hard deadline
    if (today.meetingLoadPercent > 0.6 && upcomingHardDeadlines.length > 0) {
        // Find best free window this week
        const weekDays = getWorkDaysAhead(5);
        const dayAnalyses = weekDays.map(d => analyzeDay(events, d));
        const bestDay = dayAnalyses.reduce((best, day) =>
            day.freeMinutes > best.freeMinutes ? day : best
        );

        return {
            type: 'capacity_crunch',
            today,
            criticalTasks: upcomingHardDeadlines,
            bestWindow: bestDay.date.toDateString() !== new Date().toDateString()
                ? { date: bestDay.date, freeHours: bestDay.freeMinutes / 60 }
                : null
        };
    }

    return null;
}

function analyzeDay(events: CalendarEvent[], date: Date): DayAnalysis {
    const dayEvents = events.filter(e => isSameDay(e.start, date) && !e.isAllDay);
    const meetingMinutes = dayEvents.reduce((sum, e) => sum + getDurationMinutes(e), 0);
    const workdayMinutes = 8 * 60;

    return {
        date,
        meetingCount: dayEvents.length,
        meetingMinutes,
        freeMinutes: Math.max(0, workdayMinutes - meetingMinutes),
        meetingLoadPercent: meetingMinutes / workdayMinutes
    };
}
```

### 6.3 Hero Card Rendering

The hero card always shows:
1. **Status message** — What's happening (from priority cascade)
2. **Featured item** — The most important task or meeting (in a card)
3. **Actions** — 1-2 contextual action buttons

When no calendar is connected, the hero card still works — it falls through to task-only priorities (P3, P5, P6, P7, P8, P9).

---

## 7. Calendar Integration

### 7.1 Data Strategy: Live Fetch, No Persistence

Calendar events are fetched live from Microsoft Graph and cached in the browser session. **Events are never persisted to the database.**

| Aspect | Approach |
|--------|----------|
| **Source** | Microsoft Graph API via `GET /api/calendar/events` |
| **Fetch range** | Current week (Sunday → next Sunday) |
| **Cache** | In-memory store, refreshed on tab focus if stale >5 min |
| **Offline** | Show "Calendar unavailable" — don't show stale data |
| **No connection** | Dashboard works as tasks-only (graceful degradation) |

**Why not persist:**
- Calendar events change constantly (reschedules, cancellations)
- Stale calendar data leads to wrong decisions
- Sync complexity (webhooks, polling, conflict resolution) is massive engineering
- Privacy concern: storing attendee names, meeting subjects
- Microsoft Calendar IS the source of truth — we should never be a stale copy
- StratAI captures meeting **outputs** (Pages, Tasks), not the calendar event itself

### 7.2 New Calendar REST Endpoint

```
GET /api/calendar/events?start=2026-01-27&end=2026-02-02
```

This is a **direct REST endpoint** for the dashboard UI, separate from the AI chat tools:

```typescript
// Response
interface CalendarEventsResponse {
    events: CalendarEventSummary[];
    connected: boolean;          // Whether user has calendar connected
    fetchedAt: string;           // ISO timestamp for cache management
}

interface CalendarEventSummary {
    id: string;
    subject: string;
    startDateTime: string;       // ISO
    endDateTime: string;         // ISO
    isAllDay: boolean;
    attendees: { name: string; email: string; type: 'required' | 'optional' }[];
    attendeeCount: number;       // For display: "with 8 attendees"
    onlineMeetingUrl?: string;   // Teams/Zoom link
    webLink: string;             // Outlook web link
    organizer: string;           // Organizer name
    showAs: string;              // free, busy, tentative, oof
    isCancelled: boolean;
    location?: string;
}
```

### 7.3 Calendar Event Display

Events are visually distinct from tasks in the timeline:

| Attribute | Task | Calendar Event |
|-----------|------|----------------|
| **Left icon** | Checkbox (completable) | 🗓 Calendar icon (informational) |
| **Time display** | "Due today", "Sun (hard)" | "09:00-09:30" (time range) |
| **Secondary text** | Space · Area badge | Attendee names or count |
| **Right action** | Complete/Edit/Delete | [Join →] button |
| **Past state** | Completed (strikethrough) | Dimmed (meeting is over) |
| **Color theme** | Space color dot | Neutral (zinc/gray) |

### 7.4 Interleaving Sort Logic

Within each time group (Today, This Week, etc.), items sort by:

```typescript
function sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
    return items.sort((a, b) => {
        const timeA = getEffectiveTime(a);
        const timeB = getEffectiveTime(b);

        // Items with specific times come first, sorted by time
        if (timeA && timeB) return timeA.getTime() - timeB.getTime();

        // Items with times come before items without
        if (timeA && !timeB) return -1;
        if (!timeA && timeB) return 1;

        // Both without times: tasks sort by priority
        if (a.type === 'task' && b.type === 'task') {
            if (a.data.priority !== b.data.priority) {
                return a.data.priority === 'high' ? -1 : 1;
            }
        }

        return 0;
    });
}

function getEffectiveTime(item: TimelineItem): Date | null {
    if (item.type === 'event') return new Date(item.data.startDateTime);
    if (item.type === 'task' && item.data.dueDate) return new Date(item.data.dueDate);
    return null; // No specific time
}
```

---

## 8. High-Volume User UX

### The Challenge

A power user might have:
- **30-40 active tasks** across 5+ spaces
- **6-8 meetings per day** (executive schedule)
- **15+ meetings per week**
- Multiple hard deadlines per week

Without careful design, this becomes an overwhelming wall of items.

### 8.1 Density Management Strategies

#### Strategy 1: Smart Section Collapsing

```
Section Size    → Default State        Expand Behavior
──────────────────────────────────────────────────────
≤ 5 items       → Expanded             (all visible)
6-10 items      → Show first 5         "Show N more" button
11-20 items     → Show first 5         "Show N more" button
20+ items       → Collapsed entirely   "Show N items" header click
```

Exception: **Needs Attention** and **Today** are always expanded (never collapse critical information).

#### Strategy 2: Compact Calendar Events

When there are many meetings in a day, offer a compact mode:

```
── Standard (≤ 4 meetings): ───────────────────────────────
🗓  09:00-09:30  Team standup                    [Join →]
   with Sarah, Mike, Jennifer

── Compact (5+ meetings): ────────────────────────────────
🗓  08:30  Morning briefing  (30m)               [Join →]
🗓  09:00  Team standup      (30m)               [Join →]
🗓  10:00  Client call       (1h)                [Join →]
🗓  11:00  Budget meeting    (30m)               [Join →]
🗓  12:00  Leadership lunch  (1h)
🗓  13:30  Product review    (1h)                [Join →]
🗓  15:00  Sprint planning   (1h)                [Join →]
🗓  16:00  1:1 with CTO      (30m)               [Join →]
```

In compact mode:
- Single line per event (no attendees)
- Duration shown in parentheses instead of end time
- [Join →] only for online meetings
- No attendee line (hover for details)

#### Strategy 3: Section Summaries

Each section header shows aggregate info for quick scanning:

```
── TODAY (13) ── 8 meetings · 6h · 1.5h free ────────────
── THIS WEEK (14) ── 12 meetings · Busiest: Wed (6h) ────
── LATER (8) ─────────────────────────────────────────────
── ANYTIME (10) ──────────────────────────────────────────
```

This lets a power user scan the section headers alone to understand their week without expanding anything.

#### Strategy 4: Task Badges Instead of Full Cards (Compact)

When many tasks exist, offer a density toggle (⚙ button next to filters):

```
── Standard view: ─────────────────────────────────────
☐  Review auth PR                    Due today
   StratAI · Product Development

── Compact view: ──────────────────────────────────────
☐  Review auth PR              Today · StratAI · ProdDev
☐  Approve vendor quote        Today · StraTech
☐  Send board update           Today · StraTech
☐  Review team OKRs            Today · StratAI
```

Single-line per task, all metadata on one row. Space/area as inline pills rather than second line.

#### Strategy 5: Past Event Dimming

Events that have already occurred today are dimmed, pushing visual attention to upcoming items:

```
── TODAY (13) ── 8 meetings · 6h · 1.5h free ────────────

  🗓  08:30  Morning briefing  (30m)             ← dimmed (past)
  🗓  09:00  Team standup      (30m)             ← dimmed (past)
  ✓  Reviewed PR #847                            ← completed (dimmed)
  🗓  10:00  Client call       (1h)              ← dimmed (past)
- - - - - - - NOW - - - - - - - - - - - - - - -
  🗓  11:00  Budget meeting    (30m)  [Join →]   ← upcoming
  ☐  Approve vendor quote     Due today          ← active
  🗓  12:00  Leadership lunch  (1h)              ← upcoming
  ...
```

The "NOW" divider shows where you are in the day, and past items are visually de-emphasized but still visible for reference.

### 8.2 Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| **Many tasks (50+)** | Only fetch active + recent completed (not all history) |
| **Many calendar events** | Single Graph API call with date range, max 100 events |
| **Re-rendering** | Derived values for grouping, memoized sort |
| **Store size** | Global tasks separate from space-scoped cache |
| **Page load** | Tasks and calendar load in parallel; show tasks immediately, calendar when ready |

### 8.3 Loading States

```
┌─────────────────────────────────────────────────────────────────┐
│  HERO CARD: Skeleton shimmer (greeting placeholder)             │
│                                                                 │
│  TASKS: Loading spinner ("Loading tasks...")                    │
│  CALENDAR: Secondary spinner ("Connecting to calendar...")      │
│                                                                 │
│  Order of appearance:                                           │
│  1. Page shell + hero skeleton         (instant)                │
│  2. Tasks populate                     (~200ms, from our DB)    │
│  3. Calendar events populate           (~500ms, from Graph API) │
│  4. Hero card updates with analysis    (after both loaded)      │
└─────────────────────────────────────────────────────────────────┘
```

Tasks load first (our database, fast). Calendar events arrive second (Graph API, slower). The hero card shows a task-only greeting initially, then upgrades to include calendar intelligence once events arrive.

---

## 9. Data Model & API

### 9.1 No Schema Changes Required

The existing `tasks` table already has `user_id`, `space_id`, and `area_id`. A cross-space query is simply removing the `space_id` filter. No new tables or columns needed.

### 9.2 New Types

```typescript
// Extended task with space/area display info
interface GlobalTask extends Task {
    spaceName: string;
    spaceSlug: string;
    spaceColor: string;
    areaName?: string;
    areaSlug?: string;
}

// Filter for global view
interface GlobalTaskFilter {
    spaceId?: string;           // Optional — filter to one space
    areaId?: string;            // Optional — filter to one area
    status?: TaskStatus[];      // active, completed, etc.
    priority?: TaskPriority;    // high, normal
    includeCompleted?: boolean; // Default: true (for recently completed section)
}

// Unified timeline item for interleaving
type TimelineItem =
    | { type: 'task'; data: GlobalTask }
    | { type: 'event'; data: CalendarEventSummary };

// Timeline grouped by time period
interface TimelineGroups {
    needsAttention: TimelineItem[];   // Overdue + stale (tasks only)
    today: TimelineItem[];            // Due today + today's events
    thisWeek: TimelineItem[];         // Due this week + week's events
    later: TimelineItem[];            // Due > 1 week + future events
    anytime: TimelineItem[];          // No due date (tasks only)
}
```

### 9.3 Repository Changes

New method on task repository:

```typescript
// In tasks-postgres.ts
async findAllForUser(userId: string, filter?: GlobalTaskFilter): Promise<GlobalTask[]> {
    const tasks = await sql<GlobalTaskRow[]>`
        SELECT
            t.*,
            s.name as space_name,
            s.slug as space_slug,
            s.color as space_color,
            a.name as area_name,
            a.slug as area_slug
        FROM tasks t
        LEFT JOIN spaces s ON t.space_id = s.id
        LEFT JOIN areas a ON t.area_id = a.id
        WHERE t.user_id = ${userId}
        AND t.parent_task_id IS NULL
        AND t.deleted_at IS NULL
        ${filter?.spaceId ? sql`AND t.space_id = ${filter.spaceId}` : sql``}
        ${filter?.areaId ? sql`AND t.area_id = ${filter.areaId}` : sql``}
        ${filter?.status ? sql`AND t.status = ANY(${filter.status})` : sql``}
        ${filter?.priority ? sql`AND t.priority = ${filter.priority}` : sql``}
        ${filter?.includeCompleted
            ? sql`OR (t.status = 'completed' AND t.completed_at > NOW() - INTERVAL '30 days')`
            : sql``}
        ORDER BY
            CASE WHEN t.priority = 'high' THEN 0 ELSE 1 END,
            t.due_date ASC NULLS LAST,
            t.last_activity_at DESC
    `;
    return tasks.map(rowToGlobalTask);
}
```

### 9.4 API Changes

**Modified endpoint** — make spaceId optional on `GET /api/tasks`:

```
GET /api/tasks                                    → All tasks (global)
GET /api/tasks?spaceId=stratai                    → Space-filtered (existing behavior)
GET /api/tasks?spaceId=stratai&areaId=prod-dev    → Area-filtered
GET /api/tasks?priority=high                      → Priority filter
GET /api/tasks?status=active,planning             → Status filter
```

When `spaceId` is omitted, the endpoint returns `GlobalTask` objects (with space/area display fields). When provided, it returns standard `Task` objects (backward compatible).

**New endpoint:**

```
GET /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD
```

Returns `CalendarEventsResponse` with the user's calendar events for the date range. Returns `{ connected: false, events: [] }` if no calendar integration.

### 9.5 Store Changes

```typescript
// New properties in task store
class TaskStore {
    // Existing
    tasks = $state<SvelteMap<string, Task>>(new SvelteMap());

    // New for global view
    globalTasks = $state<GlobalTask[]>([]);
    calendarEvents = $state<CalendarEventSummary[]>([]);
    calendarConnected = $state(false);
    globalLoaded = $state(false);
    calendarLoaded = $state(false);

    async loadGlobalTasks(filter?: GlobalTaskFilter) {
        // GET /api/tasks (no spaceId)
        // Populates globalTasks
    }

    async loadCalendarEvents() {
        // GET /api/calendar/events?start=...&end=...
        // Populates calendarEvents
        // Sets calendarConnected
    }

    // Derived: unified timeline
    get timeline(): TimelineGroups {
        return buildTimeline(this.globalTasks, this.calendarEvents);
    }
}
```

---

## 10. Component Architecture

### 10.1 Component Tree

```
src/routes/tasks/
└── +page.svelte                      ← NEW route

src/lib/components/tasks/
├── GlobalTaskDashboard.svelte        ← NEW orchestrator
├── HeroCard.svelte                   ← NEW (replaces FocusSuggestion for global)
├── DashboardFilters.svelte           ← NEW (view toggle + space/status filters)
├── CalendarEventCard.svelte          ← NEW (event display in timeline)
├── TaskGroupSection.svelte           ← EXISTING (reuse as-is)
├── TaskCard.svelte                   ← EXISTING (add optional space badge)
├── StatsRow.svelte                   ← EXISTING (adapt for cross-space)
├── RecentlyCompletedSection.svelte   ← EXISTING (adapt for cross-space)
├── FocusSuggestion.svelte            ← EXISTING (keep for space-scoped dashboard)
└── CompleteTaskModal.svelte          ← EXISTING (reuse as-is)
```

### 10.2 New Components

#### GlobalTaskDashboard.svelte

Orchestrator component. Manages data loading, filter state, and timeline assembly.

```
Props: none (loads its own data)
State: filter (space, status, view toggle), loading states
Children: HeroCard, DashboardFilters, StatsRow, TaskGroupSections, RecentlyCompleted
```

#### HeroCard.svelte

Temporal-aware greeting with calendar intelligence.

```
Props: tasks: GlobalTask[], events: CalendarEventSummary[], calendarConnected: boolean
State: heroState (derived from priority cascade)
Actions: Focus, Join, Triage, Capture, Plan week
```

#### DashboardFilters.svelte

Filter bar with view toggle.

```
Props:
  spaces: Space[] (for space dropdown)
  activeView: 'all' | 'tasks' | 'calendar'
  activeSpaceFilter: string | null
  activeStatusFilter: TaskStatus[] | null
Events:
  onViewChange, onSpaceFilterChange, onStatusFilterChange
```

#### CalendarEventCard.svelte

Calendar event display within the timeline.

```
Props: event: CalendarEventSummary, compact: boolean
Display: Time range, subject, attendees (or count), join button
States: upcoming (full color), past (dimmed), cancelled (strikethrough)
```

### 10.3 Modified Components

#### TaskCard.svelte — Add Space Badge

When `showSpaceBadge` prop is true, display space/area attribution:

```
Props additions:
  showSpaceBadge?: boolean        // Show space pill (default: false)
  showAreaBadge?: boolean         // Show area pill (default: true in space view)
  spaceName?: string
  spaceColor?: string
  areaName?: string
```

Badge visibility logic:
- **Unfiltered (all spaces)**: Show both space + area
- **Filtered to space**: Show area only
- **Filtered to space + area**: Show neither

---

## 11. Navigation Changes

### 11.1 Desktop Header

Add a Tasks icon to the header nav, matching the style of the Quick Chat icon (small, icon-only):

```
Before:
[StratAI] [●StraTech] [●Personal] ... [⊞All▼] [💬] [⚔️ Arena] [⚙️] [User▼]

After:
[StratAI] [●StraTech] [●Personal] ... [⊞All▼] [☑️] [💬] [⚔️ Arena] [⚙️] [User▼]
                                                 ↑
                                        Tasks icon (CheckSquare from lucide)
```

- **Icon**: `CheckSquare` from lucide-svelte (or `ListTodo`)
- **Size**: Same as chat bubble icon
- **Active state**: Highlighted when on `/tasks` route
- **Badge**: Show count of "needs attention" items (overdue + stale) if > 0
- **Tooltip**: "Tasks"

### 11.2 Mobile Header

Add Tasks to the mobile action menu/dropdown:

```
┌──────────────────┐
│  Quick Chat       │
│  Tasks        NEW │
│  Arena            │
│  Settings         │
└──────────────────┘
```

### 11.3 Space Dashboard "View All"

Change the "View all >" link on Space dashboards to route to the global dashboard with space filter:

```
Before: /spaces/[slug]/tasks
After:  /tasks?space=[slug]
```

This gives users the full-featured global dashboard while maintaining their space context through the filter.

---

## 12. Implementation Phases

### Phase 1: Core Dashboard (MVP)

**Goal**: Global task view with cross-space aggregation

- [ ] New route: `/tasks/+page.svelte`
- [ ] `GlobalTaskDashboard.svelte` component
- [ ] Repository: `findAllForUser()` with JOINs
- [ ] API: Make `spaceId` optional on `GET /api/tasks`
- [ ] New types: `GlobalTask`, `GlobalTaskFilter`
- [ ] Store: `loadGlobalTasks()` method
- [ ] Space/area badges on TaskCard
- [ ] DashboardFilters with space dropdown + status filter
- [ ] Reuse: TaskGroupSection, StatsRow, RecentlyCompleted
- [ ] Navigation: Tasks icon in header (desktop + mobile)
- [ ] "View all" routing change on Space dashboard

### Phase 2: Calendar Interleaving

**Goal**: Calendar events appear in the timeline

- [ ] New endpoint: `GET /api/calendar/events`
- [ ] `CalendarEventCard.svelte` component
- [ ] Store: `loadCalendarEvents()` method
- [ ] Timeline builder: `buildTimeline()` with interleaving sort
- [ ] View toggle: All / Tasks only / Calendar only
- [ ] Compact mode for 5+ events per day
- [ ] Past event dimming with "NOW" divider
- [ ] Section summaries (meeting count, hours)
- [ ] Graceful degradation (no calendar = tasks only)
- [ ] Loading states (tasks first, calendar second)

### Phase 3: Hero Card Intelligence

**Goal**: Proactive insights and capacity analysis

- [ ] `HeroCard.svelte` with priority cascade
- [ ] `detectCapacityCrunch()` logic
- [ ] Day analysis (meeting minutes, free time)
- [ ] Week analysis (best free window)
- [ ] Meeting-soon detection (15 min threshold)
- [ ] Meeting-ended detection (30 min threshold)
- [ ] Monday morning week overview
- [ ] Overdue/stale task triage prompt
- [ ] All-clear celebration state
- [ ] Action buttons: Focus, Join, Triage, Capture, Plan week

### Phase 4: Polish & Power Users

**Goal**: Handle high-volume gracefully

- [ ] Compact view toggle (density setting)
- [ ] Compact calendar events (single-line)
- [ ] Smart section collapsing rules
- [ ] Filter persistence in localStorage
- [ ] Task creation from global view (with space/area selector)
- [ ] Keyboard shortcuts (J/K navigation, Enter to open)
- [ ] URL state management (filters in query params)
- [ ] Performance optimization for 50+ tasks

---

## 13. Acceptance Criteria

### Must Have (V1)

- [ ] `/tasks` displays ALL user tasks across all spaces
- [ ] Each task shows space name + color badge and area badge when unfiltered
- [ ] Space filter dropdown filters tasks (and updates URL)
- [ ] Badge visibility adapts: both badges → space only → area only → none
- [ ] "View all" from Space dashboard navigates to `/tasks?space=[slug]`
- [ ] Tasks icon in desktop header nav and mobile action menu
- [ ] Calendar events appear interleaved in timeline (if calendar connected)
- [ ] Calendar events have distinct visual treatment (no checkbox, time range, join button)
- [ ] View toggle switches between All / Tasks only / Calendar only
- [ ] Hero card shows contextual greeting based on priority cascade
- [ ] Capacity crunch alert when meetings >60% + hard deadline within 2 days
- [ ] Section summaries show meeting count and hours
- [ ] Past events dimmed, past tasks show as completed
- [ ] Compact mode activates for sections with 5+ calendar events
- [ ] Dashboard works without calendar connection (tasks only)
- [ ] Loading states: tasks appear before calendar events
- [ ] Responsive: works on mobile (single column, action menu)

### Should Have

- [ ] "NOW" divider in Today section separating past from upcoming
- [ ] Best free window suggestion in capacity crunch hero card
- [ ] Filter persistence across sessions (localStorage)
- [ ] Compact/standard density toggle
- [ ] Task creation from global view with space/area selector modal
- [ ] Needs attention count badge on nav icon

### Could Have

- [ ] Keyboard navigation (J/K through items)
- [ ] Meeting-ended hero card prompt ("Capture decisions?")
- [ ] Monday morning week overview hero card
- [ ] Calendar-only view with weekly summary stats
- [ ] "Triage with AI" action from needs attention section

---

## 14. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Calendar persistence** | No — fetch live | Stale calendar data leads to wrong decisions; sync complexity is massive; privacy concerns; StratAI captures meeting outputs, not events |
| **Fetch range** | Full work week (Sun-Sun + next Mon) | Enables "This Week" interleaving, week-ahead capacity analysis, Monday overview, "best window" suggestions |
| **Interleaving approach** | Unified timeline sorted by time | Users think temporally; separating tasks and meetings forces mental context-switching |
| **View toggle** | All / Tasks / Calendar | Power users sometimes need just tasks (focus) or just calendar (scheduling context) |
| **Nav placement** | Icon (like chat), not button (like Arena) | Tasks is a utility, not a feature showcase; should be always-accessible, not prominent |
| **"View all" routing** | `/tasks?space=X` not `/spaces/X/tasks` | Gives full dashboard power while maintaining context; easy to widen to all spaces |
| **Compact mode** | Auto-trigger at 5+ events, manual toggle for density | Prevents overwhelming walls of content for busy executives |
| **Hero card** | Priority cascade, not random/rotating | Most important info first; deterministic; user learns to trust the hero card |
| **Space-scoped dashboard** | Keep `/spaces/[space]/tasks` unchanged | Still valuable for project managers; don't break existing flows |
| **No task persistence from calendar** | Calendar events are read-only display | StratAI doesn't own calendar data; "Meeting = Task" pattern (from MEETING_LIFECYCLE.md) is a future phase that creates TASKS from meetings, not the other way around |
| **Past event handling** | Dimmed (not hidden) | Users reference past meetings ("who was in that 10am call?"); hiding loses context |

---

## Related Documents

- [CALENDAR_INTEGRATION.md](./CALENDAR_INTEGRATION.md) — Calendar OAuth and tools (foundation for this feature)
- [MEETING_LIFECYCLE.md](./MEETING_LIFECYCLE.md) — End-to-end meeting journey (future: capture decisions from dashboard)
- [TASK_ASSIGNMENT.md](./TASK_ASSIGNMENT.md) — Task delegation (future: "assigned to me" filter)
- [CONTEXT_TRANSPARENCY.md](./CONTEXT_TRANSPARENCY.md) — Context indicators (hero card is context-aware UI)

---

*Last Updated: January 29, 2026*
