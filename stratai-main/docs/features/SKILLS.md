# Skills System

> **Status:** Design Complete | **Priority:** Medium | **Dependencies:** Spaces, Areas, System Prompts
>
> **Market Research:** See [`docs/research/SKILLS_MARKET_RESEARCH.md`](../research/SKILLS_MARKET_RESEARCH.md) for competitive landscape, community sentiment, enterprise requirements, and the Skills + Integrations convergence thesis.

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
- Codify team expertise so it persists across conversations and team members

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

A skill is a **domain-specific instruction set** that teaches the AI specialized behaviors, workflows, and methodologies. Skills are **passive context** — once activated in an Area, they shape every AI response in that Area without requiring user action per-message.

```
+-------------------------------------------------------------+
|                         SKILL ANATOMY                        |
+-------------------------------------------------------------+
|                                                              |
|   METADATA                                                   |
|   - Name: financial-analysis                                 |
|   - Description: "Analyze financial data using DCF..."       |
|   - Keywords: ["valuation", "DCF", "financial model"]        |
|                                                              |
|   CONTENT (Markdown)                                         |
|   - # Financial Analysis Skill                               |
|   -                                                          |
|   - ## Workflow                                              |
|   - 1. Gather key metrics (revenue, EBITDA, growth rate)     |
|   - 2. Determine appropriate valuation methodology           |
|   - 3. Build DCF model with explicit assumptions             |
|   - 4. Sensitivity analysis on key drivers                   |
|   - 5. Compare to market multiples                           |
|   -                                                          |
|   - ## Key Principles                                        |
|   - - Always state assumptions explicitly                    |
|   - - Use conservative projections                           |
|   - - Consider multiple scenarios (base/bull/bear)           |
|   -   ...                                                    |
|                                                              |
+-------------------------------------------------------------+
```

### Ownership Model

> **Decision (2026-01-31):** Skills are **first-class entities owned by users**, not child objects of Spaces or Areas. Like Spaces, skills belong to their creator and live within an org context. Ownership can transfer (succession) if the creator leaves.

```
+-------------------------------------------------------------+
|                    SKILL OWNERSHIP                            |
+-------------------------------------------------------------+
|                                                              |
|   Skills are like Spaces:                                    |
|                                                              |
|   +-- Belong to an ORG (context boundary)                    |
|   +-- Owned by a USER (creator, transferable)                |
|   +-- Created by a USER (immutable audit trail)              |
|                                                              |
|   Skills are NOT like Documents:                             |
|                                                              |
|   Documents = Space-scoped data ("Nedbank Q3 Financials")    |
|   Skills = User-owned expertise ("Financial Analysis")       |
|                                                              |
|   A user's skills follow them across all their Spaces.       |
|                                                              |
+-------------------------------------------------------------+
```

