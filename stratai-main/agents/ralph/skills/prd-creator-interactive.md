# PRD Creator (Interactive Mode)

## Purpose

Transform a feature spec into a Ralph-ready PRD through an **interactive process** that:
- Researches the codebase before planning
- Flags logic issues or ambiguities for human review
- Proposes spec changes if needed
- Only generates prd.json **after confirmation and using the standard PRD creator**

**This skill wraps the standard `prd-creator.md` with an interactive validation layer.**

## Invocation

```
Create a PRD for [feature spec path] using the interactive PRD creator 
at agents/ralph/skills/prd-creator-interactive.md

Note: This will use agents/ralph/skills/prd-creator.md for actual generation.
```

---

## Phase 1: Research (Silent)

Automatically research without asking. This is comprehensive - don't skip steps.

### 1.1 Read the Spec

```bash
cat [spec_path]
```

### 1.2 Codebase Analysis

```bash
# Search for similar patterns
grep -r "similar_pattern" src/

# Find related components
find src -name "*related*" -type f

# Check existing implementations
cat src/lib/server/persistence/similar-postgres.ts
```

### 1.3 Git History

```bash
# Find related commits
git log --oneline --grep="related feature"

# See how similar features were built
git log --oneline -- src/lib/server/persistence/
```

### 1.4 Documentation Check

Review these documents (note relevant sections):
- `AGENTS.md` - Patterns and gotchas
- `docs/database/SCHEMA_REFERENCE.md` - Auto-generated TypeScript interfaces
- `docs/database/ENTITY_MODEL.md` - Schema context (Section 12 for complete schema)
- `docs/architecture/DATABASE_STANDARDIZATION_PROJECT.md` - DB access patterns

### 1.5 Schema Query (If DB work involved)

1. Check `docs/database/SCHEMA_REFERENCE.md` for ready-made TypeScript interfaces
2. Look up tables in `docs/database/ENTITY_MODEL.md` for relationships
3. Note nullable columns requiring `??` handling
4. Identify relationships and foreign keys

