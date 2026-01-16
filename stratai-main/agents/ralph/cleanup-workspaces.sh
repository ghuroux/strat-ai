#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# cleanup-workspaces.sh - Remove old completed workspaces
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: ./cleanup-workspaces.sh [days]
#
# Removes workspaces that were completed more than [days] ago (default: 30)
# Workspaces must have a .completed marker file to be eligible for cleanup
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGE_DAYS=${1:-30}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧹 Workspace Cleanup${NC}"
echo ""
echo "Removing workspaces completed more than $AGE_DAYS days ago..."
echo ""

if [ ! -d "$SCRIPT_DIR/workspaces" ]; then
  echo "No workspaces directory found."
  exit 0
fi

REMOVED_COUNT=0
KEPT_COUNT=0

for workspace in "$SCRIPT_DIR/workspaces"/*/ ; do
  if [ ! -d "$workspace" ]; then
    continue
  fi
  
  name=$(basename "$workspace")
  
  # Check if completed
  if [ ! -f "$workspace/.completed" ]; then
    echo "⏳ Keeping: $name (not completed)"
    KEPT_COUNT=$((KEPT_COUNT + 1))
    continue
  fi
  
  # Check age
  if [ "$(uname)" = "Darwin" ]; then
    # macOS
    age_days=$(( ($(date +%s) - $(stat -f %m "$workspace/.completed")) / 86400 ))
  else
    # Linux
    age_days=$(( ($(date +%s) - $(stat -c %Y "$workspace/.completed")) / 86400 ))
  fi
  
  if [ "$age_days" -gt "$AGE_DAYS" ]; then
    echo -e "${RED}🗑️  Removing: $name (completed $age_days days ago)${NC}"
    rm -rf "$workspace"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
  else
    echo -e "${GREEN}✅ Keeping: $name (completed $age_days days ago)${NC}"
    KEPT_COUNT=$((KEPT_COUNT + 1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}Cleanup complete!${NC}"
echo ""
echo "Removed: $REMOVED_COUNT workspaces"
echo "Kept:    $KEPT_COUNT workspaces"
echo ""
echo "Note: Archives in agents/ralph/archive/ are never deleted automatically."
echo "═══════════════════════════════════════════════════════════════"

