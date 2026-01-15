# Agent Automation Guide

> **Purpose:** How to use the compound engineering loop for autonomous feature development.
>
> **Philosophy:** Each unit of work makes subsequent work easier, not harder.

---

## Overview

The StratAI agent loop implements **compound engineering** - a development methodology where every iteration builds knowledge that makes future iterations faster and more reliable.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Compound Engineering** | Each bug, pattern, or insight is captured and reused |
| **Two-Tier Memory** | AGENTS.md (long-term) + progress.txt (short-term) |
| **Schema-Aware** | PRDs include correct database shapes (camelCase) |
| **Self-Continuing** | Each iteration invokes the next automatically |

---

## Quick Start

### Starting a New Feature

```bash
# 1. Create a PRD from your spec doc
#    Use the prd-creator skill with your feature spec

# 2. The PRD creator will:
#    - Research the codebase for similar patterns
#    - Generate right-sized stories (one context window each)
#    - Include schema context for DB stories
#    - Add all required quality gates to AC

# 3. Save the PRD
#    - prd.json saved to agents/ralph/
#    - parent-task-id.txt updated

# 4. Run the loop
cd stratai-main/agents/ralph
./ralph.sh 10  # Run up to 10 iterations
```

### Continuing an Existing Feature

```bash
# Just run the loop - it will pick up where you left off
cd stratai-main/agents/ralph
./ralph.sh
```

### Completing a Feature

When all stories are done:
1. The loop will archive `progress.txt`
2. Review learnings and move reusable patterns to `AGENTS.md`
3. Create a PR for review

---

## The Loop in Detail

### Research → Plan → Work → Review → Compound

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPOUND ENGINEERING LOOP                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │ RESEARCH │───▶│   PLAN   │───▶│   WORK   │             │
│   │   20%    │    │   20%    │    │   20%    │             │
│   └──────────┘    └──────────┘    └────┬─────┘             │
│        ▲                               │                    │
│        │                               ▼                    │
│   ┌────┴─────┐    ┌──────────┐    ┌──────────┐             │
│   │ COMPOUND │◀───│  REVIEW  │◀───│  GATES   │             │
│   │   20%    │    │   20%    │    │  check   │             │
│   └──────────┘    └──────────┘    │  lint    │             │
│                                   │  audit   │             │
│                                   │  test    │             │
│                                   └──────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase Details

#### 1. Research (20%)

Before writing any code:
- Read `AGENTS.md` for established patterns
- Read `progress.txt` for feature context
- Search codebase for similar implementations
- Review `docs/database/SCHEMA_REFERENCE.md` for TypeScript interfaces (DB work)
- Review `docs/database/ENTITY_MODEL.md` for schema context (DB work)

#### 2. Plan (20%)

For each story:
- Understand the acceptance criteria
- Identify files to create/modify
- Note which patterns apply
- Plan the implementation approach

#### 3. Work (20%)

Systematic implementation:
- Create/modify one file at a time
- Run quality gates after each change
- Keep changes focused on the story
- Don't scope creep

#### 4. Review (20%)

Self-review before commit:
- Code quality: follows patterns?
- Security: any vulnerabilities?
- Performance: any bottlenecks?
- Simplicity: can it be simpler?

#### 5. Compound (20%)

Capture learnings:
- What patterns were applied?
- What decisions were made?
- What would you do differently?
- Update progress.txt or AGENTS.md

---

## Memory System

### AGENTS.md (Long-Term Memory)

**Location:** `stratai-main/AGENTS.md`

**Purpose:** Codebase-wide learnings that apply across all features.

**Update when:**
- Discovered a reusable pattern
- Made an architectural decision
- Found a non-obvious gotcha
- Created a new convention

**Structure:**
```markdown
## Codebase Patterns
### Pattern: [Name]
When to use: [context]
Implementation: [code example]

## Architectural Decisions
### Decision: [Choice]
Context: [situation]
Rationale: [why]

## Common Gotchas
### Gotcha: [Issue]
Symptom: [what you see]
Fix: [how to resolve]
```

### progress.txt (Short-Term Memory)

**Location:** `agents/ralph/progress.txt`

**Purpose:** Memory for the current feature only.

**Reset when:** Starting a new feature (archive the old one).

**Structure:**
```markdown
# Ralph Progress Log
Started: [date]
Feature: [name]

## Codebase Patterns (This Feature)
[Patterns discovered during this feature]

---

## [Date] - [Story Title]
Task ID: [id]
Status: [Complete/In Progress]

### What Was Done
[Implementation details]

### Learnings
[Patterns, decisions, lessons]
```

### Memory Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Iteration 1   │────▶│   Iteration 2   │────▶│   Iteration 3   │
│                 │     │                 │     │                 │
│ Learn pattern A │     │ Apply pattern A │     │ Refine pattern A│
│ Save to progress│     │ Learn pattern B │     │ Move A to AGENTS│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   AGENTS.md     │
                                              │                 │
                                              │ Pattern A is    │
                                              │ now permanent   │
                                              └─────────────────┘
