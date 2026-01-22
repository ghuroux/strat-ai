# Calendar Integration (Microsoft Graph)

> **The Flywheel Starts Here: Capture Every Decision**

This document specifies the Calendar integration for StratAI—the first foundational integration enabling meeting capture that feeds the decision flywheel. Calendar is the foundation that [Meeting Lifecycle](./MEETING_LIFECYCLE.md) builds upon.

**Key Insight: Meetings are where decisions happen.** Without capturing what was decided, by whom, and why, the flywheel never turns. Calendar integration makes meeting capture frictionless.

**Strategic Position:** This is a **Foundational Integration** (first-party UX), not a contextual add-on. Users shouldn't "connect their calendar"—it should feel built-in.

---

## Table of Contents

1. [Vision & Strategic Context](#1-vision--strategic-context)
2. [User Stories](#2-user-stories)
3. [Scope & Boundaries](#3-scope--boundaries)
4. [Microsoft Graph Architecture](#4-microsoft-graph-architecture)
5. [Tool Definitions](#5-tool-definitions)
6. [Capture Flow (Primary Use Case)](#6-capture-flow-primary-use-case)
7. [Authentication & Permissions](#7-authentication--permissions)
8. [UX Design](#8-ux-design)
9. [System Prompt Guidelines](#9-system-prompt-guidelines)
10. [Implementation Details](#10-implementation-details)
11. [Security & Privacy](#11-security--privacy)
12. [Success Metrics](#12-success-metrics)
13. [Relationship to Meeting Lifecycle](#13-relationship-to-meeting-lifecycle)

---

## 1. Vision & Strategic Context

### The Flywheel Depends on Capture

From the [Product Vision](../product/PRODUCT_VISION.md):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         THE DATA FLYWHEEL                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐                                                                │
│  │ 1. DECIDE    │  Employee makes a decision                                     │
│  └──────┬───────┘                                                                │
│         │                                                                        │
│         ▼                                                                        │
│  ╔══════════════╗                                                                │
│  ║ 2. CAPTURE   ║  ★ CALENDAR INTEGRATION ENABLES THIS ★                         │
│  ║              ║  StratAI records decision with context                         │
│  ╚══════╤═══════╝  WHERE: In a meeting (calendar event)                          │
│         │          WHO: Attendees captured automatically                         │
│         │          WHAT: Decision extracted from discussion                      │
│         ▼          WHY: Context preserved                                        │
│  ┌──────────────┐                                                                │
│  │ 3. EXECUTE   │  Action flows to operational systems                           │
│  └──────┬───────┘                                                                │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────┐                                                                │
│  │ 4. MEASURE   │  Outcomes collected                                            │
│  └──────┬───────┘                                                                │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────┐                                                                │
│  │ 5. LEARN     │  Decision → Outcome connected                                  │
│  └──────┬───────┘                                                                │
│         │                                                                        │
│         └─────────────────────► Back to DECIDE (smarter)                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Why Calendar First

| Factor | Rationale |
|--------|-----------|
| **Dogfood Principle** | StratGroup uses Microsoft 365 - build for our actual stack |
| **Universal Value** | Every knowledge worker benefits from calendar intelligence |
| **Flywheel Enabler** | Meeting capture is the primary source of decision data |
| **Proves Architecture** | Calendar has read/write, OAuth, complex state - tests everything |
| **High Frequency** | Multiple meetings daily = frequent value delivery |

### What This Unlocks

```
Calendar Integration (this spec)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ENABLED CAPABILITIES                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   TODAY (Calendar Primitives)                                                    │
│   ─────────────────────────                                                      │
│   • See upcoming meetings                                                        │
│   • Know who's attending                                                         │
│   • Create calendar events                                                       │
│   • Block focus time                                                             │
│   • Check free/busy                                                              │
│                                                                                  │
│   NEAR FUTURE (Meeting Lifecycle builds on this)                                 │
│   ─────────────────────────────────────────────                                  │
│   • Pre-meeting prep (surface relevant context)                                  │
│   • During-meeting notes capture                                                 │
│   • Post-meeting extraction (decisions, actions)                                 │
│   • Task creation from action items                                              │
│   • Follow-up meeting scheduling                                                 │
│                                                                                  │
│   FUTURE (Flywheel in motion)                                                    │
│   ──────────────────────────                                                     │
│   • "Last time you met about X, you decided Y"                                   │
│   • Pattern recognition across meetings                                          │
│   • Outcome correlation (decision → result)                                      │
│   • Meeting effectiveness insights                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. User Stories

### Primary: Meeting Capture

> **As a knowledge worker,** after a meeting ends, I want AI to help me capture what was decided, who owns what, and any follow-up actions, so the value of the meeting isn't lost.

### Supporting Stories

> **As a user,** I want to see my upcoming meetings in StratAI so I know what's on my calendar without switching apps.

> **As a user,** I want to create a meeting directly from StratAI when AI suggests "you should schedule a follow-up" so I don't break my flow.

> **As a user,** I want to block focus time on my calendar from StratAI so AI can help protect my deep work time.

> **As a manager,** I want AI to know who was in a meeting so it can attribute decisions and actions to the right people.

---

## 3. Scope & Boundaries

### In Scope (V1)

| Capability | Description |
|------------|-------------|
| **Read calendar events** | See upcoming and past meetings |
| **Read attendees** | Know who was in each meeting |
| **Create events** | Schedule meetings, focus time |
| **Update events** | Modify existing calendar entries |
| **Free/busy queries** | Check availability for scheduling |
| **Meeting capture prompts** | AI prompts for post-meeting capture |
| **Decision extraction** | AI helps structure what was decided |
| **Microsoft Graph API** | Azure AD OAuth, Graph API calls |

### Out of Scope (V1)

| Capability | Why Deferred |
|------------|--------------|
| **Teams meeting transcripts** | Depends on tenant policies; manual upload first (see MEETING_LIFECYCLE.md) |
| **Auto-join meetings** | Complex permissions, privacy concerns |
| **Calendar sharing/delegation** | Adds complexity; personal calendar first |
| **Google Calendar** | Microsoft first (dogfood); Google as second provider |
| **Exchange on-premises** | Cloud-first; on-prem adds significant complexity |
| **Real-time sync (webhooks)** | Polling sufficient for V1; webhooks in V2 |

### Relationship to Meeting Lifecycle

This spec covers **calendar primitives**. [MEETING_LIFECYCLE.md](./MEETING_LIFECYCLE.md) covers the **full meeting journey**:

| Calendar Integration (this spec) | Meeting Lifecycle (builds on this) |
|----------------------------------|-----------------------------------|
| Read/write calendar events | AI-guided meeting creation |
| Get attendee list | Intelligent scheduling |
| Check free/busy | Meeting prep context |
| Basic capture prompts | Full transcript processing |
| Decision extraction (basic) | Decision + Action extraction |
| — | Page generation (meeting minutes) |
| — | Task creation from actions |
| — | Area context propagation |

---

## 4. Microsoft Graph Architecture

### API Endpoints Used

```
Microsoft Graph API v1.0
├── /me/calendar
│   ├── GET /events                 # List calendar events
│   ├── POST /events                # Create event
│   ├── PATCH /events/{id}          # Update event
│   └── DELETE /events/{id}         # Delete event
│
├── /me/calendarView                # Events in time range (handles recurring)
│   └── GET ?startDateTime=...&endDateTime=...
│
├── /me/calendar/getSchedule        # Free/busy for multiple users
│   └── POST { schedules: [...], startTime, endTime }
│
└── /me/events/{id}
    ├── GET                         # Single event details
    └── /attendees                  # Attendee details
```

### MCP Server Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MCP SERVER OPTIONS FOR MS GRAPH                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   OPTION A: Community MCP Server                                                 │
│   ──────────────────────────────                                                 │
│   • Check mcp.so/servers for existing MS Graph MCP servers                       │
│   • Fastest path if quality server exists                                        │
│   • May need to fork/extend for our specific needs                               │
│                                                                                  │
│   OPTION B: Custom MCP Server                                                    │
│   ─────────────────────────────                                                  │
│   • Build our own MS Graph MCP server                                            │
│   • Full control over tool design                                                │
│   • Can optimize for StratAI's specific patterns                                 │
│   • Contribute back to ecosystem                                                 │
│                                                                                  │
│   RECOMMENDATION: Start with Option A (search for existing), fall back to B     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CALENDAR DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   User                          StratAI                      Microsoft Graph     │
│                                                                                  │
│   "What meetings                                                                 │
│    do I have today?"                                                             │
│         │                                                                        │
│         ▼                                                                        │
│   ┌──────────────┐                                                               │
│   │ Chat Input   │──────────▶ AI recognizes calendar intent                      │
│   └──────────────┘                      │                                        │
│                                         ▼                                        │
│                              ┌──────────────────┐                                │
│                              │ calendar_list_   │                                │
│                              │ events tool call │                                │
│                              └────────┬─────────┘                                │
│                                       │                                          │
│                                       ▼                                          │
│                    ┌──────────────────────────────────┐                          │
│                    │ StratAI Value-Add Layer          │                          │
│                    │ • Check user permissions         │                          │
│                    │ • Decrypt OAuth token            │                          │
│                    │ • Log for audit                  │                          │
│                    └────────────────┬─────────────────┘                          │
│                                     │                                            │
│                                     ▼                                            │
│                         ┌───────────────────────┐                                │
│                         │ MS Graph MCP Server   │────▶ GET /me/calendarView      │
│                         └───────────────────────┘           │                    │
│                                                             │                    │
│                                                             ▼                    │
│                                              ┌─────────────────────────┐         │
│                                              │ Microsoft Graph API     │         │
│                                              │ (Azure AD protected)    │         │
│                                              └─────────────────────────┘         │
│                                                             │                    │
│                                                             ▼                    │
│   ┌──────────────┐                                   [Event data]                │
│   │ AI Response  │◀────────── Format & present ◀─────────────┘                   │
│   │              │                                                               │
│   │ "You have 3  │                                                               │
│   │  meetings    │                                                               │
│   │  today..."   │                                                               │
│   └──────────────┘                                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tool Definitions

### Calendar Tools

```typescript
// Tools available to AI for calendar operations

export const CALENDAR_TOOLS: ToolDefinition[] = [
  {
    name: 'calendar_list_events',
    description: 'List calendar events within a time range. Use this to see upcoming meetings or past meetings for capture.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date-time',
          description: 'Start of time range (ISO 8601). Defaults to now.'
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          description: 'End of time range (ISO 8601). Defaults to end of today.'
        },
        includeAttendees: {
          type: 'boolean',
          default: true,
          description: 'Include attendee details in response'
        },
        maxResults: {
          type: 'number',
          default: 20,
          maximum: 50,
          description: 'Maximum events to return'
        }
      },
      required: []
    }
  },

  {
    name: 'calendar_get_event',
    description: 'Get details of a specific calendar event, including attendees and body content.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the calendar event'
        }
      },
      required: ['eventId']
    }
  },

  {
    name: 'calendar_create_event',
    description: 'Create a new calendar event. Use this to schedule meetings or block focus time.',
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Meeting subject/title'
        },
        start: {
          type: 'string',
          format: 'date-time',
          description: 'Start time (ISO 8601)'
        },
        end: {
          type: 'string',
          format: 'date-time',
          description: 'End time (ISO 8601)'
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses of attendees'
        },
        body: {
          type: 'string',
          description: 'Meeting description/agenda (HTML supported)'
        },
        location: {
          type: 'string',
          description: 'Meeting location or video call link'
        },
        isOnlineMeeting: {
          type: 'boolean',
          default: true,
          description: 'Create as Teams meeting'
        }
      },
      required: ['subject', 'start', 'end']
    }
  },

  {
    name: 'calendar_update_event',
    description: 'Update an existing calendar event.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to update'
        },
        subject: { type: 'string' },
        start: { type: 'string', format: 'date-time' },
        end: { type: 'string', format: 'date-time' },
        attendees: { type: 'array', items: { type: 'string' } },
        body: { type: 'string' },
        location: { type: 'string' }
      },
      required: ['eventId']
    }
  },

  {
    name: 'calendar_delete_event',
    description: 'Delete a calendar event. Use with caution.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to delete'
        }
      },
      required: ['eventId']
    }
  },

  {
    name: 'calendar_get_free_busy',
    description: 'Check availability for one or more people. Use this before suggesting meeting times.',
    parameters: {
      type: 'object',
      properties: {
        emails: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses to check availability for'
        },
        startTime: {
          type: 'string',
          format: 'date-time',
          description: 'Start of time range to check'
        },
        endTime: {
          type: 'string',
          format: 'date-time',
          description: 'End of time range to check'
        }
      },
      required: ['emails', 'startTime', 'endTime']
    }
  },

  {
    name: 'calendar_create_focus_time',
    description: 'Block focus time on your calendar. Creates an event marked as "busy" with no attendees.',
    parameters: {
      type: 'object',
      properties: {
        start: {
          type: 'string',
          format: 'date-time',
          description: 'Start time for focus block'
        },
        duration: {
          type: 'number',
          description: 'Duration in minutes',
          default: 60
        },
        subject: {
          type: 'string',
          default: 'Focus Time',
          description: 'Label for the focus block'
        }
      },
      required: ['start']
    }
  }
];
```

### Response Formats

```typescript
interface CalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
  attendees: {
    email: string;
    name: string;
    response: 'accepted' | 'declined' | 'tentative' | 'none';
  }[];
  organizer: {
    email: string;
    name: string;
  };
  body?: {
    content: string;
    contentType: 'html' | 'text';
  };
  isCancelled: boolean;
}

