# Guided Creation System

> **Status:** Design Complete | **Priority:** High | **First Template:** Meeting Notes

Structured document creation that produces quality-controlled outputs and organizational context.

---

## Executive Summary

Guided Creation transforms document templates from "empty structures to fill" into **intelligent data capture flows** that produce:

1. **Populated documents** with consistent quality
2. **Entity creation** (Tasks, Decisions) automatically
3. **Organizational context** that bubbles up through the hierarchy

This is not a form wizard. It's a conversational interview that collects structured data, renders it into professional documents, and creates actionable artifacts.

---

## Table of Contents

1. [Vision & Value Proposition](#1-vision--value-proposition)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Data Types](#3-core-data-types)
4. [Meeting Notes Specification](#4-meeting-notes-specification)
5. [Implementation Phases](#5-implementation-phases)
6. [Future Templates](#6-future-templates)
7. [Admin Template Editor (Future)](#7-admin-template-editor-future)
8. [Context Strategy Integration](#8-context-strategy-integration)

---

## 1. Vision & Value Proposition

### The Problem

Traditional document creation:
- User picks template → sees empty sections → faces blank page anxiety
- Quality varies wildly by author
- Meeting outcomes stay trapped in documents
- No connection to task/project management
- Context is lost after the meeting

### The Solution

Guided Creation:
- User answers focused questions → AI renders professional document
- Standardized quality enforced by structure
- Action items become Tasks automatically
- Decisions feed organizational memory
- Meetings become **context generators** that permeate the organization

### The Insight

**Templates are data schemas, not just layouts.**

```
Traditional:  Template → Empty Document → User fills sections
Guided:       Interview → Structured JSON → Rendered Document + Entities
```

The same JSON data can:
- Render into a TipTap document
- Create Task entities
- Feed the Context Strategy memory system
- Power search and analytics
- Re-render if template structure changes

### Value for Organizations

| Benefit | Description |
|---------|-------------|
| **Standardized Quality** | All meeting notes follow the same structure |
| **Automatic Workflows** | Action items become tasks without manual entry |
| **Organizational Memory** | Decisions and outcomes feed context hierarchy |
| **Reduced Friction** | Guided questions faster than blank sections |
| **Accountability** | Clear owners on decisions and actions |

---

## 2. Architecture Overview

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Template Definition                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Data Schema  │  │ Step Config  │  │ TipTap Template       │  │
│  │ (TypeScript) │  │ (UI flow)    │  │ (render structure)    │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GuidedCreationFlow Component                    │
│  - Renders step cards from config                               │
│  - Collects user input                                          │
│  - Validates data                                               │
│  - Outputs structured JSON                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Template Renderer                            │
│  - Takes JSON data + TipTap template definition                 │
│  - Produces populated document content                          │
│  - Returns entity creation instructions                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
           ┌──────────────┐    ┌──────────────────┐
           │   Document   │    │ Entity Creation  │
           │   (TipTap)   │    │ (Tasks, etc.)    │
           └──────────────┘    └──────────────────┘
```

### Component Structure

```
src/lib/
├── types/
│   └── guided-creation.ts          # Core type definitions
├── config/
│   └── template-schemas/
│       ├── index.ts                # Schema registry
│       └── meeting-notes.ts        # Meeting notes schema
├── components/
│   └── guided-creation/
│       ├── GuidedCreationFlow.svelte    # Main orchestrator
│       ├── StepCard.svelte              # Individual step wrapper
│       ├── ProgressIndicator.svelte     # Step progress dots
│       ├── steps/                       # Step type components
│       │   ├── TextStep.svelte
│       │   ├── DateTimeStep.svelte
│       │   ├── AttendeesStep.svelte
│       │   ├── ListStep.svelte
│       │   ├── DecisionsStep.svelte
│       │   └── ActionItemsStep.svelte
│       └── index.ts
├── services/
│   └── template-renderer.ts        # JSON → TipTap conversion
└── utils/
    └── guided-creation-helpers.ts  # Validation, defaults
```

---

## 3. Core Data Types

### Base Types

```typescript
// src/lib/types/guided-creation.ts

/**
 * Supported field types for guided creation steps
 */
export type FieldType =
  | 'text'           // Single line text
  | 'textarea'       // Multi-line text
  | 'datetime'       // Date and time picker
  | 'date'           // Date only
  | 'user-select'    // Single user from Space/Area
  | 'user-multi'     // Multiple users
  | 'attendees'      // Internal + external attendees
  | 'list'           // Repeatable text items
  | 'decisions'      // Decision with owner + rationale
  | 'action-items';  // Actions with assignee + due + create task

/**
 * Single field definition within a step
 */
export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: unknown | (() => unknown);
}

/**
 * A step in the guided creation flow
 */
export interface StepDefinition {
  id: string;
  title: string;
  description?: string;
  fields: FieldDefinition[];
  optional?: boolean;  // Can be skipped entirely
}

/**
 * Entity to create from collected data
 */
export interface EntityCreationRule {
  type: 'task';  // Future: 'decision', 'memory'
  sourceField: string;  // Which field contains the data
  mapping: Record<string, string>;  // Field mapping
  condition?: string;  // e.g., "item.createTask === true"
}

/**
 * Complete template schema definition
 */
export interface TemplateSchema {
  type: PageType;
  version: number;
  steps: StepDefinition[];
  entityCreation?: EntityCreationRule[];
}

/**
 * Collected data from guided creation
 */
export interface GuidedCreationData {
  templateType: PageType;
  schemaVersion: number;
  collectedAt: string;  // ISO timestamp
  data: Record<string, unknown>;
  entityCreationResults?: EntityCreationResult[];
}

/**
 * Result of creating an entity
 */
export interface EntityCreationResult {
  type: 'task';
  id: string;
  title: string;
  success: boolean;
  error?: string;
}
```

### Meeting Notes Data Type

```typescript
// src/lib/types/meeting-notes-data.ts

import type { UserId } from '$lib/types/user';

/**
 * External attendee (not in the system)
 */
export interface ExternalAttendee {
  name: string;
  organization?: string;
  email?: string;
}

/**
 * A decision made in the meeting
 */
export interface MeetingDecision {
  id: string;
  text: string;
  ownerId?: UserId;
  rationale?: string;
}

/**
 * An action item from the meeting
 */
export interface MeetingActionItem {
  id: string;
  text: string;
  assigneeId?: UserId;
  dueDate?: string;  // ISO date
  createTask: boolean;
}

/**
 * Complete meeting notes data structure
 */
export interface MeetingNotesData {
  // Basics
  title: string;
  datetime: string;  // ISO datetime

  // Attendees
  attendees: {
    internal: UserId[];
    external: ExternalAttendee[];
  };

  // Context
  purpose: string;
  includeAreaContext: boolean;
  agendaItems?: string[];

  // Outcomes
  discussionNotes?: string;
  outcomes: string[];

  // Decisions & Actions
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
}
```

---

## 4. Meeting Notes Specification

### Step-by-Step Flow

#### Step 1: Basics
**Purpose:** Capture meeting identity

| Field | Type | Required | Default |
|-------|------|----------|---------|
| title | text | Yes | - |
| datetime | datetime | Yes | Current time |

**UI Notes:**
- Title placeholder: "Q1 Planning Meeting"
- Datetime supports natural language: "yesterday 2pm", "tomorrow morning"
- Smart default: current date/time

#### Step 2: Attendees
**Purpose:** Who was there

| Field | Type | Required | Default |
|-------|------|----------|---------|
| attendees | attendees | No | - |

**UI Notes:**
- Internal attendees: Checkboxes from Space/Area members
- Search to find users not shown
- External attendees: Name + optional org/email
- Can add multiple external attendees

#### Step 3: Context
**Purpose:** What was this meeting about

| Field | Type | Required | Default |
|-------|------|----------|---------|
| purpose | textarea | Yes | - |
| includeAreaContext | toggle | No | true |
| agendaItems | list | No | - |

**UI Notes:**
- Purpose placeholder: "Discuss and finalize..."
- Area context toggle shows preview of what will be included
- Agenda items are optional, can add multiple

#### Step 4: Outcomes
**Purpose:** What happened and what was decided

| Field | Type | Required | Default |
|-------|------|----------|---------|
| discussionNotes | textarea | No | - |
| outcomes | list | No | - |
| decisions | decisions | No | - |

**UI Notes:**
- Can skip this step if meeting hasn't happened yet (pre-meeting doc)
- Each decision has optional owner (from attendees) and rationale
- Decisions are structured for future context bubbling

> **CONTEXT STRATEGY NOTE:** Decisions captured here should feed into the Area's
> context memory. When users later ask "what decisions have we made about X?",
> this structured data enables accurate retrieval. See CONTEXT_STRATEGY.md
> Phase 3 (Shared Context) for the memory proposal system this will integrate with.

#### Step 5: Action Items
**Purpose:** What needs to happen next

| Field | Type | Required | Default |
|-------|------|----------|---------|
| actionItems | action-items | No | - |

**UI Notes:**
- Each action item has:
  - Task description (text)
  - Assignee (from attendees, optional)
  - Due date (optional)
  - "Create as Task" checkbox (default: true)
- Items with "Create as Task" checked will create actual Task entities
- Tasks created in current Area

### Template Rendering

The `MeetingNotesData` renders to this TipTap structure:

```
# {title}
**Date:** {datetime formatted}
**Attendees:** {names joined}

## Purpose
{purpose}
{if includeAreaContext: area context block}

## Agenda
- {agendaItems...}

## Discussion
{discussionNotes}

## Key Outcomes
- {outcomes...}

## Decisions Made
{for each decision:}
### {decision.text}
**Owner:** {owner name}
**Rationale:** {rationale}

## Action Items
- [ ] {action.text} — @{assignee} (Due: {dueDate})
```

### Entity Creation

After document creation, for each action item where `createTask === true`:

```typescript
const task = await createTask({
  title: actionItem.text,
  spaceId: currentSpaceId,
  areaId: currentAreaId,
  assigneeId: actionItem.assigneeId,
  dueDate: actionItem.dueDate,
  sourceType: 'document',
  sourceDocumentId: newDocument.id,
  status: 'active'
});
```

---

## 5. Implementation Phases

### Phase 1: Core Types & Schema Registry (1 context window)

**Objective:** Establish type foundation and schema registration system.

**Files to Create:**
```
src/lib/types/guided-creation.ts
src/lib/types/meeting-notes-data.ts
src/lib/config/template-schemas/index.ts
src/lib/config/template-schemas/meeting-notes.ts
```

**Implementation:**

1. Create `guided-creation.ts` with all base types from Section 3
2. Create `meeting-notes-data.ts` with Meeting Notes specific types
3. Create schema registry in `template-schemas/index.ts`:

```typescript
// src/lib/config/template-schemas/index.ts
import type { TemplateSchema } from '$lib/types/guided-creation';
import type { PageType } from '$lib/types/page';
import { MEETING_NOTES_SCHEMA } from './meeting-notes';

export const TEMPLATE_SCHEMAS: Partial<Record<PageType, TemplateSchema>> = {
  meeting_notes: MEETING_NOTES_SCHEMA,
};

export function getTemplateSchema(type: PageType): TemplateSchema | null {
  return TEMPLATE_SCHEMAS[type] ?? null;
}

export function hasGuidedCreation(type: PageType): boolean {
  return type in TEMPLATE_SCHEMAS;
}
```

4. Create `meeting-notes.ts` with step definitions:

```typescript
// src/lib/config/template-schemas/meeting-notes.ts
import type { TemplateSchema } from '$lib/types/guided-creation';

export const MEETING_NOTES_SCHEMA: TemplateSchema = {
  type: 'meeting_notes',
  version: 1,
  steps: [
    {
      id: 'basics',
      title: 'Meeting Details',
      fields: [
        {
          id: 'title',
          type: 'text',
          label: "What's this meeting about?",
          placeholder: 'Q1 Planning Meeting',
          required: true
        },
        {
          id: 'datetime',
          type: 'datetime',
          label: 'When did it happen?',
          required: true,
          defaultValue: () => new Date().toISOString()
        }
      ]
    },
    {
      id: 'attendees',
      title: 'Attendees',
      optional: true,
      fields: [
        {
          id: 'attendees',
          type: 'attendees',
          label: 'Who attended?',
          hint: 'Select team members and add external participants'
        }
      ]
    },
    {
      id: 'context',
      title: 'Context',
      fields: [
        {
          id: 'purpose',
          type: 'textarea',
          label: 'What was the purpose of this meeting?',
          placeholder: 'Discuss and finalize...',
          required: true
        },
        {
          id: 'includeAreaContext',
          type: 'toggle',
          label: 'Include Area context',
          defaultValue: true
        },
        {
          id: 'agendaItems',
          type: 'list',
          label: 'Agenda items',
          placeholder: 'Add agenda item...',
          hint: 'Optional'
        }
      ]
    },
    {
      id: 'outcomes',
      title: 'Outcomes & Decisions',
      optional: true,
      fields: [
        {
          id: 'discussionNotes',
          type: 'textarea',
          label: 'Discussion notes',
          placeholder: 'Key points discussed...',
          hint: 'Optional summary of the discussion'
        },
        {
          id: 'outcomes',
          type: 'list',
          label: 'Key outcomes',
          placeholder: 'Add outcome...'
        },
        {
          id: 'decisions',
          type: 'decisions',
          label: 'Decisions made',
          hint: 'Capture decisions with owners'
        }
      ]
    },
    {
      id: 'actions',
      title: 'Action Items',
      optional: true,
      fields: [
        {
          id: 'actionItems',
          type: 'action-items',
          label: 'Follow-up actions',
          hint: 'Items marked "Create as Task" will be added to this Area'
        }
      ]
    }
  ],
  entityCreation: [
    {
      type: 'task',
      sourceField: 'actionItems',
      condition: 'item.createTask === true',
      mapping: {
        title: 'text',
        assigneeId: 'assigneeId',
        dueDate: 'dueDate'
      }
    }
  ]
};
```

**Acceptance Tests:**

```typescript
// Phase 1 Acceptance Tests

describe('Core Types', () => {
  test('MeetingNotesData interface accepts valid data', () => {
    const data: MeetingNotesData = {
      title: 'Test Meeting',
      datetime: new Date().toISOString(),
      attendees: { internal: [], external: [] },
      purpose: 'Test purpose',
      includeAreaContext: true,
      outcomes: [],
      decisions: [],
      actionItems: []
    };
    expect(data).toBeDefined();
  });
});

describe('Schema Registry', () => {
  test('getTemplateSchema returns meeting_notes schema', () => {
    const schema = getTemplateSchema('meeting_notes');
    expect(schema).not.toBeNull();
    expect(schema?.type).toBe('meeting_notes');
  });

  test('getTemplateSchema returns null for unsupported types', () => {
    const schema = getTemplateSchema('general');
    expect(schema).toBeNull();
  });

  test('hasGuidedCreation returns true for meeting_notes', () => {
    expect(hasGuidedCreation('meeting_notes')).toBe(true);
  });

  test('hasGuidedCreation returns false for general', () => {
    expect(hasGuidedCreation('general')).toBe(false);
  });

  test('meeting notes schema has 5 steps', () => {
    const schema = getTemplateSchema('meeting_notes');
    expect(schema?.steps).toHaveLength(5);
  });

  test('meeting notes schema steps are in correct order', () => {
    const schema = getTemplateSchema('meeting_notes');
    const stepIds = schema?.steps.map(s => s.id);
    expect(stepIds).toEqual(['basics', 'attendees', 'context', 'outcomes', 'actions']);
  });
});
```

---

### Phase 2: GuidedCreationFlow Component (1 context window)

**Objective:** Build the main orchestrator component that renders steps and manages state.

**Files to Create:**
```
src/lib/components/guided-creation/GuidedCreationFlow.svelte
src/lib/components/guided-creation/ProgressIndicator.svelte
src/lib/components/guided-creation/StepCard.svelte
src/lib/components/guided-creation/index.ts
src/lib/stores/guidedCreation.svelte.ts
```

**Implementation:**

1. Create store for guided creation state:

```typescript
// src/lib/stores/guidedCreation.svelte.ts
import type { TemplateSchema, GuidedCreationData } from '$lib/types/guided-creation';

interface GuidedCreationState {
  isActive: boolean;
  schema: TemplateSchema | null;
  currentStepIndex: number;
  data: Record<string, unknown>;
  spaceId: string | null;
  areaId: string | null;
}

function createGuidedCreationStore() {
  let state = $state<GuidedCreationState>({
    isActive: false,
    schema: null,
    currentStepIndex: 0,
    data: {},
    spaceId: null,
    areaId: null
  });

  return {
    get isActive() { return state.isActive; },
    get schema() { return state.schema; },
    get currentStepIndex() { return state.currentStepIndex; },
    get currentStep() {
      return state.schema?.steps[state.currentStepIndex] ?? null;
    },
    get data() { return state.data; },
    get totalSteps() { return state.schema?.steps.length ?? 0; },
    get canGoBack() { return state.currentStepIndex > 0; },
    get canGoForward() { return state.currentStepIndex < (state.schema?.steps.length ?? 1) - 1; },
    get isLastStep() { return state.currentStepIndex === (state.schema?.steps.length ?? 1) - 1; },

    start(schema: TemplateSchema, spaceId: string, areaId: string | null) {
      state = {
        isActive: true,
        schema,
        currentStepIndex: 0,
        data: initializeDefaults(schema),
        spaceId,
        areaId
      };
    },

    nextStep() {
      if (state.currentStepIndex < (state.schema?.steps.length ?? 1) - 1) {
        state.currentStepIndex++;
      }
    },

    previousStep() {
      if (state.currentStepIndex > 0) {
        state.currentStepIndex--;
      }
    },

    goToStep(index: number) {
      if (index >= 0 && index < (state.schema?.steps.length ?? 0)) {
        state.currentStepIndex = index;
      }
    },

    updateField(fieldId: string, value: unknown) {
      state.data = { ...state.data, [fieldId]: value };
    },

    getData(): GuidedCreationData {
      return {
        templateType: state.schema!.type,
        schemaVersion: state.schema!.version,
        collectedAt: new Date().toISOString(),
        data: state.data
      };
    },

    reset() {
      state = {
        isActive: false,
        schema: null,
        currentStepIndex: 0,
        data: {},
        spaceId: null,
        areaId: null
      };
    }
  };
}

function initializeDefaults(schema: TemplateSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const step of schema.steps) {
    for (const field of step.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.id] = typeof field.defaultValue === 'function'
          ? field.defaultValue()
          : field.defaultValue;
      }
    }
  }
  return defaults;
}

export const guidedCreationStore = createGuidedCreationStore();
```

2. Create ProgressIndicator component:

```svelte
<!-- src/lib/components/guided-creation/ProgressIndicator.svelte -->
<script lang="ts">
  interface Props {
    totalSteps: number;
    currentStep: number;
    onStepClick?: (index: number) => void;
  }

  let { totalSteps, currentStep, onStepClick }: Props = $props();
</script>

<div class="progress-indicator">
  {#each Array(totalSteps) as _, index}
    <button
      type="button"
      class="step-dot"
      class:completed={index < currentStep}
      class:current={index === currentStep}
      class:upcoming={index > currentStep}
      onclick={() => onStepClick?.(index)}
      disabled={index > currentStep}
      aria-label="Step {index + 1}"
    >
      {#if index < currentStep}
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
      {/if}
    </button>
    {#if index < totalSteps - 1}
      <div class="step-line" class:completed={index < currentStep}></div>
    {/if}
  {/each}
</div>

<style>
  .progress-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 1rem 0;
  }

  .step-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--surface-300);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 150ms ease;
    padding: 0;
  }

  .step-dot:disabled {
    cursor: not-allowed;
  }

  .step-dot.completed {
    background: var(--accent-500);
    border-color: var(--accent-500);
    color: white;
  }

  .step-dot.completed svg {
    width: 14px;
    height: 14px;
  }

  .step-dot.current {
    border-color: var(--accent-500);
    background: var(--accent-500);
  }

  .step-dot.upcoming {
    border-color: var(--surface-300);
  }

  .step-line {
    width: 32px;
    height: 2px;
    background: var(--surface-300);
    transition: background 150ms ease;
  }

  .step-line.completed {
    background: var(--accent-500);
  }
</style>
```

3. Create StepCard wrapper:

```svelte
<!-- src/lib/components/guided-creation/StepCard.svelte -->
<script lang="ts">
  import type { StepDefinition } from '$lib/types/guided-creation';

  interface Props {
    step: StepDefinition;
    children: import('svelte').Snippet;
  }

  let { step, children }: Props = $props();
</script>

<div class="step-card">
  <div class="step-header">
    <h3>{step.title}</h3>
    {#if step.description}
      <p class="step-description">{step.description}</p>
    {/if}
    {#if step.optional}
      <span class="optional-badge">Optional</span>
    {/if}
  </div>

  <div class="step-content">
    {@render children()}
  </div>
</div>

<style>
  .step-card {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .step-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .step-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .step-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .optional-badge {
    display: inline-block;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    background: var(--surface-100);
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    width: fit-content;
  }

  .step-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
</style>
```

4. Create main GuidedCreationFlow component:

```svelte
<!-- src/lib/components/guided-creation/GuidedCreationFlow.svelte -->
<script lang="ts">
  import type { TemplateSchema, GuidedCreationData } from '$lib/types/guided-creation';
  import { guidedCreationStore } from '$lib/stores/guidedCreation.svelte';
  import ProgressIndicator from './ProgressIndicator.svelte';
  import StepCard from './StepCard.svelte';
  // Step field components imported in Phase 3

  interface Props {
    schema: TemplateSchema;
    spaceId: string;
    areaId: string | null;
    onComplete: (data: GuidedCreationData) => void;
    onCancel: () => void;
  }

  let { schema, spaceId, areaId, onComplete, onCancel }: Props = $props();

  // Initialize store on mount
  $effect(() => {
    guidedCreationStore.start(schema, spaceId, areaId);
    return () => guidedCreationStore.reset();
  });

  function handleNext() {
    if (guidedCreationStore.isLastStep) {
      onComplete(guidedCreationStore.getData());
    } else {
      guidedCreationStore.nextStep();
    }
  }

  function handleBack() {
    guidedCreationStore.previousStep();
  }

  function handleSkipStep() {
    guidedCreationStore.nextStep();
  }

  function handleStepClick(index: number) {
    guidedCreationStore.goToStep(index);
  }
</script>

<div class="guided-creation-flow">
  <div class="flow-header">
    <ProgressIndicator
      totalSteps={guidedCreationStore.totalSteps}
      currentStep={guidedCreationStore.currentStepIndex}
      onStepClick={handleStepClick}
    />
    <span class="template-badge">{schema.type.replace('_', ' ')}</span>
  </div>

  <div class="flow-content">
    {#if guidedCreationStore.currentStep}
      <StepCard step={guidedCreationStore.currentStep}>
        <!-- Step fields rendered here - Phase 3 -->
        <div class="step-fields-placeholder">
          <p>Step fields will render here</p>
        </div>
      </StepCard>
    {/if}
  </div>

  <div class="flow-footer">
    <div class="footer-left">
      {#if guidedCreationStore.currentStep?.optional}
        <button type="button" class="btn-text" onclick={handleSkipStep}>
          Skip this step
        </button>
      {/if}
    </div>
    <div class="footer-right">
      <button type="button" class="btn-secondary" onclick={onCancel}>
        Cancel
      </button>
      {#if guidedCreationStore.canGoBack}
        <button type="button" class="btn-secondary" onclick={handleBack}>
          Back
        </button>
      {/if}
      <button type="button" class="btn-primary" onclick={handleNext}>
        {guidedCreationStore.isLastStep ? 'Create Document' : 'Next'}
      </button>
    </div>
  </div>
</div>

<style>
  .guided-creation-flow {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 400px;
  }

  .flow-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--surface-200);
  }

  .template-badge {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-tertiary);
    margin-top: 0.5rem;
  }

  .flow-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .flow-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--surface-200);
  }

  .footer-left {
    flex: 1;
  }

  .footer-right {
    display: flex;
    gap: 0.75rem;
  }

  .btn-text {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.5rem;
  }

  .btn-text:hover {
    color: var(--text-primary);
  }

  .btn-secondary {
    padding: 0.5rem 1rem;
    border: 1px solid var(--surface-300);
    background: transparent;
    color: var(--text-primary);
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn-secondary:hover {
    background: var(--surface-100);
  }

  .btn-primary {
    padding: 0.5rem 1.25rem;
    border: none;
    background: var(--accent-500);
    color: white;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-primary:hover {
    background: var(--accent-600);
  }

  .step-fields-placeholder {
    padding: 2rem;
    background: var(--surface-50);
    border-radius: 8px;
    text-align: center;
    color: var(--text-tertiary);
  }
</style>
```

**Acceptance Tests:**

```typescript
// Phase 2 Acceptance Tests

describe('GuidedCreationStore', () => {
  beforeEach(() => {
    guidedCreationStore.reset();
  });

  test('start() initializes state correctly', () => {
    guidedCreationStore.start(MEETING_NOTES_SCHEMA, 'space-1', 'area-1');
    expect(guidedCreationStore.isActive).toBe(true);
    expect(guidedCreationStore.currentStepIndex).toBe(0);
    expect(guidedCreationStore.totalSteps).toBe(5);
  });

  test('nextStep() advances to next step', () => {
    guidedCreationStore.start(MEETING_NOTES_SCHEMA, 'space-1', 'area-1');
    guidedCreationStore.nextStep();
    expect(guidedCreationStore.currentStepIndex).toBe(1);
  });

  test('previousStep() goes back', () => {
    guidedCreationStore.start(MEETING_NOTES_SCHEMA, 'space-1', 'area-1');
    guidedCreationStore.nextStep();
    guidedCreationStore.previousStep();
    expect(guidedCreationStore.currentStepIndex).toBe(0);
  });

  test('canGoBack is false on first step', () => {
    guidedCreationStore.start(MEETING_NOTES_SCHEMA, 'space-1', 'area-1');
    expect(guidedCreationStore.canGoBack).toBe(false);
  });

  test('isLastStep is true on final step', () => {
    guidedCreationStore.start(MEETING_NOTES_SCHEMA, 'space-1', 'area-1');
    for (let i = 0; i < 4; i++) {
      guidedCreationStore.nextStep();
    }
    expect(guidedCreationStore.isLastStep).toBe(true);
  });

  test('updateField() updates data', () => {
    guidedCreationStore.start(MEETING_NOTES_SCHEMA, 'space-1', 'area-1');
    guidedCreationStore.updateField('title', 'Test Meeting');
    expect(guidedCreationStore.data.title).toBe('Test Meeting');
  });

  test('getData() returns complete data structure', () => {
    guidedCreationStore.start(MEETING_NOTES_SCHEMA, 'space-1', 'area-1');
    guidedCreationStore.updateField('title', 'Test Meeting');
    const data = guidedCreationStore.getData();
    expect(data.templateType).toBe('meeting_notes');
    expect(data.data.title).toBe('Test Meeting');
    expect(data.collectedAt).toBeDefined();
  });
});

describe('GuidedCreationFlow Component', () => {
  test('renders progress indicator with correct steps', () => {
    // Mount component with schema
    // Verify 5 dots rendered
  });

  test('shows current step content', () => {
    // Mount component
    // Verify first step title "Meeting Details" visible
  });

  test('Next button advances step', () => {
    // Mount, click Next
    // Verify step 2 visible
  });

  test('Back button returns to previous step', () => {
    // Mount, go to step 2, click Back
    // Verify step 1 visible
  });

  test('Skip button visible on optional steps', () => {
    // Mount, advance to "Attendees" step (optional)
    // Verify "Skip this step" visible
  });

  test('Create Document button on last step', () => {
    // Mount, advance to last step
    // Verify button text is "Create Document"
  });

  test('onComplete called with data on final submit', () => {
    // Mount with mock onComplete
    // Fill data, advance to end, click Create
    // Verify onComplete called with data
  });

  test('onCancel called when Cancel clicked', () => {
    // Mount with mock onCancel
    // Click Cancel
    // Verify onCancel called
  });
});
```

---

### Phase 3: Step Field Components (1-2 context windows)

**Objective:** Build the individual field type components for rendering step inputs.

**Files to Create:**
```
src/lib/components/guided-creation/fields/TextField.svelte
src/lib/components/guided-creation/fields/TextAreaField.svelte
src/lib/components/guided-creation/fields/DateTimeField.svelte
src/lib/components/guided-creation/fields/ToggleField.svelte
src/lib/components/guided-creation/fields/ListField.svelte
src/lib/components/guided-creation/fields/AttendeesField.svelte
src/lib/components/guided-creation/fields/DecisionsField.svelte
src/lib/components/guided-creation/fields/ActionItemsField.svelte
src/lib/components/guided-creation/fields/index.ts
src/lib/components/guided-creation/FieldRenderer.svelte
```

**Files to Modify:**
```
src/lib/components/guided-creation/GuidedCreationFlow.svelte
```

**Implementation Notes:**

Each field component follows this interface:
```typescript
interface FieldProps {
  field: FieldDefinition;
  value: unknown;
  onUpdate: (value: unknown) => void;
  spaceId?: string;
  areaId?: string;
}
```

**Key Components:**

1. **TextField** - Simple text input with label, placeholder, required indicator
2. **TextAreaField** - Multi-line text with auto-resize
3. **DateTimeField** - Date/time picker with natural language support
4. **ToggleField** - Boolean toggle with label
5. **ListField** - Add/remove repeatable text items
6. **AttendeesField** - User selection (internal) + freeform (external)
7. **DecisionsField** - Decision text + owner select + rationale
8. **ActionItemsField** - Task text + assignee + due date + create toggle

**FieldRenderer** maps field type to component:
```svelte
{#if field.type === 'text'}
  <TextField {field} {value} {onUpdate} />
{:else if field.type === 'textarea'}
  <TextAreaField {field} {value} {onUpdate} />
{:else if field.type === 'datetime'}
  <DateTimeField {field} {value} {onUpdate} />
<!-- ... etc -->
{/if}
```

**Acceptance Tests:**

```typescript
// Phase 3 Acceptance Tests

describe('TextField', () => {
  test('renders label from field definition', () => {});
  test('shows required indicator when required', () => {});
  test('calls onUpdate when value changes', () => {});
  test('shows placeholder text', () => {});
});

describe('DateTimeField', () => {
  test('renders with default value', () => {});
  test('parses natural language input "today"', () => {});
  test('parses natural language input "yesterday 2pm"', () => {});
  test('shows formatted date in input', () => {});
});

describe('ListField', () => {
  test('renders existing items', () => {});
  test('adds new item on button click', () => {});
  test('removes item on delete click', () => {});
  test('updates item text on change', () => {});
});

describe('AttendeesField', () => {
  test('shows internal user checkboxes from Space/Area', () => {});
  test('allows adding external attendees', () => {});
  test('shows external attendee name and org', () => {});
  test('removes external attendee on delete', () => {});
});

describe('DecisionsField', () => {
  test('adds new decision with empty fields', () => {});
  test('shows owner dropdown with attendees', () => {});
  test('rationale is optional/collapsible', () => {});
});

describe('ActionItemsField', () => {
  test('adds new action item', () => {});
  test('shows assignee dropdown with attendees', () => {});
  test('shows due date picker', () => {});
  test('Create as Task checkbox defaults to true', () => {});
});

describe('FieldRenderer', () => {
  test('renders TextField for type "text"', () => {});
  test('renders DateTimeField for type "datetime"', () => {});
  test('renders AttendeesField for type "attendees"', () => {});
  // ... test all field types
});
```

---

### Phase 4: Template Renderer (1 context window)

**Objective:** Convert collected JSON data into TipTap document content.

**Files to Create:**
```
src/lib/services/template-renderer.ts
src/lib/services/template-renderers/meeting-notes-renderer.ts
```

**Implementation:**

1. Create base renderer interface:

```typescript
// src/lib/services/template-renderer.ts
import type { TipTapContent } from '$lib/types/page';
import type { GuidedCreationData, EntityCreationRule } from '$lib/types/guided-creation';

export interface RenderResult {
  content: TipTapContent;
  entitiesToCreate: EntityToCreate[];
}

export interface EntityToCreate {
  type: 'task';
  data: Record<string, unknown>;
}

export interface TemplateRenderer {
  render(data: GuidedCreationData, areaContext?: string): RenderResult;
}

// Registry of renderers
const renderers: Partial<Record<string, TemplateRenderer>> = {};

export function registerRenderer(type: string, renderer: TemplateRenderer) {
  renderers[type] = renderer;
}

export function renderTemplate(
  data: GuidedCreationData,
  areaContext?: string
): RenderResult {
  const renderer = renderers[data.templateType];
  if (!renderer) {
    throw new Error(`No renderer registered for template type: ${data.templateType}`);
  }
  return renderer.render(data, areaContext);
}
```

2. Create Meeting Notes renderer:

```typescript
// src/lib/services/template-renderers/meeting-notes-renderer.ts
import type { TemplateRenderer, RenderResult, EntityToCreate } from '../template-renderer';
import type { GuidedCreationData } from '$lib/types/guided-creation';
import type { MeetingNotesData } from '$lib/types/meeting-notes-data';
import type { TipTapContent } from '$lib/types/page';

export const meetingNotesRenderer: TemplateRenderer = {
  render(guidedData: GuidedCreationData, areaContext?: string): RenderResult {
    const data = guidedData.data as MeetingNotesData;
    const content = buildContent(data, areaContext);
    const entitiesToCreate = extractEntities(data);

    return { content, entitiesToCreate };
  }
};

function buildContent(data: MeetingNotesData, areaContext?: string): TipTapContent {
  const nodes: TipTapContent['content'] = [];

  // Title
  nodes.push({
    type: 'heading',
    attrs: { level: 1 },
    content: [{ type: 'text', text: data.title }]
  });

  // Metadata
  nodes.push({
    type: 'paragraph',
    content: [
      { type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' },
      { type: 'text', text: formatDateTime(data.datetime) }
    ]
  });

  // Attendees
  if (data.attendees.internal.length > 0 || data.attendees.external.length > 0) {
    const attendeeNames = [
      ...data.attendees.internal.map(id => getUserName(id)),
      ...data.attendees.external.map(e => e.organization ? `${e.name} (${e.organization})` : e.name)
    ];
    nodes.push({
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Attendees: ' },
        { type: 'text', text: attendeeNames.join(', ') }
      ]
    });
  }

  // Purpose section
  nodes.push({
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: 'Purpose' }]
  });
  nodes.push({
    type: 'paragraph',
    content: [{ type: 'text', text: data.purpose }]
  });

  // Area context if included
  if (data.includeAreaContext && areaContext) {
    nodes.push({
      type: 'blockquote',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', marks: [{ type: 'italic' }], text: 'Context: ' },
          { type: 'text', text: areaContext }
        ]
      }]
    });
  }

  // Agenda if present
  if (data.agendaItems && data.agendaItems.length > 0) {
    nodes.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Agenda' }]
    });
    nodes.push({
      type: 'bulletList',
      content: data.agendaItems.map(item => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }]
      }))
    });
  }

  // Discussion notes if present
  if (data.discussionNotes) {
    nodes.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Discussion' }]
    });
    nodes.push({
      type: 'paragraph',
      content: [{ type: 'text', text: data.discussionNotes }]
    });
  }

  // Outcomes if present
  if (data.outcomes && data.outcomes.length > 0) {
    nodes.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Key Outcomes' }]
    });
    nodes.push({
      type: 'bulletList',
      content: data.outcomes.map(outcome => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: outcome }] }]
      }))
    });
  }

  // Decisions if present
  if (data.decisions && data.decisions.length > 0) {
    nodes.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Decisions Made' }]
    });
    for (const decision of data.decisions) {
      nodes.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: decision.text }]
      });
      if (decision.ownerId) {
        nodes.push({
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Owner: ' },
            { type: 'text', text: getUserName(decision.ownerId) }
          ]
        });
      }
      if (decision.rationale) {
        nodes.push({
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'italic' }], text: 'Rationale: ' },
            { type: 'text', text: decision.rationale }
          ]
        });
      }
    }
  }

  // Action items if present
  if (data.actionItems && data.actionItems.length > 0) {
    nodes.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Action Items' }]
    });
    nodes.push({
      type: 'taskList',
      content: data.actionItems.map(item => ({
        type: 'taskItem',
        attrs: { checked: false },
        content: [{
          type: 'paragraph',
          content: [
            { type: 'text', text: item.text },
            ...(item.assigneeId ? [
              { type: 'text', text: ' — ' },
              { type: 'text', marks: [{ type: 'bold' }], text: `@${getUserName(item.assigneeId)}` }
            ] : []),
            ...(item.dueDate ? [
              { type: 'text', text: ` (Due: ${formatDate(item.dueDate)})` }
            ] : [])
          ]
        }]
      }))
    });
  }

  return { type: 'doc', content: nodes };
}

