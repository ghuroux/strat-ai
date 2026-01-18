# Ralph Loop Optimization

> **Status:** Phase 1 Complete, Phase 2 In Progress
> **Created:** 2026-01-18
> **Updated:** 2026-01-18
> **Priority:** High
> **Effort:** Multi-phase (5 weeks)

---

## Executive Summary

Optimize the Ralph compound engineering loop to improve feature completion rates, reduce token costs, and enable intelligent parallelization via Claude Code 2.1.0's sub-agent capabilities.

**Key Innovation:** Coordinator + Sub-agent Architecture
- Long-lived coordinator maintains high-level context (story dependencies, patterns learned, parallelization decisions)
- Fresh sub-agents handle implementation (clean context, no pollution)
- Best of both worlds: learning across stories + fresh implementation focus

**Target Improvements:**
- **70-85% cost reduction** via prompt caching + smart model selection
- **30-50% faster execution** via intelligent parallelization
- **90-95% completion rate** via automated AC verification
- **Better quality** via cross-story learning and dynamic optimization

---

## Problem Statement

### Current Issues

**1. Features Not Completed Fully**
- **Symptom:** Stories marked "complete" but acceptance criteria not fully met
- **Root Cause:** Validation checks code quality (TypeScript/lint) but not AC completion
- **Impact:** Requires manual verification and rework, defeats automation purpose

**2. Complex Checkout Flow**
- **Symptom:** Postflight → auto-fix → postflight → auto-fix loop can fail and skip stories
- **Root Cause:** Limited fix attempts (2), fresh agent context each attempt
- **Impact:** Partially-implemented stories marked "complete" after max retries

**3. Token Usage Inefficiency**
- **Symptom:** High LLM costs, especially for multi-story features
- **Root Cause:** Fresh context per story, repeated doc reads, no caching
- **Current Cost:** ~$2-3 per 10-story feature (all Sonnet)
- **Impact:** Makes Ralph loop expensive for large features

### Supporting Evidence

**Analysis of ralph.sh (36,418 bytes, 914 lines):**

```bash
# Line 593-661: Single-shot agent execution
CLAUDE_EXIT_CODE=$?
if [ $CLAUDE_EXIT_CODE -eq 124 ]; then
  # Timeout after 10 minutes
  echo "Agent may have completed work. Proceeding to validation..."
fi
```

**Problem:** Agent times out or exits, validation runs immediately, no opportunity to self-correct before formal validation.

```bash
# Line 723-750: Limited fix attempts
MAX_FIX_ATTEMPTS=2
if [ $FIX_ATTEMPT -ge $MAX_FIX_ATTEMPTS ]; then
  echo "Maximum fix attempts reached"
  # Skip story and continue
  continue 2
fi
```

**Problem:** 2 attempts may be insufficient for complex validation failures.

**No AC verification:** postflight.sh (209 lines) validates TypeScript/lint/tests but never checks if story acceptance criteria were actually met.

**4. Sequential Execution Bottleneck**
- **Symptom:** All stories execute sequentially, even when independent
- **Root Cause:** Fresh session per story to avoid context pollution
- **Impact:** 10-story feature takes 30+ minutes (could be 15 min with parallelization)

---

## The Coordinator Insight

### The Core Trade-off

**Current Approach (Fresh Session Per Story):**
```
Story 1 → [Fresh Agent] → Commit
Story 2 → [Fresh Agent] → Commit
Story 3 → [Fresh Agent] → Commit
```
- ✅ No context pollution
- ✅ Clear task boundaries
- ❌ No learning across stories
- ❌ Purely sequential (slow)
- ❌ Repeated doc reads (expensive)

**New Approach (Coordinator + Sub-agents):**
```
[Coordinator Agent - Sonnet, long-lived]
  ↓
  Analyzes: "Stories 2 & 3 touch different files → can parallel"
  ↓
  Spawns: [Story-1 Sub-agent - Sonnet, fresh] → Complete
  ↓
  Spawns: [Haiku Verifier] → Verify AC
  ↓
  Spawns: [Story-2 Sub-agent] + [Story-3 Sub-agent] (parallel!)
  ↓
  Learns: "Pattern from Story-2 applies to Story-4"
  ↓
  Continues until feature complete
```

### Key Benefits

**1. Parallelization Intelligence**
- Analyzes PRD to identify safe parallelization opportunities
- No file overlap → safe to parallel
- No dependencies → safe to parallel
- Example: 10-story auth feature
  - Sequential: 10 × 3min = **30 minutes**
  - Parallelized: 5 waves × 3min = **15 minutes (50% faster!)**

**2. Cross-Story Learning**
- "Story 2 revealed auth uses JWT, not sessions"
- "Stories 3-5 can follow pattern from Story 3"
- "This AC keeps failing - adjust approach"

**3. Fresh Implementation Context**
- Coordinator context = high-level (story status, patterns, dependencies)
- Sub-agent context = fresh (just the story + cached docs)
- **Best of both worlds!**

**4. Smarter Error Recovery**
- Coordinator sees failure patterns → adjusts strategy
- Can reorder stories dynamically
- Escalates to human when stuck

### When Parallelization is Safe

```
Can parallelize Story A + Story B when:
✅ No file overlap (A: auth.ts, B: payments.ts)
✅ No dependencies (B doesn't need A's output)
✅ Independent tests (A's tests don't affect B)
✅ No shared state mutations (different DB tables)

Must serialize when:
❌ Same file modified (both touch hooks.server.ts)
❌ Dependencies exist (B needs A's types)
❌ Sequential logic (Step 2 needs Step 1's setup)
```

### Coordinator Responsibilities

1. **Dependency Analysis**: Parse PRD, build dependency graph
2. **Wave Planning**: Group independent stories into parallel waves
3. **Sub-agent Spawning**: Launch implementation agents with fresh context
4. **Progress Monitoring**: Track completions, handle failures
5. **Pattern Learning**: Extract insights across stories
6. **Dynamic Re-planning**: Adjust based on outcomes

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Git conflicts from parallel commits** | Coordinator commits after each wave, not sub-agents |
| **Context pollution in coordinator** | Coordinator only holds high-level state (< 50k tokens) |
| **Wrong parallelization decision** | Conservative: if unsure, serialize |
| **Coordinator crash mid-feature** | Save wave state to workspace; resume capability |
| **Cost of long-lived coordinator** | Mostly orchestration (small prompts); sub-agents cached |

