#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# coordinator-agent.sh - Wave analysis mode for Ralph loop
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: ./lib/coordinator-agent.sh workspaces/feature-id
#
# Outputs: .wave-analysis.json in workspace directory
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

WORKSPACE_DIR=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validation
if [ -z "$WORKSPACE_DIR" ]; then
  echo "❌ Usage: $0 <workspace-dir>" >&2
  exit 1
fi

if [ ! -d "$WORKSPACE_DIR" ]; then
  echo "❌ Workspace not found: $WORKSPACE_DIR" >&2
  exit 1
fi

PRD_FILE="$WORKSPACE_DIR/prd.json"
if [ ! -f "$PRD_FILE" ]; then
  echo "❌ PRD not found: $PRD_FILE" >&2
  exit 1
fi

ANALYSIS_FILE="$WORKSPACE_DIR/.wave-analysis.json"

# Check for Claude CLI
CLAUDE_CLI=""
if command -v claude &> /dev/null; then
  CLAUDE_CLI="claude"
elif [ -x "/Users/ghuroux/.npm-global/bin/claude" ]; then
  CLAUDE_CLI="/Users/ghuroux/.npm-global/bin/claude"
else
  echo "❌ Claude CLI not found" >&2
  exit 1
fi

# Extract data from PRD
FEATURE_NAME=$(jq -r '.feature // .feature_name // "unknown"' "$PRD_FILE")
STORY_COUNT=$(jq '.stories | length' "$PRD_FILE")

# Build coordinator prompt
COORDINATOR_PROMPT="You are the Ralph Loop Coordinator analyzing parallelization opportunities.

**Feature:** $FEATURE_NAME

**Stories to analyze:**
$(jq -c '.stories[]' "$PRD_FILE")

**Your Task:**

Analyze the PRD and create a wave execution plan. For each story:

1. **Dependencies:** Check the .dependencies field (supports typed dependencies)
2. **File modifications:** Infer from title + description which files will be modified
3. **Parallelization safety:** Determine if it can run in parallel with other stories

**Dependency Types (Key for Parallelization):**

Dependencies can be typed for smarter parallelization:

- **Simple format:** \`\"dependencies\": [\"US-001\"]\` - Treated as integration dependency
- **Typed format:** \`\"dependencies\": [{ \"story\": \"US-001\", \"type\": \"contract\" }]\`

**Dependency Type Meanings:**

| Type | Meaning | Parallelization |
|------|---------|-----------------|
| \`contract\` | Only needs types/interfaces to exist | CAN run in parallel after contract story completes |
| \`integration\` | Needs actual implementation working | MUST wait for full completion |
| (default) | Untyped dependencies | Treat as integration (conservative) |

**Wave Planning Rules:**

1. **Wave 0/1:** Stories with no dependencies OR only contract dependencies on completed stories
2. **Contract dependencies:** If story A has only \`type: contract\` deps on Wave 0, it CAN run in Wave 1 alongside other contract-dependent stories
3. **Integration dependencies:** Story MUST wait until dependency wave completes
4. **NEVER parallelize** stories that touch the same file (file_conflict)
5. **When uncertain** about file overlap, serialize (conservative approach)

**Example - Parallel Frontend/Backend:**
- US-001: Define types (Wave 0)
- US-002: Implement API (contract dep on US-001) → Wave 1
- US-003: Build UI component (contract dep on US-001) → Wave 1 (PARALLEL with US-002!)
- US-004: Integration tests (integration dep on US-002, US-003) → Wave 2

**File Overlap Heuristics:**

- Schema migration stories → likely touch same migration directory
- Stories mentioning same component → likely touch same file
- \"Add X service\" + \"Add X middleware\" → likely different files (auth-service.ts vs auth-middleware.ts)
- \"Update X\" + \"Fix X bug\" → likely same file
- API endpoint + Frontend component (different file trees) → likely safe to parallelize
- When in doubt: serialize

**Output Format (JSON only, no explanation):**

{
  \"total_stories\": $STORY_COUNT,
  \"estimated_sequential_time_min\": <3 * total_stories>,
  \"waves\": [
    {
      \"wave_number\": 1,
      \"stories\": [\"US-001\"],
      \"parallelism\": 1,
      \"rationale\": \"Detailed explanation of why these stories can/cannot be parallelized\",
      \"estimated_time_min\": 3
    }
  ],
  \"estimated_wave_time_min\": <sum of all wave estimated_time_min>,
  \"time_savings_percent\": <round((sequential - wave) / sequential * 100)>,
  \"confidence\": \"low\" | \"medium\" | \"high\",
  \"risks\": [
    \"List specific concerns about file conflicts or other issues\"
  ]
}

**Critical:**
- Be conservative: if unsure whether parallelization is safe, serialize
- parallelism = number of stories in wave (1 = serial, 2+ = parallel)
- estimated_time_min for each wave = 3 min (assuming all parallel stories finish in 3 min)
- Output ONLY valid JSON, no markdown code blocks or extra text"

# Invoke Claude CLI
echo "🔍 Analyzing parallelization opportunities for: $FEATURE_NAME"
echo "   Stories: $STORY_COUNT"
echo ""

$CLAUDE_CLI --model sonnet --print "$COORDINATOR_PROMPT" > "$ANALYSIS_FILE.raw"

# Strip markdown code blocks if present
if grep -q '```json' "$ANALYSIS_FILE.raw"; then
  sed -n '/```json/,/```/p' "$ANALYSIS_FILE.raw" | sed '1d;$d' > "$ANALYSIS_FILE"
  rm "$ANALYSIS_FILE.raw"
else
  mv "$ANALYSIS_FILE.raw" "$ANALYSIS_FILE"
fi

# Validate JSON output
if ! jq empty "$ANALYSIS_FILE" 2>/dev/null; then
  echo "❌ Coordinator output is not valid JSON" >&2
  cat "$ANALYSIS_FILE" >&2
  exit 1
fi

echo "✅ Wave analysis complete: $ANALYSIS_FILE"
exit 0