function extractEntities(data: MeetingNotesData): EntityToCreate[] {
  const entities: EntityToCreate[] = [];

  for (const item of data.actionItems || []) {
    if (item.createTask) {
      entities.push({
        type: 'task',
        data: {
          title: item.text,
          assigneeId: item.assigneeId,
          dueDate: item.dueDate
        }
      });
    }
  }

  return entities;
}

// Helper functions (implement or import from utils)
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function getUserName(userId: string): string {
  // TODO: Implement user lookup
  return userId;
}
```

**Acceptance Tests:**

```typescript
// Phase 4 Acceptance Tests

describe('Template Renderer', () => {
  test('renderTemplate throws for unknown type', () => {
    const data: GuidedCreationData = {
      templateType: 'unknown' as any,
      schemaVersion: 1,
      collectedAt: new Date().toISOString(),
      data: {}
    };
    expect(() => renderTemplate(data)).toThrow();
  });
});

describe('Meeting Notes Renderer', () => {
  const minimalData: GuidedCreationData = {
    templateType: 'meeting_notes',
    schemaVersion: 1,
    collectedAt: new Date().toISOString(),
    data: {
      title: 'Test Meeting',
      datetime: '2026-01-12T14:00:00Z',
      attendees: { internal: [], external: [] },
      purpose: 'Test purpose',
      includeAreaContext: false,
      outcomes: [],
      decisions: [],
      actionItems: []
    }
  };

  test('renders title as h1', () => {
    const result = renderTemplate(minimalData);
    const h1 = result.content.content.find(n =>
      n.type === 'heading' && n.attrs?.level === 1
    );
    expect(h1).toBeDefined();
    expect(h1?.content?.[0]?.text).toBe('Test Meeting');
  });

  test('renders date in metadata', () => {
    const result = renderTemplate(minimalData);
    const dateNode = result.content.content.find(n =>
      n.type === 'paragraph' &&
      n.content?.some(c => c.text?.includes('Date:'))
    );
    expect(dateNode).toBeDefined();
  });

  test('includes area context when flag is true', () => {
    const dataWithContext = {
      ...minimalData,
      data: { ...minimalData.data, includeAreaContext: true }
    };
    const result = renderTemplate(dataWithContext, 'Area context text');
    const blockquote = result.content.content.find(n => n.type === 'blockquote');
    expect(blockquote).toBeDefined();
  });

  test('excludes area context when flag is false', () => {
    const result = renderTemplate(minimalData, 'Area context text');
    const blockquote = result.content.content.find(n => n.type === 'blockquote');
    expect(blockquote).toBeUndefined();
  });

  test('renders outcomes as bullet list', () => {
    const dataWithOutcomes = {
      ...minimalData,
      data: { ...minimalData.data, outcomes: ['Outcome 1', 'Outcome 2'] }
    };
    const result = renderTemplate(dataWithOutcomes);
    const bulletList = result.content.content.find(n => n.type === 'bulletList');
    expect(bulletList?.content).toHaveLength(2);
  });

  test('renders action items as task list', () => {
    const dataWithActions = {
      ...minimalData,
      data: {
        ...minimalData.data,
        actionItems: [
          { id: '1', text: 'Do thing', createTask: false }
        ]
      }
    };
    const result = renderTemplate(dataWithActions);
    const taskList = result.content.content.find(n => n.type === 'taskList');
    expect(taskList).toBeDefined();
  });

  test('extracts entities for action items with createTask=true', () => {
    const dataWithTaskCreation = {
      ...minimalData,
      data: {
        ...minimalData.data,
        actionItems: [
          { id: '1', text: 'Create task', createTask: true },
          { id: '2', text: 'No task', createTask: false }
        ]
      }
    };
    const result = renderTemplate(dataWithTaskCreation);
    expect(result.entitiesToCreate).toHaveLength(1);
    expect(result.entitiesToCreate[0].type).toBe('task');
    expect(result.entitiesToCreate[0].data.title).toBe('Create task');
  });
});
```

---

### Phase 5: Entity Creation Service (1 context window)

**Objective:** Create Tasks (and future entities) from guided creation output.

**Files to Create:**
```
src/lib/services/guided-entity-creator.ts
```

**Files to Modify:**
```
src/routes/api/pages/+server.ts (or new endpoint)
```

**Implementation:**

```typescript
// src/lib/services/guided-entity-creator.ts
import type { EntityToCreate, EntityCreationResult } from '$lib/types/guided-creation';
import { createTask } from '$lib/server/persistence/tasks-postgres';