interface FreeBusyResponse {
  schedules: {
    email: string;
    availabilityView: string;  // e.g., "0000222200002222" (0=free, 2=busy)
    scheduleItems: {
      status: 'free' | 'busy' | 'tentative' | 'outOfOffice';
      start: string;
      end: string;
    }[];
  }[];
}
```

---

## 6. Capture Flow (Primary Use Case)

### The Capture Loop

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MEETING CAPTURE FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   TRIGGER: Meeting just ended (detected via calendar)                            │
│   ────────────────────────────────────────────────                               │
│                                                                                  │
│   1. PROMPT                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   Your meeting "Q1 Planning Review" with Sarah, James, and 3 others      │   │
│   │   just ended. Would you like to capture what was discussed?              │   │
│   │                                                                          │   │
│   │   [Capture Now]  [Remind Me Later]  [Skip]                               │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   2. GUIDED CAPTURE (if user clicks "Capture Now")                               │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   AI: "Let me help you capture the key outcomes from Q1 Planning Review. │   │
│   │        I'll ask a few questions to make sure we don't miss anything."    │   │
│   │                                                                          │   │
│   │   📋 What were the main decisions made?                                   │   │
│   │      (AI suggests format: "Decided to [action] because [reason]")        │   │
│   │                                                                          │   │
│   │   👤 Were there any action items? Who owns them?                          │   │
│   │      (AI knows attendees: Sarah, James, Mike, Lisa, You)                 │   │
│   │                                                                          │   │
│   │   📅 Any follow-up meetings needed?                                       │   │
│   │      (AI can create them directly)                                       │   │
│   │                                                                          │   │
│   │   💡 Anything surprising or that changed your thinking?                   │   │
│   │      (Captures context for future learning)                              │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   3. STRUCTURED OUTPUT                                                           │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   Meeting: Q1 Planning Review                                            │   │
│   │   Date: January 22, 2026                                                 │   │
│   │   Attendees: Sarah Chen, James Wilson, Mike Park, Lisa Torres, You       │   │
│   │                                                                          │   │
│   │   DECISIONS:                                                             │   │
│   │   1. ✓ Approved 15% budget increase for marketing (Sarah)                │   │
│   │   2. ✓ Delayed Phase 2 launch to Q2 (consensus)                          │   │
│   │                                                                          │   │
│   │   ACTION ITEMS:                                                          │   │
│   │   1. [ ] Draft revised timeline → Mike (due: Jan 26)                     │   │
│   │   2. [ ] Update stakeholders → You (due: Jan 24)                         │   │
│   │   3. [ ] Prepare budget memo → Sarah (due: Jan 25)                       │   │
│   │                                                                          │   │
│   │   FOLLOW-UP:                                                             │   │
│   │   • Phase 2 Deep Dive scheduled for Feb 3                                │   │
│   │                                                                          │   │
│   │   [Create Tasks] [Save as Page] [Done]                                   │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   4. FLYWHEEL ACTIVATION                                                         │
│   • Decisions stored in Area context (with attendee attribution)                 │
│   • Tasks created with due dates and owners                                      │
│   • Page created with full meeting notes (optional)                              │
│   • Follow-up meeting scheduled on calendar                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Capture Detection

How does StratAI know a meeting just ended?

```typescript
// V1: Polling-based detection (simple, reliable)
async function checkForEndedMeetings(userId: string) {
  const recentEvents = await calendarService.listEvents({
    userId,
    startDate: now().subtract(2, 'hours'),
    endDate: now(),
  });

  for (const event of recentEvents) {
    const meetingEndTime = new Date(event.end.dateTime);
    const minutesSinceEnd = differenceInMinutes(now(), meetingEndTime);

    // Trigger capture prompt if meeting ended 0-15 minutes ago
    if (minutesSinceEnd >= 0 && minutesSinceEnd <= 15) {
      if (!await hasCapturePromptBeenShown(userId, event.id)) {
        await showCapturePrompt(userId, event);
        await markCapturePromptShown(userId, event.id);
      }
    }
  }
}

