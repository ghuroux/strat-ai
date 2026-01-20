# Auto-Generate Unique Area Colors

## Overview

When users create a new area within a space, automatically assign a visually distinct color that doesn't clash with existing areas. This reduces cognitive load (users don't have to pick colors) and ensures visual distinction between areas.

## Problem Statement

Currently, when creating an area:
1. Users must manually select a color from presets
2. No validation that the color is distinct from other areas
3. Users often pick similar colors, making areas hard to distinguish
4. The color selection step adds friction to area creation

## Solution

Auto-generate a color for new areas that is maximally distinct from existing area colors in the same space. Users can still override if they want a specific color.

## User Stories

### US-001: Color Generation Utility

**As a** developer
**I need** a color generation utility
**So that** I can generate visually distinct colors programmatically

**Acceptance Criteria:**
- Create `src/lib/utils/colorGeneration.ts` utility
- Function `generateDistinctColor(existingColors: string[]): string`
- Uses HSL color space for perceptually uniform distribution
- Returns hex color string (e.g., `#3b82f6`)
- When no existing colors, returns a pleasant default from a curated palette
- When existing colors present, picks hue maximally distant from all existing hues
- Maintains saturation 60-80% and lightness 45-65% for vibrant but readable colors
- Includes unit tests for edge cases (0, 1, many existing colors)

**Technical Notes:**
- HSL hue is 0-360 degrees, find largest gap and pick midpoint
- Consider color-blind friendly palette as fallback
- Export type `ColorGenerationOptions` for future extensibility

### US-002: Integrate with Area Creation API

**As a** user
**I need** areas to get auto-assigned colors
**So that** I don't have to manually pick colors every time

**Acceptance Criteria:**
- Modify `POST /api/spaces/[spaceId]/areas` endpoint
- If `color` not provided in request body, auto-generate one
- Fetch existing area colors for the space before generating
- Generated color is saved to database
- Response includes the generated color
- Existing behavior preserved when color IS provided (user override)

**Technical Notes:**
- Location: `src/routes/api/spaces/[spaceId]/areas/+server.ts`
- Use `postgresAreaRepository` to fetch existing areas
- Call `generateDistinctColor()` with existing colors array

### US-003: Update Area Creation UI

**As a** user
**I need** to see the auto-generated color and optionally change it
**So that** I have control while benefiting from smart defaults

**Acceptance Criteria:**
- Area creation modal shows color preview (small colored circle/badge)
- Color is pre-filled with "Auto" or shows the generated color
- User can click to expand color picker and override
- If user doesn't interact with color, the auto-generated one is used
- Color picker shows existing area colors as "already used" (grayed or marked)
- Smooth UX - color selection is optional, not a required step

**Technical Notes:**
- Location: `src/lib/components/areas/CreateAreaModal.svelte` (or similar)
- May need to call API to get preview color, or generate client-side
- Consider generating client-side to avoid extra API call

## Technical Architecture

### Color Generation Algorithm

```typescript
// src/lib/utils/colorGeneration.ts

interface ColorGenerationOptions {
  saturation?: { min: number; max: number };  // Default 60-80
  lightness?: { min: number; max: number };   // Default 45-65
  avoidHues?: number[];                        // Hues to avoid (0-360)
}

export function generateDistinctColor(
  existingColors: string[],
  options?: ColorGenerationOptions
): string {
  // 1. Convert existing colors to HSL
  // 2. Extract hues (0-360)
  // 3. Find largest gap in hue circle
  // 4. Pick midpoint of largest gap
  // 5. Apply saturation/lightness within range
  // 6. Convert back to hex
}

// Helper functions
export function hexToHsl(hex: string): { h: number; s: number; l: number };
export function hslToHex(h: number, s: number, l: number): string;
```

### Curated Fallback Palette

When generating the first color (no existing colors), use a curated palette:

```typescript
const STARTER_PALETTE = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#eab308', // Yellow
  '#ef4444', // Red
];
```

### API Changes

```typescript
// POST /api/spaces/[spaceId]/areas
// Request body (color now optional)
{
  name: string;
  description?: string;
  color?: string;  // Optional - auto-generated if not provided
  icon?: string;
}

// Response includes generated color
{
  id: string;
  name: string;
  color: string;  // Always present (provided or generated)
  // ...
}
```

## Out of Scope

- Color themes/palettes per space
- User color preferences
- Accessibility contrast checking (future enhancement)
- Color suggestions based on area name/content

## Success Metrics

- Reduced time to create areas (no color decision required)
- Visual distinction between areas in same space
- User satisfaction with auto-generated colors

## Files to Modify

**New Files:**
- `src/lib/utils/colorGeneration.ts` - Color generation utility
- `src/lib/utils/colorGeneration.test.ts` - Unit tests

**Modified Files:**
- `src/routes/api/spaces/[spaceId]/areas/+server.ts` - Auto-generate on creation
- `src/lib/components/areas/CreateAreaModal.svelte` - Show preview, optional override

## Dependencies

- None (self-contained feature)

## Testing Plan

1. **Unit tests** for color generation utility
   - Empty array returns starter palette color
   - Single color returns opposite hue
   - Multiple colors finds largest gap
   - Edge cases (all similar hues, full spectrum)

2. **Integration tests** for API
   - Create area without color - gets auto-generated
   - Create area with color - uses provided color
   - Generated colors are distinct from existing

3. **Manual testing**
   - Create 5+ areas rapidly - colors should all be visually distinct
   - Override auto-generated color - works correctly
   - Colors look good in both light and dark mode
