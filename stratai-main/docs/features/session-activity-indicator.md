# AI Response Progress Indicator

## Overview

Enhance the existing AI status indicators to provide clear visual feedback during long-running AI responses, so users know the system is still working and hasn't crashed.

## Problem Statement

During long AI responses (complex questions, large context), users have no way to know if:
- The system is still actively generating
- How long the generation has been running
- Whether the system has frozen or crashed

This creates anxiety and uncertainty, especially for responses that take 30+ seconds.

## Proposed Solution

Enhance the existing indicator system with:

1. **Generation Activity Store** - Central Svelte 5 store tracking generation state and timing
2. **Elapsed Time Display** - Show "Thinking... (15s)" with live updating time
3. **Heartbeat Animation** - Continuous subtle animation proving the system is responsive
4. **Chat Integration** - Connect the store to the chat streaming flow

## User Stories

### US-001: Create Generation Activity Store

**As a** developer
**I want** a centralized store for tracking AI generation activity
**So that** all indicator components have consistent access to generation state and timing

**Acceptance Criteria:**
- Create `src/lib/stores/generationActivity.svelte.ts` using Svelte 5 runes
- Track state: `isGenerating: boolean`, `startTime: number | null`, `elapsedSeconds: number`
- Expose methods: `startGeneration()`, `stopGeneration()`
- `elapsedSeconds` auto-updates every second while `isGenerating` is true
- Clean up interval on `stopGeneration()` to prevent memory leaks
- Export singleton instance for app-wide use

### US-002: Add Elapsed Time to Thinking Indicator

**As a** user
**I want** to see how long the AI has been generating
**So that** I know the system is still working and can gauge expected wait time

**Acceptance Criteria:**
- Modify existing `src/lib/components/chat/ThinkingIndicator.svelte`
- Display elapsed time next to "Thinking" text: "Thinking... (15s)"
- Time updates every second while generating
- Read state from `generationActivity` store
- Format: show seconds for < 60s, show "1m 15s" for >= 60s
- Smooth transition when time appears/disappears

### US-003: Add Heartbeat Animation During Generation

**As a** user
**I want** continuous visual feedback that the system is responsive
**So that** I can distinguish between "working" and "frozen"

**Acceptance Criteria:**
- Enhance `ThinkingIndicator.svelte` with a heartbeat/pulse animation
- Animation must be continuous and smooth (CSS-based, not JS intervals)
- Subtle but noticeable - users should see movement in peripheral vision
- Animation only runs when `isGenerating` is true (from store)
- Use existing color scheme - don't introduce new colors
- Animation should not be distracting or cause motion sickness (subtle pulse, not aggressive)

### US-004: Integrate Store with Chat Flow

**As a** user
**I want** the progress indicator to automatically activate during AI responses
**So that** I don't need to do anything special to see the feedback

**Acceptance Criteria:**
- Modify `src/lib/stores/chat.svelte.ts` to integrate with generationActivity store
- Call `generationActivityStore.startGeneration()` when `setStreaming(true)` is called
- Call `generationActivityStore.stopGeneration()` when `setStreaming(false)` is called
- Also call `stopGeneration()` in `abortGeneration()` method for cancelled requests
- Import the store at the top of the file
- Ensure elapsed time resets to 0 on each new generation

## Technical Notes

### File Locations
- Store: `src/lib/stores/generationActivity.svelte.ts`
- Component: `src/lib/components/chat/ThinkingIndicator.svelte` (modify existing)
- Integration: `src/lib/stores/chat.svelte.ts` (modify existing)

### Integration Points
- `setStreaming(true)` → `startGeneration()`
- `setStreaming(false)` → `stopGeneration()`
- `abortGeneration()` → `stopGeneration()`

### Existing Components to Review
- `src/lib/components/chat/ThinkingIndicator.svelte` - Current thinking indicator
- `src/lib/components/chat/AIStatusIndicator.svelte` - May also need integration
- `src/lib/stores/toast.svelte.ts` - Reference for Svelte 5 store pattern
- `src/lib/stores/chat.svelte.ts` - Where to add integration (setStreaming method ~line 798)

### Dependencies
- US-001 has no dependencies (creates the foundation)
- US-002 depends on US-001 (needs the store for elapsed time)
- US-003 depends on US-001 (needs the store for isGenerating state)
- US-004 depends on US-001 (needs the store to call methods)
- US-002, US-003, US-004 are independent of each other (can run in parallel)

## Wave Execution Plan

This feature is designed to test Phase 3 parallel wave execution:

- **Wave 1:** US-001 (Sonnet - creates new store with timer logic)
- **Wave 2:** US-002, US-003, US-004 (Haiku - simpler modifications, run in parallel)

Note: Wave 2 has 3 parallel stories, testing maximum parallelization.

## Out of Scope
- Token count or progress percentage (not available from streaming API)
- Cancel/abort generation button (separate feature)
- Multiple concurrent generation tracking (single chat context only)
