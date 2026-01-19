# Branch Management Protocol

## Purpose

Prevent branch divergence and merge conflicts during Ralph loop execution.

**This protocol addresses:**
- Long-lived branches drifting from main
- Migration number collisions
- Testing/committing on wrong branch
- Merge conflicts from parallel development

---

## Branch Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│                       BRANCH LIFECYCLE                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. PRD CREATION                                                       │
│     └─ Create feature branch: feature/{parent-task-id}                 │
│     └─ Record branch name in prd.json                                  │
│     └─ Commit workspace                                                │
│                                                                        │
│  2. DAILY SYNC (BEFORE EACH SESSION)                                   │
│     └─ Fetch origin/main                                               │
│     └─ Merge main into feature branch                                  │
│     └─ Resolve conflicts if any                                        │
│     └─ Run tests to verify                                             │
│                                                                        │
│  3. DURING DEVELOPMENT                                                 │
│     └─ Verify branch before each commit                                │
│     └─ Use timestamp migrations (no sequential numbers)                │
│     └─ Keep PRs small and merge frequently                             │
│                                                                        │
│  4. COMPLETION                                                         │
│     └─ Final sync with main                                            │
│     └─ Squash merge to main (optional)                                 │
│     └─ Delete feature branch                                           │
│     └─ Archive workspace                                               │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Pre-Flight Check (EVERY Session Start)

**Run this BEFORE starting any work:**

```bash
#!/bin/bash
# Save as: agents/ralph/validation/branch-check.sh

set -e

WORKSPACE_DIR=${1:-"agents/ralph"}

# 1. Check we have a prd.json
if [ ! -f "$WORKSPACE_DIR/prd.json" ]; then
    echo "❌ No prd.json found in $WORKSPACE_DIR"
    exit 1
fi

# 2. Get expected branch from prd.json (if recorded)
EXPECTED_BRANCH=$(cat "$WORKSPACE_DIR/prd.json" | grep -o '"branch"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4 || echo "")

# 3. Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# 4. Verify branch
if [ -n "$EXPECTED_BRANCH" ] && [ "$EXPECTED_BRANCH" != "$CURRENT_BRANCH" ]; then
    echo "⚠️  WRONG BRANCH"
    echo "   Expected: $EXPECTED_BRANCH"
    echo "   Current:  $CURRENT_BRANCH"
    echo ""
    echo "   Switch with: git checkout $EXPECTED_BRANCH"
    exit 1
fi

echo "✅ Branch: $CURRENT_BRANCH"

# 5. Check if behind main
git fetch origin main 2>/dev/null || echo "⚠️  Could not fetch origin/main"
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")

if [ "$BEHIND" -gt 0 ]; then
    echo "⚠️  Branch is $BEHIND commits behind main"
    echo "   Sync with: git merge origin/main"
    echo ""
    read -p "   Merge now? (y/n): " REPLY
    if [ "$REPLY" = "y" ]; then
        git merge origin/main
        echo "✅ Merged main"
    fi
else
    echo "✅ Up to date with main"
fi

# 6. Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Uncommitted changes detected"
    git status --short
fi

echo ""
echo "Pre-flight complete ✅"
```

---

## prd.json Branch Tracking

**Add branch field to prd.json:**

```json
{
  "feature": "Space Invitation Email",
  "created": "2026-01-16",
  "parent_task_id": "space-invitation-email",
  "branch": "feature/space-invitation-email",  // NEW: Track expected branch
  "base_branch": "main",                        // NEW: What to merge from
  "research": { ... },
  "stories": [ ... ]
}
```

This enables:
- Branch verification at session start
- Knowing what to merge from
- Documentation of branch history

---

## Migration Naming: Use Timestamps

**Problem:** Sequential numbers (039, 040) collide when branches work in parallel.

**Solution:** Use timestamps in migration names.

### Format

```
YYYYMMDD_HHMMSS_description.sql
```

### Examples

```
20260119_093000_welcome_tokens.sql
20260119_094500_fix_welcome_token_types.sql
20260120_101500_add_space_type_check.sql
```

### Why Timestamps?

| Aspect | Sequential (039, 040) | Timestamps |
|--------|----------------------|------------|
| Collision risk | High (parallel branches) | None (time-based) |
| Merge conflicts | Likely | Unlikely |
| Self-documenting | No | Yes (when created) |
| Run order | By number | By timestamp |

### Migration Template

```sql
-- Migration: 20260119_093000_description
-- Feature: [feature name]
-- Branch: [branch name]
-- Author: [name]
--
-- Purpose: [what this migration does]
--
-- Idempotent: YES (safe to run multiple times)
-- Dependencies: [list any required migrations]

-- Your migration SQL here using IF NOT EXISTS patterns
```

---

## Daily Sync Protocol

**Run this at the START of each coding session:**

