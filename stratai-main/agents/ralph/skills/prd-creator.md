---
name: prd-creator
description: "Generate schema-aware PRD from spec documents. Use when planning a feature, starting a new project, or creating requirements. Triggers on: create prd, write prd, plan feature, requirements for, spec out, ralph prd."
---

# PRD Creator

## Purpose

Generate detailed Product Requirements Documents that are:
- **Schema-aware**: References correct entity structures from ENTITY_MODEL.md
- **Pattern-compliant**: Code samples use postgres.js camelCase conventions
- **Gate-enforced**: All acceptance criteria include required quality checks
- **Right-sized**: Tasks fit within one context window

## The Job

1. **Research** - Analyze codebase for similar patterns
2. **Clarify** - Ask 3-5 essential questions (if needed)
3. **Generate** - Create structured PRD with stories
4. **Output** - Save to `agents/ralph/prd.json` and optional markdown

---

## Step 1: Research Phase

Before generating the PRD, research the codebase:

### Codebase Analysis

```bash
# Search for similar patterns
grep -r "similar_pattern" src/

# Find related components
find src -name "*related*" -type f

# Check existing implementations
cat src/lib/server/persistence/similar-postgres.ts
```

### Git History

```bash
# Find related commits
git log --oneline --grep="related feature"

# See how similar features were built
git log --oneline -- src/lib/server/persistence/
```

### Documentation Check

- `AGENTS.md` - Patterns and gotchas
- `docs/database/SCHEMA_REFERENCE.md` - Auto-generated TypeScript interfaces
- `docs/database/ENTITY_MODEL.md` - Schema context (Section 12 for complete schema)
- `docs/DATABASE_STANDARDIZATION_PROJECT.md` - DB access patterns

### Schema Query

If the feature involves database entities:
1. Check `docs/database/SCHEMA_REFERENCE.md` for ready-made TypeScript interfaces
2. Look up tables in `docs/database/ENTITY_MODEL.md` for relationships
3. Note nullable columns requiring `??` handling
4. Identify relationships and foreign keys

---

## Step 2: Clarifying Questions (If Needed)

Only ask if the initial prompt is ambiguous. Focus on:

- **Problem/Goal**: What problem does this solve?
- **Core Functionality**: What are the key actions?
- **Scope/Boundaries**: What should it NOT do?
- **Users**: Who is this for?

### Format Questions Like This

```
1. What is the primary goal?
   A. Improve user experience
   B. Add new capability
   C. Fix existing issue
   D. Other: [specify]

2. What is the scope?
   A. Minimal viable version
   B. Full-featured implementation
   C. Backend only
   D. Frontend only
```

This lets users respond with "1A, 2B" for quick iteration.

---

## Step 3: PRD Structure

Generate the PRD with these sections:

### 1. Introduction/Overview

Brief description of the feature and problem it solves.

### 2. Research Findings

```markdown
## Research Findings

**Similar patterns found:**
- `src/lib/server/persistence/users-postgres.ts` - Repository pattern
- `src/routes/api/users/` - API endpoint structure

**Relevant prior implementations:**
- Commit abc123: "feat: add space memberships"

**Applicable best practices:**
- postgres.js camelCase transformation
- Row converter pattern for null handling
```

### 3. Goals

Specific, measurable objectives (bullet list).

### 4. User Stories

Each story needs:
- **Title**: Short descriptive name
- **Description**: "As a [user], I want [feature] so that [benefit]"
- **Acceptance Criteria**: Verifiable checklist

#### Story Format

```markdown
### US-001: [Title]

**Description:** As a [user], I want [feature] so that [benefit].

**What to do:**
- [Specific action 1]
- [Specific action 2]
- [Specific action 3]

**Files:**
- [file path 1]
- [file path 2]

**Acceptance Criteria:**
- [ ] [Specific verifiable criterion]
- [ ] [Code sample if DB work - showing camelCase]
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] [Additional gates based on story type]

**Notes:**
- [Pattern to follow]
- [Related implementation to reference]
```

#### Story Sizing Rule

**Each story must be completable in ONE iteration (~one context window).**

Right-sized:
- Add a database column + migration
- Create a single UI component
- Implement one API endpoint

Too big (split these):
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

**Rule of thumb:** If you can't describe it in 2-3 sentences, split it.

### 5. Functional Requirements

Numbered list of specific functionalities:
- "FR-1: The system must allow users to..."
- "FR-2: When a user clicks X, the system must..."

### 6. Non-Goals

What this feature will NOT include. Critical for managing scope.

### 7. Technical Considerations

- Database constraints
- Existing patterns to follow
- Integration points
- Performance requirements

### 8. Risks & Mitigations

- Risk 1: [description] → Mitigation: [approach]

---

## Step 4: DB Stories Must Include Schema Context

For any story involving database work, include the schema context:

```markdown
### US-002: Create model-configs repository

**Description:** As a developer, I need type-safe DB access for model configurations.

**Schema Context (from docs/database/SCHEMA_REFERENCE.md):**

| Column (snake_case) | Property (camelCase) | Type | Nullable |
|---------------------|----------------------|------|----------|
| model_id | modelId | string | NO (PK) |
| parameter_constraints | parameterConstraints | object | NO |
| notes | notes | string | YES ⚠️ |

**Acceptance Criteria:**
- [ ] Row interface uses camelCase:
  ```typescript
  interface ModelConfigRow {
    modelId: string;           // NOT model_id
    parameterConstraints: object;
    notes: string | null;      // Nullable - use ??
  }
  ```
- [ ] Row converter handles nullable columns:
  ```typescript
  function rowToModelConfig(row: ModelConfigRow): ModelConfig {
    return {
      modelId: row.modelId,
      notes: row.notes ?? null,  // ✅ Correct
    };
  }
  ```
- [ ] npm run check passes
- [ ] npm run audit-db-access shows 0 violations
```

