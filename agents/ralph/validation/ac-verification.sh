#!/bin/bash
# Automated AC verification using Haiku LLM
# Cost: ~$0.03-0.05 per story

set -e

STORY_ID=$1
PRD_FILE=$2
PROGRESS_FILE=$3
PROJECT_DIR=$4

# Determine Claude CLI path
CLAUDE_CLI=""
if command -v claude &> /dev/null; then
  CLAUDE_CLI="claude"
elif [ -x "/Users/ghuroux/.npm-global/bin/claude" ]; then
  CLAUDE_CLI="/Users/ghuroux/.npm-global/bin/claude"
fi

if [ -z "$CLAUDE_CLI" ]; then
  echo "❌ Claude CLI not found - cannot verify AC automatically"
  echo ""
  echo "Fallback to manual verification:"
  echo ""

  # Show AC for manual review
  AC_LIST=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .acceptance_criteria[]' "$PRD_FILE")
  echo "$AC_LIST" | while IFS= read -r criterion; do
    echo "  ☐ $criterion"
  done

  echo ""
  echo "Were ALL acceptance criteria met? (y/n)"
  read -r AC_MET

  if [ "$AC_MET" != "y" ]; then
    exit 1
  fi

  exit 0
fi

echo "🤖 Automated AC Verification (using Haiku LLM)"
echo ""

# Extract story details
STORY_TITLE=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .title' "$PRD_FILE")
STORY_DESC=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .description' "$PRD_FILE")
AC_LIST=$(jq -r --arg id "$STORY_ID" '.stories[] | select(.id == $id) | .acceptance_criteria[]' "$PRD_FILE")

# Get recent git changes
cd "$PROJECT_DIR"
RECENT_CHANGES=$(git diff HEAD~1 --stat 2>/dev/null || echo "No recent changes")
CHANGED_FILES=$(git diff HEAD~1 --name-only 2>/dev/null || echo "")

# Extract implementation details from progress.txt
IMPLEMENTATION_LOG=$(grep -A 50 "$STORY_ID" "$PROGRESS_FILE" | head -60 || echo "No progress log found")

# Build verification prompt for Haiku
VERIFICATION_PROMPT="You are verifying that a user story implementation meets ALL acceptance criteria.

**Story ID:** $STORY_ID
**Title:** $STORY_TITLE
**Description:** $STORY_DESC

**Acceptance Criteria (ALL must be met):**
$AC_LIST

**Implementation Log:**
\`\`\`
$IMPLEMENTATION_LOG
\`\`\`

**Files Changed:**
\`\`\`
$CHANGED_FILES
\`\`\`

**Change Summary:**
\`\`\`
$RECENT_CHANGES
\`\`\`

**Your Task:**
1. Review the implementation log and changes
2. Verify each acceptance criterion was met
3. For automated checks (npm run check, npm run lint), assume they passed if mentioned
4. For implementation-specific criteria, verify against the log and changed files
5. Report PASS or FAIL with specific details

**Output Format:**
Return EXACTLY one of:

PASS: All acceptance criteria verified
- AC1: [criterion] ✅ [how verified]
- AC2: [criterion] ✅ [how verified]
...

OR

FAIL: Missing acceptance criteria
- AC1: [criterion] ✅ [verified]
- AC2: [criterion] ❌ [what's missing]
...
Missing criteria: [list unmet criteria]

**Rules:**
- Be strict but fair
- npm run check/lint/test passing = AC met if mentioned in log
- Implementation details should match AC requirements
- If AC is vague, give benefit of doubt if reasonable implementation exists
- Focus on whether work was done, not code quality (other gates check quality)"

# Run Haiku verification
VERIFICATION_OUTPUT=$(mktemp)
$CLAUDE_CLI --model haiku --print "$VERIFICATION_PROMPT" > "$VERIFICATION_OUTPUT" 2>&1

# Parse result
if grep -q "^PASS:" "$VERIFICATION_OUTPUT"; then
  echo "✅ AC Verification PASSED (automated)"
  echo ""
  grep "^-" "$VERIFICATION_OUTPUT" | head -10
  rm "$VERIFICATION_OUTPUT"
  exit 0
elif grep -q "^FAIL:" "$VERIFICATION_OUTPUT"; then
  echo "❌ AC Verification FAILED (automated)"
  echo ""
  cat "$VERIFICATION_OUTPUT"
  echo ""
  rm "$VERIFICATION_OUTPUT"
  exit 1
else
  echo "⚠️  Unexpected verification output:"
  cat "$VERIFICATION_OUTPUT"
  rm "$VERIFICATION_OUTPUT"

  # Fallback to manual
  echo ""
  echo "Manual verification required. Were ALL AC met? (y/n)"
  read -r AC_MET
  if [ "$AC_MET" != "y" ]; then
    exit 1
  fi
  exit 0
fi
