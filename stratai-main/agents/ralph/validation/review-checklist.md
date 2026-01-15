# Multi-Perspective Review Checklist

> Use this checklist before committing any changes.
> Ask these questions from different perspectives.

---

## Code Quality

- [ ] Follows existing codebase patterns and conventions
- [ ] No unnecessary complexity—prefer duplication over wrong abstraction
- [ ] Clear naming that matches project conventions
- [ ] No debug code or console.logs left behind
- [ ] Comments explain "why", not "what"

### Database Code Specific

- [ ] All property access uses camelCase (userId, not user_id)
- [ ] Row interface types match runtime shapes
- [ ] Nullable columns typed as `| null`
- [ ] Nullable columns handled with `??` (not `||`)
- [ ] Row converter function exists for each entity
- [ ] Queries use parameterized values (${value})

---

## Security

- [ ] No secrets or sensitive data exposed in code
- [ ] No secrets in commit history
- [ ] Input validation where user data enters system
- [ ] Output encoding where data is displayed
- [ ] Auth checks on all API endpoints
- [ ] Permission checks where needed
- [ ] SQL injection prevented (using parameterized queries)

---

## Performance

- [ ] No obvious performance regressions
- [ ] Database queries are efficient
  - [ ] No N+1 queries
  - [ ] Appropriate indexes exist
  - [ ] No unnecessary JOINs
- [ ] No unnecessary re-renders (UI components)
- [ ] Large lists are paginated
- [ ] Expensive operations are cached if appropriate

---

## Architecture

- [ ] Change is consistent with system design
- [ ] No unnecessary coupling introduced
- [ ] Follows separation of concerns
- [ ] Respects entity model relationships
- [ ] API contracts are consistent
- [ ] Error handling is consistent with patterns

---

## Simplicity

- [ ] Can this be simpler?
- [ ] Is there dead code to remove?
- [ ] Are there unnecessary abstractions?
- [ ] Would a junior developer understand this?
- [ ] Is the code self-documenting?

---

## Multi-Perspective Questions

| Perspective | Question | ✓ |
|-------------|----------|---|
| **Maintainer** | Will this be easy to modify in 6 months? | |
| **Performance** | Are there any bottlenecks? | |
| **Security** | Are there any vulnerabilities? | |
| **Simplicity** | Can this be simpler? | |
| **New Developer** | Would someone new understand this? | |
| **User** | Does this solve the user's problem? | |
| **Ops** | Will this cause operational issues? | |

---

## Before Commit

### Quality Gates (Must Pass)

```bash
npm run check           # TypeScript - 0 errors
npm run lint            # ESLint - 0 errors
npm run audit-db-access # DB patterns - 0 new violations
npm run test            # Tests - all pass
```

### Commit Message

```
type(scope): description

- Detail 1
- Detail 2
- Story ID: US-XXX
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

---

## After Commit

### Learning Capture

Ask yourself:
1. What did I learn that others should know?
2. What mistake did I make that can be prevented?
3. What pattern did I discover or create?
4. What decision was made and why?

### Where to Document

| Learning Type | Destination |
|--------------|-------------|
| Reusable across features | `AGENTS.md` |
| Specific to current feature | `progress.txt` |
| Explains non-obvious code | Inline comment |
| Prevents bug recurrence | Test case |

