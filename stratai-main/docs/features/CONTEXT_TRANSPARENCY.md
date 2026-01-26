# Context Transparency System

> **Document Purpose:** Feature specification for progressive context disclosure across area, task, and subtask chat interfaces.
>
> **Created:** January 2026
> **Status:** Design Complete - Ready for Implementation
> **Phase:** Context Management Architecture

---

## Executive Summary

**The Problem:** Users don't understand what context the AI has access to. They share documents at the Space level but don't realize they need to activate them at the Area level. They chat referencing documents, and the AI has no idea. This creates silent failures, erodes trust, and makes users feel like they're talking to a black box.

**The Solution:** A progressive context disclosure system that:
1. **Proactively surfaces context** on first message (Context Snapshot Modal)
2. **Maintains ambient awareness** during chat (Ambient Context Indicators)
3. **Explains what was used** in responses (Thinking Attribution)
4. **Catches gaps in real-time** when users reference missing context (Document Mention Detection)

**Design Principles:**
- **Progressive disclosure** — Reveal complexity as users need it
- **Visibility hierarchy** — Org hidden, Group toggleable, Personal prominent
- **Reusable components** — Work identically across Area, Task, and Subtask contexts
- **Clean/clear/premium UX** — Consistent with StratAI design language

---

## Context Visibility Hierarchy

Not all context should be visible to users. Here's the intentional hierarchy:

| Context Layer | Visibility | User Control | Rationale |
|---------------|------------|--------------|-----------|
| **Organization System Prompt** | Hidden | None | Governance/compliance - users shouldn't know it exists |
| **Group Context** | Visible, toggleable | Can disable per-conversation | Team norms, not always relevant to task |
| **Space Context** | Visible, prominent | Can manage in Space settings | Project-level knowledge |
| **Area Notes** | Visible, prominent | Full edit control | User explicitly created this |
| **Activated Documents** | Visible, prominent | Toggle on/off | User chose to activate these |
| **Available Documents** | Visible in modal | Activate button | **KEY GAP** - surfaces unactivated docs |
| **Related Tasks** | Visible | View only | System-determined relationships |

---

## The Three Contexts

This system applies to three distinct chat contexts, all using the same component patterns:

| Context | Route | Parent Entity | Context Sources |
|---------|-------|---------------|-----------------|
| **Area Chat** | `/spaces/[space]/[area]` | Area | Area notes, Area-activated docs, Related tasks |
| **Task Chat** | `/spaces/[space]/task/[taskId]` | Task (in Area) | Task details, Task docs, Parent area context |
| **Subtask Chat** | `/spaces/[space]/task/[taskId]/subtask/[subtaskId]` | Subtask (in Task) | Subtask details, Parent task context, Parent area context |

**Component Reusability:** All components must accept a generic `contextSource` prop that works across these contexts.

---

## Phase 1: Foundation

### 1.1 Ambient Context Indicators

**Location:** Below the chat input, in the footer hints area (alongside "Enter to send", etc.)

**Purpose:** Always-visible summary of what context is active for this conversation.

#### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [textarea for message input]                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Enter to send  ·  Shift+Enter new line                                 │
│                                                                          │
│  [📎 2 docs] [📝 Notes] [🔗 3 tasks] [👥 Team]          45% context     │
│  └─────────────── clickable chips ────────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Chip States

| Chip | Icon | Active State | Inactive State | Click Action |
|------|------|--------------|----------------|--------------|
| Documents | `FileText` | `[📎 2 docs]` blue/primary | `[📎 0 docs]` muted | Expand document list |
| Notes | `StickyNote` | `[📝 Notes]` blue/primary | `[📝 No notes]` muted | Expand notes preview |
| Tasks | `ListTodo` | `[🔗 3 tasks]` blue/primary | `[🔗 0 tasks]` muted | Expand task list |
| Team | `Users` | `[👥 Team]` blue/primary | Hidden when off | Toggle off popover |

#### Expanded States