---

## Goals

### Primary Goals

1. **Improve Completion Rate:** 30-40% better feature completion (all AC met)
2. **Reduce Token Costs:** 50-85% reduction via caching and smart model selection
3. **Faster Execution:** Parallel validation and subagents
4. **Better Developer Experience:** Clear checkout flow, easy resume

### Non-Goals

- Complete rewrite of Ralph loop (preserve existing architecture)
- Change PRD format or story structure
- Remove human verification (keep validation gates)

---

## Solution Overview

Multi-phase optimization leveraging:
- **Acceptance Criteria verification** (automated + human)
- **Claude Code 2.1.0 features** (background agents, subagents, prompt caching)
- **Smart model selection** (Haiku for simple tasks, Sonnet for complex)
- **Improved checkout flow** (better git workflow, workspace persistence)

---

## Phase 1: Immediate Improvements (Week 1)

**Effort:** 1 week
**Impact:** High (30-40% better completion)
**Risk:** Low

### 1.1 Add Acceptance Criteria Verification

**Create:** `agents/ralph/validation/ac-verification.sh`

```bash
#!/bin/bash
# Verify acceptance criteria before marking story complete

STORY_ID=$1
PRD_FILE=$2

# Extract AC for this story
AC_LIST=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .acceptance_criteria[]' "$PRD_FILE")

echo "📋 Acceptance Criteria Verification"
echo ""
echo "Story: $STORY_ID"
echo ""
echo "Please verify each criterion was met:"
echo ""

# Show each AC with checkbox
I=1
echo "$AC_LIST" | while IFS= read -r criterion; do
  echo "  $I. ☐ $criterion"
  I=$((I + 1))
done

echo ""
echo "Were ALL acceptance criteria met? (y/n)"
read -r AC_MET

if [ "$AC_MET" != "y" ]; then
  echo "❌ AC verification failed - story incomplete"
  echo ""
  echo "Which criteria are missing? (comma-separated numbers)"
  read -r MISSING
  echo ""
  echo "Missing AC: $MISSING"
  echo "Agent should continue working on this story."
  exit 1
fi

echo "✅ AC verification passed"
exit 0
```

**Integration in ralph.sh:**

```bash
# After postflight passes (line ~731), before marking complete:

# NEW: Verify acceptance criteria
print_step "✓ Acceptance Criteria Verification"
if ! "$SCRIPT_DIR/validation/ac-verification.sh" "$STORY_ID" "$PRD_FILE"; then
  print_error "Acceptance criteria not met"
  echo ""
  echo "   Continue working on this story? (y/n)"
  read -r CONTINUE
  if [ "$CONTINUE" = "y" ]; then
    continue  # Stay on this story, don't mark complete
  fi
fi
```

**Cost:** $0 (human verification, no LLM calls)

### 1.2 Increase Fix Attempts & Better Context

**Modify:** `ralph.sh` lines 724-750

```bash
# Increase from 2 to 3
MAX_FIX_ATTEMPTS=3

# Add story context to fix prompt
FIX_PROMPT="You are fixing validation errors for story $STORY_ID.

**CRITICAL CONTEXT - DO NOT SKIP ANY ACCEPTANCE CRITERIA:**

**Story Description:**
$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .description' "$PRD_FILE")

**Acceptance Criteria (MUST ALL BE MET):**
$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .acceptance_criteria | map("- " + .) | join("\n")' "$PRD_FILE")

**Previous Implementation Attempt:**
$(cat "$PROGRESS_FILE" | grep -A 30 "$STORY_ID" | tail -25)

**Validation Errors:**
\`\`\`
$(cat "$POSTFLIGHT_OUTPUT")
\`\`\`

**Your Task:**
1. Fix ONLY the validation errors shown above
2. Do NOT skip or partially implement ANY acceptance criteria
3. If any AC is incomplete, finish implementing it
4. Re-run ALL quality gates: npm run check, npm run lint, npm run audit-db-access
5. Update progress.txt with what you fixed

**Rules:**
- Do not introduce new changes unrelated to fixing errors
- Test your fixes thoroughly
- If you cannot fix an error, document why in progress.txt and ask for help
"
```

**Cost Impact:** Marginal (~$0.10-0.15 per failed story for 1 extra attempt)

### 1.3 Mandatory Story Completion Summary

**Modify:** `ralph.sh` line ~851-863 (progress.txt append)

```bash
# Replace simple append with structured template
print_step "📝 Updating progress.txt..."

# Agent MUST fill this out before marking complete
TEMP_SUMMARY=$(mktemp)
cat > "$TEMP_SUMMARY" <<EOF

### $STORY_ID: $STORY_TITLE ($(date +%Y-%m-%d))

**Status:** ✅ Completed

**Acceptance Criteria Met:**
$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .acceptance_criteria | map("- [x] " + . + " - [how verified]") | join("\n")' "$PRD_FILE")

**Implementation Summary:**
- [What was implemented - FILL IN]
- [Key decisions made - FILL IN]

**Files Changed:**
- [file path] - [what changed]

**Patterns Applied:**
- [Pattern from AGENTS.md]

**Learnings:**
1. [Learning 1]
2. [Learning 2]

**Quality Gates:**
- ✅ npm run check - 0 errors
- ✅ npm run lint - 0 errors
- ✅ npm run audit-db-access - 0 new violations

---
EOF

# Agent must complete this template
echo ""
echo "Please complete the story summary in progress.txt:"
echo "  1. Fill in [FILL IN] sections"
echo "  2. Add specific verification details for each AC"
echo ""
echo "Press Enter when done editing $TEMP_SUMMARY"
read -r

# Append to progress.txt
cat "$TEMP_SUMMARY" >> "$PROGRESS_FILE"
rm "$TEMP_SUMMARY"
```

