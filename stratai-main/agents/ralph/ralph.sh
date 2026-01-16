#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# ralph.sh - Compound Engineering Loop for StratAI
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: ./ralph.sh [max_iterations]
#
# This script orchestrates the compound engineering loop:
#   1. Research → Plan → Work → Review → Compound → (repeat)
#
# Prerequisites:
#   - prd.json with stories defined
#   - parent-task-id.txt with current feature scope
#   - AGENTS.md for long-term memory
#
# The actual implementation work is done by the agent (Claude Code).
# This script manages state, validation, and progress tracking.
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
PARENT_ID_FILE="$SCRIPT_DIR/parent-task-id.txt"
MAX_ITERATIONS=${1:-10}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_step() {
  echo -e "${YELLOW}$1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# Initialization
# ═══════════════════════════════════════════════════════════════════════════════

print_header "Compound Engineering Loop"
echo ""
echo "   Max iterations: $MAX_ITERATIONS"
echo "   Project:        $PROJECT_DIR"
echo "   PRD:            $PRD_FILE"
echo ""

# Check for parent task ID
if [ ! -f "$PARENT_ID_FILE" ] || [ ! -s "$PARENT_ID_FILE" ]; then
  print_error "No parent-task-id.txt found"
  echo ""
  echo "   To start a new feature:"
  echo "   1. Create a PRD using the prd-creator skill"
  echo "   2. Save the parent task ID to parent-task-id.txt"
  echo ""
  exit 1
fi

PARENT_ID=$(cat "$PARENT_ID_FILE")
echo "   Parent task:    $PARENT_ID"

# Check for PRD
if [ ! -f "$PRD_FILE" ]; then
  print_error "No prd.json found"
  echo ""
  echo "   Create a PRD first using the prd-creator skill"
  echo ""
  exit 1
fi

# Count pending stories
TOTAL_STORIES=$(jq '.stories | length' "$PRD_FILE" 2>/dev/null || echo "0")
PENDING_STORIES=$(jq '[.stories[] | select(.status == "pending")] | length' "$PRD_FILE" 2>/dev/null || echo "0")
COMPLETED_STORIES=$((TOTAL_STORIES - PENDING_STORIES))

echo "   Stories:        $COMPLETED_STORIES/$TOTAL_STORIES complete"
echo ""

# Check if progress.txt needs reset (new feature)
if [ -f "$PROGRESS_FILE" ]; then
  PROGRESS_FEATURE=$(head -10 "$PROGRESS_FILE" | grep "Feature:" | cut -d: -f2 | xargs || echo "")
  PRD_FEATURE=$(jq -r '.feature // ""' "$PRD_FILE")
  
  if [ -n "$PROGRESS_FEATURE" ] && [ "$PROGRESS_FEATURE" != "$PRD_FEATURE" ]; then
    print_warning "Different feature detected in progress.txt"
    echo "   Progress: $PROGRESS_FEATURE"
    echo "   PRD:      $PRD_FEATURE"
    echo ""
    echo "   Consider archiving progress.txt before continuing"
    echo "   Archive: mv $PROGRESS_FILE $SCRIPT_DIR/archive/\$(date +%Y-%m-%d)-$PROGRESS_FEATURE/"
    echo ""
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Main Loop
# ═══════════════════════════════════════════════════════════════════════════════

for i in $(seq 1 $MAX_ITERATIONS); do
  print_header "Iteration $i of $MAX_ITERATIONS"
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Find next pending story
  # ─────────────────────────────────────────────────────────────────────────────
  
  STORY_ID=$(jq -r '.stories[] | select(.status == "pending") | .id' "$PRD_FILE" | head -1)
  
  if [ -z "$STORY_ID" ] || [ "$STORY_ID" == "null" ]; then
    print_header "🎉 All Stories Complete!"
    echo ""
    
    # Calculate stats
    COMPLETED=$(jq '[.stories[] | select(.status == "complete" or .status == "completed")] | length' "$PRD_FILE")
    FEATURE=$(jq -r '.feature // "unnamed"' "$PRD_FILE")
    
    echo "   Feature:    $FEATURE"
    echo "   Completed:  $COMPLETED stories"
    echo ""
    
    # ═════════════════════════════════════════════════════════════════════════════
    # Feature Cleanup Automation
    # ═════════════════════════════════════════════════════════════════════════════
    
    print_step "🧹 Feature Cleanup"
    
    DATE=$(date +%Y-%m-%d)
    ARCHIVE_DIR="$SCRIPT_DIR/archive/$DATE-$(echo "$FEATURE" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
    
    # 1. Archive progress
    if [ -f "$PROGRESS_FILE" ]; then
      mkdir -p "$ARCHIVE_DIR"
      cp "$PROGRESS_FILE" "$ARCHIVE_DIR/"
      cp "$PRD_FILE" "$ARCHIVE_DIR/"
      echo "   📦 Archived progress to: $ARCHIVE_DIR/"
    fi
    
    # 2. Extract patterns to AGENTS.md (if Claude CLI available)
    if [ -n "$CLAUDE_CLI" ]; then
      echo "   🔍 Extracting reusable patterns..."
      
      EXTRACT_PROMPT="Review the completed feature in agents/ralph/progress.txt and extract:

1. **New Codebase Patterns** - Reusable code patterns discovered
2. **Architectural Decisions** - Important design choices made
3. **Common Gotchas** - Non-obvious issues found and fixed

Add these to AGENTS.md following the existing format. Only add genuinely reusable insights.

Read agents/ralph/progress.txt for the feature implementation details."

      set +e
      if [ -n "$TIMEOUT_CMD" ]; then
        $TIMEOUT_CMD $CLAUDE_CLI --print \
          --dangerously-skip-permissions \
          "$EXTRACT_PROMPT" > /dev/null 2>&1
      else
        $CLAUDE_CLI --print \
          --dangerously-skip-permissions \
          "$EXTRACT_PROMPT" > /dev/null 2>&1
      fi
      set -e
      
      echo "   ✅ Patterns extracted to AGENTS.md"
    fi
    
    # 3. Reset working files for next feature
    echo "   🔄 Resetting working files..."
    
    # Reset progress.txt to template
    cat > "$PROGRESS_FILE" << 'EOF'
# Ralph Progress Log

## Feature: [Feature Name]
**Parent Task:** [parent-task-id]
**Started:** [YYYY-MM-DD]
**Status:** Ready to begin

## Decisions Made During PRD Creation

(Captured during PRD creation phase)

## Codebase Patterns Discovered

(Patterns discovered during research)

## Stories

| ID | Title | Status |
|----|-------|--------|

---

## Iteration Log

(Each iteration appends a section below)

---

EOF
    
    # Reset prd.json to empty template
    cat > "$PRD_FILE" << 'EOF'
{
  "feature": "",
  "created": "",
  "parent_task_id": "",
  "research": {},
  "stories": []
}
EOF
    
    # Clear parent task ID
    > "$SCRIPT_DIR/parent-task-id.txt"
    
    echo "   ✅ Working files reset for next feature"
    
    # 4. Create final summary commit
    cd "$PROJECT_DIR"
    git add -A
    git commit -m "feat: complete $FEATURE feature

- Implemented $COMPLETED stories
- Extracted patterns to AGENTS.md
- Archived progress to $ARCHIVE_DIR/
- Reset working files for next feature"
    
    echo ""
    print_success "Feature complete!"
    echo ""
    echo "   📊 Summary:"
    echo "   • Feature: $FEATURE"
    echo "   • Stories completed: $COMPLETED"
    echo "   • Archive: $ARCHIVE_DIR/"
    echo "   • Patterns: Added to AGENTS.md"
    echo ""
    echo "   🚀 Ready for next feature!"
    echo ""
    exit 0
  fi
  
  STORY_TITLE=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .title' "$PRD_FILE")
  STORY_DESC=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .description' "$PRD_FILE")
  STORY_STATUS=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .status' "$PRD_FILE")
  
  # ───────────────────────────────────────────────────────────────────────────────
  # Resume Capability: Skip completed stories
  # ───────────────────────────────────────────────────────────────────────────────
  
  if [ "$STORY_STATUS" == "completed" ] || [ "$STORY_STATUS" == "complete" ]; then
    echo ""
    echo "✅ Story $STORY_ID already completed - skipping"
    continue
  fi
  
  echo ""
  echo "📋 Story: $STORY_ID"
  echo "   Title: $STORY_TITLE"
  echo ""
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Research Phase (first iteration only)
  # ─────────────────────────────────────────────────────────────────────────────
  
  if [ "$i" -eq 1 ]; then
    print_step "🔍 Research Phase"
    echo ""
    echo "   Before implementing, review:"
    echo "   • AGENTS.md - Long-term codebase patterns"
    echo "   • progress.txt - Current feature context"
    echo "   • docs/database/SCHEMA_REFERENCE.md - TypeScript interfaces (if DB work)"
    echo "   • docs/database/ENTITY_MODEL.md - Schema context (if DB work)"
    echo "   • Similar implementations in codebase"
    echo ""
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Preflight Validation
  # ─────────────────────────────────────────────────────────────────────────────
  
  print_step "🔒 Preflight Validation"
  
  if ! "$SCRIPT_DIR/validation/preflight.sh"; then
    print_error "Preflight failed"
    echo ""
    echo "   Fix the issues above and run again"
    exit 1
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Work Phase (Agent Implementation)
  # ─────────────────────────────────────────────────────────────────────────────
  
  print_step "🤖 Work Phase"
  echo ""
  echo "   Agent implementing: $STORY_ID - $STORY_TITLE"
  echo ""
  # ─────────────────────────────────────────────────────────────────────────────
  # Try to invoke Claude agent automatically
  # ─────────────────────────────────────────────────────────────────────────────
  
  CLAUDE_CLI=""
  if command -v claude &> /dev/null; then
    CLAUDE_CLI="claude"
  elif [ -x "/Users/ghuroux/.npm-global/bin/claude" ]; then
    CLAUDE_CLI="/Users/ghuroux/.npm-global/bin/claude"
  fi
  
  if [ -n "$CLAUDE_CLI" ]; then
    echo "   ┌────────────────────────────────────────────────────────────┐"
    echo "   │  🤖 INVOKING CLAUDE AGENT AUTOMATICALLY                   │"
    echo "   └────────────────────────────────────────────────────────────┘"
    echo ""
    echo "   📋 Story: $STORY_ID - $STORY_TITLE"
    echo "   📁 Context: prompt.md, prd.json, progress.txt, AGENTS.md"
    echo ""
    echo "   Agent will:"
    echo "   1. Read prompt.md for instructions"
    echo "   2. Implement the story"
    echo "   3. Run quality gates"
    echo "   4. Update progress.txt"
    echo ""
    echo "   Starting agent..."
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    
    # Build the agent prompt
    AGENT_PROMPT="You are implementing a user story in the Ralph compound engineering loop.

**Current Story:** $STORY_ID - $STORY_TITLE

**Your Task:**
1. Read and follow the instructions in \`agents/ralph/prompt.md\`
2. Read the current story details from \`agents/ralph/prd.json\`
3. Review existing patterns in \`AGENTS.md\`
4. Review current feature context in \`agents/ralph/progress.txt\`
5. Implement the story following ALL acceptance criteria
6. Run quality gates: \`npm run check\`, \`npm run lint\`
7. Update \`agents/ralph/progress.txt\` with your learnings
8. Commit your changes with a descriptive message

**Critical Rules:**
- Follow the patterns in AGENTS.md (especially camelCase for DB access)
- Do NOT skip any acceptance criteria
- Do NOT skip quality gates
- Do NOT skip updating progress.txt
- Commit your work when done

**Start by reading agents/ralph/prompt.md to understand the full context.**"

    # Invoke Claude CLI
    cd "$PROJECT_DIR" || exit 1
    
    # Create a temporary prompt file
    TEMP_PROMPT_FILE=$(mktemp)
    echo "Implement user story $STORY_ID: $STORY_TITLE

Start by reading agents/ralph/prompt.md for full instructions and context.

You MUST:
1. Implement ALL acceptance criteria
2. Run quality gates (npm run check, npm run lint)
3. Update agents/ralph/progress.txt with learnings
4. Commit your changes

Read agents/ralph/prompt.md NOW to begin." > "$TEMP_PROMPT_FILE"
    
    echo "   Invoking Claude CLI (this may take 2-5 minutes)..."
    echo ""
    echo "───────────────────────────────────────────────────────────────"
    
    # Run with timeout and show output
    set +e  # Don't exit on error
    
    # macOS doesn't have timeout by default, use gtimeout if available
    TIMEOUT_CMD=""
    if command -v timeout &> /dev/null; then
      TIMEOUT_CMD="timeout 600"
    elif command -v gtimeout &> /dev/null; then
      TIMEOUT_CMD="gtimeout 600"
    fi
    
    if [ -n "$TIMEOUT_CMD" ]; then
      $TIMEOUT_CMD $CLAUDE_CLI --print \
        --system-prompt "$AGENT_PROMPT" \
        --dangerously-skip-permissions \
        --verbose \
        "$(cat "$TEMP_PROMPT_FILE")"
    else
      # No timeout available - run without it
      $CLAUDE_CLI --print \
        --system-prompt "$AGENT_PROMPT" \
        --dangerously-skip-permissions \
        --verbose \
        "$(cat "$TEMP_PROMPT_FILE")"
    fi
    
    CLAUDE_EXIT_CODE=$?
    set -e  # Re-enable exit on error
    
    # Clean up temp file
    rm -f "$TEMP_PROMPT_FILE"
    
    echo ""
    echo "───────────────────────────────────────────────────────────────"
    
    if [ $CLAUDE_EXIT_CODE -eq 124 ]; then
      # Timeout
      echo ""
      echo "   ⏱️  Agent timed out (10 minute limit)"
      echo ""
      echo "   The agent may have completed work. Proceeding to validation..."
      echo "   If validation fails, you can manually continue the work."
      echo ""
    elif [ $CLAUDE_EXIT_CODE -ne 0 ]; then
      # Error
      echo ""
      echo "   ⚠️  Agent exited with code: $CLAUDE_EXIT_CODE"
      echo ""
      echo "   Options:"
      echo "   1. Press Enter to continue to validation anyway"
      echo "   2. Press Ctrl+C to exit and investigate"
      echo ""
      read -r
    else
      # Success
      echo ""
      echo "   ✅ Agent completed"
      echo ""
      echo "   Proceeding to postflight validation..."
      echo ""
    fi
    
  else
    # Fallback to manual mode
    echo "   ┌────────────────────────────────────────────────────────────┐"
    echo "   │  ⚠️  MANUAL IMPLEMENTATION REQUIRED                        │"
    echo "   │                                                            │"
    echo "   │  Claude CLI not found. Please implement manually:         │"
    echo "   │                                                            │"
    echo "   │  1. Read prompt.md for context                            │"
    echo "   │  2. Implement the story                                   │"
    echo "   │  3. Run quality gates                                     │"
    echo "   │  4. Update progress.txt                                   │"
    echo "   │                                                            │"
    echo "   └────────────────────────────────────────────────────────────┘"
    echo ""
    echo "   Press Enter when story is implemented, or Ctrl+C to exit..."
    read -r
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Postflight Validation with Auto-Fix
  # ─────────────────────────────────────────────────────────────────────────────
  
  print_step "🔒 Postflight Validation"
  
  POSTFLIGHT_OUTPUT=$(mktemp)
  MAX_FIX_ATTEMPTS=2
  FIX_ATTEMPT=0
  
  while true; do
    # Run postflight and capture output
    if "$SCRIPT_DIR/validation/postflight.sh" 2>&1 | tee "$POSTFLIGHT_OUTPUT"; then
      # Success!
      rm -f "$POSTFLIGHT_OUTPUT"
      break
    fi
    
    # Postflight failed
    print_error "Postflight failed"
    echo ""
    
    # Check if we've exhausted fix attempts
    if [ $FIX_ATTEMPT -ge $MAX_FIX_ATTEMPTS ]; then
      echo "   ❌ Maximum fix attempts ($MAX_FIX_ATTEMPTS) reached"
      echo ""
      echo "   Options:"
      echo "   1. Press Enter to skip this story and continue"
      echo "   2. Press Ctrl+C to exit and fix manually"
      echo ""
      read -r
      rm -f "$POSTFLIGHT_OUTPUT"
      continue 2  # Continue to next story in outer loop
    fi
    
    # Try auto-fix if Claude CLI is available
    if [ -n "$CLAUDE_CLI" ]; then
      FIX_ATTEMPT=$((FIX_ATTEMPT + 1))
      echo "   🔧 Auto-fix attempt $FIX_ATTEMPT of $MAX_FIX_ATTEMPTS..."
      echo ""
      
      # Create fix prompt with error details
      FIX_PROMPT="You are fixing validation errors for story $STORY_ID.

**CRITICAL: This is a FIX attempt. The story was implemented but validation failed.**

**Validation errors:**
\`\`\`
$(cat "$POSTFLIGHT_OUTPUT")
\`\`\`

**Your task:**
1. Read the validation errors above carefully
2. Fix ONLY the specific issues mentioned
3. Do NOT reimplement the entire story
4. Run quality gates after fixing
5. Update progress.txt with what you fixed

**Rules:**
- Focus ONLY on fixing the errors shown above
- Do not introduce new changes
- Test your fixes with npm run check, npm run lint, npm run test
- If you cannot fix the issue, explain why in progress.txt

Read agents/ralph/prompt.md for context if needed."

      # Invoke fix agent with fresh context
      set +e
      if [ -n "$TIMEOUT_CMD" ]; then
        $TIMEOUT_CMD $CLAUDE_CLI --print \
          --system-prompt "$AGENT_PROMPT" \
          --dangerously-skip-permissions \
          "$(echo "$FIX_PROMPT")"
      else
        $CLAUDE_CLI --print \
          --system-prompt "$AGENT_PROMPT" \
          --dangerously-skip-permissions \
          "$(echo "$FIX_PROMPT")"
      fi
      FIX_EXIT_CODE=$?
      set -e
      
      if [ $FIX_EXIT_CODE -eq 0 ]; then
        echo ""
        echo "   ✅ Fix agent completed - re-running validation..."
        echo ""
        # Loop will re-run postflight
      else
        echo ""
        echo "   ⚠️  Fix agent failed (exit code: $FIX_EXIT_CODE)"
        echo ""
        # Loop will try again or hit max attempts
      fi
    else
      # No CLI - manual fix required
      echo "   Fix the issues and press Enter to re-validate..."
      echo "   (Or press Ctrl+C to exit)"
      read -r
    fi
  done
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Review Phase
  # ─────────────────────────────────────────────────────────────────────────────
  
  print_step "👀 Review Phase"
  echo ""
  echo "   Self-review checklist:"
  echo "   • Code follows existing patterns"
  echo "   • All property access uses camelCase"
  echo "   • Nullable columns handled with ??"
  echo "   • No unnecessary complexity"
  echo "   • Would a new developer understand this?"
  echo ""
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Compound Phase
  # ─────────────────────────────────────────────────────────────────────────────
  
  print_step "📚 Compound Phase"
  echo ""
  echo "   Capture learnings:"
  echo "   • What patterns did you apply?"
  echo "   • What decisions did you make?"
  echo "   • What would you do differently?"
  echo ""
  
  # Update PRD status
  print_step "📝 Updating PRD..."
  
  jq --arg id "$STORY_ID" \
    '.stories = [.stories[] | if .id == $id then .status = "completed" else . end]' \
    "$PRD_FILE" > "$PRD_FILE.tmp" && mv "$PRD_FILE.tmp" "$PRD_FILE"
  
  # Append to progress.txt
  echo "" >> "$PROGRESS_FILE"
  echo "## $(date +%Y-%m-%d) - $STORY_TITLE" >> "$PROGRESS_FILE"
  echo "Task ID: $STORY_ID" >> "$PROGRESS_FILE"
  echo "Status: Completed" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "### What Was Done" >> "$PROGRESS_FILE"
  echo "[Fill in implementation details]" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "### Learnings" >> "$PROGRESS_FILE"
  echo "[Capture patterns, decisions, lessons]" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Auto-Commit Story
  # ─────────────────────────────────────────────────────────────────────────────
  
  print_step "💾 Committing changes..."
  
  cd "$PROJECT_DIR"
  
  # Auto-commit this story's changes
  if git add -A && git commit -m "feat($STORY_ID): $STORY_TITLE"; then
    echo ""
    echo "   ✅ Committed: feat($STORY_ID): $STORY_TITLE"
    echo ""
  else
    echo ""
    echo "   ⚠️  Commit failed (possibly nothing to commit)"
    echo ""
  fi
  
  # ─────────────────────────────────────────────────────────────────────────────
  # Summary
  # ─────────────────────────────────────────────────────────────────────────────
  
  print_success "Story $STORY_ID complete!"
  
  REMAINING=$(jq '[.stories[] | select(.status == "pending")] | length' "$PRD_FILE")
  echo ""
  echo "   Remaining stories: $REMAINING"
  echo ""
  
  if [ "$REMAINING" -gt 0 ]; then
    echo "🔄 Continuing to next story..."
  fi
  
done

# ═══════════════════════════════════════════════════════════════════════════════
# Max Iterations Reached
# ═══════════════════════════════════════════════════════════════════════════════

print_warning "Max iterations ($MAX_ITERATIONS) reached"
echo ""
echo "   To continue: ./ralph.sh $((MAX_ITERATIONS * 2))"
echo ""

REMAINING=$(jq '[.stories[] | select(.status == "pending")] | length' "$PRD_FILE")
echo "   Remaining stories: $REMAINING"
echo ""