---

## Step 5: Output Formats

### prd.json Format

```json
{
  "feature": "Model Configuration System",
  "created": "2026-01-14",
  "parent_task_id": "task-abc123",
  "research": {
    "similar_patterns": [
      "src/lib/server/persistence/users-postgres.ts"
    ],
    "related_commits": ["abc123"],
    "docs_reviewed": ["docs/database/ENTITY_MODEL.md", "docs/database/SCHEMA_REFERENCE.md", "docs/DATABASE_STANDARDIZATION_PROJECT.md"]
  },
  "stories": [
    {
      "id": "US-001",
      "title": "Create model_configurations migration",
      "description": "As a developer, I need the database schema for model configurations.",
      "status": "pending",
      "dependencies": [],
      "acceptance_criteria": [
        "Migration creates table with correct columns",
        "Index on enabled column",
        "npm run check passes"
      ]
    },
    {
      "id": "US-002",
      "title": "Create model-configs-postgres.ts repository",
      "description": "As a developer, I need type-safe DB access for model configurations.",
      "status": "pending",
      "dependencies": ["US-001"],
      "acceptance_criteria": [
        "Row interface uses camelCase",
        "Row converter handles nullables with ??",
        "npm run check passes",
        "npm run audit-db-access shows 0 violations"
      ]
    }
  ]
}
```

### Markdown PRD (Optional)

Also generate a readable markdown version at `tasks/prd-[feature-name].md` for human review.

---

## Step 6: Checklist Before Saving

- [ ] Researched codebase for similar patterns
- [ ] Asked clarifying questions (if needed)
- [ ] Each story is right-sized (one context window)
- [ ] DB stories include schema context with camelCase
- [ ] All AC include `npm run check` and `npm run lint`
- [ ] DB stories include `npm run audit-db-access`
- [ ] UI stories include browser verification
- [ ] Non-goals clearly define scope boundaries
- [ ] Stories ordered by dependencies

---

## Example: Transform MODEL_CONFIGURATION_SYSTEM.md

Given the spec doc, generate:

```markdown
# PRD: Model Configuration System

## Introduction

A hybrid system for managing model-specific parameters without hardcoding. 
Allows runtime configuration via database with Admin UI for quick fixes.

## Research Findings

**Similar patterns:**
- `src/lib/server/persistence/users-postgres.ts` - Repository pattern
- `src/lib/config/model-capabilities.ts` - Existing model config

**Applicable patterns:**
- postgres.js camelCase transformation
- Row converter with null handling
- Admin UI pattern from `/admin/` routes

## Goals

- Runtime model configuration (no deploys for constraint changes)
- Type-safe database access following StratAI patterns
- Admin UI for viewing and editing configurations

## User Stories

### US-001: Create model_configurations migration

**Description:** As a developer, I need the database schema for model configurations.

**What to do:**
- Create migration file `030-model-configurations.sql`
- Define table with columns matching spec
- Add indexes and triggers

**Files:**
- src/lib/server/persistence/migrations/030-model-configurations.sql

**Acceptance Criteria:**
- [ ] Table has columns: model_id (PK), parameter_constraints, capabilities_override, enabled, deprecated, deprecation_message, notes, timestamps
- [ ] Index on `enabled` column
- [ ] Update trigger for `updated_at`
- [ ] npm run check passes
- [ ] npm run lint passes

### US-002: Create model-configs-postgres.ts repository

**Description:** As a developer, I need type-safe DB access for model configurations.

**Schema Context:**
| Column | Property | Type | Nullable |
|--------|----------|------|----------|
| model_id | modelId | string | NO |
| deprecation_message | deprecationMessage | string | YES |
| notes | notes | string | YES |
| updated_by | updatedBy | string | YES |

**What to do:**
- Create repository file with row interface
- Implement CRUD methods
- Export from persistence/index.ts

**Files:**
- src/lib/server/persistence/model-configs-postgres.ts
- src/lib/server/persistence/index.ts

**Acceptance Criteria:**
- [ ] Row interface uses camelCase (modelId not model_id)
- [ ] Nullable columns typed as `| null`
- [ ] Row converter uses `??` for nullables
- [ ] Methods: findByModelId, findAll, upsert, delete
- [ ] npm run check passes
- [ ] npm run audit-db-access shows 0 violations

### US-003: Create applyModelConstraints() service

**Description:** As a developer, I need a service that applies parameter constraints before LiteLLM calls.

[... continue with remaining stories ...]

## Non-Goals

- Version history for configs (V2)
- Bulk import/export (V2)
- A/B testing of configs (V2)

## Technical Considerations

- Uses postgres.js with camelCase transformation
- Extends existing model-capabilities.ts pattern
- Admin UI reuses existing admin layout
```

---

## Reference

- **TypeScript interfaces:** `docs/database/SCHEMA_REFERENCE.md`
- **Schema context:** `docs/database/ENTITY_MODEL.md`
- **DB patterns:** `docs/DATABASE_STANDARDIZATION_PROJECT.md`
- **AC templates:** `agents/ralph/skills/ac-generator.md`
- **Codebase patterns:** `AGENTS.md`