**Benefit:** Forces documentation of what was actually done vs. what was planned

**Cost:** $0 (template-based)

### 1.4 Improve Checkout Flow

**Problem:** Current flow deletes workspace immediately after completion, no way to resume or review.

**Solution:** Preserve workspace, add completion summary

**Modify:** `ralph.sh` lines 257-505 (completion logic)

```bash
# When all stories complete:
if [ -z "$STORY_ID" ] || [ "$STORY_ID" == "null" ]; then
  print_header "🎉 All Stories Complete!"

  COMPLETED=$(jq '[.stories[] | select(.status == "complete" or .status == "completed")] | length' "$PRD_FILE")
  FEATURE=$(jq -r '.feature_name // .feature // "unnamed"' "$PRD_FILE")

  # Don't delete workspace - mark as completed
  COMPLETION_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "$COMPLETION_TIME" > "$WORKSPACE_DIR/.completed"

  # Update prd.json with completion metadata
  jq --arg time "$COMPLETION_TIME" '.completed_at = $time | .status = "completed"' "$PRD_FILE" > "$PRD_FILE.tmp"
  mv "$PRD_FILE.tmp" "$PRD_FILE"

  # Create completion summary
  cat > "$WORKSPACE_DIR/COMPLETION_SUMMARY.md" <<EOF
# Feature Completion: $FEATURE

**Completed:** $COMPLETION_TIME
**Stories:** $COMPLETED completed
**Branch:** feature/$PARENT_ID
**Workspace:** $WORKSPACE_DIR

## Implementation Summary

$(jq -r '.stories[] | "### " + .id + ": " + .title + "\n- Status: " + .status + "\n"' "$PRD_FILE")

## Quality Verification

**Before merging, verify:**
- [ ] All acceptance criteria met (review progress.txt)
- [ ] npm run check passes (0 errors)
- [ ] npm run lint passes (0 errors)
- [ ] npm run test passes (if tests exist)
- [ ] Manual testing complete
- [ ] Code reviewed

## Next Steps

### 1. Review Implementation
\`\`\`bash
# Review all changes
git diff main..feature/$PARENT_ID

# Review progress log
cat $WORKSPACE_DIR/progress.txt
\`\`\`

### 2. Run Full Test Suite
\`\`\`bash
cd $PROJECT_DIR
npm run check
npm run lint
npm run test
\`\`\`

### 3. Create Pull Request
\`\`\`bash
gh pr create \\
  --base main \\
  --head feature/$PARENT_ID \\
  --title "feat: $FEATURE" \\
  --body "Automated implementation via Ralph loop. See workspace: $WORKSPACE_DIR"
\`\`\`

### 4. After PR Merged
\`\`\`bash
# Archive workspace
cd agents/ralph
./cleanup-workspaces.sh --archive $WORKSPACE_DIR

# Or manually:
mv $WORKSPACE_DIR archive/$(date +%Y-%m-%d)-$(basename $WORKSPACE_DIR)-MERGED/
\`\`\`

## Workspace Contents

- \`prd.json\` - Final PRD state
- \`progress.txt\` - Implementation log with learnings
- \`.completed\` - Completion timestamp

## Archive Location

After archiving: \`agents/ralph/archive/$DATE-$FEATURE/\`
EOF

  # Archive progress to central location
  DATE=$(date +%Y-%m-%d)
  ARCHIVE_DIR="$SCRIPT_DIR/archive/$DATE-$(echo "$FEATURE" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
  mkdir -p "$ARCHIVE_DIR"
  cp "$PROGRESS_FILE" "$ARCHIVE_DIR/"
  cp "$PRD_FILE" "$ARCHIVE_DIR/"
  cp "$PARENT_ID_FILE" "$ARCHIVE_DIR/" 2>/dev/null || true

  # Commit completion
  cd "$PROJECT_DIR"
  git add -A
  git commit -m "feat($FEATURE): complete feature implementation

- Implemented $COMPLETED stories via Ralph loop
- Workspace: $WORKSPACE_DIR
- See COMPLETION_SUMMARY.md for review checklist
- Branch ready for PR: feature/$PARENT_ID

Co-Authored-By: Ralph Loop <ralph@stratai.com>"

  # Display summary
  echo ""
  echo "✅ Feature Complete!"
  echo ""
  echo "📊 Summary:"
  echo "   • Feature: $FEATURE"
  echo "   • Stories: $COMPLETED completed"
  echo "   • Branch: feature/$PARENT_ID"
  echo "   • Workspace: $WORKSPACE_DIR (preserved)"
  echo ""
  echo "📋 Next Steps:"
  echo "   1. Review: cat $WORKSPACE_DIR/COMPLETION_SUMMARY.md"
  echo "   2. Verify: Run full test suite"
  echo "   3. PR: gh pr create --base main --head feature/$PARENT_ID"
  echo ""
  echo "⚠️  Workspace preserved for review - archive after PR merge"
  echo ""

  exit 0
fi
```

**Benefits:**
- Clear next steps
- Workspace persists for review
- Easy PR creation
- Manual cleanup (safer)

**Cost:** $0

---

## Phase 2: Token Cost Optimizations (Week 2)

**Status:** ✅ Complete (2026-01-18)
**Effort:** 1 week
**Impact:** Very High (70-85% cost reduction)
**Risk:** Medium (requires Claude Code 2.1.0+ features)

### 2.1 Implement Prompt Caching

**Problem:** Agent re-reads AGENTS.md, SCHEMA_REFERENCE.md, ENTITY_MODEL.md every story

**Solution:** Mark static content for caching in system prompt

**Modify:** `ralph.sh` line ~592-614 (agent prompt construction)