**Output:** Internal notes (don't show user unless relevant)

---

## Phase 2: Analysis & Flag Issues

After research, analyze for issues AND prepare clarifying questions.

### 2.1 Categorize Issues Found

#### 🔴 Blockers (Must resolve before PRD)
- Spec conflicts with existing code
- Missing prerequisites
- Impossible requirements
- Data model contradictions

#### 🟡 Clarifications Needed
- Ambiguous requirements
- Multiple valid interpretations
- Edge cases not covered
- Scope unclear

#### 🟢 Suggestions (Optional improvements)
- Better approaches found in codebase
- Patterns that could simplify implementation
- Potential future issues to consider

### 2.2 Focus Areas for Clarifications

When formulating questions, cover these areas (if not already clear from spec):

- **Problem/Goal**: What problem does this solve?
- **Core Functionality**: What are the key actions?
- **Scope/Boundaries**: What should it NOT do?
- **Users**: Who is this for?

### 2.3 Question Format (Multiple Choice)

Format questions for quick responses. User can reply "1A, 2B":

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

**If any 🔴 or 🟡 items exist → STOP and present to user**

### Output Format (When Issues Found)

```markdown
## PRD Analysis: [Feature Name]

### 🔴 Blockers
1. **[Issue Title]**
   - What I found: [description]
   - Why it's a problem: [explanation]
   - Suggested resolution: [proposal]

### 🟡 Clarifications Needed
1. **[Question]**
   - Context: [what I found]
   - Options: 
     A) [option 1]
     B) [option 2]
   - My recommendation: [preference + why]

### 🟢 Suggestions
1. **[Suggestion]**
   - Current spec says: [X]
   - I found: [Y in codebase]
   - Proposal: [Z]

---

**Please review and respond:**
- For blockers: How should we resolve?
- For clarifications: Which option? (e.g., "1A, 2B")
- For suggestions: Accept/reject?

Once confirmed, I'll generate the PRD.
```

---

## Phase 3: Spec Amendment (If Needed)

If user confirms changes:

1. **Update the spec file** with agreed changes (or note them)
2. **Document decisions** in the PRD's research section
3. **Proceed to generation**

---

## Phase 4: PRD Generation (DELEGATE TO STANDARD)

**⚠️ CRITICAL RULES:**
1. Do NOT generate the PRD freestyle - follow the standard PRD creator
2. The PRIMARY output is `prd.json` - this is what Ralph loop reads
3. Markdown is secondary - nice for humans but not required for the loop
4. All 3 files in `agents/ralph/` MUST be created/updated

Only after Phase 2 is clear (no blockers, clarifications resolved):

### Step 4.0: Set Parent Task ID

Generate a kebab-case task ID from the feature name and save to `parent-task-id.txt`:

```bash
# Example: "Phase A.1: Area Visibility Fixes" → "phase-a1-area-visibility"
echo "phase-a1-area-visibility" > agents/ralph/parent-task-id.txt
```

This ID will be used in:
- `prd.json` → `parent_task_id` field
- `progress.txt` → Parent Task reference
- Ralph loop scoping

### Step 4.1: Read the Standard PRD Creator

```
READ agents/ralph/skills/prd-creator.md IN FULL
```

This is not optional. The standard PRD creator contains:
- Required PRD structure (Step 1)
- Schema context format for DB stories (Step 2)
- Output format specifications (Step 3)
- Quality checklist (Step 4)

### Step 4.2: Execute Standard PRD Creator Steps 1-4

Follow the standard PRD creator's instructions exactly:

1. **Step 1: PRD Structure** - Use all required sections
2. **Step 2: DB Stories Schema Context** - Include table mappings for any DB work
3. **Step 3: Output Formats** - Generate both prd.json AND prd-[feature].md
4. **Step 4: Checklist** - Verify all items before saving

### Step 4.3: Augment with Interactive Session Decisions

Add to the `research` section of prd.json:

```json
{
  "research": {
    "similar_patterns": [...],
    "related_commits": [...],
    "docs_reviewed": [...],
    "decisions_made": [
      {
        "question": "[from Phase 2]",
        "decision": "[user's choice]",
        "rationale": "[why]"
      }
    ]
  }
}
```

### Step 4.4: Initialize progress.txt with Decisions

```markdown
# Ralph Progress Log

## Feature: [name]
**Parent Task:** [id]
**Started:** [date]
**Status:** Ready to begin

## Decisions Made During PRD Creation
- [Decision 1]: [rationale from Phase 2/3]
- [Decision 2]: [rationale]

## Codebase Patterns Discovered
[patterns from Phase 1 research]

## Stories
| ID | Title | Status |
|----|-------|--------|
| US-001 | ... | pending |
```

---

## Phase 5: Workspace Setup

**Create isolated workspace for parallel execution:**

### Step 5.1: Determine Workspace Name

Use the `parent_task_id` from Phase 4:
- Must be filesystem-safe: lowercase, hyphens only, no spaces
- Example: "Page Listing Access Fix" → "page-listing-access-fix"
- This becomes the workspace directory name

### Step 5.2: Create Workspace Directory Structure

```bash
mkdir -p agents/ralph/workspaces/{parent-task-id}/
```

### Step 5.3: Move Files to Workspace

Move the PRD files you just created INTO the workspace:

```bash
# Move from root ralph/ to workspace/
mv agents/ralph/prd.json agents/ralph/workspaces/{parent-task-id}/prd.json
mv agents/ralph/progress.txt agents/ralph/workspaces/{parent-task-id}/progress.txt
mv agents/ralph/parent-task-id.txt agents/ralph/workspaces/{parent-task-id}/parent-task-id.txt
```

**CRITICAL:** All three files MUST be in the workspace directory, not in agents/ralph/ root.

### Step 5.4: Create Git Feature Branch

```bash
git checkout -b feature/{parent-task-id}
```

This isolates the feature work on its own branch for clean PR workflow.

### Step 5.5: Commit Workspace Creation

```bash
git add agents/ralph/workspaces/{parent-task-id}/
git commit -m "feat: create PRD workspace for {feature-name}

- Created workspace: agents/ralph/workspaces/{parent-task-id}/
- Initialized prd.json with {count} stories
- Created feature branch: feature/{parent-task-id}
- Ready for Ralph loop execution"
```

---

## Phase 6: Confirmation

After completing Phases 1-5, present:

```markdown
## PRD Created Successfully ✅

**Feature:** [name]
**Stories:** [count]
**Workspace:** agents/ralph/workspaces/{parent-task-id}/
**Branch:** feature/{parent-task-id}

**Files created (VERIFY ALL EXIST):**
- ✅ agents/ralph/workspaces/{parent-task-id}/parent-task-id.txt - **REQUIRED**
- ✅ agents/ralph/workspaces/{parent-task-id}/prd.json - **REQUIRED**
- ✅ agents/ralph/workspaces/{parent-task-id}/progress.txt - **REQUIRED**
- 📄 tasks/prd-[feature-name].md (human-readable copy) - Optional

**Git Setup:**
- ✅ Feature branch created: feature/{parent-task-id}
- ✅ Workspace committed to branch

### Decisions Captured
| Question | Decision | Rationale |
|----------|----------|-----------|
| [from Phase 2] | [choice] | [why] |

### Story Summary
| ID | Title | Effort | Has Schema Context |
|----|-------|--------|-------------------|
| US-001 | ... | small | ✅ (if DB work) |

### Quality Checklist (from prd-creator.md Step 4)
- [ ] Each story is right-sized (one context window)
- [ ] DB stories include schema context with camelCase
- [ ] All AC include `npm run check` and `npm run lint`
- [ ] DB stories include `npm run audit-db-access`
- [ ] Stories ordered by dependencies

### Ready for Ralph Loop 🚀

**To start autonomous implementation:**

```bash
cd agents/ralph
./ralph.sh workspaces/{parent-task-id}
```

Ralph will:
- ✅ Load PRD from workspace
- ✅ Implement stories sequentially with fresh context per story
- ✅ Auto-commit after each story
- ✅ Auto-fix validation failures (max 2 attempts)
- ✅ Archive and extract patterns when complete
- ✅ Mark workspace as completed

**For parallel execution**, you can run multiple Ralph instances:
```bash
# Terminal 1
./ralph.sh workspaces/feature-a

# Terminal 2
./ralph.sh workspaces/feature-b

# Terminal 3
./ralph.sh workspaces/feature-c
```

Each workspace is isolated - no conflicts! 🎉

### Additional Commands
- List workspaces: `./ralph.sh --list`
- Check status: `./ralph.sh --status workspaces/{parent-task-id}`
- Manual preflight: `./agents/ralph/validation/preflight.sh`
2. Begin US-001

Shall I start the implementation now?
```

---

## Example Flow

### Scenario: User runs PRD creator on Phase A.1

**Phase 1: Agent researches silently...**
- Reads spec
- Greps codebase for `isGeneral`, `findAllAccessible`
- Reviews `areas-postgres.ts`, `SCHEMA_REFERENCE.md`

**Phase 2: Agent finds issues and STOPS:**
```markdown
## PRD Analysis: Area Visibility Fixes

### 🟡 Clarifications Needed

1. **Guest role behavior unclear**
   - Spec says: "General area always visible to space members"
   - I found: Code has special handling for 'guest' role (excluded from open areas)
   - Question: Should guests see General area?
   - Options:
     A) Yes - General is universal (even guests see it)
     B) No - Guests only see explicitly shared areas
   - My recommendation: A) General should be universal

2. **findAllAccessible vs findAll usage**
   - Spec assumes findAll is the problem
   - I found: findAllAccessible exists and handles most cases
   - Question: Is the bug that findAllAccessible isn't being called, or that it's missing logic?
   - My recommendation: Investigate callers first

---

Please clarify these points and I'll generate the PRD.
```

**User responds:**
"A for guests. And yes, let's verify findAllAccessible is called everywhere first."

**Phase 3: Agent documents decisions**

**Phase 4: Agent reads and follows `prd-creator.md`:**
```
Reading agents/ralph/skills/prd-creator.md...

Following Step 1: PRD Structure...
Following Step 2: DB Stories Schema Context...
Following Step 3: Output Formats...
Running Step 4: Checklist...
```

**Phase 5: Agent presents final confirmation:**
```markdown
## PRD Created Successfully ✅

Example below:

**Feature:** Phase A.1: Area Visibility Fixes
**Stories:** 5
**PRD Creator Used:** agents/ralph/skills/prd-creator.md

### Decisions Captured (only if there where)
| Question | Decision | Rationale |
|----------|----------|-----------|
| Guest visibility | Include guests | General should be universal fallback |
| Query investigation | Check callers first | findAllAccessible may already work |

### Story Summary
| ID | Title | Effort | Has Schema Context |
|----|-------|--------|-------------------|
| US-001 | Migration: Fix General areas | Small | ✅ |
| US-002 | Fix findAllAccessible query | Medium | ✅ |
...

Shall I start the implementation now?
```

---

## Key Principles

1. **Research before asking** - Don't ask obvious questions answerable by codebase
2. **Flag real issues** - Only stop for genuine blockers/ambiguities
3. **Propose solutions** - Don't just identify problems, suggest fixes
4. **Document decisions** - Capture rationale in PRD for future reference
5. **Respect user time** - Batch questions, don't drip-feed
6. **Never freestyle the PRD** - Always delegate generation to the standard skill

---

## Relationship to Standard PRD Creator

```
┌─────────────────────────────────────────────────────────────────┐
│ prd-creator-interactive.md (THIS FILE)                         │
│                                                                 │
│   Phase 1: Research ─────────────────┐                         │
│   Phase 2: Analysis & Flag Issues    │ Interactive phases      │
│   Phase 3: Spec Amendment            │ (human-in-loop)         │
│                        ──────────────┘                         │
│                                                                 │
│   Phase 4: DELEGATE TO ────────────────────────────────────────┼──┐
│   Phase 5: Confirmation                                        │  │
└─────────────────────────────────────────────────────────────────┘  │
                                                                     │
┌─────────────────────────────────────────────────────────────────┐  │
│ prd-creator.md (GENERATION ONLY)                       ◄───────┼──┘
│                                                                 │
│   Step 1: PRD Structure          ◄── USE THIS                  │
│   Step 2: DB Stories Schema      ◄── USE THIS                  │
│   Step 3: Output Formats         ◄── USE THIS                  │
│   Step 4: Checklist              ◄── USE THIS                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Required Reading (Must Read Before Phase 4)

| Priority | File | Purpose |
|----------|------|---------|
| **1 (REQUIRED)** | `agents/ralph/skills/prd-creator.md` | PRD structure, format, checklist |
| 2 | `docs/database/SCHEMA_REFERENCE.md` | TypeScript interfaces for DB work |
| 3 | `docs/database/ENTITY_MODEL.md` | Entity relationships |
| 4 | `AGENTS.md` | Codebase patterns and gotchas |

