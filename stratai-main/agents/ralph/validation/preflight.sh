#!/bin/bash
# agents/ralph/validation/preflight.sh
# Pre-iteration validation for the compound engineering loop
#
# Purpose: Ensure clean state before starting work
# Run: Before each iteration of the ralph loop
# Exit: 0 if all checks pass, 1 if any fail

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RALPH_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$(dirname "$RALPH_DIR")")"

echo "🔍 Preflight checks..."
echo "   Project: $PROJECT_DIR"

cd "$PROJECT_DIR"

# ═══════════════════════════════════════════════════════════════════
# 1. Clean Working Directory
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "📁 Checking working directory..."

if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory not clean"
  echo ""
  echo "   Uncommitted changes:"
  git status --short
  echo ""
  echo "   Fix: Commit or stash changes before proceeding"
  exit 1
fi

echo "   ✅ Working directory is clean"

# ═══════════════════════════════════════════════════════════════════
# 2. TypeScript Compilation
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "📝 Checking TypeScript..."

if ! npm run check --silent 2>/dev/null; then
  echo "❌ TypeScript errors exist"
  echo ""
  echo "   Fix: Run 'npm run check' and fix all errors"
  exit 1
fi

echo "   ✅ TypeScript compiles (0 errors)"

# ═══════════════════════════════════════════════════════════════════
# 3. Lint Check
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "🔎 Checking lint..."

# Capture lint output - we'll allow existing warnings but track them
LINT_OUTPUT=$(npm run lint 2>&1) || true
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c "error" || echo "0")

if [ "$LINT_ERRORS" -gt 0 ]; then
  echo "⚠️  Lint errors exist (will not accept new ones)"
  echo "   Existing errors: $LINT_ERRORS"
else
  echo "   ✅ Lint passes"
fi

# ═══════════════════════════════════════════════════════════════════
# 4. Database Access Audit Baseline
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "🗄️  Capturing DB access audit baseline..."

# Check if audit script exists
if [ -f "$PROJECT_DIR/scripts/audit-db-access.ts" ]; then
  BASELINE=$(npm run audit-db-access --silent 2>&1 | grep -oE '[0-9]+' | tail -1 || echo "0")
else
  # If audit script doesn't exist yet, baseline is 0
  BASELINE="0"
  echo "   ⚠️  Audit script not found (will be created in DB standardization project)"
fi

echo "BASELINE_VIOLATIONS=$BASELINE" > "$RALPH_DIR/.ralph-state"
echo "   Baseline violations: $BASELINE"

# ═══════════════════════════════════════════════════════════════════
# 5. Check Required Files
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "📋 Checking required files..."

# Check AGENTS.md exists
if [ ! -f "$PROJECT_DIR/AGENTS.md" ]; then
  echo "   ⚠️  AGENTS.md not found - create it for long-term learnings"
else
  echo "   ✅ AGENTS.md exists"
fi

# Check progress.txt exists
if [ ! -f "$RALPH_DIR/progress.txt" ]; then
  echo "   ⚠️  progress.txt not found - will be created"
else
  echo "   ✅ progress.txt exists"
fi

# Check prd.json exists
if [ ! -f "$RALPH_DIR/prd.json" ]; then
  echo "   ⚠️  prd.json not found - run PRD creator first"
else
  PENDING_STORIES=$(jq '[.stories[] | select(.status == "pending")] | length' "$RALPH_DIR/prd.json" 2>/dev/null || echo "0")
  echo "   ✅ prd.json exists ($PENDING_STORIES pending stories)"
fi

# ═══════════════════════════════════════════════════════════════════
# 6. Environment Check
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "🔧 Checking environment..."

# Check if node_modules exists
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  echo "❌ node_modules not found"
  echo "   Fix: Run 'npm install'"
  exit 1
fi

echo "   ✅ Dependencies installed"

# Check database connection (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
  echo "   ✅ DATABASE_URL is set"
else
  echo "   ⚠️  DATABASE_URL not set - DB operations may fail"
fi

# ═══════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Preflight passed"
echo ""
echo "   State saved to: $RALPH_DIR/.ralph-state"
echo "   Baseline violations: $BASELINE"
echo "═══════════════════════════════════════════════════════════════"

exit 0