```bash
# Build cacheable context (mark with cache_control)
CACHEABLE_CONTEXT=$(cat <<'CACHE_EOF'
<system_context cache_control="ephemeral">

## Long-Term Codebase Patterns (from AGENTS.md)

$(cat "$PROJECT_DIR/AGENTS.md")

## Database Schema Reference (from SCHEMA_REFERENCE.md)

$(cat "$PROJECT_DIR/docs/database/SCHEMA_REFERENCE.md")

## Entity Model (from ENTITY_MODEL.md)

$(cat "$PROJECT_DIR/docs/database/ENTITY_MODEL.md")

## PRD Creator Patterns

$(cat "$SCRIPT_DIR/skills/prd-creator.md")

## Database Standardization Guidelines

$(cat "$PROJECT_DIR/docs/DATABASE_STANDARDIZATION_PROJECT.md")

</system_context>
CACHE_EOF
)

# Build fresh context (changes per story - not cached)
STORY_CONTEXT=$(cat <<EOF

## Current Feature Context

**Feature:** $(jq -r '.feature' "$PRD_FILE")
**Progress:** $(cat "$PROGRESS_FILE" | head -50)

## Current Story: $STORY_ID

**Title:** $STORY_TITLE
**Description:** $STORY_DESC

**Acceptance Criteria:**
$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .acceptance_criteria | map("- " + .) | join("\n")' "$PRD_FILE")

**Dependencies:** $(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .dependencies | join(", ")' "$PRD_FILE")

EOF
)

# Combined system prompt
AGENT_PROMPT="$CACHEABLE_CONTEXT

$STORY_CONTEXT

## Your Task

Implement story $STORY_ID following ALL acceptance criteria.

Read agents/ralph/prompt.md for full instructions.
"
```

**Invoke with cache control:**
```bash
$CLAUDE_CLI --print \
  --system-prompt "$AGENT_PROMPT" \
  --cache-system-prompt \
  "$(cat "$TEMP_PROMPT_FILE")"
```

**Cost Savings:**
- Without caching: ~1.5M tokens read per 10-story feature (AGENTS.md + schemas × 10 stories)
- With caching: ~150k tokens (90% cached)
- **Savings: 85-90% on repeated doc reads**

### 2.2 Smart Model Selection (Haiku for Simple Tasks)

**Problem:** Everything uses Sonnet, even simple tasks like updating progress.txt

**Solution:** Use Haiku for non-critical tasks

**Create:** `agents/ralph/lib/smart-model-select.sh`

```bash
#!/bin/bash
# Select model based on task complexity

TASK_TYPE=$1

case $TASK_TYPE in
  "implement")
    # Complex: story implementation
    echo "sonnet"
    ;;

  "fix")
    # Medium: fixing validation errors
    echo "sonnet"
    ;;

  "update-progress")
    # Simple: updating progress.txt
    echo "haiku"
    ;;

  "mark-complete")
    # Simple: updating prd.json status
    echo "haiku"
    ;;

  "validate")
    # Simple: running validation checks
    echo "haiku"
    ;;

  *)
    # Default to sonnet for safety
    echo "sonnet"
    ;;
esac
```

**Modify ralph.sh to use smart selection:**

```bash
# Line ~616: Story implementation (keep Sonnet)
MODEL=$(./lib/smart-model-select.sh "implement")
$CLAUDE_CLI --model "$MODEL" --print ...

# Line ~784: Fix attempts (keep Sonnet - needs reasoning)
MODEL=$(./lib/smart-model-select.sh "fix")
$CLAUDE_CLI --model "$MODEL" --print ...

# NEW: Progress updates (use Haiku)
print_step "📝 Updating progress.txt..."
MODEL=$(./lib/smart-model-select.sh "update-progress")

PROGRESS_PROMPT="Update progress.txt for story $STORY_ID.

Add a summary section with:
- What was implemented
- Files changed
- Patterns applied
- Learnings

Current progress.txt:
$(cat "$PROGRESS_FILE")

Story details:
$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id)' "$PRD_FILE")
"

$CLAUDE_CLI --model "$MODEL" --print \
  "$(echo "$PROGRESS_PROMPT")"
```

**Cost Savings:**
- Sonnet: ~$3 per 1M input tokens
- Haiku: ~$0.25 per 1M input tokens (12x cheaper)
- Estimated savings: 50-70% on non-implementation tasks

### 2.3 Progress File Size Limiting

**Problem:** progress.txt grows unbounded, re-read every story

**Solution:** Cap size, archive old entries

**Add to ralph.sh after each story completion:**

```bash
# After updating progress.txt (line ~863)
PROGRESS_SIZE=$(wc -l < "$PROGRESS_FILE")
MAX_PROGRESS_LINES=500

if [ "$PROGRESS_SIZE" -gt "$MAX_PROGRESS_LINES" ]; then
  print_step "📦 Archiving old progress entries..."

  # Archive full progress
  ARCHIVE_PROGRESS="$SCRIPT_DIR/archive/$(date +%Y-%m-%d)-$FEATURE-progress-full.txt"
  cp "$PROGRESS_FILE" "$ARCHIVE_PROGRESS"

  # Keep header + recent entries
  HEADER_LINES=50
  RECENT_LINES=$((MAX_PROGRESS_LINES - HEADER_LINES))

  HEAD_CONTENT=$(head -$HEADER_LINES "$PROGRESS_FILE")
  TAIL_CONTENT=$(tail -$RECENT_LINES "$PROGRESS_FILE")

  cat > "$PROGRESS_FILE" <<EOF
$HEAD_CONTENT

---
**Note:** Progress file truncated. Full history: $ARCHIVE_PROGRESS
---

$TAIL_CONTENT
EOF

  echo "   ✅ Progress archived to $ARCHIVE_PROGRESS"
  echo "   ✅ Kept recent $RECENT_LINES lines"
fi
```

**Cost Savings:** 20-30% on context window usage for long features

---

## Phase 2.5: Coordinator Analysis Mode (Week 3)

**Status:** Planning
**Effort:** 3-4 days
**Impact:** Medium (validation + metrics gathering)
**Risk:** Low (analysis-only, no execution changes)

### Objective