Clicking a chip expands an inline panel above the indicators:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📎 Active Documents                                           [× Close]│
│  ─────────────────────────────────────────────────────────────────────  │
│  ✓ API-Design-Spec.md                                      [Deactivate] │
│  ✓ Authentication-Notes.md                                 [Deactivate] │
│                                                                          │
│  ⚠ Available but not activated:                                         │
│     Legacy-API-Notes.md                                    [+ Activate] │
│     Security-Requirements.md                               [+ Activate] │
│                                                                          │
│  [Manage Documents...]                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Component Structure

```
src/lib/components/chat/
├── ContextBar.svelte              # Container for all indicators
├── ContextChip.svelte             # Individual clickable chip
├── ContextPanel.svelte            # Expandable panel for chip details
├── panels/
│   ├── DocumentsPanel.svelte      # Document list with activate/deactivate
│   ├── NotesPanel.svelte          # Area notes preview
│   ├── TasksPanel.svelte          # Related tasks list
│   └── TeamPanel.svelte           # Group context toggle
```

#### Props Interface

```typescript
// ContextBar.svelte
interface ContextBarProps {
  contextSource: {
    type: 'area' | 'task' | 'subtask';
    id: string;
    spaceId: string;
    areaId?: string;       // For task/subtask
    taskId?: string;       // For subtask
  };
  disabled?: boolean;
}

// Context data shape (from API/store)
interface ActiveContext {
  documents: {
    active: Array<{ id: string; filename: string; charCount: number }>;
    available: Array<{ id: string; filename: string; charCount: number }>;
  };
  notes: {
    hasNotes: boolean;
    preview?: string;      // First 200 chars
    fullContent?: string;
  };
  relatedTasks: Array<{
    id: string;
    title: string;
    status: string;
    relationship: string;
  }>;
  groupContext: {
    enabled: boolean;
    groupName?: string;
    preview?: string;
  };
}
```

#### Acceptance Criteria

- [ ] **AC1.1.1:** Context bar appears below chat input in Area, Task, and Subtask views
- [ ] **AC1.1.2:** Chips show count badges for documents and tasks (e.g., "2 docs", "3 tasks")
- [ ] **AC1.1.3:** Chips are visually distinct when context exists (primary color) vs. empty (muted)
- [ ] **AC1.1.4:** Clicking a chip expands an inline panel with details
- [ ] **AC1.1.5:** Only one panel can be expanded at a time (clicking another collapses current)
- [ ] **AC1.1.6:** Document panel shows "Available but not activated" section when documents exist in Space but aren't activated in Area
- [ ] **AC1.1.7:** Users can activate/deactivate documents directly from the panel
- [ ] **AC1.1.8:** Team chip is hidden when no group context is available
- [ ] **AC1.1.9:** All interactions work identically across Area, Task, and Subtask contexts
- [ ] **AC1.1.10:** Components support both dark and light themes (DESIGN-SYSTEM.md compliance)
- [ ] **AC1.1.11:** Context bar updates reactively when documents are activated/deactivated

---

### 1.2 Thinking Attribution

**Location:** Inside the ThinkingIndicator component during AI response generation.

**Purpose:** Show users what context is being used as the AI generates a response.

#### Visual Design

**During Generation:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ◉ Thinking (15s)                                                       │
│                                                                          │
│  Using:  📎 API-Spec.md  ·  📝 Area notes  ·  🔗 2 tasks                │
└─────────────────────────────────────────────────────────────────────────┘
```

**After Response Complete (collapsed):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  AI response content here...                                            │
│                                                                          │
│                                           [Context: 3 sources used] 👁   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Expanded (click on "Context: 3 sources used"):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Context used for this response:                                        │
│  ───────────────────────────────────────────────────────────────────    │
│  📎 API-Spec.md              (~4.2k tokens)                             │
│  📝 Area notes               (~800 tokens)                              │
│  🔗 Related: Auth flow task  (~200 tokens)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Component Structure

```
src/lib/components/chat/
├── ThinkingIndicator.svelte       # Existing - enhance with context
├── ThinkingContextBar.svelte      # NEW: Context list during thinking
├── ResponseContextBadge.svelte    # NEW: Collapsed badge after response
├── ResponseContextPanel.svelte    # NEW: Expanded panel on badge click
```

#### Props Interface

```typescript
// ThinkingContextBar.svelte
interface ThinkingContextBarProps {
  context: {
    documents: Array<{ filename: string; tokenEstimate: number }>;
    notes: { included: boolean; tokenEstimate: number };
    tasks: Array<{ title: string; tokenEstimate: number }>;
    groupContext: { included: boolean; tokenEstimate: number };
  };
}

