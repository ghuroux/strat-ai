#!/bin/bash
#
# Ralph Loop Smoke Test Runner
#
# Runs Playwright smoke tests as part of Ralph validation.
# Uses tiered approach:
#   - Tier 1 (Critical): Must pass or abort
#   - Tier 2 (Core): Must pass for completion
#   - Tier 3 (UX): Warn if fail, don't block
#
# Usage: ./smoke-test.sh [--tier1-only] [--skip-tier3]
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Parse arguments
TIER1_ONLY=false
SKIP_TIER3=false

for arg in "$@"; do
  case $arg in
    --tier1-only)
      TIER1_ONLY=true
      shift
      ;;
    --skip-tier3)
      SKIP_TIER3=true
      shift
      ;;
  esac
done

echo "========================================"
echo "      Ralph Loop Smoke Tests"
echo "========================================"
echo ""

cd "$PROJECT_DIR"

# Check if dev server is running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "${YELLOW}Starting dev server...${NC}"
  npm run dev &
  DEV_PID=$!

  # Wait for server to be ready
  echo "Waiting for server to start..."
  for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
      echo -e "${GREEN}Server is ready${NC}"
      break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
      echo -e "${RED}Server failed to start within 30 seconds${NC}"
      exit 1
    fi
  done
else
  echo -e "${GREEN}Dev server already running${NC}"
  DEV_PID=""
fi

echo ""

# Tier 1: Critical Path Tests (MUST PASS)
echo -e "${YELLOW}[TIER 1] Running Critical Path Tests...${NC}"
if npx playwright test tier1-critical --reporter=list; then
  echo -e "${GREEN}[TIER 1] PASSED${NC}"
else
  echo -e "${RED}[TIER 1] FAILED - ABORTING${NC}"
  echo ""
  echo "Critical tests failed. Fix these before continuing."

  # Cleanup
  if [ -n "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null || true
  fi

  exit 1
fi

if [ "$TIER1_ONLY" = true ]; then
  echo ""
  echo -e "${GREEN}Tier 1 only mode - skipping remaining tiers${NC}"

  # Cleanup
  if [ -n "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null || true
  fi

  exit 0
fi

echo ""

# Tier 2: Core Functionality Tests (MUST PASS)
echo -e "${YELLOW}[TIER 2] Running Core Functionality Tests...${NC}"
if npx playwright test tier2-core --reporter=list; then
  echo -e "${GREEN}[TIER 2] PASSED${NC}"
else
  echo -e "${RED}[TIER 2] FAILED - BLOCKING COMPLETION${NC}"
  echo ""
  echo "Core functionality tests failed. Feature cannot be marked complete."

  # Cleanup
  if [ -n "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null || true
  fi

  exit 1
fi

echo ""

# Tier 3: UX Tests (WARN ONLY)
if [ "$SKIP_TIER3" = true ]; then
  echo -e "${YELLOW}[TIER 3] Skipped (--skip-tier3 flag)${NC}"
else
  echo -e "${YELLOW}[TIER 3] Running UX Tests...${NC}"
  if npx playwright test tier3-ux --reporter=list; then
    echo -e "${GREEN}[TIER 3] PASSED${NC}"
  else
    echo -e "${YELLOW}[TIER 3] FAILED - Review Recommended${NC}"
    echo ""
    echo "UX tests failed. Not blocking, but review is recommended."
    # Don't exit with error for Tier 3
  fi
fi

echo ""

# Cleanup
if [ -n "$DEV_PID" ]; then
  echo "Stopping dev server..."
  kill $DEV_PID 2>/dev/null || true
fi

echo "========================================"
echo -e "${GREEN}      All Smoke Tests PASSED${NC}"
echo "========================================"