Add coordinator agent in **planning mode only** to:
1. Analyze parallelization opportunities BEFORE implementation
2. Log potential time savings for validation
3. Gather data on how often parallelization is possible
4. Test coordinator prompting without risking execution flow

**Key Constraint:** Coordinator only analyzes and logs - actual implementation stays sequential (current approach).

### 2.5.1 Create Coordinator Agent

**Create:** `agents/ralph/lib/coordinator-agent.sh`

```bash
#!/bin/bash
# Coordinator agent - Wave analysis mode

WORKSPACE_DIR=$1
PRD_FILE="$WORKSPACE_DIR/prd.json"
ANALYSIS_FILE="$WORKSPACE_DIR/.wave-analysis.json"

# Invoke coordinator in analysis-only mode
COORDINATOR_PROMPT="You are the Ralph Loop Coordinator analyzing parallelization opportunities.

**Feature:** $(jq -r '.feature' "$PRD_FILE")

**Stories:**
$(jq '.stories[]' "$PRD_FILE")

**Your Task:**

Analyze the PRD and create a wave execution plan. For each story, determine:
1. Which stories it depends on (check .dependencies field)
2. Which files it will likely modify (infer from title + description)
3. Whether it can run in parallel with other stories

**Wave Planning Rules:**
- Wave 1: Stories with no dependencies and unique file sets
- Wave N: Stories whose dependencies are in waves 1..N-1
- NEVER parallelize stories touching the same file
- When file overlap is uncertain, serialize

**Output Format (JSON):**
\`\`\`json
{
  \"total_stories\": 10,
  \"estimated_sequential_time_min\": 30,
  \"waves\": [
    {
      \"wave_number\": 1,
      \"stories\": [\"US-001\"],
      \"parallelism\": 1,
      \"rationale\": \"Schema migration - blocks all others\"
    },
    {
      \"wave_number\": 2,
      \"stories\": [\"US-002\", \"US-003\"],
      \"parallelism\": 2,
      \"rationale\": \"US-002 touches auth-service.ts, US-003 touches auth-middleware.ts (different files, no dependencies)\"
    }
  ],
  \"estimated_wave_time_min\": 18,
  \"time_savings_percent\": 40,
  \"confidence\": \"medium\",
  \"risks\": [
    \"US-002 and US-003 might both modify types.ts (uncertain)\"
  ]
}
\`\`\`

**Be conservative:** If unsure whether parallelization is safe, serialize."

claude --model sonnet --print "$COORDINATOR_PROMPT" > "$ANALYSIS_FILE"

echo "✅ Wave analysis complete: $ANALYSIS_FILE"
```

### 2.5.2 Integrate into ralph.sh (Analysis Only)

**Modify:** `ralph.sh` after PRD load, before story loop

```bash
# Line ~240, after PRD validation, before main loop:

print_step "🔍 Analyzing Parallelization Opportunities..."

if [ -x "$SCRIPT_DIR/lib/coordinator-agent.sh" ]; then
  "$SCRIPT_DIR/lib/coordinator-agent.sh" "$WORKSPACE_DIR"

  if [ -f "$WORKSPACE_DIR/.wave-analysis.json" ]; then
    echo ""
    echo "📊 Coordinator Analysis:"

    ESTIMATED_SEQUENTIAL=$(jq -r '.estimated_sequential_time_min' "$WORKSPACE_DIR/.wave-analysis.json")
    ESTIMATED_PARALLEL=$(jq -r '.estimated_wave_time_min' "$WORKSPACE_DIR/.wave-analysis.json")
    SAVINGS_PERCENT=$(jq -r '.time_savings_percent' "$WORKSPACE_DIR/.wave-analysis.json")

    echo "   Sequential execution: ~${ESTIMATED_SEQUENTIAL} min"
    echo "   With parallelization: ~${ESTIMATED_PARALLEL} min"
    echo "   Potential savings: ${SAVINGS_PERCENT}%"
    echo ""

    WAVE_COUNT=$(jq '.waves | length' "$WORKSPACE_DIR/.wave-analysis.json")
    echo "   Proposed execution plan: $WAVE_COUNT waves"
    jq -r '.waves[] | "     Wave \(.wave_number): \(.stories | join(", ")) (\(.parallelism) parallel)"' "$WORKSPACE_DIR/.wave-analysis.json"
    echo ""

    RISKS=$(jq -r '.risks | join("\n   - ")' "$WORKSPACE_DIR/.wave-analysis.json")
    if [ -n "$RISKS" ] && [ "$RISKS" != "null" ]; then
      echo "   ⚠️  Potential risks:"
      echo "   - $RISKS"
      echo ""
    fi

    echo "   (Currently executing sequentially - parallelization in Phase 3)"
    echo ""
  fi
else
  echo "   Coordinator agent not found - skipping analysis"
  echo ""
fi

# Continue with sequential execution (current approach)
print_header "Beginning Sequential Story Implementation"
```

### 2.5.3 Metrics Collection

**Add:** Wave analysis tracking to COMPLETION_SUMMARY.md

```bash
# In completion logic (line ~298), add to COMPLETION_SUMMARY.md:

if [ -f "$WORKSPACE_DIR/.wave-analysis.json" ]; then
  cat >> "$WORKSPACE_DIR/COMPLETION_SUMMARY.md" <<EOF

## Parallelization Analysis

**Coordinator predicted:**
- Sequential time: $(jq -r '.estimated_sequential_time_min' "$WORKSPACE_DIR/.wave-analysis.json") min
- Parallel time: $(jq -r '.estimated_wave_time_min' "$WORKSPACE_DIR/.wave-analysis.json") min
- Potential savings: $(jq -r '.time_savings_percent' "$WORKSPACE_DIR/.wave-analysis.json")%

**Actual execution:**
- Start: $FEATURE_START_TIME
- End: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Duration: $ACTUAL_DURATION min

**Wave plan accuracy:**
$(jq -r '.waves[] | "- Wave \(.wave_number): \(.stories | join(", "))"' "$WORKSPACE_DIR/.wave-analysis.json")

**Learnings for Phase 3:**
- Was the wave plan accurate? (review file changes)
- Did any stories touch same files? (would have caused conflicts)
- Could parallelization have been more aggressive?

EOF
fi
```

