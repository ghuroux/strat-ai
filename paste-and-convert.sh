#!/bin/bash

# Helper script to paste markdown content and immediately convert to PDF/DOCX
# Usage: ./paste-and-convert.sh [pdf|docx]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPORTS_DIR="$SCRIPT_DIR/exports"
OUTPUT_FORMAT="${1:-pdf}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}LibreChat Quick Export Helper${NC}"
echo -e "${BLUE}========================================${NC}"
echo
echo -e "${YELLOW}Instructions:${NC}"
echo "1. Export your conversation from LibreChat as Markdown"
echo "2. When it opens in a new window, select all (Cmd+A) and copy (Cmd+C)"
echo "3. Paste the content below and press Ctrl+D when done"
echo
echo -e "${GREEN}Paste your markdown content (Ctrl+D when finished):${NC}"
echo

# Create timestamped filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TEMP_FILE="$EXPORTS_DIR/conversation-$TIMESTAMP.md"

# Read from stdin
cat > "$TEMP_FILE"

echo
echo -e "${GREEN}✓ Content saved!${NC}"
echo -e "${GREEN}File:${NC} $TEMP_FILE"
echo

# Convert using the existing script
"$SCRIPT_DIR/convert-export.sh" "$TEMP_FILE" "$OUTPUT_FORMAT"
