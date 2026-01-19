#!/bin/bash
#
# Branch Health Check for Ralph Loop
#
# Usage: ./branch-check.sh [workspace_dir]
#
# Verifies:
# 1. Correct branch (matches prd.json if recorded)
# 2. Branch is up to date with main
# 3. No uncommitted changes blocking work
#

set -e

WORKSPACE_DIR=${1:-"agents/ralph"}
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              RALPH BRANCH HEALTH CHECK                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Check we have a prd.json
PRD_FILE="$WORKSPACE_DIR/prd.json"
if [ ! -f "$PRD_FILE" ]; then
    echo -e "${RED}❌ No prd.json found in $WORKSPACE_DIR${NC}"
    echo "   Are you in the correct directory?"
    exit 1
fi

echo "📁 Workspace: $WORKSPACE_DIR"

# 2. Get expected branch from prd.json (if recorded)
EXPECTED_BRANCH=$(grep -o '"branch"[[:space:]]*:[[:space:]]*"[^"]*"' "$PRD_FILE" 2>/dev/null | cut -d'"' -f4 || echo "")

# 3. Get current branch
CURRENT_BRANCH=$(git branch --show-current)

echo "🌿 Current branch: $CURRENT_BRANCH"

# 4. Verify branch matches expected (if recorded)
if [ -n "$EXPECTED_BRANCH" ]; then
    if [ "$EXPECTED_BRANCH" != "$CURRENT_BRANCH" ]; then
        echo ""
        echo -e "${RED}⚠️  WRONG BRANCH${NC}"
        echo "   Expected: $EXPECTED_BRANCH"
        echo "   Current:  $CURRENT_BRANCH"
        echo ""
        echo "   Switch with: git checkout $EXPECTED_BRANCH"
        exit 1
    fi
    echo -e "${GREEN}✅ Branch matches prd.json${NC}"
else
    echo -e "${YELLOW}⚠️  No branch recorded in prd.json (consider adding)${NC}"
fi

# 5. Check if behind main
echo ""
echo "Checking sync with main..."
git fetch origin main 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not fetch origin/main (offline?)${NC}"
}

BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")

if [ "$BEHIND" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Branch is $BEHIND commits BEHIND main${NC}"
    echo ""
    echo "   To sync: git merge origin/main"
    echo ""

    # Only prompt if interactive terminal
    if [ -t 0 ]; then
        read -p "   Merge main now? (y/n): " REPLY
        if [ "$REPLY" = "y" ]; then
            echo "   Merging..."
            if git merge origin/main; then
                echo -e "${GREEN}✅ Merged main successfully${NC}"
            else
                echo -e "${RED}❌ Merge conflicts! Resolve before continuing.${NC}"
                exit 1
            fi
        fi
    fi
else
    echo -e "${GREEN}✅ Up to date with main${NC}"
fi

if [ "$AHEAD" -gt 0 ]; then
    echo "ℹ️  Branch is $AHEAD commits ahead of main"
fi

# 6. Check for uncommitted changes
echo ""
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected:${NC}"
    git status --short
    echo ""
    echo "   Consider committing or stashing before starting work"
else
    echo -e "${GREEN}✅ Working tree clean${NC}"
fi

# 7. Summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}Pre-flight complete ✅${NC}"
echo ""
echo "Ready to run Ralph loop:"
echo "   ./ralph.sh $WORKSPACE_DIR"
echo ""