### 2.5.4 Test on Real Features

**Run on 3-5 completed workspaces** to gather data:

```bash
# Test on existing workspaces
for workspace in agents/ralph/archive/*/; do
  if [ -f "$workspace/prd.json" ]; then
    echo "Analyzing: $workspace"
    ./lib/coordinator-agent.sh "$workspace"

    # Compare prediction to actual (if timing data available)
    cat "$workspace/.wave-analysis.json" | jq '.estimated_wave_time_min, .time_savings_percent'
  fi
done

# Aggregate results
echo "📊 Parallelization Potential Across Features:"
echo "   Average savings: X%"
echo "   Features with 30%+ savings: Y/Z"
echo "   Most common wave count: N"
```

### 2.5.5 Validation Criteria

Phase 2.5 is successful when:
- [ ] Coordinator can analyze a PRD and produce a wave plan
- [ ] Wave plan is conservative (no obvious conflicts)
- [ ] Analysis runs in < 30 seconds
- [ ] At least 3 real features analyzed
- [ ] Data shows 20%+ average potential savings
- [ ] Risks are correctly identified

### Benefits of Phase 2.5

1. **Low Risk:** No changes to execution flow
2. **Data-Driven:** Gather metrics before implementation
3. **Prompt Refinement:** Test coordinator prompting
4. **Feasibility Validation:** Confirm parallelization is worthwhile
5. **User Feedback:** Show potential savings to stakeholders

### Expected Outcomes

**Good case:**
- 30-50% of features show 30%+ savings potential
- Coordinator accurately identifies file conflicts
- Wave plans make logical sense

**Neutral case:**
- 10-20% savings potential (marginal benefit)
- Many uncertain file overlaps (conservative serialization)

**Bad case:**
- < 10% savings potential across features
- Coordinator can't reliably determine file overlaps
- **Decision:** Skip Phase 3, focus on other optimizations

---

## Phase 3: Coordinator Implementation (Week 4)

**Status:** Planning
**Effort:** 1 week
**Impact:** High (30-50% faster execution, cross-story learning)
**Risk:** Medium-High (new execution model)

**Prerequisites:** Phase 2.5 complete with positive results (20%+ average savings potential)

### Objective

Implement full coordinator agent with conservative parallel execution:
1. Coordinator analyzes wave plan (from Phase 2.5)
2. Spawns sub-agents for story implementation (one per wave)
3. Verifies completions with Haiku
4. Commits after each wave
5. Learns from outcomes to optimize future waves

**Constraint:** Max 2 stories in parallel (conservative start)

### 3.1 Coordinator Agent Execution Mode

**Problem:** Agent implements → exits → bash runs validation → new agent fixes

**Better:** Agent spawns validation subagent in same session

**Requires:** Claude Code 2.1.0 Task tool with background agents

**Modify prompt.md to instruct agent:**

```markdown
## After Implementation

Instead of exiting, you MUST validate your work using a background agent:

1. Spawn a validation agent using the Task tool:
   - Set run_in_background: false (blocking)
   - Task: Run quality gates and report results

2. If validation fails:
   - Read the validation output
   - Fix the issues yourself
   - Re-run validation
   - Repeat until passing

3. Only after validation passes:
   - Update progress.txt
   - Mark story as complete
   - Invoke ralph skill to continue

**Example:**

After implementing the story, invoke the Task tool:

\`\`\`json
{
  "subagent_type": "general-purpose",
  "description": "Validate story implementation",
  "prompt": "Run quality gates for story US-XXX:

1. Run: npm run check
2. Run: npm run lint
3. Run: npm run audit-db-access
4. Run: npm test (if tests exist)

Report results as:
- ✅ Gate name - passed
- ❌ Gate name - failed: [error details]

If any gate fails, provide the specific errors."
}
\`\`\`

If validation agent reports failures, fix them and re-validate.
```

**Benefits:**
- Single agent session (maintains context)
- Self-correcting before formal postflight
- Fewer fix iterations

**Cost Impact:** Neutral to positive (fewer fresh context loads)

### 3.2 Smart Validation Tiers

**Problem:** Not all stories need full validation agent review

**Solution:** Tier validation by story complexity

**Add to prd.json story schema:**

```json
{
  "id": "US-001",
  "title": "...",
  "complexity": "low",  // NEW: low | medium | high
  "validation_tier": "automated"  // NEW: automated | human | agent
}
```

**Modify PRD creator to assign complexity:**

```markdown
## Story Complexity Guidelines

**Low Complexity:**
- Single file changes
- Simple CRUD operations
- UI text/style changes
- Validation: Automated only (TypeScript/lint)

**Medium Complexity:**
- Multi-file changes
- New database queries
- API endpoint changes
- Validation: Automated + human AC check

**High Complexity:**
- Schema migrations
- Complex business logic
- Integration points
- Validation: Automated + agent review
```

**Implement tiered validation in ralph.sh:**