// ResponseContextBadge.svelte
interface ResponseContextBadgeProps {
  sourceCount: number;
  totalTokens: number;
  onexpand: () => void;
}
```

#### Acceptance Criteria

- [ ] **AC1.2.1:** ThinkingIndicator shows context being used during generation
- [ ] **AC1.2.2:** Context items appear as compact chips (icon + name)
- [ ] **AC1.2.3:** After response completes, a subtle badge appears below the message
- [ ] **AC1.2.4:** Badge text: "Context: N sources used" (N = count of context items)
- [ ] **AC1.2.5:** Clicking badge expands to show full context list with token estimates
- [ ] **AC1.2.6:** Expanded panel can be collapsed by clicking badge again or clicking outside
- [ ] **AC1.2.7:** Context data is captured at message send time (not dynamic lookup)
- [ ] **AC1.2.8:** Works across Area, Task, and Subtask chat views
- [ ] **AC1.2.9:** Components support both dark and light themes

---

## Phase 2: Proactive Disclosure

### 2.1 Context Snapshot Modal

**Trigger:** First message in a NEW conversation (not on returns to existing conversations).

**Purpose:** Give users a proactive view of what context the AI will have, with ability to adjust before chatting.

#### Trigger Logic

```typescript
function shouldShowContextModal(
  contextSource: ContextSource,
  conversationId: string | null
): boolean {
  // Only show for new conversations (no existing messages)
  if (conversationId) {
    const conversation = getConversation(conversationId);
    if (conversation && conversation.messageCount > 0) {
      return false; // Existing conversation with history
    }
  }

  // Check "don't show again" preference
  const dismissed = getDismissedContextModals();
  if (dismissed.includes(`${contextSource.type}-${contextSource.id}`)) {
    return false;
  }

  return true; // New conversation, not dismissed
}
```

#### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                    ✕    │
│   📋 Context for this conversation                                      │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   AREA: API Design                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ 📝 Area Notes                                                    │   │
│   │    "OAuth 2.0 with PKCE, REST conventions, rate limiting..."     │   │
│   │                                                       [Edit]     │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   📎 DOCUMENTS                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ ✅ Active in this Area:                                          │   │
│   │    • API-Spec-v2.md                                              │   │
│   │    • Auth-Flow-Diagram.md                                        │   │
│   │                                                                   │   │
│   │ ⚠️ Available but not activated:                                   │   │
│   │    ○ Legacy-API-Notes.md                    [+ Activate]         │   │
│   │    ○ Security-Requirements.md               [+ Activate]         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   👥 TEAM: Engineering                                                   │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ ☑ Include team coding standards                                  │   │
│   │   "TypeScript strict, PR reviews, conventional commits..."       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   🔗 RELATED TASKS                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Implement OAuth flow [in progress]                             │   │
│   │ • Review security requirements [completed]                       │   │
│   │ • Set up rate limiting [pending]                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│                          [Start Chatting]  [Skip for now]               │
│                                                                          │
│   □ Don't show this again for this Area                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Component Structure

```
src/lib/components/chat/
├── ContextSnapshotModal.svelte    # Main modal component
├── sections/
│   ├── NotesSection.svelte        # Area notes with edit link
│   ├── DocumentsSection.svelte    # Active + available docs
│   ├── TeamSection.svelte         # Group context toggle
│   └── TasksSection.svelte        # Related tasks (read-only)
```

#### Props Interface

```typescript
// ContextSnapshotModal.svelte
interface ContextSnapshotModalProps {
  contextSource: {
    type: 'area' | 'task' | 'subtask';
    id: string;
    name: string;
    spaceId: string;
    areaId?: string;
    taskId?: string;
  };
  context: ActiveContext;
  onstart: () => void;          // User clicks "Start Chatting"
  onskip: () => void;           // User clicks "Skip for now"
  ondismiss: () => void;        // User checks "Don't show again"
  onactivate: (docId: string) => void;
  ondeactivate: (docId: string) => void;
  ontoggleteam: (enabled: boolean) => void;
}
```

#### Acceptance Criteria

- [ ] **AC2.1.1:** Modal appears on first message attempt in new conversation
- [ ] **AC2.1.2:** Modal does NOT appear when returning to existing conversation with messages
- [ ] **AC2.1.3:** "Available but not activated" section highlights unactivated Space documents
- [ ] **AC2.1.4:** Users can activate documents directly from modal
- [ ] **AC2.1.5:** Users can toggle group context on/off
- [ ] **AC2.1.6:** "Start Chatting" closes modal and sends the pending message
- [ ] **AC2.1.7:** "Skip for now" closes modal and sends the pending message (no changes)
- [ ] **AC2.1.8:** "Don't show again" persists preference per-Area (or per-Task/Subtask)
- [ ] **AC2.1.9:** Preference stored in localStorage with key pattern: `stratai-context-modal-dismissed-{type}-{id}`
- [ ] **AC2.1.10:** Modal works for Area, Task, and Subtask contexts
- [ ] **AC2.1.11:** Modal is responsive (full-screen on mobile, centered on desktop)
- [ ] **AC2.1.12:** Components support both dark and light themes

---

## Phase 3: Intelligent Detection

### 3.1 Document Mention Detection

**Purpose:** Detect when users reference documents that aren't in their active context and offer to activate them.

**Trigger:** Real-time as user types, or on message submit.

#### Detection Strategy

**Option A: Exact Filename Match (MVP)**
- Simple string matching against known document filenames
- Low false positives, but may miss variations ("the API spec" vs "API-Spec.md")

**Option B: Fuzzy Match + Confirmation (Recommended)**
- Fuzzy matching with confidence threshold
- Show inline suggestion only when confidence > 80%

**Option C: AI-Assisted (Future)**
- Let the LLM identify document references in tool-calling flow
- Most accurate but adds latency

#### Visual Design

**Inline Suggestion (appears above input when detected):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠ You mentioned "Security-Requirements.md" but it's not in your       │
│    context. [+ Activate]  [Dismiss]                                     │
└─────────────────────────────────────────────────────────────────────────┘
│  [textarea for message input]                                            │
```