export interface EntityCreationContext {
  spaceId: string;
  areaId: string | null;
  sourceDocumentId: string;
  userId: string;
}

export async function createEntitiesFromGuidedCreation(
  entities: EntityToCreate[],
  context: EntityCreationContext
): Promise<EntityCreationResult[]> {
  const results: EntityCreationResult[] = [];

  for (const entity of entities) {
    try {
      const result = await createEntity(entity, context);
      results.push(result);
    } catch (error) {
      results.push({
        type: entity.type,
        id: '',
        title: entity.data.title as string || 'Unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

async function createEntity(
  entity: EntityToCreate,
  context: EntityCreationContext
): Promise<EntityCreationResult> {
  switch (entity.type) {
    case 'task':
      return createTaskEntity(entity.data, context);
    default:
      throw new Error(`Unknown entity type: ${entity.type}`);
  }
}

async function createTaskEntity(
  data: Record<string, unknown>,
  context: EntityCreationContext
): Promise<EntityCreationResult> {
  const task = await createTask({
    title: data.title as string,
    spaceId: context.spaceId,
    areaId: context.areaId,
    dueDate: data.dueDate as string | undefined,
    // assigneeId: data.assigneeId as string | undefined, // Future: when we have assignees
    sourceType: 'document',
    sourceDocumentId: context.sourceDocumentId,
    status: 'active',
    priority: 'normal',
    color: '#6366f1' // Default color
  });

  return {
    type: 'task',
    id: task.id,
    title: task.title,
    success: true
  };
}
```

**Acceptance Tests:**

```typescript
// Phase 5 Acceptance Tests

describe('Guided Entity Creator', () => {
  const mockContext: EntityCreationContext = {
    spaceId: 'space-123',
    areaId: 'area-456',
    sourceDocumentId: 'doc-789',
    userId: 'user-abc'
  };

  test('creates task from entity definition', async () => {
    const entities: EntityToCreate[] = [{
      type: 'task',
      data: { title: 'Test task', dueDate: '2026-01-20' }
    }];

    const results = await createEntitiesFromGuidedCreation(entities, mockContext);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].type).toBe('task');
    expect(results[0].id).toBeDefined();
  });

  test('creates multiple tasks', async () => {
    const entities: EntityToCreate[] = [
      { type: 'task', data: { title: 'Task 1' } },
      { type: 'task', data: { title: 'Task 2' } }
    ];

    const results = await createEntitiesFromGuidedCreation(entities, mockContext);

    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
  });

  test('handles creation failure gracefully', async () => {
    // Mock createTask to throw
    const entities: EntityToCreate[] = [{
      type: 'task',
      data: { title: '' } // Invalid - will fail
    }];

    const results = await createEntitiesFromGuidedCreation(entities, mockContext);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toBeDefined();
  });

  test('links task to source document', async () => {
    const entities: EntityToCreate[] = [{
      type: 'task',
      data: { title: 'Test task' }
    }];

    await createEntitiesFromGuidedCreation(entities, mockContext);

    // Verify task has sourceDocumentId set
    // (Would need to fetch task and check)
  });
});
```

---

### Phase 6: Integration & Polish (1 context window)

**Objective:** Wire guided creation into the existing page creation flow.

**Files to Modify:**
```
src/lib/components/pages/NewPageModal.svelte
src/routes/api/pages/+server.ts
src/routes/spaces/[space]/[area]/pages/+page.svelte (or wherever pages are listed)
```

**Files to Create:**
```
src/lib/components/pages/GuidedCreationModal.svelte
```

**Implementation:**

1. Create wrapper modal that switches between template selection and guided flow:

```svelte
<!-- src/lib/components/pages/GuidedCreationModal.svelte -->
<script lang="ts">
  import { hasGuidedCreation, getTemplateSchema } from '$lib/config/template-schemas';
  import type { PageType, TipTapContent } from '$lib/types/page';
  import type { GuidedCreationData } from '$lib/types/guided-creation';
  import { renderTemplate } from '$lib/services/template-renderer';
  import TemplateSelector from './TemplateSelector.svelte';
  import GuidedCreationFlow from '../guided-creation/GuidedCreationFlow.svelte';

  interface Props {
    isOpen: boolean;
    spaceId: string;
    areaId: string | null;
    areaContext?: string;
    onClose: () => void;
    onCreate: (data: {
      title: string;
      pageType: PageType;
      content: TipTapContent;
      guidedData?: GuidedCreationData;
    }) => void;
  }

  let { isOpen, spaceId, areaId, areaContext, onClose, onCreate }: Props = $props();

  type Mode = 'template-select' | 'guided-flow' | 'title-input';
  let mode = $state<Mode>('template-select');
  let selectedType = $state<PageType | null>(null);
  let title = $state('');

  // Reset on open
  $effect(() => {
    if (isOpen) {
      mode = 'template-select';
      selectedType = null;
      title = '';
    }
  });

  function handleTemplateSelect(type: PageType) {
    selectedType = type;

    if (hasGuidedCreation(type)) {
      mode = 'guided-flow';
    } else {
      // Fall back to simple title input for non-guided templates
      mode = 'title-input';
      title = getDefaultTitle(type);
    }
  }

  function handleGuidedComplete(data: GuidedCreationData) {
    const result = renderTemplate(data, areaContext);
    onCreate({
      title: data.data.title as string || 'Untitled',
      pageType: selectedType!,
      content: result.content,
      guidedData: data
    });
  }

  function handleSimpleCreate() {
    if (!selectedType || !title.trim()) return;
    onCreate({
      title: title.trim(),
      pageType: selectedType,
      content: getTemplateContent(selectedType)
    });
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={onClose}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      {#if mode === 'template-select'}
        <div class="modal-header">
          <h2>Choose a template</h2>
          <button class="close-btn" onclick={onClose}>×</button>
        </div>
        <div class="modal-content">
          <TemplateSelector
            selected={selectedType}
            onSelect={handleTemplateSelect}
          />
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick={onClose}>Cancel</button>
          <button
            class="btn-primary"
            disabled={!selectedType}
            onclick={() => selectedType && handleTemplateSelect(selectedType)}
          >
            Next
          </button>
        </div>

      {:else if mode === 'guided-flow' && selectedType}
        <GuidedCreationFlow
          schema={getTemplateSchema(selectedType)!}
          {spaceId}
          {areaId}
          onComplete={handleGuidedComplete}
          onCancel={onClose}
        />

      {:else if mode === 'title-input'}
        <!-- Simple title input for non-guided templates -->
        <div class="modal-header">
          <button class="back-btn" onclick={() => mode = 'template-select'}>←</button>
          <h2>Name your page</h2>
          <button class="close-btn" onclick={onClose}>×</button>
        </div>
        <div class="modal-content">
          <input
            type="text"
            bind:value={title}
            placeholder="Page title"
            autofocus
          />
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick={onClose}>Cancel</button>
          <button
            class="btn-primary"
            disabled={!title.trim()}
            onclick={handleSimpleCreate}
          >
            Create Page
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
```

2. Update API endpoint to handle entity creation:

```typescript
// In POST handler for /api/pages
if (guidedData) {
  const renderResult = renderTemplate(guidedData, areaContext);

  // Create the page
  const page = await createPage({
    title,
    pageType,
    content: renderResult.content,
    spaceId,
    areaId,
    userId,
    guidedCreationData: guidedData // Store for reference
  });

  // Create entities
  if (renderResult.entitiesToCreate.length > 0) {
    const entityResults = await createEntitiesFromGuidedCreation(
      renderResult.entitiesToCreate,
      {
        spaceId,
        areaId,
        sourceDocumentId: page.id,
        userId
      }
    );

    return json({
      page,
      entitiesCreated: entityResults
    });
  }

  return json({ page });
}
```

3. Show success feedback with created entities:

```svelte
<!-- After page creation -->
{#if entitiesCreated.length > 0}
  <div class="creation-success">
    <p>Page created!</p>
    <p class="entities-created">
      Also created {entitiesCreated.length} task{entitiesCreated.length > 1 ? 's' : ''}
    </p>
  </div>
{/if}
```

**Acceptance Tests:**

```typescript
// Phase 6 Acceptance Tests

describe('GuidedCreationModal', () => {
  test('shows template selector initially', () => {
    // Mount modal
    // Verify TemplateSelector visible
  });

  test('switches to guided flow for meeting_notes', () => {
    // Mount, select meeting_notes
    // Verify GuidedCreationFlow visible
  });

  test('switches to simple title input for general', () => {
    // Mount, select general
    // Verify title input visible, not guided flow
  });

  test('onCreate called with rendered content', () => {
    // Complete guided flow
    // Verify onCreate receives TipTap content
  });
});

describe('Page Creation API with Guided Data', () => {
  test('creates page with rendered content', async () => {
    // POST with guidedData
    // Verify page created with correct content
  });

  test('creates tasks from action items', async () => {
    // POST with guidedData containing action items
    // Verify tasks created
    // Verify tasks linked to page
  });

  test('returns entity creation results', async () => {
    // POST with guidedData
    // Verify response includes entitiesCreated
  });
});

describe('End-to-End: Meeting Notes Creation', () => {
  test('full flow creates page and tasks', async () => {
    // 1. Open modal
    // 2. Select meeting_notes
    // 3. Fill all steps
    // 4. Submit
    // 5. Verify page created with content
    // 6. Verify tasks created
    // 7. Verify navigation to editor
  });
});
```

---

## 6. Future Templates

After Meeting Notes is proven, apply the pattern to:

### Decision Record
**Steps:**
1. What decision? (text)
2. What's the context/problem? (textarea)
3. Options considered (list with pros/cons)
4. Which option chosen? (select from above)
5. Rationale (textarea)
6. Consequences/next steps (list)

**Entity Creation:** Link to Decisions system (future)

### Proposal
**Steps:**
1. What are you proposing? (text)
2. What problem does this solve? (textarea)
3. Proposed solution (textarea)
4. Benefits (list)
5. Risks and mitigations (list)
6. Resources needed (list)
7. Timeline (optional)

**Entity Creation:** None initially; future: project/initiative

### Project Brief
**Steps:**
1. Project name (text)
2. Overview (textarea)
3. Objectives (list)
4. Scope - in/out (two lists)
5. Success criteria (list)
6. Stakeholders (user-select + roles)
7. Timeline (date range)

**Entity Creation:** Future: create Area for project

### Weekly Update
**Steps:**
1. Which week? (date range)
2. Highlights (list)
3. Progress (task list - could pull from actual tasks!)
4. Blockers (list)
5. Next week focus (list)
6. Metrics (optional key-value pairs)

**Entity Creation:** None; but could mark tasks as done

---

## 7. Admin Template Editor (Future)

> This section describes future capability, not initial implementation.

### Vision

Organizations can create and customize templates:

```
Admin → Templates
├── View system templates (read-only)
├── Create custom templates
│   ├── Define steps and fields
│   ├── Set required vs optional
│   ├── Configure entity creation
│   └── Preview flow
├── Clone and modify templates
└── Set org-wide defaults
```

### Custom Template Schema

```typescript
interface CustomTemplate extends TemplateSchema {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  icon: string;
  isSystem: boolean;  // false for custom
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### Field Type Editor

Admins can configure:
- Field type (from supported types)
- Label and placeholder
- Required/optional
- Validation rules
- Default values

### Entity Creation Rules

Admins can configure:
- Which fields create entities
- Field mappings
- Conditions (when to create)

---

## 8. Context Strategy Integration

> **Critical:** This section describes how Guided Creation feeds organizational memory.

### The Connection

Guided Creation captures **structured knowledge** that should flow into the Context Strategy (see `CONTEXT_STRATEGY.md`):

| Guided Creation Output | Context Strategy Destination |
|------------------------|------------------------------|
| Meeting decisions | Area-level memory (decisions made) |
| Action items | Task context + Area activity |
| Outcomes | Area-level memory (what happened) |
| Attendees | Relationship/collaboration graph |
| Discussion notes | Searchable organizational knowledge |

### Implementation Path

**Phase 1 (Current):** Store `guidedCreationData` JSON on the page record
- Enables search and retrieval
- Preserves structure for future use

**Phase 2 (Future):** Memory extraction pipeline
- After page creation, extract memory items
- Decisions → Area decisions memory
- Outcomes → Area activity memory
- Use memory evaluation from CONTEXT_STRATEGY.md

**Phase 3 (Future):** Memory proposals for shared context
- Significant decisions proposed to Area-level memory
- Approval workflow for team review
- Propagation to Space-level if relevant

### The Vision

When a user asks: *"What decisions have we made about the marketing campaign?"*

The system can retrieve:
1. Decision Record documents (full docs)
2. Decisions extracted from Meeting Notes (structured)
3. Related conversations (semantic search)

All because Guided Creation captured **structured data**, not just prose.

### Context Hierarchy Impact

```
Organization Memory
  └── Group Memory (Marketing Team)
       └── Space Memory (Work)
            └── Area Memory (Campaign Launch)
                 ├── Meeting: Q1 Planning
                 │    └── Decision: Focus on digital
                 │    └── Decision: $50k budget
                 ├── Meeting: Creative Review
                 │    └── Decision: Agency partner selected
                 └── Tasks created from meetings
```

This is how meetings become **context generators that permeate the organization**.

---

## Appendix A: Component Quick Reference

| Component | Purpose | Location |
|-----------|---------|----------|
| GuidedCreationFlow | Main orchestrator | `components/guided-creation/` |
| ProgressIndicator | Step dots | `components/guided-creation/` |
| StepCard | Step wrapper | `components/guided-creation/` |
| FieldRenderer | Field type router | `components/guided-creation/` |
| TextField | Single line input | `components/guided-creation/fields/` |
| TextAreaField | Multi-line input | `components/guided-creation/fields/` |
| DateTimeField | Date/time picker | `components/guided-creation/fields/` |
| AttendeesField | User + external select | `components/guided-creation/fields/` |
| DecisionsField | Decision with owner | `components/guided-creation/fields/` |
| ActionItemsField | Tasks with create toggle | `components/guided-creation/fields/` |
| GuidedCreationModal | Integration wrapper | `components/pages/` |

---

## Appendix B: Type Quick Reference

| Type | Purpose | Location |
|------|---------|----------|
| TemplateSchema | Full template definition | `types/guided-creation.ts` |
| StepDefinition | Single step config | `types/guided-creation.ts` |
| FieldDefinition | Field config | `types/guided-creation.ts` |
| GuidedCreationData | Collected user data | `types/guided-creation.ts` |
| MeetingNotesData | Meeting-specific data | `types/meeting-notes-data.ts` |
| EntityToCreate | Entity creation instruction | `types/guided-creation.ts` |
| RenderResult | Template render output | `services/template-renderer.ts` |

---

## Appendix C: Test Coverage Summary

| Phase | Unit Tests | Integration Tests | E2E Tests |
|-------|------------|-------------------|-----------|
| 1: Types & Schema | 8 | - | - |
| 2: Flow Component | 12 | - | - |
| 3: Field Components | 24 | - | - |
| 4: Renderer | 10 | 2 | - |
| 5: Entity Creation | 5 | 3 | - |
| 6: Integration | 4 | 4 | 2 |
| **Total** | **63** | **9** | **2** |

---

*Document Version: 1.0*
*Created: 2026-01-12*
*Author: Claude + Human collaboration*