```bash
# After story implementation, before marking complete

COMPLEXITY=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .complexity // "medium"' "$PRD_FILE")

case $COMPLEXITY in
  "low")
    print_step "🔍 Validation: Automated (low complexity)"

    # Run automated checks only
    if ! npm run check --silent 2>/dev/null; then
      print_error "TypeScript errors"
      # Trigger fix loop
    fi

    if ! npm run lint --silent 2>/dev/null; then
      print_error "Lint errors"
      # Trigger fix loop
    fi
    ;;

  "medium")
    print_step "🔍 Validation: Automated + Human AC Check"

    # Run automated checks
    npm run check && npm run lint

    # Human verification of AC
    ./validation/ac-verification.sh "$STORY_ID" "$PRD_FILE"
    ;;

  "high")
    print_step "🔍 Validation: Full Review (high complexity)"

    # Run automated checks
    npm run check && npm run lint && npm run test

    # Spawn agent reviewer (using Haiku for cost efficiency)
    REVIEW_PROMPT="Review story $STORY_ID implementation for completeness and quality.

**Story Details:**
$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id)' "$PRD_FILE")

**Implementation:**
$(cat "$PROGRESS_FILE" | grep -A 50 "$STORY_ID")

**Changed Files:**
$(git diff --name-only HEAD~1)

**Diff:**
$(git diff HEAD~1 | head -200)

**Review Checklist:**
1. Are ALL acceptance criteria met?
2. Does code follow existing patterns?
3. Are there any security concerns?
4. Are edge cases handled?
5. Is error handling appropriate?

**Report format:**
- PASS: All criteria met
- FAIL: Missing [specific criteria]

Be specific about what's missing or wrong."

    claude --model haiku --print "$REVIEW_PROMPT" > "$WORKSPACE_DIR/.review-output"

    if grep -q "FAIL" "$WORKSPACE_DIR/.review-output"; then
      print_error "Agent review failed"
      cat "$WORKSPACE_DIR/.review-output"
      # Trigger fix loop with review feedback
    fi
    ;;
esac
```

**Cost Analysis:**
- Low complexity (60% of stories): $0 extra
- Medium complexity (30%): $0 extra (human check)
- High complexity (10%): ~$0.03-0.05 per story (Haiku review)

**For 10-story feature:**
- 1 high-complexity story: $0.05
- **Total overhead: $0.05 for significantly better quality**

### 3.3 Parallel Story Execution with Subagents

**Experimental:** Use subagents to parallelize independent stories

**Requires:** Stories with no dependencies can run in parallel

**Example scenario:**
```json
{
  "stories": [
    {"id": "US-001", "dependencies": []},
    {"id": "US-002", "dependencies": []},  // Parallel with US-001
    {"id": "US-003", "dependencies": ["US-001"]},
    {"id": "US-004", "dependencies": ["US-002"]}  // Parallel with US-003
  ]
}
```

**Modified ralph.sh logic:**

```bash
# Instead of sequential story processing:
for i in $(seq 1 $MAX_ITERATIONS); do
  STORY_ID=$(jq -r '.stories[] | select(.status == "pending") | .id' "$PRD_FILE" | head -1)
  # ... implement story ...
done

# Use parallel processing:
while true; do
  # Find ALL ready stories (not just first)
  READY_STORIES=$(jq -r '.stories[] | select(.status == "pending") | select(.dependencies == [] or (.dependencies | all(. as $dep | any($PRD.stories[]; .id == $dep and .status == "completed")))) | .id' "$PRD_FILE")

  if [ -z "$READY_STORIES" ]; then
    break  # No more ready stories
  fi

  # If multiple ready stories, spawn subagents
  READY_COUNT=$(echo "$READY_STORIES" | wc -l)

  if [ "$READY_COUNT" -gt 1 ]; then
    echo "🚀 $READY_COUNT stories ready - spawning parallel agents"

    for STORY_ID in $READY_STORIES; do
      # Spawn background agent for each
      claude --print \
        --background \
        "Implement story $STORY_ID from agents/ralph/prd.json. Follow agents/ralph/prompt.md instructions." &

      echo "   Started agent for $STORY_ID (PID: $!)"
    done

    # Wait for all background agents
    wait

    echo "✅ All parallel stories complete"
  else
    # Single story - process normally
    STORY_ID=$(echo "$READY_STORIES" | head -1)
    # ... normal processing ...
  fi
done
```

**Benefits:**
- Faster feature completion (parallel work)
- Better resource utilization

**Risks:**
- More complex coordination
- Potential conflicts if stories touch same files
- Higher token usage (multiple agents running)

**Recommendation:** Start with sequential, add parallelization as Phase 4 (optional)

---

## Phase 4: Process & Documentation (Week 4)

**Effort:** 1 week
**Impact:** Medium (long-term quality)
**Risk:** Low

### 4.1 Enhanced PRD Quality Checklist

**Modify:** `agents/ralph/skills/prd-creator.md`

Add complexity scoring to PRD creation:

```markdown
## Step 4: Story Complexity Assignment

For each story, assign complexity based on:

**Low Complexity (1-2 points):**
- Single file change (1)
- No database changes (1)
- No new dependencies (1)
- < 50 lines of code (1)

**Medium Complexity (3-5 points):**
- Multiple files (2)
- Database query changes (2)
- New internal dependencies (1)
- 50-200 lines (1)

**High Complexity (6+ points):**
- Schema migration (3)
- External API integration (3)
- Complex business logic (2)
- > 200 lines (2)

**Assign tier:**
- 1-2 points: "low"
- 3-5 points: "medium"
- 6+ points: "high"

**Add to prd.json:**
```json
{
  "id": "US-001",
  "complexity": "medium",
  "complexity_score": 4,
  "complexity_factors": [
    "Multiple files (2)",
    "Database query changes (2)"
  ]
}
```
```

### 4.2 Ralph Loop Metrics Dashboard

**Create:** `agents/ralph/metrics.sh`

```bash
#!/bin/bash
# Display Ralph loop metrics

echo "📊 Ralph Loop Metrics"
echo ""

# Aggregate from all workspaces
for workspace in agents/ralph/workspaces/*/; do
  if [ -f "$workspace/prd.json" ]; then
    FEATURE=$(jq -r '.feature' "$workspace/prd.json")
    TOTAL=$(jq '.stories | length' "$workspace/prd.json")
    COMPLETED=$(jq '[.stories[] | select(.status == "completed")] | length' "$workspace/prd.json")

    if [ -f "$workspace/.completed" ]; then
      STATUS="✅ DONE"
      COMPLETED_AT=$(cat "$workspace/.completed")
    else
      STATUS="🔄 IN PROGRESS ($COMPLETED/$TOTAL)"
    fi

    echo "Feature: $FEATURE"
    echo "  Status: $STATUS"
    echo "  Stories: $COMPLETED/$TOTAL"
    [ -f "$workspace/.completed" ] && echo "  Completed: $COMPLETED_AT"
    echo ""
  fi
done

# Aggregate statistics
echo "Summary:"
TOTAL_FEATURES=$(find agents/ralph/workspaces -name "prd.json" | wc -l)
COMPLETED_FEATURES=$(find agents/ralph/workspaces -name ".completed" | wc -l)
IN_PROGRESS=$((TOTAL_FEATURES - COMPLETED_FEATURES))

echo "  Total Features: $TOTAL_FEATURES"
echo "  Completed: $COMPLETED_FEATURES"
echo "  In Progress: $IN_PROGRESS"
```