#### Component Structure

```
src/lib/components/chat/
├── DocumentMentionDetector.svelte  # Logic component (no UI)
├── DocumentSuggestion.svelte       # Inline suggestion banner
```

#### Detection Logic

```typescript
interface DocumentMention {
  filename: string;
  matchedText: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

function detectDocumentMentions(
  inputText: string,
  availableDocuments: Array<{ id: string; filename: string }>,
  activeDocuments: Array<{ id: string; filename: string }>
): DocumentMention[] {
  const mentions: DocumentMention[] = [];

  for (const doc of availableDocuments) {
    // Skip if already active
    if (activeDocuments.some(d => d.id === doc.id)) continue;

    // Check for exact filename match (case-insensitive)
    const filenameRegex = new RegExp(
      escapeRegex(doc.filename.replace(/\.[^.]+$/, '')), // Match without extension
      'gi'
    );

    const matches = inputText.matchAll(filenameRegex);
    for (const match of matches) {
      mentions.push({
        filename: doc.filename,
        matchedText: match[0],
        confidence: 1.0, // Exact match
        startIndex: match.index!,
        endIndex: match.index! + match[0].length
      });
    }
  }

  return mentions;
}
```

#### Acceptance Criteria

- [ ] **AC3.1.1:** Detection runs on input change (debounced 500ms)
- [ ] **AC3.1.2:** Only detects documents that are available but not activated
- [ ] **AC3.1.3:** Suggestion banner appears above input with document name
- [ ] **AC3.1.4:** "Activate" button adds document to context immediately
- [ ] **AC3.1.5:** "Dismiss" button hides suggestion (persists for current message)
- [ ] **AC3.1.6:** Only one suggestion shown at a time (first match wins)
- [ ] **AC3.1.7:** Suggestion disappears when document is activated
- [ ] **AC3.1.8:** Works across Area, Task, and Subtask contexts
- [ ] **AC3.1.9:** No false positives for common words that happen to match filenames
- [ ] **AC3.1.10:** Components support both dark and light themes

