#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# smart-model-select.sh - Dynamic model selection based on task complexity
# ═══════════════════════════════════════════════════════════════════════════════
#
# Returns model name for Claude CLI --model flag based on task type.
#
# Usage:
#   MODEL=$(./lib/smart-model-select.sh "implement")
#   $CLAUDE_CLI --model "$MODEL" ...
#
# Task Types:
#   - implement: Story implementation (complex reasoning) → Sonnet
#   - fix: Validation error fixes (complex reasoning) → Sonnet
#   - review: Code review (complex judgment) → Sonnet
#   - update-progress: Structured text generation → Haiku
#   - mark-complete: JSON updates → Haiku
#   - validate-format: Output structure checks → Haiku
#   - ac-verify: Checklist verification → Haiku
#
# Cost Savings:
#   - Haiku: $0.25/1M input, $1.25/1M output (12x cheaper than Sonnet)
#   - Sonnet: $3/1M input, $15/1M output (use for complex tasks only)
#
# ═══════════════════════════════════════════════════════════════════════════════

TASK_TYPE=$1

# Validate input
if [ -z "$TASK_TYPE" ]; then
  echo "❌ Error: No task type provided" >&2
  echo "Usage: $0 <task_type>" >&2
  echo "sonnet"  # Default to sonnet for safety
  exit 1
fi

case $TASK_TYPE in
  "implement")
    # Complex: Story implementation requires reasoning, pattern matching, architecture
    echo "sonnet"
    ;;

  "fix")
    # Complex: Fixing validation errors requires understanding root causes
    echo "sonnet"
    ;;

  "review")
    # Complex: Code review requires judgment and context understanding
    echo "sonnet"
    ;;

  "update-progress")
    # Simple: Structured text generation from template
    echo "haiku"
    ;;

  "mark-complete")
    # Simple: JSON update (status field modification)
    echo "haiku"
    ;;

  "validate-format")
    # Simple: Check output structure against schema
    echo "haiku"
    ;;

  "ac-verify")
    # Simple: Checklist verification against acceptance criteria
    # (Already using Haiku in Phase 1)
    echo "haiku"
    ;;

  *)
    # Unknown task type - default to sonnet for safety
    echo "⚠️  Warning: Unknown task type '$TASK_TYPE' - defaulting to sonnet" >&2
    echo "sonnet"
    ;;
esac
