#!/bin/bash
# agents/ralph/validation/postflight.sh
# Post-iteration validation for the compound engineering loop
#
# Purpose: Ensure quality gates pass after work is done
# Run: After each iteration, before commit
# Exit: 0 if all checks pass, 1 if any fail

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RALPH_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$(dirname "$RALPH_DIR")")"

echo "🔍 Postflight checks..."
echo "   Project: $PROJECT_DIR"

cd "$PROJECT_DIR"

# Load baseline from preflight
if [ -f "$RALPH_DIR/.ralph-state" ]; then
  source "$RALPH_DIR/.ralph-state"
else
  BASELINE_VIOLATIONS=0
fi

FAILED=0

# ═══════════════════════════════════════════════════════════════════
# 1. TypeScript Compilation
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "📝 Checking TypeScript..."

if ! npm run check --silent 2>/dev/null; then
  echo "❌ TypeScript errors introduced"
  echo ""
  echo "   Fix: Run 'npm run check' and fix all errors"
  FAILED=1
else
  echo "   ✅ TypeScript compiles (0 errors)"
fi

# ═══════════════════════════════════════════════════════════════════
# 2. Lint Check
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "🔎 Checking lint..."

if ! npm run lint --silent 2>/dev/null; then
  echo "❌ Lint errors introduced"
  echo ""
  echo "   Fix: Run 'npm run lint' and fix all errors"
  FAILED=1
else
  echo "   ✅ Lint passes"
fi

# ═══════════════════════════════════════════════════════════════════
# 3. Database Access Audit
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "🗄️  Checking DB access patterns..."

# Check if audit script exists
if [ -f "$PROJECT_DIR/scripts/audit-db-access.ts" ]; then
  CURRENT=$(npm run audit-db-access --silent 2>&1 | grep -oE '[0-9]+' | tail -1 || echo "0")
  
  if [ "$CURRENT" -gt "$BASELINE_VIOLATIONS" ]; then
    echo "❌ New DB access violations introduced"
    echo "   Baseline: $BASELINE_VIOLATIONS"
    echo "   Current:  $CURRENT"
    echo "   New violations: $((CURRENT - BASELINE_VIOLATIONS))"
    echo ""
    echo "   Run 'npm run audit-db-access' to see details"
    echo "   Fix: Use camelCase for all row property access"
    FAILED=1
  else
    echo "   ✅ No new DB access violations"
    echo "      Baseline: $BASELINE_VIOLATIONS, Current: $CURRENT"
  fi
else
  echo "   ⚠️  Audit script not found (skipping)"
fi

# ═══════════════════════════════════════════════════════════════════
# 4. Tests
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "🧪 Running tests..."

# Check if tests exist and run them
if npm run test --silent 2>/dev/null; then
  echo "   ✅ Tests pass"
else
  # Check if it failed because no tests or actual test failure
  TEST_OUTPUT=$(npm run test 2>&1) || true
  if echo "$TEST_OUTPUT" | grep -q "No test files found"; then
    echo "   ⚠️  No tests found (skipping)"
  else
    echo "❌ Tests failed"
    echo ""
    echo "   Fix: Run 'npm run test' and fix failing tests"
    FAILED=1
  fi
fi

# ═══════════════════════════════════════════════════════════════════
# 5. Check for Debug Code
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "🔍 Checking for debug code..."

# Look for console.log in staged files (excluding test files)
DEBUG_CODE=$(git diff --cached --name-only | xargs grep -l "console.log" 2>/dev/null | grep -v ".test." | grep -v ".spec." || true)

if [ -n "$DEBUG_CODE" ]; then
  echo "   ⚠️  console.log found in:"
  echo "$DEBUG_CODE" | sed 's/^/      /'
  echo "   Consider removing debug statements"
else
  echo "   ✅ No debug code detected"
fi

# ═══════════════════════════════════════════════════════════════════
# 6. Self-Review Reminder
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "📋 Self-review checklist:"
echo "   □ Code follows existing patterns"
echo "   □ All property access uses camelCase"
echo "   □ Nullable columns handled with ??"
echo "   □ No unnecessary complexity"
echo "   □ Would a new developer understand this?"

# ═══════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"

if [ "$FAILED" -eq 1 ]; then
  echo "❌ Postflight FAILED"
  echo ""
  echo "   Fix the issues above before committing."
  echo "   Do not proceed until all gates pass."
  echo "═══════════════════════════════════════════════════════════════"
  exit 1
else
  echo "✅ Postflight passed"
  echo ""
  echo "   All quality gates passed."
  echo "   Ready to commit and continue."
  echo "═══════════════════════════════════════════════════════════════"
  exit 0
fi