// Run every 5 minutes when user is active
```

### Capture Data Model

```typescript
interface MeetingCapture {
  id: string;
  calendarEventId: string;
  areaId: string;
  userId: string;

  // From calendar
  subject: string;
  startTime: Date;
  endTime: Date;
  attendees: {
    userId?: string;  // If StratAI user
    email: string;
    name: string;
  }[];

  // Captured content
  decisions: {
    description: string;
    decidedBy?: string;  // Attendee attribution
    rationale?: string;
  }[];

  actions: {
    description: string;
    ownerId?: string;    // Attendee attribution
    ownerEmail: string;
    dueDate?: Date;
    taskId?: string;     // If task created
  }[];

  notes?: string;        // Free-form notes
  followUpEventId?: string;  // If follow-up scheduled

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 7. Authentication & Permissions

### Microsoft Azure AD Setup

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    AZURE AD APP REGISTRATION                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   App Registration: "StratAI Calendar Integration"                               │
│                                                                                  │
│   REDIRECT URIs:                                                                 │
│   • https://app.stratai.com/auth/callback/microsoft                              │
│   • http://localhost:5173/auth/callback/microsoft (dev)                          │
│                                                                                  │
│   API PERMISSIONS (Delegated):                                                   │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  Permission                    │ Type      │ Purpose                    │    │
│   ├────────────────────────────────┼───────────┼────────────────────────────┤    │
│   │  Calendars.Read                │ Delegated │ Read user's calendar       │    │
│   │  Calendars.ReadWrite           │ Delegated │ Create/update events       │    │
│   │  User.Read                     │ Delegated │ Get user profile           │    │
│   │  offline_access                │ Delegated │ Refresh tokens             │    │
│   └────────────────────────────────┴───────────┴────────────────────────────┘    │
│                                                                                  │
│   NOTE: We use DELEGATED permissions (user context), not APPLICATION             │
│   permissions (app context). This means:                                         │
│   • Each user authenticates individually                                         │
│   • Access is limited to what the user can see                                   │
│   • No admin consent required for basic calendar access                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### OAuth Flow

```typescript
// 1. Initiate OAuth
async function initiateCalendarAuth(userId: string): Promise<string> {
  const state = generateSecureState();
  await storeAuthState(userId, state);

  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', AZURE_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', 'Calendars.ReadWrite User.Read offline_access');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'consent');

  return authUrl.toString();
}

// 2. Handle callback
async function handleCalendarCallback(code: string, state: string): Promise<void> {
  const { userId } = await verifyAuthState(state);

  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();

  // Store encrypted tokens
  await integrationsService.storeCredentials(userId, 'calendar', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  });
}

// 3. Token refresh (automatic)
async function ensureValidToken(userId: string): Promise<string> {
  const credentials = await integrationsService.getCredentials(userId, 'calendar');

  if (credentials.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return credentials.accessToken;  // Token still valid
  }

  // Refresh token
  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await tokenResponse.json();

  await integrationsService.updateCredentials(userId, 'calendar', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || credentials.refreshToken,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  });

  return tokens.access_token;
}
```

---

## 8. UX Design

### Foundational Integration Feel

Calendar should NOT feel like "connecting an integration." It should feel built-in.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING: CALENDAR SETUP                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │                    🗓️ Connect Your Calendar                              │   │
│   │                                                                          │   │
│   │   StratAI works best when it knows your schedule. Connect your           │   │
│   │   calendar to:                                                           │   │
│   │                                                                          │   │
│   │   ✓ Capture meeting decisions and action items                           │   │
│   │   ✓ Know when you're busy or available                                   │   │
│   │   ✓ Schedule follow-up meetings directly                                 │   │
│   │   ✓ Protect your focus time                                              │   │
│   │                                                                          │   │
│   │                                                                          │   │
│   │   ┌───────────────────────────────────────────────────────────────────┐ │   │
│   │   │                                                                    │ │   │
│   │   │   [Microsoft Logo]  Connect Microsoft 365                          │ │   │
│   │   │                                                                    │ │   │
│   │   └───────────────────────────────────────────────────────────────────┘ │   │
│   │                                                                          │   │
│   │   ┌───────────────────────────────────────────────────────────────────┐ │   │
│   │   │                                                                    │ │   │
│   │   │   [Google Logo]  Connect Google Calendar (Coming Soon)             │ │   │
│   │   │                                                                    │ │   │
│   │   └───────────────────────────────────────────────────────────────────┘ │   │
│   │                                                                          │   │
│   │                                         [Skip for now]                   │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Sidebar Calendar Widget

```
┌──────────────────────────────────────────┐
│  StratAI                            [≡]  │
├──────────────────────────────────────────┤
│                                          │
│  📅 TODAY                                │
│  ─────────────────────────               │
│  09:00  Q1 Planning Review               │
│         Sarah, James +3                  │
│         [Capture →]                      │
│                                          │
│  11:30  1:1 with Lisa                    │
│         30 min                           │
│                                          │
│  14:00  Product Demo                     │
│         External                         │
│                                          │
│  ─────────────────────────               │
│  [+ Block Focus Time]                    │
│                                          │
├──────────────────────────────────────────┤
│  SPACES                                  │
│  ▸ StratTech Projects                    │
│  ▸ Personal                              │
│                                          │
└──────────────────────────────────────────┘
```

### Post-Meeting Capture Prompt

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                              [x]                 │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   📝 Meeting just ended                                                  │   │
│   │                                                                          │   │
│   │   Q1 Planning Review                                                     │   │
│   │   with Sarah Chen, James Wilson, and 3 others                            │   │
│   │   9:00 AM - 10:30 AM                                                     │   │
│   │                                                                          │   │
│   │   Would you like to capture what was discussed?                          │   │
│   │                                                                          │   │
│   │   ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐            │   │
│   │   │  📝 Capture Now │  │ ⏰ Remind Later │  │ ✗ Skip       │            │   │
│   │   └─────────────────┘  └─────────────────┘  └──────────────┘            │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. System Prompt Guidelines

### Calendar Context in System Prompt

```markdown
## Calendar Integration

You have access to the user's Microsoft 365 calendar.

### Available Tools

- **calendar_list_events**: See upcoming and past meetings
- **calendar_get_event**: Get details of a specific meeting
- **calendar_create_event**: Schedule meetings or focus time
- **calendar_update_event**: Modify existing events
- **calendar_delete_event**: Remove events (use carefully)
- **calendar_get_free_busy**: Check availability

### Meeting Capture (Primary Use Case)

When a meeting has recently ended:
1. Acknowledge the meeting (subject, attendees)
2. Offer to help capture outcomes
3. Guide through structured capture:
   - Decisions made (who decided, why)
   - Action items (who owns, when due)
   - Follow-up needed
4. Offer to create tasks and schedule follow-ups

### Best Practices

- Always confirm before creating/modifying calendar events
- When scheduling, check free/busy first
- For meetings with external attendees, include video call link
- Focus time blocks should be marked as "busy"
- Keep meeting descriptions concise but informative
```

### Capture Prompt Guidelines

```markdown
### Meeting Capture Conversation

When capturing meeting outcomes, ask in this order:

1. **Decisions**: "What decisions were made in this meeting?"
   - Prompt for WHO made or approved each decision
   - Ask for brief rationale where helpful

2. **Actions**: "Were there any action items or follow-ups?"
   - Get owner for each item (suggest from attendee list)
   - Ask for due dates where appropriate
   - Confirm if items should become Tasks

3. **Follow-up**: "Do you need to schedule any follow-up meetings?"
   - Offer to check availability and create the event
   - Suggest appropriate attendees based on the discussion

4. **Notes**: "Anything else worth capturing for future reference?"
   - Open-ended for context that doesn't fit above
   - Good for "surprising" or "changed my thinking" insights

### Response Format

After capture, present structured summary:

```
**Meeting: [Subject]**
Date: [Date]
Attendees: [Names]

**Decisions:**
1. ✓ [Decision] ([Owner/Approver])

**Action Items:**
1. [ ] [Action] → [Owner] (due: [Date])

**Follow-up:**
• [Meeting name] scheduled for [Date]
```

Offer: [Create Tasks] [Save as Page] [Done]
```

---

## 10. Implementation Details

### Calendar Provider

```typescript
// src/lib/server/integrations/providers/calendar/provider.ts

import { BaseProvider } from '../base-provider';
import { CALENDAR_TOOLS } from './tools';
import { MicrosoftGraphClient } from './client';

export class CalendarProvider extends BaseProvider {
  private client: MicrosoftGraphClient;

  constructor(integration: Integration, credentials: DecryptedCredential[]) {
    super(integration, credentials);

    const accessToken = credentials.find(c => c.type === 'access_token')?.value;
    if (!accessToken) throw new Error('Calendar access token required');

    this.client = new MicrosoftGraphClient(accessToken);
  }

  get serviceType() { return 'calendar' as const; }
  get displayName() { return 'Microsoft 365 Calendar'; }
  get iconUrl() { return '/icons/microsoft.svg'; }
  get tier() { return 'foundational' as const; }  // Foundational, not contextual

  getToolDefinitions(): ToolDefinition[] {
    return CALENDAR_TOOLS;
  }

  async executeTool(
    toolName: string,
    parameters: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolResult> {
    switch (toolName) {
      case 'calendar_list_events':
        return this.listEvents(parameters);
      case 'calendar_get_event':
        return this.getEvent(parameters.eventId as string);
      case 'calendar_create_event':
        return this.createEvent(parameters);
      case 'calendar_update_event':
        return this.updateEvent(parameters);
      case 'calendar_delete_event':
        return this.deleteEvent(parameters.eventId as string);
      case 'calendar_get_free_busy':
        return this.getFreeBusy(parameters);
      case 'calendar_create_focus_time':
        return this.createFocusTime(parameters);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }

  async getContextSummary(): Promise<string> {
    const today = await this.listEvents({
      startDate: startOfDay(new Date()),
      endDate: endOfDay(new Date()),
    });

    if (!today.success || !today.data?.length) {
      return 'Calendar connected. No meetings today.';
    }

    const events = today.data as CalendarEvent[];
    return `
## Today's Calendar

${events.map(e => `- ${format(new Date(e.start.dateTime), 'HH:mm')} ${e.subject} (${e.attendees.length} attendees)`).join('\n')}
    `.trim();
  }

  // ... tool implementations
}
```

### Microsoft Graph Client

```typescript
// src/lib/server/integrations/providers/calendar/client.ts

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class MicrosoftGraphClient {
  constructor(private accessToken: string) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${GRAPH_BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new GraphError(error);
    }

    return response.json();
  }

  async listEvents(params: {
    startDateTime: string;
    endDateTime: string;
    top?: number;
  }): Promise<{ value: GraphEvent[] }> {
    const query = new URLSearchParams({
      startDateTime: params.startDateTime,
      endDateTime: params.endDateTime,
      $top: String(params.top || 20),
      $orderby: 'start/dateTime',
      $select: 'id,subject,start,end,location,attendees,organizer,isOnlineMeeting,onlineMeeting,isCancelled',
    });

    return this.request(`/me/calendarView?${query}`);
  }

  async getEvent(eventId: string): Promise<GraphEvent> {
    return this.request(`/me/events/${eventId}?$expand=attachments`);
  }

  async createEvent(event: CreateEventInput): Promise<GraphEvent> {
    return this.request('/me/events', {
      method: 'POST',
      body: JSON.stringify({
        subject: event.subject,
        start: { dateTime: event.start, timeZone: 'UTC' },
        end: { dateTime: event.end, timeZone: 'UTC' },
        attendees: event.attendees?.map(email => ({
          emailAddress: { address: email },
          type: 'required',
        })),
        body: event.body ? { contentType: 'HTML', content: event.body } : undefined,
        location: event.location ? { displayName: event.location } : undefined,
        isOnlineMeeting: event.isOnlineMeeting ?? true,
        onlineMeetingProvider: event.isOnlineMeeting ? 'teamsForBusiness' : undefined,
      }),
    });
  }

  async updateEvent(eventId: string, updates: Partial<CreateEventInput>): Promise<GraphEvent> {
    return this.request(`/me/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.request(`/me/events/${eventId}`, { method: 'DELETE' });
  }

  async getFreeBusy(params: {
    schedules: string[];
    startTime: string;
    endTime: string;
  }): Promise<{ value: ScheduleInfo[] }> {
    return this.request('/me/calendar/getSchedule', {
      method: 'POST',
      body: JSON.stringify({
        schedules: params.schedules,
        startTime: { dateTime: params.startTime, timeZone: 'UTC' },
        endTime: { dateTime: params.endTime, timeZone: 'UTC' },
        availabilityViewInterval: 30,
      }),
    });
  }
}
```

---

## 11. Security & Privacy

### Data Handling

| Data Type | Storage | Retention |
|-----------|---------|-----------|
| **OAuth tokens** | Encrypted in `integration_credentials` | Until revoked |
| **Calendar event IDs** | `meeting_captures` table | With capture |
| **Event subjects/attendees** | In capture records | Per org policy |
| **Event bodies** | NOT stored (only read) | Not retained |

### Privacy Principles

1. **Minimal Data**: Only store what's needed for capture (IDs, subjects, attendees)
2. **User-Controlled**: User initiates capture; no auto-capture without consent
3. **Delegated Access**: Tokens access only what user can access
4. **Transparent**: Show what data AI accessed in tool usage display
5. **Revocable**: User can disconnect calendar at any time

### What We DON'T Access

- Other users' calendars (unless shared with permission)
- Email content (separate integration)
- Files/attachments (separate integration)
- Tenant admin data (we use delegated, not app permissions)

---

## 12. Success Metrics

### Adoption

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Calendar Connection Rate** | > 80% of active users | Connected / total active |
| **Connection Time** | < 2 minutes | OAuth flow start to complete |
| **Connection Failures** | < 5% | Failed auths / attempts |

### Usage

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Capture Rate** | > 30% of meetings | Captures / eligible meetings |
| **Capture Completion** | > 80% of started | Completed / started captures |
| **Decisions Captured** | > 2 per capture | Average decisions per capture |
| **Actions Captured** | > 3 per capture | Average actions per capture |
| **Task Creation Rate** | > 50% of actions | Tasks created / actions captured |

### Flywheel Impact

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Decision Attribution** | > 90% have owner | Attributed / total decisions |
| **Action Completion** | > 70% within due date | On-time / total tasks |
| **Follow-up Scheduling** | > 40% of captures | Follow-ups created / captures |

---

## 13. Relationship to Meeting Lifecycle

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CALENDAR → MEETING LIFECYCLE RELATIONSHIP                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   CALENDAR INTEGRATION (This Spec)                                               │
│   ─────────────────────────────────                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  Primitives:                                                             │   │
│   │  • Read/write calendar events (Microsoft Graph API)                      │   │
│   │  • OAuth token management                                                │   │
│   │  • Basic capture prompts and extraction                                  │   │
│   │  • Tools: list_events, create_event, get_free_busy, etc.                │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                        │
│                                         │ provides                               │
│                                         ▼                                        │
│   MEETING LIFECYCLE (MEETING_LIFECYCLE.md)                                       │
│   ────────────────────────────────────────                                       │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  Features:                                                               │   │
│   │  • AI-guided meeting creation                                            │   │
│   │  • Intelligent scheduling                                                │   │
│   │  • Meeting prep context surfacing                                        │   │
│   │  • Transcript processing                                                 │   │
│   │  • Full decision/action extraction with human confirmation               │   │
│   │  • Page generation (meeting minutes)                                     │   │
│   │  • Task creation workflow                                                │   │
│   │  • Area context propagation                                              │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                        │
│                                         │ enables                                │
│                                         ▼                                        │
│   DATA FLYWHEEL (PRODUCT_VISION.md)                                              │
│   ─────────────────────────────────                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  Outcome:                                                                │   │
│   │  • Decisions captured with attribution                                   │   │
│   │  • Actions tracked to completion                                         │   │
│   │  • Patterns learned over time                                            │   │
│   │  • "Last time you decided X, Y happened"                                 │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### What Calendar Provides to Meeting Lifecycle

| Calendar Primitive | Meeting Lifecycle Uses It For |
|-------------------|------------------------------|
| `calendar_list_events` | Show upcoming meetings for prep |
| `calendar_get_event` | Get attendees for attribution |
| `calendar_create_event` | Schedule follow-up meetings |
| `calendar_get_free_busy` | Intelligent scheduling |
| Capture prompts | Full extraction workflow |
| OAuth tokens | All Graph API access |

### Implementation Sequence

| Phase | Calendar Integration | Meeting Lifecycle |
|-------|---------------------|-------------------|
| **1** | OAuth, read events, basic capture | — |
| **2** | Create events, focus time | AI-guided creation (uses calendar_create_event) |
| **3** | — | Full extraction workflow |
| **4** | — | Page generation, Area propagation |

---

## Related Documents

- [INTEGRATIONS_ARCHITECTURE.md](./INTEGRATIONS_ARCHITECTURE.md) - Integration layer design
- [MEETING_LIFECYCLE.md](./MEETING_LIFECYCLE.md) - Full meeting journey feature
- [PRODUCT_VISION.md](../product/PRODUCT_VISION.md) - Data flywheel vision
- [CONTEXT_STRATEGY.md](../CONTEXT_STRATEGY.md) - How captured data feeds context

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Microsoft Graph first | StratGroup uses M365; dogfood principle | 2026-01-22 |
| Delegated permissions (not app) | User-scoped access; no admin consent needed | 2026-01-22 |
| Capture focus for V1 | Flywheel depends on capturing decisions; prep is valuable but secondary | 2026-01-22 |
| Full read-write | Higher value (schedule follow-ups, focus time); proves architecture | 2026-01-22 |
| Polling for capture detection | Simple, reliable; webhooks add complexity for V1 | 2026-01-22 |
| Foundational tier (first-party UX) | Calendar shouldn't feel like "an integration" | 2026-01-22 |
| Basic capture in calendar spec | Full extraction belongs in Meeting Lifecycle spec | 2026-01-22 |