### 4.3 Update Documentation

**Files to update:**

1. **CLAUDE.md** - Add Ralph optimization learnings to Decision Log
2. **agents/ralph/README.md** - Create usage guide
3. **agents/ralph/TROUBLESHOOTING.md** - Common issues and fixes

**Create:** `agents/ralph/README.md`

```markdown
# Ralph Compound Engineering Loop

Autonomous feature development system for StratAI.

## Quick Start

### 1. Create a PRD

\`\`\`bash
# Interactive PRD creator
claude "Create a PRD for [feature spec path] using
  agents/ralph/skills/prd-creator-interactive.md"
\`\`\`

### 2. Run Ralph Loop

\`\`\`bash
cd agents/ralph
./ralph.sh workspaces/{feature-id}
\`\`\`

### 3. Monitor Progress

\`\`\`bash
# Check status
./ralph.sh --status workspaces/{feature-id}

# View progress log
cat workspaces/{feature-id}/progress.txt

# List all workspaces
./ralph.sh --list
\`\`\`

## Architecture

- **Workspace Isolation:** Each feature has isolated directory
- **Quality Gates:** TypeScript, lint, DB audit, tests
- **Auto-Fix:** Up to 3 attempts to fix validation failures
- **Validation Tiers:** Low/medium/high complexity stories
- **Prompt Caching:** 85-90% cost reduction on repeated docs

## Cost Optimization

**With Optimizations:**
- 10-story feature: ~$0.50-0.80 (was $2-3)
- Savings: 70-85% via caching + smart model selection

**Model Usage:**
- Sonnet: Story implementation, complex fixes
- Haiku: Progress updates, simple validation

## Troubleshooting

See `TROUBLESHOOTING.md` for common issues.
```

---

## Success Metrics

### Completion Rate
- **Baseline:** ~60-70% of stories fully complete (estimate)
- **Target:** 90-95% of stories fully complete
- **Measure:** AC verification pass rate

### Cost Efficiency
- **Baseline:** $2-3 per 10-story feature
- **Target:** $0.50-0.80 per 10-story feature
- **Measure:** Token usage from LiteLLM logs

### Execution Speed
- **Baseline:** ~30-45 min per feature (sequential)
- **Target:** ~20-30 min per feature (with optimizations)
- **Measure:** Workspace completion time

### Quality
- **Baseline:** N/A (not tracked)
- **Target:**
  - 100% of stories pass automated gates
  - 95%+ pass AC verification
  - < 5% require manual fixes post-completion
- **Measure:** Postflight pass rate, AC verification logs

---

## Implementation Timeline

### Week 1: Phase 1 (Immediate Improvements)
- Mon: AC verification script
- Tue: Increase fix attempts, better context
- Wed: Story completion summary template
- Thu: Improve checkout flow
- Fri: Test on 2-3 features, gather metrics

### Week 2: Phase 2 (Claude Code 2.1.0 Features)
- Mon: Implement prompt caching
- Tue: Smart model selection (Haiku for simple tasks)
- Wed: Progress file size limiting
- Thu-Fri: Test on real features, measure cost savings

### Week 3: Phase 3 (Advanced Features)
- Mon-Tue: Background validation agents
- Wed: Smart validation tiers
- Thu: Test parallel execution (optional)
- Fri: Polish and bug fixes

### Week 4: Phase 4 (Documentation & Metrics)
- Mon: Enhanced PRD quality checklist
- Tue: Metrics dashboard
- Wed: Update all documentation
- Thu: Final testing
- Fri: Write-up and retrospective

---

## Risks & Mitigations

### Risk 1: Claude Code 2.1.0 Features Not Available
**Mitigation:** Phase 2 is optional. Phases 1, 3, 4 work without 2.1.0.

### Risk 2: Prompt Caching Doesn't Work as Expected
**Mitigation:** Fall back to current approach. Monitor cache hit rates.

### Risk 3: Background Agents Increase Complexity
**Mitigation:** Keep current flow as fallback. Gradual rollout.

### Risk 4: Human AC Verification Slows Down Loop
**Mitigation:** Only for medium/high complexity stories. Low complexity is automated.

---

## Open Questions

1. **Should we add parallel workspace execution?**
   - Pro: Faster overall throughput
   - Con: More complex coordination
   - Decision: Phase 5 (future)

2. **Should we integrate with task_list MCP server?**
   - Pro: Better task tracking
   - Con: Dependency on external service
   - Decision: Evaluate after Phase 3

3. **Should we add automatic PR creation?**
   - Pro: Fully automated feature → PR flow
   - Con: Less human review
   - Decision: Add as opt-in flag

---

## Appendix: Claude Code 2.1.0 Features Used

### Background Agents
- Run agents in background while main agent continues
- Used for: Validation while agent prepares next story

### Prompt Caching
- Cache static context to reduce token costs
- Used for: AGENTS.md, schema docs, PRD creator patterns

### Smart Model Selection
- Use Haiku for simple tasks, Sonnet for complex
- Used for: Progress updates, validation, marking complete

### Task Tool Improvements
- Better subagent spawning and coordination
- Used for: Parallel story execution (Phase 3)

---

## References

- [Claude Code 2.1.0 Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [Enabling Claude Code autonomy](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously)
- [Original Ralph Loop (snarktank)](https://github.com/snarktank/ralph)
- [Compound Engineering Principles](docs/amp-skills-main/compound-engineering/SKILL.md)

---

**Next Steps:** Start with Phase 1 implementation (Week 1). Create branch `feature/ralph-optimization` and implement AC verification first.
