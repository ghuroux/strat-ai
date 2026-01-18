#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# ralph.sh - Compound Engineering Loop for StratAI
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: 
#   ./ralph.sh workspaces/{feature-id}  # Run with workspace (recommended)
#   ./ralph.sh --list                   # List all workspaces
#   ./ralph.sh --status {workspace}     # Show workspace status
#   ./ralph.sh [max_iterations]         # Legacy mode (backward compatible)
#
# This script orchestrates the compound engineering loop:
#   1. Research → Plan → Work → Review → Compound → (repeat)
#
# Prerequisites:
#   - Workspace with prd.json, progress.txt, parent-task-id.txt
#   - AGENTS.md for long-term memory
#
# The actual implementation work is done by the agent (Claude Code).
# This script manages state, validation, and progress tracking.
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Base configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# ═══════════════════════════════════════════════════════════════════════════════
# Parse Arguments & Setup Workspace
# ═══════════════════════════════════════════════════════════════════════════════

# Handle commands
if [ "$1" = "--list" ]; then
  echo "📋 Available Workspaces:"
  echo ""
  if [ -d "$SCRIPT_DIR/workspaces" ]; then
    for workspace in "$SCRIPT_DIR/workspaces"/*/ ; do
      if [ -d "$workspace" ]; then
        name=$(basename "$workspace")
        if [ -f "$workspace/prd.json" ]; then
          total=$(jq '[.stories[]] | length' "$workspace/prd.json" 2>/dev/null || echo "?")
          completed=$(jq '[.stories[] | select(.status == "completed" or .status == "complete")] | length' "$workspace/prd.json" 2>/dev/null || echo "0")
          if [ -f "$workspace/.completed" ]; then
            echo "  ✅ $name ($completed/$total stories) - COMPLETED"
          elif [ "$completed" -gt 0 ]; then
            echo "  🔄 $name ($completed/$total stories) - IN PROGRESS"
          else
            echo "  ⏳ $name ($completed/$total stories) - PENDING"
          fi
        else
          echo "  ❓ $name (no PRD)"
        fi
      fi
    done
  else
    echo "  (no workspaces yet)"
  fi
  echo ""
  exit 0
fi

if [ "$1" = "--status" ]; then
  if [ -z "$2" ]; then
    echo "❌ Usage: ./ralph.sh --status workspaces/{feature-id}"
    exit 1
  fi
  workspace_path="$SCRIPT_DIR/$2"
  if [ ! -d "$workspace_path" ]; then
    echo "❌ Workspace not found: $2"
    exit 1
  fi
  if [ ! -f "$workspace_path/prd.json" ]; then
    echo "❌ No PRD found in workspace: $2"
    exit 1
  fi
  
  echo "📊 Workspace Status"
  echo ""
  echo "Workspace: $2"
  echo "Feature: $(jq -r '.feature // "unknown"' "$workspace_path/prd.json")"
  echo ""
  total=$(jq '[.stories[]] | length' "$workspace_path/prd.json")
  completed=$(jq '[.stories[] | select(.status == "completed" or .status == "complete")] | length' "$workspace_path/prd.json")
  echo "Progress: $completed/$total stories ($(( completed * 100 / total ))%)"
  echo ""
  if [ -f "$workspace_path/.completed" ]; then
    echo "Status: ✅ COMPLETED"
    echo "Completed at: $(cat "$workspace_path/.completed")"
  elif [ "$completed" -gt 0 ]; then
    echo "Status: 🔄 IN PROGRESS"
    current=$(jq -r '[.stories[] | select(.status == "pending")] | .[0].id // "none"' "$workspace_path/prd.json")
    if [ "$current" != "none" ]; then
      echo "Next story: $current"
    fi
  else
    echo "Status: ⏳ PENDING (not started)"
  fi
  echo ""
  exit 0
fi

# Determine workspace directory
WORKSPACE_DIR=""
MAX_ITERATIONS=10

if [ -n "$1" ] && [ -d "$SCRIPT_DIR/$1" ]; then
  # Workspace mode
  WORKSPACE_DIR="$SCRIPT_DIR/$1"
  MAX_ITERATIONS=${2:-10}
  echo "🎯 Workspace Mode: $1"
  echo ""
elif [ -n "$1" ] && [[ "$1" =~ ^[0-9]+$ ]]; then
  # Legacy mode with max iterations
  WORKSPACE_DIR="$SCRIPT_DIR"
  MAX_ITERATIONS=$1
  echo "⚠️  Legacy Mode (no workspace isolation)"
  echo "   For parallel execution, use: ./ralph.sh workspaces/{feature-id}"
  echo "   Create workspace: Use PRD creator interactive skill"
  echo ""
elif [ -z "$1" ]; then
  # Legacy mode default
  WORKSPACE_DIR="$SCRIPT_DIR"
  echo "⚠️  Legacy Mode (no workspace isolation)"
  echo "   For parallel execution, use: ./ralph.sh workspaces/{feature-id}"
  echo "   Create workspace: Use PRD creator interactive skill"
  echo ""
else
  # Invalid workspace
  echo "❌ Workspace not found: $1"
  echo ""
  echo "Available workspaces:"
  if [ -d "$SCRIPT_DIR/workspaces" ]; then
    ls -1 "$SCRIPT_DIR/workspaces/" 2>/dev/null || echo "  (none)"
  else
    echo "  (none)"
  fi
  echo ""
  echo "Usage:"
  echo "  ./ralph.sh workspaces/{feature-id}  # Run with workspace"
  echo "  ./ralph.sh --list                   # List workspaces"
  echo "  ./ralph.sh --status {workspace}     # Show status"
  exit 1
fi

# Configure paths based on workspace
PRD_FILE="$WORKSPACE_DIR/prd.json"
PROGRESS_FILE="$WORKSPACE_DIR/progress.txt"
PARENT_ID_FILE="$WORKSPACE_DIR/parent-task-id.txt"

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

# Track start time for duration calculation (Phase 2.5)
date +%s > "$WORKSPACE_DIR/.start-time"

# ═══════════════════════════════════════════════════════════════════════════════
# Git Branch Management (Trunk-Based Development)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Rule: Main is always the source of truth. Each feature gets its own branch.
# This ensures parallel Ralph loops don't conflict and code stays organized.
#
# ═══════════════════════════════════════════════════════════════════════════════

print_step "🌿 Setting Up Feature Branch"

# Check if we're in a git repo
if ! git -C "$PROJECT_DIR" rev-parse --git-dir > /dev/null 2>&1; then
  print_warning "Not a git repository - skipping branch management"
  echo ""
else
  cd "$PROJECT_DIR" || exit 1

  # Get feature name for branch
  FEATURE_NAME=$(jq -r '.feature_name // .feature // "unknown"' "$PRD_FILE" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
  FEATURE_BRANCH="feature/$FEATURE_NAME"

  # Check current branch
  CURRENT_BRANCH=$(git branch --show-current)

  # Check for uncommitted changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    print_warning "Uncommitted changes detected"
    echo ""
    echo "   Options:"
    echo "   1. Commit your changes first"
    echo "   2. Stash with: git stash"
    echo "   3. Discard with: git checkout -- ."
    echo ""
    read -p "   Continue anyway? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "   Aborted. Please handle uncommitted changes first."
      exit 1
    fi
  fi

  # Check if feature branch already exists
  if git show-ref --verify --quiet "refs/heads/$FEATURE_BRANCH"; then
    # Feature branch exists - check if we're on it
    if [ "$CURRENT_BRANCH" = "$FEATURE_BRANCH" ]; then
      print_success "Already on feature branch: $FEATURE_BRANCH"
      echo ""
    else
      echo "   Feature branch exists: $FEATURE_BRANCH"
      echo "   Current branch: $CURRENT_BRANCH"
      echo ""
      read -p "   Switch to existing feature branch? [Y/n] " -n 1 -r
      echo ""
      if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        git checkout "$FEATURE_BRANCH"
        print_success "Switched to: $FEATURE_BRANCH"
        echo ""
      fi
    fi
  else
    # Feature branch doesn't exist - create from main
    echo "   Creating feature branch from main..."
    echo ""

    # If not on main, switch to it first
    if [ "$CURRENT_BRANCH" != "main" ]; then
      echo "   Switching to main branch..."
      git checkout main || {
        print_error "Failed to checkout main branch"
        exit 1
      }
    fi

    # Pull latest main (if remote exists)
    if git remote | grep -q origin; then
      echo "   Pulling latest from origin/main..."
      git pull origin main --ff-only 2>/dev/null || {
        print_warning "Could not pull from origin (continuing with local main)"
      }
    fi

    # Create and switch to feature branch
    git checkout -b "$FEATURE_BRANCH" || {
      print_error "Failed to create branch: $FEATURE_BRANCH"
      exit 1
    }

    print_success "Created feature branch: $FEATURE_BRANCH"
    echo ""
  fi

  # Store branch name for later use
  echo "$FEATURE_BRANCH" > "$WORKSPACE_DIR/.feature-branch"
fi

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

# ─────────────────────────────────────────────────────────────────────────────
# Coordinator Wave Analysis (Phase 2.5 - Analysis Only)
# ─────────────────────────────────────────────────────────────────────────────

print_step "🔍 Analyzing Parallelization Opportunities (Phase 2.5)"

if [ -x "$SCRIPT_DIR/lib/coordinator-agent.sh" ]; then
  # Run coordinator analysis
  if "$SCRIPT_DIR/lib/coordinator-agent.sh" "$WORKSPACE_DIR"; then

    ANALYSIS_FILE="$WORKSPACE_DIR/.wave-analysis.json"

    if [ -f "$ANALYSIS_FILE" ]; then
      echo ""
      echo "┌────────────────────────────────────────────────────────────┐"
      echo "│  📊 COORDINATOR ANALYSIS                                   │"
      echo "└────────────────────────────────────────────────────────────┘"
      echo ""

      # Extract key metrics
      ESTIMATED_SEQUENTIAL=$(jq -r '.estimated_sequential_time_min' "$ANALYSIS_FILE")
      ESTIMATED_PARALLEL=$(jq -r '.estimated_wave_time_min' "$ANALYSIS_FILE")
      SAVINGS_PERCENT=$(jq -r '.time_savings_percent' "$ANALYSIS_FILE")
      CONFIDENCE=$(jq -r '.confidence' "$ANALYSIS_FILE")

      echo "   Sequential execution:    ~${ESTIMATED_SEQUENTIAL} min"
      echo "   With parallelization:    ~${ESTIMATED_PARALLEL} min"
      echo "   Potential time savings:   ${SAVINGS_PERCENT}%"
      echo "   Confidence level:         ${CONFIDENCE}"
      echo ""

      # Show wave breakdown
      WAVE_COUNT=$(jq '.waves | length' "$ANALYSIS_FILE")
      echo "   Proposed execution plan:  $WAVE_COUNT waves"
      echo ""

      jq -r '.waves[] |
        "     Wave \(.wave_number): \(.stories | join(", ")) " +
        (if .parallelism > 1 then "(\(.parallelism) parallel)" else "(sequential)" end) +
        "\n       → \(.rationale)"' "$ANALYSIS_FILE"

      echo ""

      # Show risks if any
      RISKS=$(jq -r '.risks | length' "$ANALYSIS_FILE")
      if [ "$RISKS" -gt 0 ]; then
        echo "   ⚠️  Potential risks identified:"
        jq -r '.risks[] | "       • " + .' "$ANALYSIS_FILE"
        echo ""
      fi

      echo "   ℹ️  Currently executing sequentially (Phase 3 will add parallelization)"
      echo ""
    fi
  else
    echo "   ⚠️  Wave analysis failed - proceeding with sequential execution"
    echo ""
  fi
else
  echo "   ⚠️  Coordinator agent not found - skipping analysis"
  echo "   Install: chmod +x $SCRIPT_DIR/lib/coordinator-agent.sh"
  echo ""
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Launch Orchestrator Agent (Phase 2.75)
# ═══════════════════════════════════════════════════════════════════════════════

print_header "Launching Orchestrator Agent"

# Check for Claude Code CLI
CLAUDE_CLI=""
if command -v claude &> /dev/null; then
  CLAUDE_CLI="claude"
elif [ -x "/Users/ghuroux/.npm-global/bin/claude" ]; then
  CLAUDE_CLI="/Users/ghuroux/.npm-global/bin/claude"
fi

if [ -z "$CLAUDE_CLI" ]; then
  print_error "Claude Code CLI not found"
  echo ""
  echo "   Install: npm install -g @anthropic-ai/claude-cli"
  echo ""
  exit 1
fi

# Build orchestrator prompt
ORCHESTRATOR_PROMPT_FILE="$SCRIPT_DIR/lib/orchestrator-prompt.md"

if [ ! -f "$ORCHESTRATOR_PROMPT_FILE" ]; then
  print_error "Orchestrator prompt not found: $ORCHESTRATOR_PROMPT_FILE"
  exit 1
fi

# Launch orchestrator agent
print_step "Starting orchestrator agent for feature: $(jq -r '.feature // "unknown"' "$PRD_FILE")"
echo ""
echo "   Workspace: $WORKSPACE_DIR"
echo "   Stories: $TOTAL_STORIES total, $PENDING_STORIES pending"
echo ""

# Create orchestrator context
FEATURE_NAME=$(jq -r '.feature // "unknown"' "$PRD_FILE")

cat > "$WORKSPACE_DIR/.orchestrator-context.txt" <<EOF
You are the Ralph Loop orchestrator agent.

**Workspace Directory:** $WORKSPACE_DIR
**Project Directory:** $PROJECT_DIR
**Feature:** $FEATURE_NAME
**Pending Stories:** $PENDING_STORIES
**Progress Log:** $WORKSPACE_DIR/.orchestrator-progress.log

**CRITICAL - Progress Logging:**
Write progress updates to .orchestrator-progress.log for live visibility!
Example: echo "📋 [\$(date +%H:%M:%S)] Starting US-001: Story Title" >> .orchestrator-progress.log
See the "Progress Logging" section in the orchestrator prompt for all events to log.

**Instructions:**
Read the orchestrator prompt at: $ORCHESTRATOR_PROMPT_FILE

Then:
1. Log "🚀 Orchestrator started" to progress log
2. Read prd.json to understand all stories
3. Read .wave-analysis.json for parallelization insights (informational only)
4. Read progress.txt for context from previous stories (if it exists)
5. For each story: log progress, implement via sub-agent, validate, update progress
6. Create COMPLETION_SUMMARY.md when all stories complete
7. Log "🏆 ALL STORIES COMPLETE" to progress log

Work through stories sequentially. Do not parallelize (Phase 3).

Start with the first pending story.
EOF

# Initialize progress log for live visibility
PROGRESS_LOG="$WORKSPACE_DIR/.orchestrator-progress.log"
echo "" > "$PROGRESS_LOG"
echo "═══════════════════════════════════════════════════════════════"
echo "📊 Live Progress (from $PROGRESS_LOG)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Start tailing progress log in background
tail -f "$PROGRESS_LOG" 2>/dev/null &
TAIL_PID=$!

# Cleanup function to stop tail
cleanup_tail() {
  if [ -n "$TAIL_PID" ] && kill -0 "$TAIL_PID" 2>/dev/null; then
    kill "$TAIL_PID" 2>/dev/null || true
  fi
}
trap cleanup_tail EXIT

cd "$PROJECT_DIR" || exit 1

# Spawn orchestrator agent
set +e
$CLAUDE_CLI --print \
  --dangerously-skip-permissions \
  --verbose \
  "$(cat "$WORKSPACE_DIR/.orchestrator-context.txt")"

ORCHESTRATOR_EXIT=$?
set -e

# Stop tailing
cleanup_tail
trap - EXIT

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $ORCHESTRATOR_EXIT -ne 0 ]; then
  print_error "Orchestrator agent failed with exit code: $ORCHESTRATOR_EXIT"
  echo ""
  echo "   Check workspace for partial progress: $WORKSPACE_DIR/progress.txt"
  echo "   To resume: ./ralph.sh $WORKSPACE_DIR"
  echo ""
  exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Feature Complete
# ═══════════════════════════════════════════════════════════════════════════════

print_success "Feature implementation complete!"
echo ""
echo "   Review checklist: $WORKSPACE_DIR/COMPLETION_SUMMARY.md"
echo "   Full progress log: $WORKSPACE_DIR/progress.txt"
echo ""

# Archive workspace if in workspace mode
if [ "$WORKSPACE_DIR" != "$SCRIPT_DIR" ]; then
  DATE=$(date +%Y-%m-%d)
  FEATURE_NAME_SLUG=$(echo "$FEATURE_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
  ARCHIVE_DIR="$SCRIPT_DIR/archive/$DATE-$FEATURE_NAME_SLUG"

  if [ -f "$PROGRESS_FILE" ] && [ ! -f "$WORKSPACE_DIR/.completed" ]; then
    mkdir -p "$ARCHIVE_DIR"
    cp "$PROGRESS_FILE" "$ARCHIVE_DIR/" 2>/dev/null || true
    cp "$PRD_FILE" "$ARCHIVE_DIR/" 2>/dev/null || true
    cp "$PARENT_ID_FILE" "$ARCHIVE_DIR/" 2>/dev/null || true
    cp "$WORKSPACE_DIR/COMPLETION_SUMMARY.md" "$ARCHIVE_DIR/" 2>/dev/null || true
    echo "   📦 Archived to: $ARCHIVE_DIR/"
  fi

  # Mark workspace as completed if not already
  if [ ! -f "$WORKSPACE_DIR/.completed" ]; then
    COMPLETION_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "$COMPLETION_TIME" > "$WORKSPACE_DIR/.completed"
    echo "   ✅ Workspace marked as completed"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Git Branch Merge (Trunk-Based Development)
# ═══════════════════════════════════════════════════════════════════════════════

if [ -f "$WORKSPACE_DIR/.feature-branch" ]; then
  FEATURE_BRANCH=$(cat "$WORKSPACE_DIR/.feature-branch")
  CURRENT_BRANCH=$(git -C "$PROJECT_DIR" branch --show-current)

  echo ""
  print_step "🔀 Branch Management"
  echo ""
  echo "   Feature branch: $FEATURE_BRANCH"
  echo "   Current branch: $CURRENT_BRANCH"
  echo ""

  # Offer to merge to main
  echo "   Would you like to merge this feature to main?"
  echo ""
  echo "   [M] Merge to main and delete feature branch (recommended)"
  echo "   [K] Keep feature branch (merge later)"
  echo "   [N] Do nothing"
  echo ""
  read -p "   Choice [M/k/n]: " -n 1 -r
  echo ""
  echo ""

  if [[ $REPLY =~ ^[Mm]$ ]] || [[ -z $REPLY ]]; then
    cd "$PROJECT_DIR" || exit 1

    # Ensure we're on the feature branch and it has all changes
    if [ "$CURRENT_BRANCH" != "$FEATURE_BRANCH" ]; then
      git checkout "$FEATURE_BRANCH" 2>/dev/null || true
    fi

    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "   Committing remaining changes..."
      git add -A
      git commit -m "chore: final changes for $FEATURE_NAME" || true
    fi

    # Switch to main and merge
    echo "   Switching to main..."
    git checkout main || {
      print_error "Failed to checkout main"
      exit 1
    }

    echo "   Merging $FEATURE_BRANCH..."
    if git merge "$FEATURE_BRANCH" -m "Merge $FEATURE_BRANCH"; then
      print_success "Merged to main successfully"

      # Delete feature branch
      echo "   Cleaning up feature branch..."
      git branch -d "$FEATURE_BRANCH" 2>/dev/null || true
      rm -f "$WORKSPACE_DIR/.feature-branch"
      print_success "Deleted branch: $FEATURE_BRANCH"
      echo ""

      # Offer to push
      if git remote | grep -q origin; then
        echo "   Push to origin? [y/N] "
        read -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
          git push origin main && print_success "Pushed to origin/main"
        fi
      fi
    else
      print_error "Merge failed - resolve conflicts manually"
      echo "   Your feature branch is preserved: $FEATURE_BRANCH"
      echo "   To resolve:"
      echo "     1. Fix conflicts"
      echo "     2. git add ."
      echo "     3. git commit"
      echo "     4. git branch -d $FEATURE_BRANCH"
    fi

  elif [[ $REPLY =~ ^[Kk]$ ]]; then
    echo "   Feature branch kept: $FEATURE_BRANCH"
    echo ""
    echo "   To merge later:"
    echo "     git checkout main"
    echo "     git merge $FEATURE_BRANCH"
    echo "     git branch -d $FEATURE_BRANCH"
    echo ""

  else
    echo "   No changes made to branches."
  fi
fi

echo ""
print_success "Ralph loop complete!"
echo ""
exit 0
