# Agent Context for This Iteration

> This prompt provides context for each iteration of the compound engineering loop.
> Read this before implementing any story.

---

## Your Task

Implement the next pending story from `prd.json` using compound engineering principles.

---

## Before Starting

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

### 3. Read the Story

Check `agents/ralph/prd.json` for:
- Story description and acceptance criteria
- Dependencies on other stories
- Technical notes

### 4. Research (if needed)

```bash
# Search for similar patterns
grep -r "similar_pattern" src/

# Check git history
git log --oneline --grep="related feature"

# Review schema
cat stratai-main/docs/database/ENTITY_MODEL.md
```

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
interface EntityRow {
  id: string;
  userId: string;           // NOT user_id
  displayName: string | null;
}
```

---

## Execution Workflow

### 1. Plan (Understand the story)

- Read story description and acceptance criteria
- Identify files to create/modify
- Note patterns to apply from AGENTS.md

### 2. Work (Implement systematically)

- Create/modify files one at a time
- Run quality gates after each change:
  ```bash
  npm run check           # TypeScript
  npm run lint            # ESLint
  npm run audit-db-access # DB patterns
  ```
- Keep changes focused on the story

### 3. Review (Self-check before commit)

Ask yourself:
- Code quality: Does it follow existing patterns?
- Security: Are there any vulnerabilities?
- Performance: Are there any bottlenecks?
- Simplicity: Can this be simpler?

### 4. Compound (Capture learnings)

After completing the story:
- What patterns did you apply?
- What decisions did you make?
- What would you do differently?

Update `progress.txt` with learnings.

---

## Quality Gates

Before marking the story complete, ALL gates must pass:

```bash
npm run check           # 0 TypeScript errors
npm run lint            # 0 lint errors
npm run audit-db-access # 0 new violations
npm run test            # Tests pass (if applicable)
```

**Do not proceed if any gate fails.**

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

## Output

When you complete the story:

1. **Implement** the story following the acceptance criteria
2. **Run** all quality gates
3. **Update** progress.txt with:
   - What was done
   - Files changed
   - Learnings (patterns, decisions, lessons)
4. **Commit** with message: `feat(US-XXX): Story title`
5. **Invoke** the ralph skill to continue to the next story

---

## Self-Continuation

After completing this story, invoke the ralph skill to pick up the next pending story. This creates a self-sustaining development loop.

```
Continue to next story...
```

---

## When All Stories Complete (Feature Cleanup)

When all stories in `prd.json` are marked "completed":

### 1. Final Quality Gate
```bash
npm run check           # 0 TypeScript errors
npm run lint            # 0 lint errors (or pre-existing only)
```

### 2. Update AGENTS.md with Reusable Learnings

Extract **general patterns** from `progress.txt` that apply beyond this feature:
- New code patterns discovered
- Gotchas that others should know
- Architectural insights

**Skip feature-specific learnings** - they're already in the code.

### 3. Mark PRD as Complete

Update `tasks/prd-[feature].md` header:
```markdown
# PRD: [Feature Name]

> **Status:** ✅ COMPLETED
> **Completed:** [date]
> **Stories:** X/X complete
```

### 4. Reset Working Files

Clear for next feature:

**parent-task-id.txt** → Empty
**prd.json** → Reset to:
```json
{
  "feature": "",
  "created": "",
  "parent_task_id": "",
  "stories": []
}
```
**progress.txt** → Reset to template (keep header, clear iterations)

### 5. Commit Cleanup
```bash
git add -A
git commit -m "chore: complete [feature] and reset ralph working files"
```

---

## Quick Reference

### File Locations

| File | Purpose |
|------|---------|
| `stratai-main/AGENTS.md` | Long-term codebase learnings |
| `agents/ralph/progress.txt` | Short-term feature memory |
| `agents/ralph/prd.json` | Current PRD state |

### Required Reading

| Document | When to Read |
|----------|--------------|
| `AGENTS.md` | Always - patterns and gotchas |
| `progress.txt` | Always - feature context |
| `docs/database/ENTITY_MODEL.md` | DB work - schema reference |
| `docs/database/SCHEMA_REFERENCE.md` | DB work - TypeScript interfaces |
| `docs/DATABASE_STANDARDIZATION_PROJECT.md` | DB work - patterns |

### Compound Templates

#### Pattern
```markdown
## Pattern: [Name]
When to use: [context]
Implementation: [code example]
See: [file reference]
```

#### Decision
```markdown
## Decision: [Choice Made]
Context: [situation]
Rationale: [why this choice]
Consequences: [trade-offs]
```

#### Lesson
```markdown
## Lesson: [What Went Wrong]
Symptom: [what was observed]
Root cause: [actual problem]
Fix: [solution]
Prevention: [how to avoid]
```

---

*Remember: Each unit of work should make subsequent work easier, not harder.*