| Aspect | Space | Skill |
|--------|-------|-------|
| **Owner** | Creator (user) | Creator (user) |
| **Belongs to** | Org | Org (via creator's org) |
| **If owner leaves** | Ownership transfers | Ownership transfers |
| **Deletion** | Owner or org admin | Owner or org admin |

### Visibility & Sharing

Skills have a visibility level that determines who can see and activate them:

```
PERSONAL (V1 default)
  Creator sees it in all their Areas/Spaces
  Nobody else sees it
  No approval needed
      |
      v  [Creator requests to share] (V2)
      |
SPACE-SHARED (V2, approval required)
  Creator submits to Space admin
  Space admin approves -> Space members can see and activate it
      |
      v  [Org admin can promote] (V2)
      |
ORG-WIDE (V2, org admin approval)
  Visible to all Spaces in the org
  Org admin approves (or promotes from Space-shared)
```

| Visibility | Who sees it | Who decides | Quality gate | Version |
|------------|-------------|-------------|--------------|---------|
| **Personal** | Only creator | Creator | None needed | **V1** |
| **Space** | Space members | Space admin approves | Space admin reviews | V2 |
| **Org** | All Spaces in org | Org admin approves | Org admin reviews | V2 |

**Key principle:** The creator always sees their own skills everywhere they work, regardless of sharing status. A personal skill doesn't need approval to be useful to its creator.

**V2 Approval Flow:**

```
Creator: "Share Financial Analysis with Nedbank Space"
    |
    v
Space Admin sees request:
    [Approve for this Space]  [Approve for Org]  [Reject]
    |                          |
    v                          v
visibility = 'space'         visibility = 'org'
+ skill_space_shares entry   (visible everywhere in org)
```

An org admin seeing a Space-level share request can "upgrade" it to org-wide. A Space admin can only approve for their Space.

### Activation Model

Skills are activated per-Area via the ContextPanel, same pattern as documents.

**V1 (personal skills):**

| Action | How |
|--------|-----|
| **Create** | User creates skill (personal library) |
| **Activate** | Creator toggles their skill on in any Area's ContextPanel |
| **Deactivate** | Creator toggles skill off |

**V2 (shared skills):**

| Action | How |
|--------|-----|
| **Share** | Creator requests share -> admin approves |
| **Activate** | Any Space/Area member toggles shared skill on in ContextPanel |
| **Deactivate** | Any member toggles it off for their Area |

This is deliberately simple. Skills are *environment* — "how we work in this Area" — not on-demand actions. See [V2: Quick Skills](#quick-skills-v2) for the on-demand invocation pattern.

### Skill vs Document

**Core Distinction:**
- **Skills** = *How* to work (methodologies, quality standards, workflows, rules)
- **Documents** = *What* we're working on (context, data, specs, reference materials)

This means quality assurance, review checklists, and process standards belong in Skills — not scattered across documents. A financial analyst's DCF methodology is a Skill; the company's Q3 financials are a Document.

| Aspect | Document | Skill |
|--------|----------|-------|
| **Purpose** | Reference information | Behavioral instructions |
| **Content** | Facts, data, specs | Workflows, methodologies, rules |
| **Ownership** | Space-scoped (data belongs to project) | User-owned (expertise belongs to person) |
| **Cross-Space** | No (inherently contextual) | Yes (expertise is portable) |
| **Injection** | Summary in prompt, full via `read_document` tool | Short: full in prompt. Long: summary + `read_skill` tool |
| **Example** | "Q1 Budget Spreadsheet" | "Financial Analysis Methodology" |
| **Changes** | Updated when data changes | Updated when process improves |
| **Activation** | Toggle per-Area in ContextPanel | Toggle per-Area in ContextPanel |

---

## 3. User Stories

### Create a Skill

```
AS A user
I WANT TO create a skill
SO THAT I can codify my expertise as reusable AI instructions

Acceptance Criteria:
- [ ] Can create skill with name, description, and content
- [ ] Can optionally add keywords (for discoverability and tool matching)
- [ ] Skill is personal by default (only I can see it)
- [ ] Skill appears in my skills list
- [ ] Can use the skill in any Area I belong to
```

### Activate Skill in Area

```
AS A user in an Area
I WANT TO activate my skills (and shared skills) in this Area
SO THAT the AI uses those methodologies here

Acceptance Criteria:
- [ ] ContextPanel shows my personal skills + shared skills for this Space
- [ ] Can activate/deactivate skills per Area (same toggle pattern as documents)
- [ ] Active skills reflected in AI responses
```

### Share a Skill (V2)

```
AS A skill creator
I WANT TO share my skill with a Space or org
SO THAT my team can benefit from my expertise

Acceptance Criteria:
- [ ] Can request to share a skill with a specific Space
- [ ] Space admin receives share request notification
- [ ] Space admin can approve for Space or promote to Org
- [ ] Approved skills visible to Space/Org members in ContextPanel
- [ ] Rejected requests notify creator with optional reason
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
- [ ] Short skills injected fully into AI context
- [ ] Long skills summarized in context, full content via read_skill tool
- [ ] AI follows skill workflows and principles
- [ ] Context transparency shows active skills
```

---

## 4. Database Schema

### Migration: Create skills tables

```sql
-- Migration: YYYYMMDD_001_skills.sql

-- Skills table (first-class entity, user-owned)
CREATE TABLE skills (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Org context (skills don't cross orgs, same as Spaces)
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Ownership
  owner_id TEXT NOT NULL REFERENCES users(id),     -- Current owner (transferable)
  created_by TEXT NOT NULL REFERENCES users(id),    -- Original creator (immutable audit)

  -- Visibility (V1: personal only. V2 adds 'space', 'org')
  visibility TEXT NOT NULL DEFAULT 'personal'
    CHECK (visibility IN ('personal', 'space', 'org')),

  -- Metadata
  name TEXT NOT NULL,
  description TEXT NOT NULL,  -- One-line description for prompt injection

  -- Content
  content TEXT NOT NULL,  -- Full markdown skill content
  summary TEXT,  -- AI-generated summary (~200 tokens) for prompt injection

  -- Discoverability
  keywords TEXT[],  -- Optional keywords for search, filtering, and tool matching

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Area skill activation (which skills are active in which Areas)
-- Works for both personal and shared skills
CREATE TABLE area_skill_activations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  area_id TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by TEXT NOT NULL REFERENCES users(id),

  UNIQUE(area_id, skill_id)
);

-- V2: Space-scoped sharing (which Spaces can see a shared skill)
-- Only needed when visibility = 'space'
-- When visibility = 'org', skill is visible everywhere (no entries needed)
CREATE TABLE skill_space_shares (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  approved_by TEXT NOT NULL REFERENCES users(id),
  approved_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(skill_id, space_id)
);

-- V2: Share request workflow
CREATE TABLE skill_share_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id),
  target_space_id TEXT REFERENCES spaces(id),  -- NULL = requesting org-wide
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_skills_org ON skills(org_id);
CREATE INDEX idx_skills_owner ON skills(owner_id);
CREATE INDEX idx_skills_visibility ON skills(visibility);
CREATE INDEX idx_area_skill_activations_area ON area_skill_activations(area_id);
CREATE INDEX idx_area_skill_activations_skill ON area_skill_activations(skill_id);
CREATE INDEX idx_skill_space_shares_space ON skill_space_shares(space_id);
CREATE INDEX idx_skill_share_requests_status ON skill_share_requests(status)
  WHERE status = 'pending';
```

### TypeScript Types

```typescript
// In src/lib/types/skills.ts

export type SkillVisibility = 'personal' | 'space' | 'org';

export interface Skill {
  id: string;

  // Context
  orgId: string;

  // Ownership
  ownerId: string;
  createdBy: string;

  // Visibility
  visibility: SkillVisibility;

  // Metadata
  name: string;
  description: string;  // One-line, for prompt injection

  // Content
  content: string;  // Full markdown
  summary: string | null;  // AI-generated ~200 token summary

  // Discoverability
  keywords: string[] | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSkillInput {
  name: string;
  description: string;
  content: string;
  keywords?: string[];
  // orgId and ownerId derived from session
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  content?: string;
  keywords?: string[];
}

export interface AreaSkillActivation {
  id: string;
  areaId: string;
  skillId: string;
  activatedAt: Date;
  activatedBy: string;
}

// V2: Sharing
export interface SkillSpaceShare {
  id: string;
  skillId: string;
  spaceId: string;
  approvedBy: string;
  approvedAt: Date;
}

export interface SkillShareRequest {
  id: string;
  skillId: string;
  requestedBy: string;
  targetSpaceId: string | null;  // null = org-wide request
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
}

// For context injection (size-based: full content or summary)
export interface SkillContext {
  id: string;
  name: string;
  description: string;
  content: string;
  summary: string | null;
  keywords: string[] | null;
}
```

---

## 5. API Changes

### Skill Endpoints

**POST /api/skills** - Create skill (personal)
```typescript
// Request body
{
  name: string;
  description: string;
  content: string;
  keywords?: string[];
}
// orgId, ownerId, createdBy derived from session
// visibility defaults to 'personal'

// Response
{
  skill: Skill;
}
```

**GET /api/skills** - List my skills
```typescript
// Returns all skills owned by the current user
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

**PATCH /api/skills/[id]** - Update skill (owner only)
```typescript
// Request body
{
  name?: string;
  description?: string;
  content?: string;
  keywords?: string[];
}
```

**DELETE /api/skills/[id]** - Delete skill (owner or org admin)

### Skills Available for an Area

**GET /api/areas/[areaId]/available-skills** - List skills activatable in this Area
```typescript
// Returns:
// V1: Current user's personal skills
// V2: + Space-shared skills + Org-wide skills
// Response
{
  skills: Skill[];
}
```

### Area Skill Activation Endpoints

**POST /api/areas/[areaId]/skills** - Activate skill in Area
```typescript
// Request body
{
  skillId: string;
}
```

**DELETE /api/areas/[areaId]/skills/[skillId]** - Deactivate skill

**GET /api/areas/[areaId]/skills** - List activated skills for this Area
```typescript
// Response
{
  skills: Skill[];  // Full skill objects for activated skills
}
```

### V2: Sharing Endpoints

**POST /api/skills/[id]/share** - Request to share skill
```typescript
// Request body
{
  targetSpaceId?: string;  // null = org-wide request
}
// Response
{
  request: SkillShareRequest;
}
```

**GET /api/spaces/[spaceId]/skill-requests** - List pending share requests (Space admin)
```typescript
// Response
{
  requests: (SkillShareRequest & { skill: Skill })[];
}
```

**POST /api/skill-requests/[id]/review** - Approve/reject share request
```typescript
// Request body
{
  action: 'approve' | 'approve_org' | 'reject';
  rejectionReason?: string;
}
```

### Repository Methods

```typescript
// In src/lib/server/persistence/skills-postgres.ts

interface SkillsRepository {
  // CRUD
  createSkill(input: CreateSkillInput, userId: string, orgId: string): Promise<Skill>;
  getSkill(skillId: string): Promise<Skill | null>;
  updateSkill(skillId: string, input: UpdateSkillInput): Promise<Skill>;
  deleteSkill(skillId: string): Promise<void>;

  // Listing
  getSkillsByOwner(userId: string): Promise<Skill[]>;

  // Area context
  getAvailableSkillsForArea(areaId: string, userId: string): Promise<Skill[]>;
  // V1: personal skills owned by userId
  // V2: + Space-shared skills for this Area's Space + Org-wide skills

  // Area activations
  activateSkillInArea(areaId: string, skillId: string, userId: string): Promise<void>;
  deactivateSkillInArea(areaId: string, skillId: string): Promise<void>;
  getActivatedSkillsForArea(areaId: string): Promise<Skill[]>;

  // Context loading (for prompt injection)
  getActiveSkillContextForArea(areaId: string): Promise<SkillContext[]>;
  // Returns all activated skills for this Area with content for injection

  // V2: Sharing
  requestShare(skillId: string, userId: string, targetSpaceId?: string): Promise<SkillShareRequest>;
  reviewShareRequest(requestId: string, reviewerId: string, action: string, reason?: string): Promise<void>;
  getPendingShareRequests(spaceId: string): Promise<SkillShareRequest[]>;

  // V2: Ownership transfer
  transferOwnership(skillId: string, newOwnerId: string): Promise<void>;
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
    isActivated?: boolean;  // In Area context
    showActions?: boolean;  // Edit/Delete (only for owner)
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleActivation?: (activated: boolean) => void;
  }
</script>
```

```
+-------------------------------------------------------------+
|  Financial Analysis                          [Personal]      |
|  -----------------------------------------------------------+
|  Analyze financial data using DCF methodology,               |
|  sensitivity analysis, and market comparables.               |
|                                                              |
|  Keywords: valuation, DCF, financial model                   |
|                                                              |
|                              [Share] [Edit]  [Delete]        |
+-------------------------------------------------------------+
```

Visibility badge shows: `[Personal]`, `[Shared: Nedbank]`, or `[Org-wide]`

### 6.2 SkillEditor Component

Create/edit skill with markdown preview.

**Location:** `src/lib/components/skills/SkillEditor.svelte`

```
+-------------------------------------------------------------+
|  Create Skill                                           [X]  |
+-------------------------------------------------------------+
|                                                              |
|  Name                                                        |
|  +-------------------------------------------------------+  |
|  | Financial Analysis                                     |  |
|  +-------------------------------------------------------+  |
|                                                              |
|  Description (one line for AI context)                       |
|  +-------------------------------------------------------+  |
|  | Analyze financial data using DCF methodology...        |  |
|  +-------------------------------------------------------+  |
|                                                              |
|  Keywords (optional, comma-separated)                        |
|  +-------------------------------------------------------+  |
|  | valuation, DCF, financial model, EBITDA                |  |
|  +-------------------------------------------------------+  |
|  Helps with search and AI tool matching                      |
|                                                              |
|  Content                                  [Edit] [Preview]   |
|  +-------------------------------------------------------+  |
|  | # Financial Analysis Skill                             |  |
|  |                                                        |  |
|  | ## Workflow                                            |  |
|  | 1. Gather key metrics...                               |  |
|  | 2. Determine methodology...                            |  |
|  | ...                                                    |  |
|  +-------------------------------------------------------+  |
|                                                              |
|                               [Cancel]  [Create Skill]       |
+-------------------------------------------------------------+
```

No Space/Area selector — skills are personal by default. Sharing is a separate action (V2).

### 6.3 My Skills Page

Personal skills library. Accessible from user menu or settings.

**Location:** `src/routes/skills/+page.svelte`

```
+-------------------------------------------------------------+
|  My Skills                                  [+ New Skill]    |
+-------------------------------------------------------------+
|                                                              |
|  Your personal skills library                                |
|  Activate these in any Area you work in                      |
|                                                              |
|  +-------------------------------------------------------+  |
|  |  Financial Analysis                     [Personal]     |  |
|  |  DCF methodology, sensitivity analysis...              |  |
|  +-------------------------------------------------------+  |
|                                                              |
|  +-------------------------------------------------------+  |
|  |  Investment Memo                        [Personal]     |  |
|  |  Structure investment memos with thesis...             |  |
|  +-------------------------------------------------------+  |
|                                                              |
|  +-------------------------------------------------------+  |
|  |  Code Review                    [Shared: Nedbank SVS]  |  |
|  |  Review code for security, performance...              |  |
|  +-------------------------------------------------------+  |
|                                                              |
|  ---  Platform Library  ----------------------------------   |
|                                                              |
|  Curated skills maintained by StratAI                        |
|                                                              |
|  ANALYSIS & STRATEGY                                         |
|  +-------------------------------------------------------+  |
|  |  PRD Writing                              [+ Add]      |  |
|  |  Structure product requirements documents...           |  |
|  +-------------------------------------------------------+  |
|                                                              |
+-------------------------------------------------------------+
```

### 6.4 Context Panel Skills Section

Show activatable skills in Area Context Panel. **Same toggle pattern as documents.**

**Location:** Update `src/lib/components/areas/ContextPanel.svelte`

```
+-------------------------------------------------------------+
|  Context                                                [X]  |
+-------------------------------------------------------------+
|                                                              |
|  Area Notes                                                  |
|  +-------------------------------------------------------+  |
|  | Q1 budget planning for Nedbank project...              |  |
|  +-------------------------------------------------------+  |
|                                                              |
|  Skills                                                      |
|  +-------------------------------------------------------+  |
|  |  My Skills                                             |  |
|  |  Financial Analysis                               yes  |  |
|  |  Investment Memo                                   no  |  |
|  |                                                        |  |
|  |  Shared Skills (V2)                                    |  |
|  |  Brand Guidelines              [Org]              yes  |  |
|  |  Nedbank Compliance            [Space]            yes  |  |
|  +-------------------------------------------------------+  |
|                                                              |
|  Documents                                                   |
|  +-------------------------------------------------------+  |
|  |  Q1_Budget_Template.xlsx                          yes  |  |
|  |  Historical_Data.pdf                              yes  |  |
|  +-------------------------------------------------------+  |
|                                                              |
+-------------------------------------------------------------+
```

### 6.5 Platform Skills Library

Curated skills provided by StratAI, inspired by [Anthropic's Skills Library](https://github.com/anthropics/skills).

Accessible from the My Skills page as a section/tab (not Space-scoped — platform skills are added to your personal library).

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
// +-- index.ts           # Registry of all platform skills
// +-- internal-comms.ts  # Internal Communications skill
// +-- financial-analysis.ts
// +-- code-review.ts
// +-- ...

export interface PlatformSkill {
  id: string;           // e.g., 'platform:internal-comms'
  name: string;
  description: string;
  category: 'business' | 'documents' | 'analysis' | 'development' | 'creative';
  content: string;      // Full markdown content
  summary: string;      // Pre-generated summary for prompt injection
  keywords: string[];   // For search and discoverability
  version: string;      // Semantic version for updates
}

// When user adds platform skill to personal library:
// 1. Copy platform skill content to skills table
// 2. Mark as source: 'platform' and platform_skill_id: 'platform:internal-comms'
// 3. User can customize (creates fork)
// 4. Updates available when platform version > local version
```

**Database columns for platform skill tracking:**

```sql
-- Add to skills table
ALTER TABLE skills ADD COLUMN source TEXT DEFAULT 'custom'
  CHECK (source IN ('custom', 'platform'));
ALTER TABLE skills ADD COLUMN platform_skill_id TEXT;  -- e.g., 'platform:internal-comms'
ALTER TABLE skills ADD COLUMN platform_version TEXT;   -- Track version for update notifications
```

---

## 7. System Prompt Integration

### Injection Strategy: Size-Based (Full Content or Summary + Tool)

> **Decision (2026-01-31):** Skills use a **size-based injection strategy** that follows the document pattern but with a key difference — short skills get their full content injected directly (because they're behavioral instructions the AI must follow), while long skills use summary + `read_skill` tool (same as documents use `read_document`).

#### Why Size-Based?

Skills are **instructions the AI must follow**, not reference material it looks up. A 200-token summary of a 2000-token methodology doesn't give the AI enough detail to actually adhere to the workflow. But injecting the full content of every skill would be wasteful for large skills.

```
+---------------------------------------------------------------------+
|                    SKILL INJECTION (SIZE-BASED)                      |
+---------------------------------------------------------------------+
|                                                                      |
|   For each active skill in the Area:                                 |
|                                                                      |
|   Content <= 800 tokens?  --YES-->  Inject FULL CONTENT              |
|        |                            in system prompt                 |
|        |                            (inside <skill> tags)            |
|        |                                                             |
|        +--NO--->  Inject SUMMARY in system prompt                    |
|                   + register read_skill tool                         |
|                   (AI fetches full content when needed)              |
|                                                                      |
|   read_skill tool is ONLY registered when long skills exist.         |
|   Short skills need no tool -- full content is already visible.      |
|                                                                      |
+---------------------------------------------------------------------+
```

**Context loading for an Area combines:**
- Creator's personal skills activated in this Area
- V2: Space-shared skills activated in this Area
- V2: Org-wide skills activated in this Area

All activated skills are treated identically for injection — the visibility/sharing model is purely an access control concern, not a prompt concern.

#### Why Not Pure Document Pattern (Summary + Tool for Everything)?

| | Documents | Skills |
|---|-----------|--------|
| **AI's relationship** | Reference material — look up *when relevant* | Behavioral instructions — follow *always when active* |
| **Usage pattern** | Occasional lookup | Continuous adherence |
| **Failure mode** | AI doesn't cite a fact -> minor quality issue | AI doesn't follow methodology -> **feature failed** |
| **Conclusion** | Summary + tool is optimal | Full content needed for adherence (when feasible) |

Research (Section 11) shows 50-70% adherence with summaries vs 70-85% with full content visible. For short skills (the common case), the cost of full injection is negligible — especially with prompt caching.

#### Prompt Caching Economics

Skills in the system prompt benefit from **prefix caching** (Anthropic: 0.1x cost on cache hit). This makes full injection cheaper than it appears:

```
3 active skills x 500 tokens = 1,500 tokens in system prompt

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
 * Size-based strategy: full content for short skills, summary for long ones.
 */

// Skills under this threshold get full content injection.
// ~800 tokens = a well-structured skill with workflow + output format + constraints.
const FULL_INJECTION_THRESHOLD = 800;

/**
 * Estimate token count from string length.
 * Rough heuristic: 1 token ~ 4 characters for English text.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate prompt section for active skills.
 *
 * Strategy:
 * 1. Skills <= 800 tokens -> inject FULL content in system prompt
 * 2. Skills > 800 tokens -> inject summary, AI uses read_skill tool for full content
 * 3. Sort by ID for cache stability
 */
export function getSkillsPrompt(skills: SkillContext[]): string {
  if (!skills || skills.length === 0) return '';

  const fullInjection: SkillContext[] = [];
  const summaryOnly: SkillContext[] = [];

  // Sort by ID for deterministic ordering (cache stability)
  const sorted = [...skills].sort((a, b) => a.id.localeCompare(b.id));

  for (const skill of sorted) {
    const contentTokens = estimateTokens(skill.content);
    if (contentTokens <= FULL_INJECTION_THRESHOLD) {
      fullInjection.push(skill);
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

  // Summary injection (fallback path -- use read_skill for full content)
  if (summaryOnly.length > 0) {
    prompt += `

The following skills are available via the **read_skill** tool:`;

    for (const skill of summaryOnly) {
      prompt += `

<skill name="${skill.name}" injection="summary">
${skill.summary || skill.description}
(Use read_skill tool to access the full methodology before applying)
</skill>`;
    }
  }

  prompt += `

**Skill Usage:**
- Follow active skill methodologies for ALL relevant responses -- these are instructions, not suggestions
- For skills shown in full above, apply the workflow directly
- For summarized skills, use **read_skill** tool to load the full methodology before applying
- Skills define *how* to work; documents provide *what* to reference
- If multiple skills apply, combine their principles thoughtfully
</active_skills>`;

  return prompt;
}
```

### Tool: read_skill

The `read_skill` tool is **only registered when long skills (>800 tokens) are active**. It serves one purpose: letting the AI fetch the full content of a skill whose summary was injected in the system prompt.

This is the honest equivalent of the `read_document` tool — the AI genuinely needs the content and the UX animation ("Reading Financial Analysis skill...") reflects real work.

**Location:** `src/lib/server/tools/read-skill.ts`

```typescript
export const READ_SKILL_TOOL = {
  type: 'function',
  function: {
    name: 'read_skill',
    description: 'Read the full content of an active skill to access detailed workflows, steps, and methodologies. Use this for skills shown as summaries in your context.',
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

### Phase 1: Schema & Backend

- [ ] Create migration: `skills` and `area_skill_activations` tables
- [ ] Include V2 tables (`skill_space_shares`, `skill_share_requests`) in schema for forward compatibility (not used in V1)
- [ ] Create TypeScript types in `src/lib/types/skills.ts`
- [ ] Create `skills-postgres.ts` repository
- [ ] Create skill API endpoints (CRUD, personal only)
- [ ] Create area skill activation endpoints
- [ ] Create `GET /api/areas/[areaId]/available-skills` endpoint
- [ ] Run migration, verify tables

### Phase 2: System Prompt Integration

- [ ] Add `getSkillsPrompt()` to `system-prompts.ts`
- [ ] Update `getFocusAreaPrompt()` to accept skills
- [ ] Create `read_skill` tool definition (for long skills)
- [ ] Implement `executeReadSkill()` function
- [ ] Update Area chat endpoint to load and inject skills
- [ ] Conditionally register `read_skill` tool (only when long skills active)
- [ ] Test: create skill, activate in Area, verify in AI context

### Phase 3: UI - My Skills & Skill Editor

- [ ] Create `SkillCard.svelte` component
- [ ] Create `SkillEditor.svelte` component (modal)
- [ ] Create My Skills page (`/skills`)
- [ ] Add Skills link to user navigation
- [ ] Test: create, edit, delete skills in UI

### Phase 4: UI - Area Activation & Context Panel

- [ ] Update `ContextPanel.svelte` with skills section (same toggle pattern as documents)
- [ ] Show personal skills available for this Area
- [ ] Wire up activation/deactivation API calls
- [ ] Test: activate personal skill in Area, verify in AI context

### Phase 5: Context Transparency & AI Summary Generation

- [ ] Update `ResponseContextBadge.svelte` with skills
- [ ] Update context metadata to track active skills
- [ ] Update Prompt Inspector to show skill content
- [ ] Add summary generation on skill create/update (Haiku 4.5, same pattern as documents)
- [ ] Test: verify active skills shown in context badge, summaries generated

### Phase 6: Platform Skills Library

- [ ] Create `src/lib/config/platform-skills/` directory structure
- [ ] Define `PlatformSkill` interface and registry
- [ ] Create initial platform skills (4-6 curated skills):
  - [ ] Internal Communications
  - [ ] Financial Analysis
  - [ ] Code Review
  - [ ] PRD Writing
- [ ] Add `source` and `platform_skill_id` columns to skills table
- [ ] Create "Add from Library" section in My Skills page
- [ ] Implement platform skill copying to personal library
- [ ] Add version tracking for update notifications
- [ ] Test: add platform skill, customize, verify updates available

---

## 9. Edge Cases

| Scenario | Handling |
|----------|----------|
| Skill deleted while activated in Areas | CASCADE delete removes activations |
| Skill updated while active in Area | Next chat loads fresh content |
| Large skill content (>3200 chars / ~800 tokens) | Summary in prompt, full via `read_skill` tool |
| Conflicting skills activated in same Area | AI synthesizes; deterministic sort by ID |
| User activates skill in Area they later lose access to | Activation remains but skill excluded from context (user can't access Area) |
| Owner leaves org (V2) | Org admin transfers ownership to another user |
| Shared skill updated by owner | All Spaces using it get updated content on next chat |
| No skills active in Area | No skills section in prompt, `read_skill` tool not registered |
| All active skills are short | Full content injected, `read_skill` tool not registered |
| User has 20+ personal skills | All shown in My Skills page; only activated ones injected in prompt |
| V2: Share request for Space user isn't in | Reject — can only request share to Spaces you belong to |
| V2: Org admin deletes shared skill | CASCADE removes shares and activations; dependents notified |

---

## 10. Future Enhancements (V2)

**Not in V1 scope — defer these:**

### Sharing & Approval Workflow (V2)

> **Decision (2026-01-31):** V1 skills are personal only. V2 adds approval-based sharing to maintain quality as skills become shared resources.

**Approval flow:**
1. Creator requests to share skill with a Space (or org-wide)
2. Space admin (or org admin) reviews the skill content
3. Admin approves for Space, promotes to Org, or rejects with reason
4. Approved skills become visible to Space/Org members in ContextPanel
5. Creator can update content; changes propagate to all Spaces using it

**Succession:**
When a skill owner leaves the org, org admin transfers `owner_id` to another user. Same process as Space ownership transfer.

**Admin UI:**
- Space settings: "Pending Skill Requests" section
- Org admin: "Manage Org Skills" page
- Notification system: email/in-app for share requests and approvals

### Quick Skills (V2)

> **Decision (2026-01-31):** V1 Skills are passive context (environment). V2 adds on-demand invocation as a separate interaction pattern called **Quick Skills**.

Quick Skills enable users to invoke a skill for a specific message or short interaction via "/" in the chat input or a button press, without permanently activating it in the Area.

| Aspect | Area Skills (V1) | Quick Skills (V2) |
|--------|-------------------|---------------------|
| **Mental model** | "How this Area works" | "Help me with this right now" |
| **Activation** | Toggle in ContextPanel | "/" in chat or button press |
| **Lifetime** | Persistent until deactivated | Active until dismissed |
| **Token cost** | Amortized by caching | Only when invoked |
| **Example** | Financial Analysis methodology | PPTX formatting guide |
| **UX** | Invisible (always in context) | Visible badge "PPTX Formatting active [x]" |

Quick Skills share the same `skills` table and `read_skill` tool — the data model supports it without changes. Only the interaction pattern differs.

### Other V2 Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Skill Analytics** | Track which skills are most used/effective |
| **Skill Versioning** | Track changes over time, rollback capability |
| **Skill Inheritance** | Org skills can be extended/overridden at Space level |
| **Community Marketplace** | User-contributed skill templates (moderated) |
| **Skill Parameters** | Skills with configurable options (e.g., "formality level") |
| **Skill Composition** | Combine multiple skills into meta-skills |
| **AI-Assisted Skill Authoring** | Meta-prompt optimizes user-written skills for adherence |

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
| `src/routes/api/areas/[areaId]/available-skills/+server.ts` | **NEW** - Available skills for Area |
| `src/routes/skills/+page.svelte` | **NEW** - My Skills page |
| `src/lib/components/skills/SkillCard.svelte` | **NEW** - Skill display component |
| `src/lib/components/skills/SkillEditor.svelte` | **NEW** - Skill editor modal |
| `src/lib/components/areas/ContextPanel.svelte` | Update for skills section |
| `src/lib/config/system-prompts.ts` | Update for skills injection |
| `src/lib/server/tools/read-skill.ts` | **NEW** - Read skill tool (long skills only) |

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

**Root cause:** LLMs cannot inherently distinguish between system prompts and user prompts -- everything is just text. They tend to prioritize the most recent instructions in the context window.

---

### Alternative Techniques Evaluated

We evaluated seven alternative approaches:

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

#### 2. Constrained Decoding

Enforce output structure at token generation level -- model can ONLY generate valid tokens matching a schema.

| Aspect | Assessment |
|--------|------------|
| **Adherence** | 100% for structure |
| **Availability** | NOT available via Claude/OpenAI APIs |
| **Verdict** | **Not feasible** - requires self-hosted models |

#### 3. Constitutional AI / Self-Critique Loop

```
Generate -> Critique -> Revise Loop
1. AI generates response
2. AI critiques: "Did I follow the skill methodology?"
3. AI revises based on critique
4. Repeat until satisfactory
```

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Higher - self-verification catches errors |
| **Complexity** | Low - just prompt engineering |
| **Token cost** | 1.3-1.5x |
| **Verdict** | **Strong V1 candidate** |

#### 4. Extended Thinking Integration

```
Use extended thinking for skill compliance checking
1. Enable extended thinking for skill-heavy responses
2. Prompt: "In your thinking, verify each skill step"
3. Thinking traces provide audit trail
```

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Higher - deliberate verification |
| **Audit trail** | Built-in via thinking summary |
| **Token cost** | Variable (budget_tokens) |
| **Verdict** | **Strong V1 candidate** |

#### 5. ToolGuard Pattern (Two-Phase Enforcement)

```
BUILDTIME: Compile skill -> validation rules
RUNTIME: Check compliance before/after response
Post-generation: Validate -> Pass/Fail -> Retry if needed
```

| Aspect | Assessment |
|--------|------------|
| **Adherence** | High - deterministic validation |
| **Complexity** | Medium - need validation engine |
| **Verdict** | **Good V2 pattern** |

#### 6. Cognitive Architecture (Procedural + Semantic Memory)

Separate LEARNER (semantic) from ACTOR (procedural).

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Potentially highest |
| **Complexity** | Very high - multi-agent |
| **Verdict** | **Over-engineered** for current stage |

#### 7. Meta-Prompting (Prompt Optimization)

Use LLM to optimize skill prompts for adherence at creation time.

| Aspect | Assessment |
|--------|------------|
| **Adherence** | Improved prompts = better following |
| **User experience** | Better - AI helps write skills |
| **Verdict** | **Good V1.5 feature** |

---

### Recommended Enforcement Stack

#### V1 Enforcement

```
+-------------------------------------------------------------+
|  V1 SKILL ENFORCEMENT STACK                                  |
+-------------------------------------------------------------+
|                                                              |
|  Layer 1: SIZE-BASED INJECTION                               |
|  ------------------------------------------------------------+
|  - Short skills (<= 800 tokens): full content in prompt     |
|  - Long skills (> 800 tokens): summary + read_skill tool    |
|  - Full content gives 65-80% baseline adherence             |
|                                                              |
|  Layer 2: STRUCTURED SKILL TEMPLATE                          |
|  ------------------------------------------------------------+
|  - Required sections: Workflow, Output Format, Examples      |
|  - MUST/NEVER constraints explicitly marked                  |
|  - Counter-examples showing what NOT to do                   |
|                                                              |
|  Layer 3: SELF-CRITIQUE INSTRUCTION                          |
|  ------------------------------------------------------------+
|  - Add to skill prompt: "After generating, verify you        |
|    followed each workflow step. Revise if needed."           |
|  - ~1.3x token cost, meaningful adherence improvement        |
|                                                              |
+-------------------------------------------------------------+
```

#### V2 Additions

```
+-------------------------------------------------------------+
|  V2 ENFORCEMENT ADDITIONS                                    |
+-------------------------------------------------------------+
|                                                              |
|  Layer 4: EXTENDED THINKING FOR COMPLEX SKILLS               |
|  ------------------------------------------------------------+
|  - Skills can be marked requires_thinking: true              |
|  - Enable extended thinking for those responses              |
|  - Provides audit trail in thinking summary                  |
|                                                              |
|  Layer 5: AI-ASSISTED SKILL AUTHORING                        |
|  ------------------------------------------------------------+
|  - Meta-prompt optimizes user-written skills                 |
|  - Suggests improvements for enforceability                  |
|                                                              |
|  Layer 6: POST-GENERATION VALIDATION                         |
|  ------------------------------------------------------------+
|  - Skills define validation_rules (required sections, etc.)  |
|  - Lightweight check after generation                        |
|  - Retry loop if validation fails (max 2 retries)            |
|                                                              |
+-------------------------------------------------------------+
```

### Estimated Adherence by Approach

| Approach | Est. Adherence | Token Cost | Complexity |
|----------|----------------|------------|------------|
| Summary + tool only (document pattern) | 50-70% | 1x | Low |
| **Size-based injection (V1 baseline)** | **65-80%** | **~1x (cached)** | **Low** |
| + Structured templates | 70-85% | ~1x | Low |
| + Self-critique loop | 80-90% | 1.3x | Low |
| + Extended thinking | 85-95% | 1.5-2x | Low |
| + Post-gen validation | 90-97% | 1.5x + retries | Medium |

**V1 Target: 80-90% adherence** with size-based injection + structured templates + self-critique (layers 1-3).

---

### V1 Skill Template (Enhanced)

```markdown
# [Skill Name]

## When to Apply
[Explicit conditions for when this methodology is relevant]

## Required Workflow (MUST follow in order)
1. [Step] -> Verify: [what proves this step was done]
2. [Step] -> Verify: [checkpoint]
3. [Step] -> Verify: [checkpoint]
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

### V2 Database Schema Additions

For enforcement features:

```sql
ALTER TABLE skills ADD COLUMN requires_thinking BOOLEAN DEFAULT false;
ALTER TABLE skills ADD COLUMN validation_rules JSONB;  -- For post-gen validation
ALTER TABLE skills ADD COLUMN output_schema JSONB;     -- For structured outputs
ALTER TABLE skills ADD COLUMN complexity TEXT DEFAULT 'standard'
  CHECK (complexity IN ('simple', 'standard', 'complex'));
```

---

### Research Sources

**Instruction Adherence:**
- [The Stability Trap: LLM Instruction Adherence Auditing](https://arxiv.org/html/2601.11783)
- [Towards Verifiably Safe Tool Use](https://arxiv.org/html/2601.08012)
- [Tool Calling Optimization](https://www.statsig.com/perspectives/tool-calling-optimization)

**Enforcement Frameworks:**
- [IBM ToolGuard](https://arxiv.org/abs/2507.16459) - Two-phase enforcement pattern
- [Routine: Structural Planning](https://arxiv.org/pdf/2507.14447) - Workflow encoding
- [Constitutional AI](https://arxiv.org/abs/2212.08073) - Self-critique methodology

**Advanced Techniques:**
- [DSPy Framework](https://dspy.ai/) - Programmatic prompt optimization
- [Claude Extended Thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking) - Reasoning traces
- [Meta-Prompting Guide](https://www.promptingguide.ai/techniques/meta-prompting) - Prompt optimization
- [Procedural Memory Research](https://arxiv.org/abs/2505.03434) - Cognitive architectures

---

## Design Rationale

### Why User-Owned Skills (Not Space-Scoped)?

> **Decision (2026-01-31):** Skills are first-class entities owned by users, not child objects of Spaces or Areas.

Documents are Space-scoped because they're inherently contextual — "Nedbank Q3 Financials" belongs to the Nedbank Space. Skills are expertise — "Financial Analysis Methodology" belongs to the person who wrote it.

Forcing skills into Space ownership means:
1. **Duplication**: Same skill recreated in every Space the creator works in
2. **Drift**: Copies diverge as the creator updates one but not others
3. **Artificial scoping**: Expertise doesn't belong to a project; it belongs to a person
4. **No succession**: If Space-scoped, what happens when the skill is used across 5 Spaces and the creator leaves?

User ownership solves all four. A skill lives once, the creator uses it everywhere, and ownership can transfer cleanly.

### Why Approval-Based Sharing?

> **Decision (2026-01-31):** Sharing skills beyond personal use requires admin approval.

Without quality gates, shared skills become polluted. One poorly-written skill shared to an org affects every team member's AI experience. The approval flow provides:

1. **Quality control**: Admin reviews before broader exposure
2. **Graduated scope**: Space admin approves for Space; org admin can promote to org-wide
3. **Creator autonomy**: Personal skills need no approval — your expertise, your rules
4. **Natural fit**: Mirrors how organizations already handle shared resources (document publishing, template libraries)

V1 ships without sharing (personal only). This is safe because personal skills are already useful across all the creator's Spaces, and the schema supports sharing from day one.

### Why Size-Based Injection?

> **Updated 2026-01-31:** Simplified from the previous "hybrid injection engine" (with token budgets, activation-mode priority sorting, and always-registered tools) to a simple size check.

Skills are **instructions the AI must follow**, not reference material it looks up. For short skills (the common case, most skills are under 800 tokens), full content injection gives the best adherence at negligible cost (prompt caching makes it cheaper than tool calls after message 3).

For long skills (>800 tokens), summary + `read_skill` tool follows the proven document pattern. The `read_skill` tool is only registered when long skills exist — no tool sprawl for the common case.

**Key insight:** Prompt caching makes full injection of short skills cheaper than the "efficient" summary + tool approach. Skills are the most cache-friendly content in the system prompt (stable, rarely changed, deterministic order).

### Why Area Skills First (Not Quick Skills)?

> **Decision (2026-01-31):** V1 builds Area Skills (passive context). Quick Skills (on-demand "/" invocation) is V2.

1. **Area Skills are the moat.** No competitor does "persistent methodology per workspace context." Everyone does slash commands.
2. **Area Skills are simpler to build.** They follow the document pattern already in place. Quick Skills need new UX (chat input integration, auto-deactivation logic, "active for this message" semantics).
3. **Quick Skills layer on top.** Once Area Skills exist, adding "/" invocation is additive. Same `skills` table, same content, different interaction pattern.
4. **Foundation supports both.** The schema, types, and content model work for both paradigms without changes.
