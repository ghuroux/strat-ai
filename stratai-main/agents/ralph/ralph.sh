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

**Instructions:**
Read the orchestrator prompt at: $ORCHESTRATOR_PROMPT_FILE

Then:
1. Read prd.json to understand all stories
2. Read .wave-analysis.json for parallelization insights (informational only)
3. Read progress.txt for context from previous stories (if it exists)
4. Implement each pending story by spawning Task sub-agents
5. Validate, auto-fix, update progress after each story
6. Create COMPLETION_SUMMARY.md when all stories complete

Work through stories sequentially. Do not parallelize (Phase 3).

Start with the first pending story.
EOF

# Spawn orchestrator agent
echo "   Launching orchestrator..."
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "$PROJECT_DIR" || exit 1

set +e
$CLAUDE_CLI --print \
  --dangerously-skip-permissions \
  --verbose \
  "$(cat "$WORKSPACE_DIR/.orchestrator-context.txt")"

ORCHESTRATOR_EXIT=$?
set -e

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
  ARCHIVE_DIR="$SCRIPT_DIR/archive/$DATE-$(echo "$FEATURE_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"

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

echo ""
exit 0
