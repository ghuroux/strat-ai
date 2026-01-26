# Skills System

> **Status:** Design Complete | **Priority:** Medium | **Dependencies:** Spaces, Areas, System Prompts

Enable specialized AI capabilities within Spaces and Areas through reusable instruction sets called Skills.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Core Concepts](#2-core-concepts)
3. [User Stories](#3-user-stories)
4. [Database Schema](#4-database-schema)
5. [API Changes](#5-api-changes)
6. [UI Components](#6-ui-components)
7. [System Prompt Integration](#7-system-prompt-integration)
8. [Implementation Phases](#8-implementation-phases)
9. [Edge Cases](#9-edge-cases)
10. [Future Enhancements (V2)](#10-future-enhancements-v2)

---

## 1. Problem Statement

### Current State

StratAI provides contextual AI through:
- **Platform prompts** - Model-optimized base instructions
- **Space context** - High-level organizational context
- **Area context** - Specialized focus area instructions
- **Document summaries** - Reference materials injected into context

However, these are **free-form text** requiring users to write effective prompts themselves.

### The Gap

Teams need to:
- Apply consistent, proven methodologies to AI interactions (e.g., financial analysis frameworks)
- Share expertise across the organization (not just documents, but *how to work*)
- Ensure AI follows domain-specific workflows (e.g., PRD templates, code review checklists)
- Activate specialized behaviors on-demand without rewriting prompts

### Value Proposition

| Benefit | Description |
|---------|-------------|
| **Expertise Codification** | Capture "how we do things" as reusable skills |
| **Consistency** | Same methodology applied regardless of who's asking |
| **Onboarding** | New team members inherit organizational expertise |
| **Quality** | Proven workflows reduce errors and omissions |
| **Efficiency** | Pre-built skills save prompt engineering time |

---

## 2. Core Concepts

### What is a Skill?

A skill is a **domain-specific instruction set** that teaches the AI specialized behaviors, workflows, and methodologies.

```
┌─────────────────────────────────────────────────────────────────┐
│                         SKILL ANATOMY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  METADATA                                                │   │
│   │  ─────────                                               │   │
│   │  • Name: financial-analysis                              │   │
│   │  • Description: "Analyze financial data using DCF..."    │   │
│   │  • Triggers: ["valuation", "DCF", "financial model"]     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  CONTENT (Markdown)                                      │   │
│   │  ─────────────────                                       │   │
│   │  # Financial Analysis Skill                              │   │
│   │                                                          │   │
│   │  ## Workflow                                             │   │
│   │  1. Gather key metrics (revenue, EBITDA, growth rate)    │   │
│   │  2. Determine appropriate valuation methodology          │   │
│   │  3. Build DCF model with explicit assumptions            │   │
│   │  4. Sensitivity analysis on key drivers                  │   │
│   │  5. Compare to market multiples                          │   │
│   │                                                          │   │
│   │  ## Key Principles                                       │   │
│   │  - Always state assumptions explicitly                   │   │
│   │  - Use conservative projections                          │   │
│   │  - Consider multiple scenarios (base/bull/bear)          │   │
│   │  ...                                                     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Skill Levels

Skills can be attached at different levels of the hierarchy:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SKILL HIERARCHY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ORGANIZATION (V2)                                              │
│   └── Skills available to all Spaces                            │
│       Example: "Company Communication Style"                     │
│                                                                  │
│   SPACE                                                          │
│   └── Skills available to all Areas in Space                    │
│       Example: "Nedbank Financial Analysis"                      │
│                                                                  │
│   AREA                                                           │
│   └── Skills active for this specific Area                      │
│       Example: "Q1 Budget Planning Process"                      │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Context Injection Order:                                │   │
│   │  Platform → Space → Space Skills → Area → Area Skills    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Activation Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Always Active** | Skill always included in context | Core methodology that applies to all work in this Space/Area |
| **Trigger-based** | Skill activated when keywords detected | Specialized skills invoked on-demand |
| **Manual** | User explicitly activates via UI | Optional skills user can toggle |

### Skill vs Document

| Aspect | Document | Skill |
|--------|----------|-------|
| **Purpose** | Reference information | Behavioral instructions |
| **Content** | Facts, data, specs | Workflows, methodologies, rules |
| **Injection** | Summary in prompt, full via tool | Summary in prompt, full via tool |
| **Example** | "Q1 Budget Spreadsheet" | "Financial Analysis Methodology" |

Both use the same pattern: **summary in prompt, full content via tool call**.

---

## 3. User Stories

### Create a Skill

```
AS A Space owner
I WANT TO create a skill for my Space
SO THAT my team uses consistent methodologies

Acceptance Criteria:
- [ ] Can create skill with name, description, and content
- [ ] Can specify trigger keywords (optional)
- [ ] Can set activation mode (always/trigger/manual)
- [ ] Skill appears in Space skills list
```

### Activate Skill in Area

```
AS AN Area user
I WANT TO activate Space skills in my Area
SO THAT the AI uses those methodologies here

Acceptance Criteria:
- [ ] Can see available Space skills
- [ ] Can activate/deactivate skills per Area
- [ ] Active skills reflected in AI responses
```

### Use a Skill Template

```
AS A user
I WANT TO create a skill from a template
SO THAT I can quickly add proven methodologies

Acceptance Criteria:
- [ ] Can browse skill templates (curated library)
- [ ] Can preview template content
- [ ] Can create skill from template with customization
- [ ] Template categories: Analysis, Development, Writing, etc.
```

### AI Uses Active Skills

```
AS A user in an Area with active skills
I WANT the AI to follow the skill methodologies
SO THAT I get consistent, high-quality outputs

Acceptance Criteria:
- [ ] AI receives skill summaries in context
- [ ] AI can read full skill content when needed
- [ ] AI follows skill workflows and principles
- [ ] Context transparency shows active skills
```

---

## 4. Database Schema

### Migration: Create skills table

```sql
-- Migration: YYYYMMDD_001_skills.sql

-- Skills table (attached to Space or Area)
CREATE TABLE skills (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Ownership (one of space_id or area_id, not both for V1)
  space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
  area_id TEXT REFERENCES areas(id) ON DELETE CASCADE,

  -- Metadata
  name TEXT NOT NULL,
  description TEXT NOT NULL,  -- One-line description for prompt injection

  -- Content
  content TEXT NOT NULL,  -- Full markdown skill content
  summary TEXT,  -- AI-generated summary (~200 tokens) for prompt injection

  -- Activation
  activation_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (activation_mode IN ('always', 'trigger', 'manual')),
  triggers TEXT[],  -- Keywords that activate trigger-based skills

  -- Audit
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT skill_has_owner CHECK (
    (space_id IS NOT NULL AND area_id IS NULL) OR
    (space_id IS NULL AND area_id IS NOT NULL)
  )
);

-- Area skill activation (which Space skills are active in which Areas)
CREATE TABLE area_skill_activations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by TEXT NOT NULL REFERENCES users(id),

  UNIQUE(area_id, skill_id)
);

-- Indexes
CREATE INDEX idx_skills_space ON skills(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX idx_skills_area ON skills(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_area_skill_activations ON area_skill_activations(area_id);
```

### TypeScript Types

```typescript
// In src/lib/types/skills.ts

export type SkillActivationMode = 'always' | 'trigger' | 'manual';

export interface Skill {
  id: string;

  // Ownership
  spaceId: string | null;
  areaId: string | null;

  // Metadata
  name: string;
  description: string;  // One-line, for prompt injection

  // Content
  content: string;  // Full markdown
  summary: string | null;  // AI-generated ~200 token summary

  // Activation
  activationMode: SkillActivationMode;
  triggers: string[] | null;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSkillInput {
  spaceId?: string;
  areaId?: string;
  name: string;
  description: string;
  content: string;
  activationMode?: SkillActivationMode;
  triggers?: string[];
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  content?: string;
  activationMode?: SkillActivationMode;
  triggers?: string[];
}

export interface AreaSkillActivation {
  id: string;
  areaId: string;
  skillId: string;
  activatedAt: Date;
  activatedBy: string;
}

// For context injection (matches ContextDocument pattern)
export interface SkillContext {
  id: string;
  name: string;
  description: string;
  content: string;
  summary: string | null;
}
```

---

## 5. API Changes

### Skill Endpoints

**POST /api/skills** - Create skill
```typescript
// Request body
{
  spaceId?: string;
  areaId?: string;
  name: string;
  description: string;
  content: string;
  activationMode?: 'always' | 'trigger' | 'manual';
  triggers?: string[];
}

// Response
{
  skill: Skill;
}
```

**GET /api/skills?spaceId={spaceId}** - List Space skills
```typescript
// Response
{
  skills: Skill[];
}
```

**GET /api/skills/[id]** - Get skill
```typescript
// Response
{
  skill: Skill;
}
```

**PATCH /api/skills/[id]** - Update skill
```typescript
// Request body
{
  name?: string;
  description?: string;
  content?: string;
  activationMode?: 'always' | 'trigger' | 'manual';
  triggers?: string[];
}
```

**DELETE /api/skills/[id]** - Delete skill

### Area Skill Activation Endpoints

**POST /api/areas/[areaId]/skills** - Activate skill in Area
```typescript
// Request body
{
  skillId: string;
}
```

**DELETE /api/areas/[areaId]/skills/[skillId]** - Deactivate skill

**GET /api/areas/[areaId]/skills** - List activated skills
```typescript
// Response
{
  skills: Skill[];  // Full skill objects for activated skills
}
```

### Repository Methods

```typescript
// In src/lib/server/persistence/skills-postgres.ts

interface SkillsRepository {
  // CRUD
  createSkill(input: CreateSkillInput, userId: string): Promise<Skill>;
  getSkill(skillId: string): Promise<Skill | null>;
  updateSkill(skillId: string, input: UpdateSkillInput): Promise<Skill>;
  deleteSkill(skillId: string): Promise<void>;

  // Listing
  getSkillsForSpace(spaceId: string): Promise<Skill[]>;
  getSkillsForArea(areaId: string): Promise<Skill[]>;  // Area-owned skills

  // Area activations
  activateSkillInArea(areaId: string, skillId: string, userId: string): Promise<void>;
  deactivateSkillInArea(areaId: string, skillId: string): Promise<void>;
  getActivatedSkillsForArea(areaId: string): Promise<Skill[]>;  // Space skills activated here

  // Context loading
  getActiveSkillsForArea(areaId: string): Promise<SkillContext[]>;
  // Returns: Area-owned skills + activated Space skills (for prompt injection)
}
```

---

## 6. UI Components

### 6.1 SkillCard Component

Display a skill with metadata and actions.

**Location:** `src/lib/components/skills/SkillCard.svelte`

```svelte
<script lang="ts">
  interface Props {
    skill: Skill;
    isActivated?: boolean;  // For Space skills in Area context
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleActivation?: (activated: boolean) => void;
  }
</script>
```

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Financial Analysis                                [Always]  │
│  ─────────────────────────────────────────────────────────────  │
│  Analyze financial data using DCF methodology,                  │
│  sensitivity analysis, and market comparables.                  │
│                                                                  │
│  Triggers: valuation, DCF, financial model                      │
│                                                                  │
│                                    [Edit]  [Delete]             │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 SkillEditor Component

Create/edit skill with markdown preview.

**Location:** `src/lib/components/skills/SkillEditor.svelte`

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Skill                                             [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Name                                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Financial Analysis                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Description (one line for AI context)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Analyze financial data using DCF methodology...         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Activation Mode                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Always Active   ○ Trigger-based   ● Manual           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Trigger Keywords (comma-separated)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ valuation, DCF, financial model, EBITDA                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Content                                    [Edit] [Preview]    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ # Financial Analysis Skill                               │   │
│  │                                                          │   │
│  │ ## Workflow                                              │   │
│  │ 1. Gather key metrics...                                 │   │
│  │ 2. Determine methodology...                              │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│                               [Cancel]  [Create Skill]          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Space Skills Page

Manage skills at Space level.

**Location:** `src/routes/spaces/[space]/skills/+page.svelte`

```
┌─────────────────────────────────────────────────────────────────┐
│  Nedbank SVS  >  Skills                          [+ New Skill]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Space Skills                                                    │
│  Skills available to all Areas in this Space                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⚡ Financial Analysis                         [Always]  │   │
│  │  DCF methodology, sensitivity analysis...               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⚡ Investment Memo                           [Trigger]  │   │
│  │  Structure investment memos with thesis...              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⚡ Code Review                                [Manual]  │   │
│  │  Review code for security, performance...               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Context Panel Skills Section

Show active skills in Area Context Panel.

**Location:** Update `src/lib/components/areas/ContextPanel.svelte`

```
┌─────────────────────────────────────────────────────────────────┐
│  Context                                                  [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Area Notes                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Q1 budget planning for Nedbank project...               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Active Skills                                       [Manage]   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⚡ Financial Analysis            [Space] [Always]  ✓   │   │
│  │  ⚡ Investment Memo               [Space] [Active]  ✓   │   │
│  │  ⚡ Code Review                   [Space]           ○   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Documents                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📄 Q1_Budget_Template.xlsx                         ✓   │   │
│  │  📄 Historical_Data.pdf                             ✓   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.5 Platform Skills Library

Curated skills provided by StratAI, inspired by [Anthropic's Skills Library](https://github.com/anthropics/skills).

**Location:** `src/routes/spaces/[space]/skills/+page.svelte` (tab or section)

```
┌─────────────────────────────────────────────────────────────────┐
│  Nedbank SVS  >  Skills                          [+ New Skill]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Your Skills]  [Platform Library]                              │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  📚 Platform Skills Library                                      │
│  Curated skills maintained by StratAI                           │
│                                                                  │
│  BUSINESS & COMMUNICATION                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📋 Internal Communications                    [+ Add]   │   │
│  │  Craft 3P updates, newsletters, status reports...       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎨 Brand Guidelines                           [+ Add]   │   │
│  │  Apply brand voice, tone, and visual standards...       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  DOCUMENTS & DATA                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📄 PDF Processing                             [+ Add]   │   │
│  │  Extract text, merge, split, create PDFs...             │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Excel Analysis                             [+ Add]   │   │
│  │  Parse spreadsheets, pivot tables, formulas...          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ANALYSIS & STRATEGY                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  💰 Financial Analysis                         [+ Add]   │   │
│  │  DCF, comparables, sensitivity analysis...              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📝 PRD Writing                                [+ Add]   │   │
│  │  Structure product requirements documents...            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  DEVELOPMENT                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔍 Code Review                                [+ Add]   │   │
│  │  Security, performance, best practices...               │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🧪 Test Writing                               [+ Add]   │   │
│  │  Unit tests, integration tests, coverage...             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Platform Skills Categories:**

| Category | Skills | Description |
|----------|--------|-------------|
| **Business & Communication** | Internal Comms, Brand Guidelines, Meeting Notes | Professional communication formats |
| **Documents & Data** | PDF, Excel, PowerPoint, Word | Document processing and creation |
| **Analysis & Strategy** | Financial Analysis, Market Research, PRD Writing | Structured analytical frameworks |
| **Development** | Code Review, Test Writing, API Design | Software development best practices |
| **Creative** | Content Writing, Design Critique, Copywriting | Creative and marketing workflows |

**Implementation:**

```typescript
// Platform skills stored in code (not database)
// Located at: src/lib/config/platform-skills/

// Structure:
// platform-skills/
// ├── index.ts           # Registry of all platform skills
// ├── internal-comms.ts  # Internal Communications skill
// ├── financial-analysis.ts
// ├── code-review.ts
// └── ...

export interface PlatformSkill {
  id: string;           // e.g., 'platform:internal-comms'
  name: string;
  description: string;
  category: 'business' | 'documents' | 'analysis' | 'development' | 'creative';
  content: string;      // Full markdown content
  summary: string;      // Pre-generated summary for prompt injection
  version: string;      // Semantic version for updates
}

// When user adds platform skill to Space:
// 1. Copy platform skill content to skills table
// 2. Mark as `source: 'platform'` and `platform_skill_id: 'platform:internal-comms'`
// 3. User can customize (creates fork)
// 4. Updates available when platform version > local version
```

**Database Addition:**

```sql
-- Add to skills table
ALTER TABLE skills ADD COLUMN source TEXT DEFAULT 'custom'
  CHECK (source IN ('custom', 'platform'));
ALTER TABLE skills ADD COLUMN platform_skill_id TEXT;  -- e.g., 'platform:internal-comms'
ALTER TABLE skills ADD COLUMN platform_version TEXT;   -- Track version for update notifications
```

---

## 7. System Prompt Integration

### Skill Prompt Generation

Skills integrate into the existing prompt layering system, following the same pattern as documents.

**Location:** Update `src/lib/config/system-prompts.ts`

```typescript
/**
 * Skill context for prompt injection
 * Follows same pattern as ContextDocument
 */
export interface SkillContext {
  id: string;
  name: string;
  description: string;
  content: string;
  summary: string | null;
}

/**
 * Generate prompt section for active skills
 * Summaries in prompt, full content via read_skill tool
 */
export function getSkillsPrompt(skills: SkillContext[]): string {
  if (!skills || skills.length === 0) return '';

  let prompt = `
<active_skills>
## Active Skills

You have access to these specialized skills that define methodologies and workflows:`;

  for (const skill of skills) {
    prompt += `

<skill name="${skill.name}">
${skill.summary || skill.description}
</skill>`;
  }

  prompt += `

**Skill Usage:**
- Apply active skill methodologies when relevant to the conversation
- Use **read_skill** tool to access full skill content when you need detailed workflows or steps
- Skills define *how* to work; documents provide *what* to reference
- If multiple skills apply, combine their principles thoughtfully
</active_skills>`;

  return prompt;
}
```

### Updated Focus Area Prompt

Update `getFocusAreaPrompt()` to include skills:

```typescript
export function getFocusAreaPrompt(
  focusArea: FocusAreaInfo,
  skills?: SkillContext[]
): string {
  // ... existing document handling ...

  // Add skills section
  if (skills && skills.length > 0) {
    prompt += getSkillsPrompt(skills);
  }

  // ... rest of function ...
}
```

### Tool: read_skill

New tool for AI to access full skill content.

**Location:** `src/lib/server/tools/read-skill.ts`

```typescript
export const READ_SKILL_TOOL = {
  type: 'function',
  function: {
    name: 'read_skill',
    description: 'Read the full content of an active skill to access detailed workflows, steps, and methodologies',
    parameters: {
      type: 'object',
      properties: {
        skill_name: {
          type: 'string',
          description: 'The name of the skill to read'
        }
      },
      required: ['skill_name']
    }
  }
};

export async function executeReadSkill(
  skillName: string,
  activeSkills: SkillContext[]
): Promise<string> {
  const skill = activeSkills.find(s =>
    s.name.toLowerCase() === skillName.toLowerCase()
  );

  if (!skill) {
    return `Skill "${skillName}" not found. Available skills: ${activeSkills.map(s => s.name).join(', ')}`;
  }

  return `# ${skill.name}\n\n${skill.content}`;
}
```

### Context Transparency

Update `ResponseContextBadge.svelte` to show active skills:

```typescript
interface Props {
  // ... existing props ...
  activeSkills?: Array<{ name: string }>;
}
```

```svelte
{#if activeSkills?.length}
  <div class="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
    <Zap size={12} class="text-amber-500 flex-shrink-0" />
    <span class="flex-1">Skills</span>
    <span class="text-[10px] font-medium">
      {activeSkills.map(s => s.name).join(', ')}
    </span>
  </div>
{/if}
```

---

## 8. Implementation Phases

### Phase 1: Schema & Backend (Session 1)

- [ ] Create migration: `skills` and `area_skill_activations` tables
- [ ] Create TypeScript types in `src/lib/types/skills.ts`
- [ ] Create `skills-postgres.ts` repository
- [ ] Create skill API endpoints (CRUD)
- [ ] Create area skill activation endpoints
- [ ] Run migration, verify tables

### Phase 2: System Prompt Integration (Session 1-2)

- [ ] Add `getSkillsPrompt()` to `system-prompts.ts`
- [ ] Update `getFocusAreaPrompt()` to accept skills
- [ ] Create `read_skill` tool definition
- [ ] Implement `executeReadSkill()` function
- [ ] Update Area chat endpoint to load and inject skills
- [ ] Test: create skill, verify in AI context

### Phase 3: UI - Space Skills (Session 2)

- [ ] Create `SkillCard.svelte` component
- [ ] Create `SkillEditor.svelte` component
- [ ] Create Space skills page (`/spaces/[space]/skills`)
- [ ] Add Skills link to Space navigation
- [ ] Test: create, edit, delete skills in UI

### Phase 4: UI - Area Activation (Session 2-3)

- [ ] Update `ContextPanel.svelte` with skills section
- [ ] Create skill activation toggle UI
- [ ] Wire up activation/deactivation API calls
- [ ] Test: activate Space skill in Area, verify in AI context

### Phase 5: Context Transparency (Session 3)

- [ ] Update `ResponseContextBadge.svelte` with skills
- [ ] Update context metadata to track active skills
- [ ] Update Prompt Inspector to show skill content
- [ ] Test: verify active skills shown in context badge

### Phase 6: AI Summary Generation (Session 3)

- [ ] Add summary generation on skill create/update
- [ ] Use same pattern as document summaries (Haiku 4.5)
- [ ] Backfill existing skills if any
- [ ] Test: verify summaries generated and used

### Phase 7: Platform Skills Library (Session 4)

- [ ] Create `src/lib/config/platform-skills/` directory structure
- [ ] Define `PlatformSkill` interface and registry
- [ ] Create initial platform skills (4-6 curated skills):
  - [ ] Internal Communications
  - [ ] Financial Analysis
  - [ ] Code Review
  - [ ] PRD Writing
- [ ] Add `source` and `platform_skill_id` columns to skills table
- [ ] Create "Add from Library" UI in Space skills page
- [ ] Implement platform skill copying to Space
- [ ] Add version tracking for update notifications
- [ ] Test: add platform skill to Space, customize, verify updates available

---

## 9. Edge Cases

| Scenario | Handling |
|----------|----------|
| Skill deleted while activated in Areas | CASCADE delete removes activations |
| Skill updated while Area active | Next chat loads fresh content |
| Large skill content (>10k chars) | Summary in prompt, full via tool (same as docs) |
| Conflicting skills activated | AI synthesizes; order by activation time |
| Space skill "always" mode | Auto-included without activation record |
| Area has its own skill + Space skill | Both active, Area skill takes precedence for conflicts |
| Trigger keyword detected but skill not activated | Only activated skills can be triggered |
| User without Area access tries to activate | API returns 403 Forbidden |

---

## 10. Future Enhancements (V2)

**Not in V1 scope - defer these:**

| Enhancement | Description |
|-------------|-------------|
| **Organization Skills** | Skills shared across all Spaces in an org |
| **Anthropic Skills Sync** | Auto-import/update from [anthropics/skills](https://github.com/anthropics/skills) repo |
| **Skill Analytics** | Track which skills are most used/effective |
| **Skill Versioning** | Track changes over time, rollback capability |
| **Skill Inheritance** | Area skills can extend/override Space skills |
| **Dynamic Trigger Detection** | AI suggests activating skills based on conversation |
| **Skill Sharing** | Share skills between Spaces |
| **Community Marketplace** | User-contributed skill templates (moderated) |
| **Skill Parameters** | Skills with configurable options (e.g., "formality level") |
| **Skill Composition** | Combine multiple skills into meta-skills |

**Platform Skills Expansion (V1.x):**

The Platform Skills Library (Section 6.5) launches with a curated set. Expansion roadmap:

| Phase | Skills | Source |
|-------|--------|--------|
| **V1.0** | Internal Comms, Financial Analysis, Code Review, PRD Writing | StratAI curated |
| **V1.1** | PDF, Excel, PowerPoint processing | Adapted from Anthropic skills |
| **V1.2** | Brand Guidelines, Meeting Notes, Test Writing | StratAI curated |
| **V2.0** | Auto-sync with Anthropic skills repo | Automated pipeline |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/server/persistence/skills-postgres.ts` | **NEW** - Skills repository |
| `src/lib/types/skills.ts` | **NEW** - Skill types |
| `src/lib/config/platform-skills/` | **NEW** - Platform skills library (curated) |
| `src/lib/config/platform-skills/index.ts` | **NEW** - Platform skills registry |
| `src/routes/api/skills/+server.ts` | **NEW** - Skills API |
| `src/routes/api/areas/[areaId]/skills/+server.ts` | **NEW** - Area activation API |
| `src/routes/spaces/[space]/skills/+page.svelte` | **NEW** - Space skills page |
| `src/lib/components/skills/SkillCard.svelte` | **NEW** - Skill display component |
| `src/lib/components/skills/SkillEditor.svelte` | **NEW** - Skill editor modal |
| `src/lib/components/areas/ContextPanel.svelte` | Update for skills section |
| `src/lib/config/system-prompts.ts` | Update for skills injection |
| `src/lib/server/tools/read-skill.ts` | **NEW** - Read skill tool |
| `docs/features/TASK_ASSIGNMENT.md` | Task assignment (related) |
| `docs/CONTEXT_STRATEGY.md` | Context architecture (related) |

---

## Example Skill Content

### Financial Analysis Skill

```markdown
# Financial Analysis

## Overview
Apply rigorous financial analysis methodology to evaluate business value, investment opportunities, and strategic decisions.

## Workflow

### 1. Data Gathering
- Request key financial metrics: Revenue, EBITDA, growth rate, margins
- Identify comparable companies or transactions
- Note any data limitations or assumptions needed

### 2. Methodology Selection
Choose appropriate valuation approach based on context:
- **DCF**: For stable cash-flow businesses with predictable growth
- **Comparables**: When good public/private comparables exist
- **LBO**: For acquisition scenarios with debt financing
- **Sum-of-Parts**: For diversified businesses or conglomerates

### 3. Model Construction
- Build model in clear sections: Assumptions, Projections, Valuation
- State all assumptions explicitly with rationale
- Use conservative base case; create bull/bear scenarios
- Include sensitivity analysis on key drivers (growth, margins, discount rate)

### 4. Validation
- Cross-check with market multiples
- Sanity check against recent transactions
- Identify key risks to the thesis

### 5. Presentation
- Lead with conclusion and key metrics
- Support with methodology overview
- Highlight key assumptions and sensitivities
- Address potential concerns proactively

## Key Principles

1. **Transparency**: State all assumptions; never hide uncertainty
2. **Conservatism**: Base case should be achievable, not optimistic
3. **Triangulation**: Use multiple methods to validate conclusion
4. **Sensitivity Focus**: Identify which assumptions matter most
5. **Context Awareness**: Adjust methodology to situation (growth vs. mature, private vs. public)

## Output Format

When providing financial analysis:

```
## Executive Summary
[One paragraph: conclusion, key metric, confidence level]

## Valuation Summary
| Methodology | Value Range | Weight |
|-------------|-------------|--------|
| DCF         | $X - $Y     | 50%    |
| Comparables | $A - $B     | 30%    |
| ...         | ...         | ...    |

## Key Assumptions
- Growth rate: X% (rationale)
- Terminal multiple: Yx (rationale)
- Discount rate: X% (rationale)

## Sensitivity Analysis
[Table showing value at different assumption combinations]

## Risks & Considerations
- [Key risk 1]
- [Key risk 2]
```
```

---

## Design Rationale

### Why Skills Separate from Documents?

Documents are **reference material** (facts, data, specifications). Skills are **behavioral instructions** (workflows, methodologies, rules). Keeping them separate:

1. **Clarity**: Users understand the difference in purpose
2. **Activation**: Skills have activation modes; documents don't
3. **Conflict Resolution**: When methodologies conflict, resolution is explicit
4. **Reusability**: Skills are designed to be applied across contexts

### Why Summary + Tool Pattern?

Same rationale as documents:

1. **Token Efficiency**: Only inject summary (~200 tokens) into context
2. **On-Demand Detail**: AI calls `read_skill` when it needs full workflow
3. **Context Window Management**: Scale to many skills without context overflow
4. **Caching**: Stable summaries maximize prompt cache hits

### Why Space-Level First?

1. **Team Consistency**: Skills benefit from team-wide adoption
2. **Reduced Duplication**: One skill, multiple Areas
3. **Governance**: Space owners control methodology
4. **Simpler V1**: Avoids org-level permission complexity
