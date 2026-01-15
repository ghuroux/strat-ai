# Agent Workflow Guide

> **Purpose:** How to use the compound engineering loop for StratAI development.
>
> **Philosophy:** Each unit of engineering work should make subsequent units easier—not harder.

---

## The 80/20 Rule

**80% of effort goes to planning and review. 20% goes to execution.**

This is counterintuitive but proven. Good plans with thorough review compound knowledge. Rushed execution creates debt.

---

## The Compound Engineering Loop

```
Research → Plan → Work → Review → Compound → (repeat)
```

| Phase | Time | Activities |
|-------|------|------------|
| **Research** | 20% | Search codebase, check git history, review docs, query schema |
| **Plan** | 20% | Create PRD, size tasks, generate acceptance criteria |
| **Work** | 20% | Preflight, implement, quality gates |
| **Review** | 20% | Self-review, multi-perspective check, browser verification |
| **Compound** | 20% | Capture patterns, document decisions, record lessons |

---

## Before You Start Any Work

### 1. Read Long-Term Memory

Check `stratai-main/AGENTS.md` for:
- Codebase patterns to follow
- Architectural decisions to respect
- Common gotchas to avoid

### 2. Read Short-Term Memory

Check `agents/ralph/progress.txt` for:
- Patterns discovered in this feature
- Context from previous iterations
- Learnings that apply to current work

### 3. Research the Codebase

```bash
# Search for similar patterns
grep -r "similar_pattern" src/

# Find related components
find src -name "*related*" -type f

# Check git history for related changes
git log --oneline --grep="related feature"

# See how similar features were built
git log --oneline -- src/lib/server/persistence/
```

### 4. Query Schema (for DB work)

Review database documentation:

1. **`docs/database/SCHEMA_REFERENCE.md`** - Ready-made TypeScript interfaces for all tables
2. **`docs/database/ENTITY_MODEL.md`** Section 12 - Complete SQL schema, relationships
3. **`docs/database/ACCESS_PATTERNS.md`** - Common query patterns

---

## Critical Rules

### Database Access (postgres.js)

postgres.js automatically transforms column names from snake_case to camelCase.

```typescript
// ✅ CORRECT - postgres.js transforms to camelCase
interface UserRow {
  userId: string;           // Database: user_id
  displayName: string | null;  // Database: display_name
}

const userId = row.userId;
const name = row.displayName ?? 'Unknown';

// ❌ WRONG - returns undefined!
const userId = row.user_id;
const name = row.display_name;
```

### Null Handling

Use `??` for nullable columns, not `||`:

```typescript
// ✅ CORRECT - handles null, preserves empty string
const desc = row.description ?? 'default';

// ❌ WRONG - empty string becomes 'default'
const desc = row.description || 'default';
```

### Row Interfaces

Type definitions MUST match runtime shapes:

```typescript
// ✅ CORRECT - matches runtime
interface UserRow {
  userId: string;
  displayName: string | null;
}

// ❌ WRONG - type mismatch, will compile but fail at runtime
interface UserRow {
  user_id: string;
  display_name: string | null;
}
```

---

## Quality Gates

Run these after EVERY meaningful change:

```bash
npm run check           # TypeScript - must pass (0 errors)
npm run lint            # ESLint - must pass (0 errors)
npm run audit-db-access # DB patterns - no new violations
npm run test            # Tests - must pass
```

**Never commit if any gate fails.**

---

## Task Sizing

> Each task must be completable in ONE iteration (~one context window)

### Right-Sized Tasks ✅

- Add a database column + migration
- Create a single UI component
- Implement one API endpoint
- Add a filter to an existing list
- Write tests for one module
- Create one repository file

### Too Big (Split These) ❌

| Too Big | Split Into |
|---------|-----------|
| "Build the dashboard" | Schema, queries, layout, cards, filters |
| "Add authentication" | Schema, middleware, login UI, session handling |
| "Implement model config" | Migration, repository, API endpoints, Admin UI |

### The 2-3 Sentence Rule

**If you can't describe the change in 2-3 sentences, it's too big.**

Good: "Add model_id column to model_configurations table with TEXT type. Create index on enabled column."

Bad: "Set up the model configuration system."

---

## Self-Review Checklist

Before committing, review from multiple perspectives:

### Code Quality
- [ ] Follows existing codebase patterns
- [ ] No unnecessary complexity
- [ ] Clear naming that matches conventions
- [ ] No debug code or console.logs
- [ ] All property access uses camelCase
- [ ] Nullable columns handled with `??`

### Security
- [ ] No secrets or sensitive data exposed
- [ ] Input validation where needed
- [ ] Auth checks on API endpoints

### Performance
- [ ] No obvious performance regressions
- [ ] Database queries are efficient (no N+1)
- [ ] No unnecessary re-renders (UI)

### Architecture
- [ ] Change is consistent with system design
- [ ] No unnecessary coupling introduced
- [ ] Respects entity model relationships

### Simplicity
- [ ] Can this be simpler?
- [ ] Is there dead code to remove?

---

## Multi-Perspective Questions

Ask these before committing:

| Perspective | Question |
|-------------|----------|
| **Maintainer** | Will this be easy to modify in 6 months? |
| **Performance** | Are there any bottlenecks? |
| **Security** | Are there any vulnerabilities? |
| **Simplicity** | Can this be simpler? |
| **New Developer** | Would someone new understand this? |

---

## Browser Verification (UI Stories)

For stories with UI changes:

### Functional Testing (behavior)
```
Use take_snapshot to read page content as accessibility tree
```
- Returns text that can be read and verified
- For: button exists, text appears, form works

### Visual Testing (appearance)
```
Use take_screenshot to capture visual appearance
```
- For: layout, colors, styling, animations

---

## Capturing Learnings

### What to Capture

After completing work, ask:
1. What did I learn that others should know?
2. What mistake did I make that can be prevented?
3. What pattern did I discover or create?
4. What decision was made and why?

### Where to Put It

| Learning Type | Destination |
|--------------|-------------|
| Reusable across features | `AGENTS.md` |
| Specific to current feature | `progress.txt` |
| Explains non-obvious code | Inline comment |
| Prevents bug recurrence | Test case |

### Templates

#### Pattern
```markdown
## Pattern: [Name]
When to use: [context]
Implementation:
```[language]
[code example]
```
See: [file reference]
```

#### Decision
```markdown
## Decision: [Choice Made]
Context: [situation]
Options: [alternatives considered]
Rationale: [why this choice]
Consequences: [trade-offs]
```

#### Lesson (From Failures)
```markdown
## Lesson: [What Went Wrong]
Symptom: [what was observed]
Root cause: [actual problem]
Fix: [solution applied]
Prevention: [how to avoid in future]
```

---

## Task Discovery

While implementing, **liberally create new tasks** when discovering:

- Failing tests or test gaps
- Code that needs refactoring
- Missing error handling
- Documentation gaps
- TODOs or FIXMEs in code
- Build/lint warnings
- Performance issues
- Security concerns

Add to `prd.json` with appropriate dependencies.

---

## Commit Convention

```
type(scope): description

- Bullet points for details
- Reference story ID: US-001
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples:
- `feat(US-001): add model_configurations migration`
- `fix(members): resolve duplicate owner in list`
- `refactor(db): standardize camelCase access`

---

## Quick Reference

### Commands

```bash
# Create PRD from spec doc
/ralph-prd stratai-main/docs/FEATURE_SPEC.md

# Run single iteration
/ralph-run

# Capture learnings
/ralph-compound

# Run full loop
./agents/ralph/ralph.sh 10
```

### File Locations

| File | Purpose |
|------|---------|
| `stratai-main/AGENTS.md` | Long-term codebase learnings |
| `agents/ralph/progress.txt` | Short-term feature memory |
| `agents/ralph/prd.json` | Current PRD state |
| `agents/ralph/parent-task-id.txt` | Current feature scope |

### Essential Docs

- `CLAUDE.md` - Role and collaboration principles
- `docs/database/SCHEMA_REFERENCE.md` - Auto-generated TypeScript interfaces
- `docs/database/ENTITY_MODEL.md` - Authoritative data architecture
- `docs/DATABASE_STANDARDIZATION_PROJECT.md` - DB access patterns
- `AGENTS.md` - Codebase patterns and gotchas

---

## Success Metrics

You're doing compound engineering well when:

- [ ] Each feature takes less effort than the last similar feature
- [ ] Bugs become one-time events (documented and prevented)
- [ ] New work builds on established patterns
- [ ] Code reviews surface fewer issues
- [ ] Technical debt decreases over time

---

*Last updated: 2026-01-14*