```bash
# 1. Ensure you're on the feature branch
git checkout feature/{parent-task-id}

# 2. Fetch latest main
git fetch origin main

# 3. Check how far behind
git rev-list --count HEAD..origin/main

# 4. Merge main into feature branch
git merge origin/main

# 5. If conflicts, resolve them BEFORE starting feature work

# 6. Verify tests pass
npm run check
npm run test  # if applicable

# 7. THEN start feature development
```

### Why Daily Sync?

```
WITHOUT DAILY SYNC:
  main ─────●─────●─────●─────●─────●───── (41 commits)
            │                           │
  feature ──┴─────●─────●─────●─────────┘ PAINFUL MERGE
                                         (6 conflicts)

WITH DAILY SYNC:
  main ─────●─────●─────●─────●─────●─────
            │     ↓     ↓     ↓     │
  feature ──┴─────●─────●─────●─────┘ EASY MERGE
                  (merged)(merged)    (0 conflicts)
```

---

## Branch Verification Before Commit

**Add to your shell or use a pre-commit hook:**

### Option A: Manual Check

```bash
# Before every commit, verify:
git branch --show-current  # Should match expected branch
```

### Option B: Pre-Commit Hook

Save to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Verify branch matches expected pattern

BRANCH=$(git branch --show-current)

# Don't allow direct commits to main
if [ "$BRANCH" = "main" ]; then
    echo "❌ Direct commits to main not allowed"
    echo "   Create a feature branch: git checkout -b feature/your-feature"
    exit 1
fi

# Warn if branch doesn't match feature pattern
if [[ ! "$BRANCH" =~ ^feature/ ]]; then
    echo "⚠️  Branch '$BRANCH' doesn't match feature/* pattern"
    read -p "   Continue anyway? (y/n): " REPLY
    if [ "$REPLY" != "y" ]; then
        exit 1
    fi
fi

exit 0
```

Make executable: `chmod +x .git/hooks/pre-commit`

---

## IDE/Terminal Configuration

### Show Branch in Terminal Prompt

Add to `~/.zshrc` or `~/.bashrc`:

```bash
# Show git branch in prompt
parse_git_branch() {
    git branch 2>/dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/ (\1)/'
}
export PS1="\u@\h \W\[\033[32m\]\$(parse_git_branch)\[\033[00m\] $ "
```

Result: `user@machine stratai-main (feature/welcome-email) $ `

### VS Code Settings

Settings → Search "git" → Enable:
- `Git: Decorations` - Shows branch in title bar
- `Git: Show Push Success Notification` - Confirms pushes

---

## Integration with prd-creator-interactive.md

The PRD creator should be updated to:

1. **Phase 5.3:** Record branch name in prd.json
2. **Phase 5.4:** Create branch using timestamp-based naming
3. **Add new phase:** Daily sync instructions in confirmation

### Updated Phase 5.4

```markdown
### Step 5.4: Create Git Feature Branch and Commit

# 1. Create branch
git checkout -b feature/{parent-task-id}

# 2. Update prd.json with branch info
# (manually or via jq)
# Add: "branch": "feature/{parent-task-id}"
# Add: "base_branch": "main"

# 3. Stage and commit
git add agents/ralph/workspaces/{parent-task-id}/
git commit -m "feat: create PRD workspace for {feature-name}"
```

### Updated Confirmation (Phase 6)

Add to the confirmation output:

```markdown
### 🔄 Daily Sync Protocol

Before each session, run:
\`\`\`bash
./agents/ralph/validation/branch-check.sh workspaces/{parent-task-id}
\`\`\`

This ensures:
- ✅ You're on the correct branch
- ✅ Branch is synced with main
- ✅ No uncommitted changes blocking work
```

---

## Parallel Workspace Isolation

The claim "no conflicts" for parallel workspaces is **only partially true**:

### ✅ What IS Isolated

- PRD state (prd.json, progress.txt)
- Ralph loop execution state
- Story completion tracking

### ❌ What is NOT Isolated

- **Migration numbers** - Both workspaces might create 039.sql
- **Shared code files** - Two features might touch same file
- **Git branches** - Still need to merge to main eventually

### Mitigation

1. **Use timestamp migrations** - No collision possible
2. **Sync with main daily** - Catch conflicts early
3. **Merge frequently** - Don't let branches diverge
4. **Communication** - If working in parallel, coordinate which files each touches

---

## Quick Reference

| Situation | Action |
|-----------|--------|
| Starting new feature | Create branch, record in prd.json |
| Starting day's work | Run branch-check.sh, sync with main |
| Creating migration | Use timestamp format |
| Before committing | Verify branch name |
| Feature complete | Final sync, merge to main, delete branch |
| Merge conflict | Resolve BEFORE feature work, not after |

---

## Checklist

- [ ] prd.json has `branch` and `base_branch` fields
- [ ] Migrations use timestamp naming
- [ ] branch-check.sh runs at session start
- [ ] Terminal shows current branch
- [ ] Daily sync with main is habit
- [ ] Pre-commit hook prevents main commits
