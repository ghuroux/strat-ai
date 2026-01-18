#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# analyze-completed-features.sh - Retrospective analysis of wave predictions
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RALPH_DIR="$(dirname "$SCRIPT_DIR")"

echo "📊 Ralph Loop - Coordinator Analysis Validation"
echo ""
echo "Analyzing completed features for parallelization potential..."
echo ""

TOTAL_FEATURES=0
FEATURES_WITH_ANALYSIS=0
TOTAL_PREDICTED_SAVINGS=0
FEATURES_WITH_SAVINGS=0

# Analyze completed workspaces
for workspace in "$RALPH_DIR"/workspaces/*/; do
  if [ -f "$workspace/.completed" ] && [ -f "$workspace/.wave-analysis.json" ]; then
    TOTAL_FEATURES=$((TOTAL_FEATURES + 1))
    FEATURES_WITH_ANALYSIS=$((FEATURES_WITH_ANALYSIS + 1))

    FEATURE=$(jq -r '.feature // .feature_name' "$workspace/prd.json" 2>/dev/null || echo "unknown")
    SAVINGS=$(jq -r '.time_savings_percent' "$workspace/.wave-analysis.json")
    CONFIDENCE=$(jq -r '.confidence' "$workspace/.wave-analysis.json")

    echo "Feature: $FEATURE"
    echo "  Predicted savings: ${SAVINGS}%"
    echo "  Confidence: $CONFIDENCE"
    echo ""

    TOTAL_PREDICTED_SAVINGS=$((TOTAL_PREDICTED_SAVINGS + SAVINGS))

    if [ "$SAVINGS" -ge 20 ]; then
      FEATURES_WITH_SAVINGS=$((FEATURES_WITH_SAVINGS + 1))
    fi
  elif [ -f "$workspace/.completed" ]; then
    TOTAL_FEATURES=$((TOTAL_FEATURES + 1))
  fi
done

# Also analyze archived features
if [ -d "$RALPH_DIR/archive" ]; then
  for archive_dir in "$RALPH_DIR"/archive/*/; do
    if [ -f "$archive_dir/prd.json" ]; then
      # Run coordinator analysis on archived feature
      TEMP_WORKSPACE=$(mktemp -d)
      cp "$archive_dir/prd.json" "$TEMP_WORKSPACE/"

      if "$RALPH_DIR/lib/coordinator-agent.sh" "$TEMP_WORKSPACE" 2>/dev/null; then
        TOTAL_FEATURES=$((TOTAL_FEATURES + 1))
        FEATURES_WITH_ANALYSIS=$((FEATURES_WITH_ANALYSIS + 1))

        FEATURE=$(jq -r '.feature // .feature_name' "$archive_dir/prd.json" 2>/dev/null || echo "unknown")
        SAVINGS=$(jq -r '.time_savings_percent' "$TEMP_WORKSPACE/.wave-analysis.json")

        echo "Feature (archived): $FEATURE"
        echo "  Predicted savings: ${SAVINGS}%"
        echo ""

        TOTAL_PREDICTED_SAVINGS=$((TOTAL_PREDICTED_SAVINGS + SAVINGS))

        if [ "$SAVINGS" -ge 20 ]; then
          FEATURES_WITH_SAVINGS=$((FEATURES_WITH_SAVINGS + 1))
        fi
      fi

      rm -rf "$TEMP_WORKSPACE"
    fi
  done
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total features analyzed:     $TOTAL_FEATURES"
echo "With wave analysis:          $FEATURES_WITH_ANALYSIS"
echo ""

if [ "$FEATURES_WITH_ANALYSIS" -gt 0 ]; then
  AVG_SAVINGS=$((TOTAL_PREDICTED_SAVINGS / FEATURES_WITH_ANALYSIS))
  PERCENT_WITH_SAVINGS=$((FEATURES_WITH_SAVINGS * 100 / FEATURES_WITH_ANALYSIS))

  echo "Average predicted savings:   ${AVG_SAVINGS}%"
  echo "Features with 20%+ savings:  $FEATURES_WITH_SAVINGS / $FEATURES_WITH_ANALYSIS (${PERCENT_WITH_SAVINGS}%)"
  echo ""

  # Decision guidance
  if [ "$AVG_SAVINGS" -ge 20 ] && [ "$FEATURES_WITH_SAVINGS" -ge 2 ]; then
    echo "✅ RECOMMENDATION: Proceed to Phase 3"
    echo "   Significant parallelization potential detected."
    echo ""
  elif [ "$AVG_SAVINGS" -ge 10 ]; then
    echo "⚠️  RECOMMENDATION: Consider Phase 3 cautiously"
    echo "   Modest parallelization potential. Weigh implementation effort."
    echo ""
  else
    echo "❌ RECOMMENDATION: Skip Phase 3"
    echo "   Insufficient parallelization potential. Focus on other optimizations."
    echo ""
  fi
fi