```

---

## Task Sizing

### The One Context Window Rule

Each story must be completable in ONE iteration.

**Right-sized examples:**
- Add a database column + migration
- Create a single UI component
- Implement one API endpoint
- Write tests for one module

**Too big (split these):**
- "Build the dashboard" → schema, queries, components, pagination
- "Add authentication" → schema, middleware, login UI, sessions

### The 2-3 Sentence Rule

If you can't describe the change in 2-3 sentences, it's too big.

**Good:** "Add model_id column to model_configurations table with TEXT type. Create index on enabled column."

**Bad:** "Set up the model configuration system."

---

## Quality Gates

### Required Gates (Every Story)

```bash
npm run check           # TypeScript - 0 errors
npm run lint            # ESLint - 0 errors
```

### DB Stories Add

```bash
npm run audit-db-access # DB patterns - 0 new violations
```

### UI Stories Add

```
Verify in browser using dev-browser skill
```

### Test Stories Add

```bash
npm run test            # Tests pass
```

---

## PRD Creation

### Using the PRD Creator Skill

The PRD creator skill generates schema-aware PRDs:

1. **Research** - Analyzes codebase for similar patterns
2. **Schema Query** - Looks up TypeScript interfaces in `docs/database/SCHEMA_REFERENCE.md`
3. **Relationships** - Reviews entity relationships in `docs/database/ENTITY_MODEL.md`
4. **Pattern Application** - Includes correct code templates from Pattern Library
5. **AC Generation** - Adds all required quality gates

### PRD Structure

```json
{
  "feature": "Model Configuration System",
  "created": "2026-01-14",
  "parent_task_id": "task-abc123",
  "stories": [
    {
      "id": "US-001",
      "title": "Create migration",
      "description": "...",
      "status": "pending",
      "dependencies": [],
      "acceptance_criteria": ["..."]
    }
  ]
}
```

### Story Dependencies

Stories can depend on other stories:

```json
{
  "id": "US-002",
  "title": "Create repository",
  "dependencies": ["US-001"],  // Depends on migration
  ...
}
```

The loop processes stories in dependency order.

---

## Validation Pipeline

### Preflight (Before Each Iteration)

```bash
./agents/ralph/validation/preflight.sh
```

Checks:
- Clean working directory
- TypeScript compiles
- Lint passes
- Captures audit baseline
- Required files exist

### Postflight (After Each Iteration)

```bash
./agents/ralph/validation/postflight.sh
```

Checks:
- No new TypeScript errors
- No new lint errors
- No new DB violations
- Tests pass

---

## Browser Verification

### When to Use

For UI stories that need visual verification.

### Functional Testing (Behavior)

```
Use take_snapshot to read page content as accessibility tree
```

Best for: Element exists, text appears, form works

### Visual Testing (Appearance)

```
Use take_screenshot to capture visual appearance
```

Best for: Layout, colors, styling, animations

---

## Common Workflows

### Starting Fresh

```bash
# 1. Create PRD from spec
# 2. Verify prd.json created
cat agents/ralph/prd.json

# 3. Run loop
./agents/ralph/ralph.sh 10
```

### Resuming Work

```bash
# Just run - picks up where you left off
./agents/ralph/ralph.sh
```

### Handling Failures

```bash
# If postflight fails:
# 1. Fix the issues
# 2. Run postflight manually
./agents/ralph/validation/postflight.sh

# 3. Continue loop
./agents/ralph/ralph.sh
```

### Archiving a Feature

```bash
# Automatic when all stories complete
# Manual archive:
DATE=$(date +%Y-%m-%d)
FEATURE="feature-name"
mkdir -p agents/ralph/archive/$DATE-$FEATURE
mv agents/ralph/progress.txt agents/ralph/archive/$DATE-$FEATURE/
```

---

## File Reference

| File | Purpose |
|------|---------|
| `stratai-main/AGENTS.md` | Long-term codebase learnings |
| `agents/ralph/progress.txt` | Short-term feature memory |
| `agents/ralph/prd.json` | Current PRD state |
| `agents/ralph/parent-task-id.txt` | Current feature scope |
| `agents/ralph/ralph.sh` | Loop orchestrator |
| `agents/ralph/prompt.md` | Per-iteration context |
| `agents/ralph/skills/*.md` | Skill definitions |
| `agents/ralph/validation/*.sh` | Validation scripts |

---

## Troubleshooting

### "No prd.json found"

Create a PRD first using the prd-creator skill.

### "Preflight failed"

Fix the reported issues before continuing:
- Commit or stash uncommitted changes
- Fix TypeScript errors
- Fix lint errors

### "Postflight failed"

The iteration introduced issues:
- Fix TypeScript errors
- Fix lint errors
- Fix DB access violations (use camelCase)
- Fix failing tests

### "Max iterations reached"

Run the loop again with more iterations:
```bash
./ralph.sh 20
```

---

## Best Practices

### DO

- Read AGENTS.md before every feature
- Keep stories small (one context window)
- Run gates after every change
- Capture learnings in progress.txt
- Move reusable patterns to AGENTS.md

### DON'T

- Skip the research phase
- Create oversized stories
- Commit without passing gates
- Forget to capture learnings
- Leave progress.txt cluttered

---

## Success Metrics

You're doing compound engineering well when:

- [ ] Each feature takes less effort than the last similar feature
- [ ] Bugs become one-time events (documented and prevented)
- [ ] New developers can be productive quickly
- [ ] Code reviews surface fewer issues
- [ ] Technical debt decreases over time

---

*Last updated: 2026-01-14*