---

## Technical Implementation Notes

### Data Flow

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Context API    │ ──▶ │  Context Store   │ ──▶ │  UI Components  │
│  /api/context   │      │  (Svelte 5)      │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

### API Endpoint

```typescript
// GET /api/spaces/[spaceId]/areas/[areaId]/context
// Returns: ActiveContext

// POST /api/spaces/[spaceId]/areas/[areaId]/context/documents
// Body: { documentId: string, action: 'activate' | 'deactivate' }
```

### Store Pattern

```typescript
// src/lib/stores/activeContext.svelte.ts
class ActiveContextStore {
  // Per-context state using SvelteMap
  private contexts = new SvelteMap<string, ActiveContext>();

  // Reactive getters
  getContext(source: ContextSource): ActiveContext | undefined;

  // Actions
  async loadContext(source: ContextSource): Promise<void>;
  async activateDocument(source: ContextSource, docId: string): Promise<void>;
  async deactivateDocument(source: ContextSource, docId: string): Promise<void>;
  async toggleGroupContext(source: ContextSource, enabled: boolean): Promise<void>;
}

export const activeContextStore = new ActiveContextStore();
```

### Integration Points

1. **ChatInput.svelte** — Add ContextBar below input
2. **ThinkingIndicator.svelte** — Add ThinkingContextBar
3. **ChatMessage.svelte** — Add ResponseContextBadge to assistant messages
4. **Area/Task/Subtask pages** — Add ContextSnapshotModal logic

---

## Open Questions

1. **Token budget display:** Should we show estimated token usage per context item in the indicators?
   - *Leaning yes* — helps users understand cost/benefit

2. **Context Panel position:** Inline expansion vs. slide-out drawer?
   - *Leaning inline* — keeps user in flow, no modal fatigue

3. **Persistence scope:** "Don't show again" per-Area or per-user globally?
   - *Leaning per-Area* — different areas have different context needs

4. **Mobile UX:** Bottom sheet for modal, or full-screen?
   - *Leaning bottom sheet* — matches existing modal patterns

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Document activation rate | Unknown | +30% | Analytics: activate events from modal |
| "No context" failures | Unknown | -50% | AI logs: responses mentioning missing context |
| Context modal skip rate | N/A | <40% | Track "Skip for now" vs "Start Chatting" |
| User trust score | Survey | +15% | Quarterly NPS on "AI understands my context" |

---

## Implementation Phases

### Phase 1: Foundation (Target: 1-2 weeks)
- [ ] Create ContextBar component with chips
- [ ] Create expandable panels for each context type
- [ ] Integrate with ChatInput
- [ ] Create ThinkingContextBar
- [ ] Create ResponseContextBadge
- [ ] Test across Area/Task/Subtask

### Phase 2: Proactive Disclosure (Target: 1 week)
- [ ] Create ContextSnapshotModal
- [ ] Implement trigger logic (new conversation detection)
- [ ] Add "Don't show again" persistence
- [ ] Test activation flow from modal

### Phase 3: Intelligent Detection (Target: 1-2 weeks)
- [ ] Implement document mention detection
- [ ] Create DocumentSuggestion banner
- [ ] Tune for false positive rate
- [ ] Test across various document naming patterns

---

## References

- `DESIGN-SYSTEM.md` — UI patterns and theme support
- `context-loading-architecture.md` — Context loading strategy
- `ChatInput.svelte` — Integration point for ContextBar
- `ThinkingIndicator.svelte` — Integration point for ThinkingContextBar
- `ContextIndicator.svelte` — Reference for chip/badge patterns

---

*This document should be updated as implementation progresses. The Context Transparency system is essential for building user trust in StratAI's context-aware AI experience.*
