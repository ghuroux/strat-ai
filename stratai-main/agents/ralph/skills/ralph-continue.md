# Ralph Continue Skill

**When to use:** After implementing a story in a Ralph loop iteration

**Purpose:** Signal to Ralph that the story is complete and trigger validation

---

## Instructions for Agent

After implementing a user story:

1. ✅ **Run quality gates:**
```bash
npm run check
npm run lint
npm run test  # if applicable
```

2. ✅ **Update progress.txt:**
```
## US-XXX: Story Title

### Implementation
- Describe what was implemented
- Key files changed
- Patterns used

### Challenges
- Any issues encountered
- How they were resolved

### Learnings
- Patterns that could be reused
- Gotchas discovered
```

3. ✅ **Signal completion:**

**Option A:** In terminal where Ralph is running, press Enter

**Option B:** If Ralph is running in MCP mode:
```bash
curl -X POST http://localhost:3000/ralph/continue
```

---

## Checklist Before Continuing

- [ ] All acceptance criteria met
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] Tests pass (if applicable)
- [ ] progress.txt updated with learnings
- [ ] Code committed locally

---

## What Ralph Will Do Next

After you signal completion, Ralph will:
1. Run postflight validation
2. Check for new quality violations
3. Mark story as complete in prd.json
4. Move to next story (or finish if all done)

