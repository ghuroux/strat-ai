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
11. [Skill Enforcement Techniques](#11-skill-enforcement-techniques)

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

**Core Distinction:**
- **Skills** = *How* to work (methodologies, quality standards, workflows, rules)
- **Documents** = *What* we're working on (context, data, specs, reference materials)

This means quality assurance, review checklists, and process standards belong in Skills—not scattered across documents. A financial analyst's DCF methodology is a Skill; the company's Q3 financials are a Document.

| Aspect | Document | Skill |
|--------|----------|-------|
| **Purpose** | Reference information | Behavioral instructions |
| **Content** | Facts, data, specs | Workflows, methodologies, rules |
| **Injection** | Summary in prompt, full via tool | Summary in prompt, full via tool |
| **Example** | "Q1 Budget Spreadsheet" | "Financial Analysis Methodology" |
| **Changes** | Updated when data changes | Updated when process improves |
| **Ownership** | Often external (uploaded) | Internal (team-created) |

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

// For context injection (hybrid: full content or summary based on size)
export interface SkillContext {
  id: string;
  name: string;
  description: string;
  content: string;
  summary: string | null;
  activationMode: SkillActivationMode;  // Needed for injection priority sorting
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

### Injection Strategy: Hybrid (Full Content + Summary Fallback)

> **Decision (2026-01-30):** Skills use a **hybrid injection strategy**, NOT the document summary+tool pattern. Skills are behavioral instructions that the AI must follow — they need to be visible in the system prompt for reliable adherence. Documents are reference material looked up on demand. Different usage patterns warrant different injection strategies.

#### Why Not Follow the Document Pattern?

| | Documents | Skills |
|---|-----------|--------|
| **AI's relationship** | Reference material — look up *when relevant* | Behavioral instructions — follow *always when active* |
| **Usage pattern** | Occasional lookup | Continuous adherence |
| **Failure mode** | AI doesn't cite a fact → minor quality issue | AI doesn't follow methodology → **feature failed** |
| **Conclusion** | Summary + tool is optimal | Full visibility needed for adherence |

Research (Section 11) shows 50-70% adherence with summaries vs 70-85% with full content visible. For a system whose core value is "consistent AI behavior," that difference matters.

#### Hybrid Injection Rules

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    HYBRID SKILL INJECTION                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   For each active skill:                                                         │
│                                                                                  │
│   Content ≤ 800 tokens?  ──YES──▶  Inject FULL CONTENT in system prompt         │
│        │                           (inside <skill> tags)                          │
│        │                                                                         │
│        └──NO───▶  Inject SUMMARY/DESCRIPTION + tool instruction                  │
│                   (AI uses read_skill to get full content)                        │
│                                                                                  │
│   BUDGET GUARDRAIL:                                                              │
│   Total skill injection capped at 3000 tokens.                                   │
│   If active skills exceed budget:                                                │
│   1. Always-active skills get priority                                           │
│   2. Shorter skills get priority (more likely to fit)                             │
│   3. Remaining skills fall back to summary + tool                                │
│   4. AI informed: "Additional skills available via read_skill tool"              │
│                                                                                  │
│   read_skill tool is ALWAYS registered (even for fully-injected skills)          │
│   as a fallback for mid-conversation re-reads.                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Prompt Caching Economics

Skills in the system prompt benefit from **prefix caching** (Anthropic: 0.1x cost on cache hit). This makes full injection cheaper than it appears:

```
3 active skills × 500 tokens = 1,500 tokens in system prompt

Message 1:  Cache WRITE (1.25x)  = 1,875 token-equivalents
Message 2+: Cache HIT (0.1x)    = 150 token-equivalents each

Over a 10-message conversation:
  Full injection avg:    ~323 tokens/message (cached after msg 1)
  Summary + tool avg:   ~480 tokens/message (tool results NOT cached)

Full injection is CHEAPER after message 3, AND gives better adherence.
```

**Why skills are cache-friendly:**
- Content changes rarely (methodology documents, not live data)
- Active skills per Area are stable within a conversation
- Deterministic sort order (by ID) prevents cache-busting from reordering

### Skill Prompt Generation

**Location:** Update `src/lib/config/system-prompts.ts`

```typescript
/**
 * Skill context for prompt injection.
 * Uses hybrid strategy: full content for short skills, summary for long ones.
 */
export interface SkillContext {
  id: string;
  name: string;
  description: string;
  content: string;
  summary: string | null;
  activationMode: SkillActivationMode;
}

// Skill injection budget (tokens). Prevents unbounded prompt growth.
const SKILL_TOKEN_BUDGET = 3000;
// Skills under this threshold get full content injection.
// ~800 tokens ≈ a well-structured skill with workflow + output format + constraints.
const FULL_INJECTION_THRESHOLD = 800;

/**
 * Estimate token count from string length.
 * Rough heuristic: 1 token ≈ 4 characters for English text.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate prompt section for active skills using hybrid injection.
 *
 * Strategy:
 * 1. Sort: always-active first, then by content length (shorter first)
 * 2. Skills ≤ 800 tokens AND within budget → inject FULL content
 * 3. Skills > 800 tokens OR over budget → inject summary/description
 * 4. read_skill tool always available as fallback
 */
export function getSkillsPrompt(skills: SkillContext[]): string {
  if (!skills || skills.length === 0) return '';

  let tokensUsed = 0;
  const fullInjection: SkillContext[] = [];
  const summaryOnly: SkillContext[] = [];

  // Sort: always-active first, then by content length (shorter first)
  // Deterministic sort by ID as tiebreaker (cache stability)
  const sorted = [...skills].sort((a, b) => {
    if (a.activationMode === 'always' && b.activationMode !== 'always') return -1;
    if (b.activationMode === 'always' && a.activationMode !== 'always') return 1;
    const lenDiff = a.content.length - b.content.length;
    if (lenDiff !== 0) return lenDiff;
    return a.id.localeCompare(b.id);
  });

  for (const skill of sorted) {
    const contentTokens = estimateTokens(skill.content);
    if (contentTokens <= FULL_INJECTION_THRESHOLD
        && tokensUsed + contentTokens <= SKILL_TOKEN_BUDGET) {
      fullInjection.push(skill);
      tokensUsed += contentTokens;
    } else {
      summaryOnly.push(skill);
    }
  }

  let prompt = `
<active_skills>
## Active Skills

You have specialized skills that define methodologies and workflows you MUST follow:`;

  // Full content injection (high-adherence path)
  for (const skill of fullInjection) {
    prompt += `

<skill name="${skill.name}" injection="full">
${skill.content}
</skill>`;
  }

  // Summary injection (fallback path — use read_skill for full content)
  if (summaryOnly.length > 0) {
    prompt += `

The following skills are available via the **read_skill** tool:`;

    for (const skill of summaryOnly) {
      prompt += `

<skill name="${skill.name}" injection="summary">
${skill.summary || skill.description}
(Use read_skill tool to access the full methodology)
</skill>`;
    }
  }

  prompt += `

**Skill Usage:**
- Follow active skill methodologies for ALL relevant responses — these are instructions, not suggestions
- For skills shown in full above, apply the workflow directly
- For summarized skills, use **read_skill** tool to load the full methodology before applying
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

  // Add skills section (hybrid injection)
  if (skills && skills.length > 0) {
    prompt += getSkillsPrompt(skills);
  }

  // ... rest of function ...
}
```

### Tool: read_skill

The `read_skill` tool is **always registered** when skills are active, even for fully-injected skills. It serves as:
1. **Fallback** for summarized skills (over threshold or over budget)
2. **Re-read** for fully-injected skills when context window is long and AI needs a refresh
3. **Trigger-mode** access for skills not yet activated in the conversation

**Location:** `src/lib/server/tools/read-skill.ts`

```typescript
export const READ_SKILL_TOOL = {
  type: 'function',
  function: {
    name: 'read_skill',
    description: 'Read the full content of an active skill to access detailed workflows, steps, and methodologies. Use this for skills shown as summaries, or to re-read a skill\'s full methodology.',
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
  activeSkills?: Array<{ name: string; injection: 'full' | 'summary' }>;
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

## 11. Skill Enforcement Techniques

> **Research-backed approaches for reliable skill adherence (2025-2026)**

A key challenge with Skills is ensuring the AI *actually follows* the methodology rather than acknowledging it exists. Research shows LLM policy adherence rates vary from 31% to 69% without enforcement mechanisms.

### The Problem

Simply injecting skill content into prompts doesn't guarantee adherence. Models may:
- Acknowledge the skill but not apply it
- Apply it partially or inconsistently
- Override it when user requests seem to conflict
- Forget it in longer conversations

**Root cause:** LLMs cannot inherently distinguish between system prompts and user prompts—everything is just text. They tend to prioritize the most recent instructions in the context window.

---

### Alternative Techniques Evaluated

We evaluated seven alternative approaches against our baseline (summary + tool pattern):

#### 1. DSPy-Style Programmatic Skills

From [Stanford DSPy](https://dspy.ai/):

```python
# Define skills as executable signatures, not prose
class FinancialAnalysis(dspy.Signature):
    """Analyze company value using DCF methodology"""
    company_data = dspy.InputField(desc="Financial metrics")

    assumptions = dspy.OutputField(desc="Explicit assumptions")
    methodology = dspy.OutputField(desc="DCF, Comparables, or LBO")
    valuation = dspy.OutputField(desc="Range with sensitivity")

# Optimizer automatically tunes prompts for adherence
optimizer = dspy.MIPROv2(metric=accuracy_metric)
optimized_skill = optimizer.compile(FinancialAnalysis, trainset=examples)
```

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Higher - structured outputs enforced |
| **Complexity** | High - requires DSPy integration |
| **User authoring** | Harder - need to define schemas |
| **Verdict** | **V2 consideration** for critical skills |

**Reference:** [DSPy Optimization Study](https://arxiv.org/html/2507.03620v1) - "Accuracy improved from 46.2% to 64.0% on prompt evaluation tasks."

#### 2. Constrained Decoding

From [XGrammar](https://blog.mlc.ai/2024/11/22/achieving-efficient-flexible-portable-structured-generation-with-xgrammar):

Enforce output structure at token generation level—model can ONLY generate valid tokens matching a schema.

| Aspect | Assessment |
|--------|------------|
| **Adherence** | 100% for structure |
| **Availability** | NOT available via Claude/OpenAI APIs |
| **Verdict** | **Not feasible** - requires self-hosted models |

#### 3. Constitutional AI / Self-Critique Loop

From [Anthropic's Constitutional AI](https://arxiv.org/abs/2212.08073):

```
Generate → Critique → Revise Loop
─────────────────────────────────
1. AI generates response
2. AI critiques: "Did I follow the skill methodology?"
3. AI revises based on critique
4. Repeat until satisfactory
```

**Implementation:**
```markdown
After generating your response, self-critique:
1. Did I follow each step in the skill workflow?
2. Did I include all required output sections?
3. Did I violate any constraints?

If any answer is "no", revise your response before presenting.
```

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Higher - self-verification catches errors |
| **Complexity** | Low - just prompt engineering |
| **Token cost** | 1.3-1.5x |
| **Verdict** | **Strong V1 candidate** |

**Reference:** [Constitutional AI Paper](https://arxiv.org/abs/2212.08073) - "Model-generated critiques progressively reduce errors."

#### 4. Extended Thinking Integration

From [Claude Extended Thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking):

```
Use extended thinking for skill compliance checking
──────────────────────────────────────────────────
1. Enable extended thinking for skill-heavy responses
2. Prompt: "In your thinking, verify each skill step"
3. Thinking traces provide audit trail
4. Summary shows methodology was followed
```

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Higher - deliberate verification |
| **Audit trail** | Built-in via thinking summary |
| **Token cost** | Variable (budget_tokens) |
| **Verdict** | **Strong V1 candidate** |

**Reference:** [Extended Thinking Tips](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/extended-thinking-tips) - "Valuable for policy-heavy environments when Claude needs to verify compliance."

#### 5. ToolGuard Pattern (Two-Phase Enforcement)

From [IBM ToolGuard](https://arxiv.org/abs/2507.16459):

```
BUILDTIME: Compile skill → validation rules
RUNTIME: Check compliance before/after response
──────────────────────────────────────────────
Skill: Financial Analysis
Guards:
  - MUST contain "Assumptions" section
  - MUST specify methodology (DCF|Comparables|LBO)
  - MUST include risk factors
  - Token count for assumptions >= 50

Post-generation: Validate → Pass/Fail → Retry if needed
```

| Aspect | Assessment |
|--------|------------|
| **Adherence** | High - deterministic validation |
| **Complexity** | Medium - need validation engine |
| **Determinism** | Guaranteed checks run |
| **Verdict** | **Good V2 pattern** |

**Reference:** [ToolGuard Research](https://arxiv.org/abs/2507.16459) - "31-69% baseline adherence without guards."

#### 6. Cognitive Architecture (Procedural + Semantic Memory)

From [Wheeler & Jeunen 2025](https://arxiv.org/abs/2505.03434):

Separate LEARNER (semantic) from ACTOR (procedural):
- Learner Agent monitors, identifies skills, adapts to context
- Actor Agent (LLM) executes playbook, focuses on quality

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Potentially highest |
| **Complexity** | Very high - multi-agent |
| **Research maturity** | Emerging (2025) |
| **Verdict** | **Over-engineered** for current stage |

#### 7. Meta-Prompting (Prompt Optimization)

From [OpenAI Cookbook](https://cookbook.openai.com/examples/enhance_your_prompts_with_meta_prompting):

```
Use LLM to optimize skill prompts for adherence
───────────────────────────────────────────────
1. User writes skill in natural language
2. Meta-prompt optimizes for clarity/enforceability
3. Test against examples, refine iteratively
4. Store optimized version
```

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Improved prompts = better following |
| **User experience** | Better - AI helps write skills |
| **One-time cost** | Optimization on skill creation |
| **Verdict** | **Good V1.5 feature** |

---

### Recommended Hybrid Approach

#### V1 Enforcement Stack

Layer techniques that require no infrastructure changes:

```
┌─────────────────────────────────────────────────────────────┐
│  V1 SKILL ENFORCEMENT STACK                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: STRUCTURED SKILL TEMPLATE                         │
│  ─────────────────────────────────────────────────────────  │
│  • Required sections: Workflow, Output Format, Examples     │
│  • MUST/NEVER constraints explicitly marked                 │
│  • Counter-examples showing what NOT to do                  │
│                                                             │
│  Layer 2: SELF-CRITIQUE INSTRUCTION                         │
│  ─────────────────────────────────────────────────────────  │
│  • Add to skill prompt: "After generating, verify you       │
│    followed each workflow step. Revise if needed."          │
│  • ~1.3x token cost, meaningful adherence improvement       │
│                                                             │
│  Layer 3: EXTENDED THINKING FOR COMPLEX SKILLS              │
│  ─────────────────────────────────────────────────────────  │
│  • Skills can be marked `requires_thinking: true`           │
│  • Enable extended thinking for those responses             │
│  • Provides audit trail in thinking summary                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### V2 Additions

```
┌─────────────────────────────────────────────────────────────┐
│  V2 ENFORCEMENT ADDITIONS                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 4: AI-ASSISTED SKILL AUTHORING                       │
│  ─────────────────────────────────────────────────────────  │
│  • Meta-prompt optimizes user-written skills                │
│  • Suggests improvements for enforceability                 │
│  • Addresses "users can't write good skills" problem        │
│                                                             │
│  Layer 5: POST-GENERATION VALIDATION                        │
│  ─────────────────────────────────────────────────────────  │
│  • Skills define validation_rules (required sections, etc.) │
│  • Lightweight check after generation                       │
│  • Retry loop if validation fails (max 2 retries)           │
│                                                             │
│  Layer 6: STRUCTURED OUTPUT SCHEMAS (critical skills)       │
│  ─────────────────────────────────────────────────────────  │
│  • For high-stakes skills (financial, legal, compliance)    │
│  • JSON schema enforcement via API structured outputs       │
│  • Guarantees structure, not content quality                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Estimated Adherence by Approach

| Approach | Est. Adherence | Token Cost | Complexity |
|----------|----------------|------------|------------|
| Summary + tool (document pattern) | 50-70% | 1x | Low |
| **Hybrid injection (V1 baseline)** | **65-80%** | **~1x (cached)** | **Low** |
| + Structured templates | 70-85% | ~1x | Low |
| + Self-critique loop | 80-90% | 1.3x | Low |
| + Extended thinking | 85-95% | 1.5-2x | Low |
| + Post-gen validation | 90-97% | 1.5x + retries | Medium |
| + Structured outputs | 95-100% (structure) | 1x | Medium |

**V1 baseline: Hybrid injection** — full content for skills ≤800 tokens (most skills), summary + tool for oversized skills. Budget cap at 3000 tokens. Prompt caching makes full injection cost-neutral after message 3.

**V1 Target: 80-90% adherence** with hybrid injection + structured templates + self-critique (layers 1-3).

---

### V1 Skill Template (Enhanced)

```markdown
# [Skill Name]

## When to Apply
[Explicit conditions that trigger this methodology]

## Required Workflow (MUST follow in order)
1. [Step] → Verify: [what proves this step was done]
2. [Step] → Verify: [checkpoint]
3. [Step] → Verify: [checkpoint]
...

## Output Format (MUST match this structure)
[Exact template the response must follow]

## Constraints (NEVER violate)
- [Hard constraint 1]
- [Hard constraint 2]

## Example Application

**User asks:** "[Example query]"

**Correct response:**
[Full worked example showing methodology applied correctly]

**Incorrect response (common mistake):**
[Counter-example showing what NOT to do and why]

## Self-Verification
After generating your response, verify:
- [ ] Followed each workflow step in order
- [ ] Output matches required format
- [ ] No constraints violated
- [ ] All required sections present

If any check fails, revise before presenting.
```

---

### Database Schema Addition (V2)

For enforcement features:

```sql
-- Add to skills table for V2 enforcement
ALTER TABLE skills ADD COLUMN requires_thinking BOOLEAN DEFAULT false;
ALTER TABLE skills ADD COLUMN validation_rules JSONB;  -- For post-gen validation
ALTER TABLE skills ADD COLUMN output_schema JSONB;     -- For structured outputs
ALTER TABLE skills ADD COLUMN complexity TEXT DEFAULT 'standard'
  CHECK (complexity IN ('simple', 'standard', 'complex'));
```

---

### Monitoring Skill Adherence

Track whether skills are being followed:

1. **Context transparency** - Show which skills were active (already planned)
2. **User feedback** - "Did the AI follow the methodology?" thumbs up/down
3. **Automated evaluation** - Sample responses, check against skill requirements
4. **Thinking audit** - Review extended thinking summaries for compliance verification

**Reference:** [LLM Reliability Evaluation](https://galileo.ai/blog/llm-reliability) - "Quality monitoring should assess instruction following as a key indicator."

---

### Research Sources

**Instruction Adherence:**
- [The Stability Trap: LLM Instruction Adherence Auditing](https://arxiv.org/html/2601.11783)
- [Towards Verifiably Safe Tool Use](https://arxiv.org/html/2601.08012)
- [Tool Calling Optimization](https://www.statsig.com/perspectives/tool-calling-optimization) - "Reliable agents are built, not wished into existence"

**Enforcement Frameworks:**
- [IBM ToolGuard](https://arxiv.org/abs/2507.16459) - Two-phase enforcement pattern
- [Routine: Structural Planning](https://arxiv.org/pdf/2507.14447) - Workflow encoding
- [Constitutional AI](https://arxiv.org/abs/2212.08073) - Self-critique methodology

**Advanced Techniques:**
- [DSPy Framework](https://dspy.ai/) - Programmatic prompt optimization
- [Claude Extended Thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) - Reasoning traces
- [Meta-Prompting Guide](https://www.promptingguide.ai/techniques/meta-prompting) - Prompt optimization
- [Procedural Memory Research](https://arxiv.org/abs/2505.03434) - Cognitive architectures

**Structured Generation:**
- [Constrained Decoding Guide](https://www.aidancooper.co.uk/constrained-decoding/)
- [XGrammar](https://blog.mlc.ai/2024/11/22/achieving-efficient-flexible-portable-structured-generation-with-xgrammar)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/changelog)

---

## Design Rationale

### Why Skills Separate from Documents?

Documents are **reference material** (facts, data, specifications). Skills are **behavioral instructions** (workflows, methodologies, rules). Keeping them separate:

1. **Clarity**: Users understand the difference in purpose
2. **Activation**: Skills have activation modes; documents don't
3. **Conflict Resolution**: When methodologies conflict, resolution is explicit
4. **Reusability**: Skills are designed to be applied across contexts

### Why Hybrid Injection (Not Pure Summary + Tool)?

> **Updated 2026-01-30:** Originally specified as summary + tool (matching documents). Changed to hybrid injection after analyzing the fundamental difference between reference material and behavioral instructions.

Skills are **instructions the AI must follow**, not reference material it looks up. The document pattern optimizes for token efficiency at the cost of adherence. For Skills, adherence IS the feature.

**Hybrid injection** (full content for ≤800 token skills, summary for larger ones):

1. **Adherence**: Full content visibility → 65-80% baseline (vs 50-70% for summary-only)
2. **Cache economics**: Full content in system prompt gets prefix caching (0.1x after msg 1). Tool results in message history are NOT prefix-cached. Full injection is actually *cheaper* after 3 messages.
3. **Latency**: No tool round-trip for the common case (most skills are ≤800 tokens)
4. **Graceful degradation**: 3000-token budget cap prevents unbounded growth. Oversized/overflow skills automatically fall back to summary + tool.
5. **Tool still available**: `read_skill` always registered for re-reads, trigger-mode skills, and summarized overflow skills

The key insight: **prompt caching makes the "expensive" approach cheaper than the "efficient" approach** for content that doesn't change within a conversation. Skills are the most cache-friendly content in the system prompt.

### Why Space-Level First?

1. **Team Consistency**: Skills benefit from team-wide adoption
2. **Reduced Duplication**: One skill, multiple Areas
3. **Governance**: Space owners control methodology
4. **Simpler V1**: Avoids org-level permission complexity
