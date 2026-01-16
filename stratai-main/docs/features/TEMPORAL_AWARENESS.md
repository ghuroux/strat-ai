# Temporal Awareness

> Giving the AI accurate date/time context to prevent outdated responses.

## Problem Statement

LLMs have training data cutoffs (~6-12 months old). Without explicit temporal context:
1. Models confidently give outdated information
2. Date-relative queries fail ("next week", "this quarter", "recent")
3. Web searches target wrong years
4. "Latest" and "current" are meaningless

**Example:** User asks "What's the latest news on X?" but the AI thinks it's 2025 (it's actually January 2026).

## Solution

Inject temporal context into every conversation via system prompt:

```
Current date: Thursday, January 16, 2026
Timezone: Africa/Johannesburg (SAST, UTC+2)
```

This is **Layer 0** in our prompt architecture - universal context that applies before any space/area/task context.

## Implementation

### Phase 1: Temporal Context Injection (Simple)

Add temporal context to system prompts.

**File:** `src/lib/config/system-prompts.ts`

```typescript
/**
 * Generate temporal context for system prompts
 * Provides the AI with accurate date/time awareness
 */
export function getTemporalContext(timezone?: string): string {
    const now = new Date();
    const tz = timezone || 'Africa/Johannesburg'; // Default to SAST

    // Format date with day of week for relative queries
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: tz
    });

    // Get timezone display name
    const tzName = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'long'
    }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || tz;

    return `<temporal_context>
Current date: ${dateStr}
Timezone: ${tzName}
</temporal_context>`;
}
```

**Integration in `getSystemPromptLayers()`:**

```typescript
export function getSystemPromptLayers(
    model: string,
    options: {
        space?: SpaceType | null;
        spaceInfo?: SpaceInfo | null;
        focusArea?: FocusAreaInfo | null;
        focusedTask?: FocusedTaskInfo | null;
        timezone?: string; // NEW: User's timezone
    }
): PromptLayer[] {
    const layers: PromptLayer[] = [];

    // Layer 0: Temporal context (most universal)
    const temporalContext = getTemporalContext(options.timezone);
    layers.push({
        name: 'temporal',
        content: temporalContext,
        shouldCache: false // Changes daily, don't cache
    });

    // Layer 1: Platform prompt (cached globally per model)
    const platformPrompt = getPlatformPrompt(model);
    layers.push({
        name: 'platform',
        content: platformPrompt,
        shouldCache: true
    });

    // ... rest of layers
}
```

### Phase 2: User Timezone Detection & Storage

Detect timezone from browser on login, store in user preferences.

#### 2.1 Update UserPreferences Type

**File:** `src/lib/types/user.ts`

```typescript
export interface UserPreferences {
    homePage?: HomePagePreference;
    theme?: ThemePreference;
    defaultModel?: string | null;
    timezone?: string;  // NEW: IANA timezone (e.g., "Africa/Johannesburg")
}
```

#### 2.2 Detect Timezone on Login

**File:** `src/routes/login/+page.svelte` (add after successful login)

```typescript
// Detect and store timezone on successful login
async function updateTimezoneIfNeeded() {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Only update if different from stored value
    if (userStore.preferences.timezone !== detectedTimezone) {
        await fetch('/api/user/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timezone: detectedTimezone })
        });
        userStore.setPreferences({
            ...userStore.preferences,
            timezone: detectedTimezone
        });
    }
}
```

**Alternative:** Detect in `+layout.svelte` on first load (catches existing sessions).

#### 2.3 Pass Timezone to Chat API

**File:** `src/routes/api/chat/+server.ts`

The chat endpoint already has access to `locals.session`. Add timezone to session data or fetch from user preferences.

```typescript
// In POST handler
const timezone = locals.session?.preferences?.timezone || 'Africa/Johannesburg';

// Pass to prompt builder
const layers = getSystemPromptLayers(model, {
    space,
    focusArea,
    focusedTask,
    timezone  // NEW
});
```

### Phase 3: Settings UI (Optional)

Allow users to manually override detected timezone.

**Location:** Settings > General (alongside theme preference)

```svelte
<div class="form-group">
    <label>Timezone</label>
    <select bind:value={timezone}>
        <!-- Common timezones -->
        <option value="Africa/Johannesburg">South Africa (SAST)</option>
        <option value="Europe/London">London (GMT/BST)</option>
        <option value="America/New_York">New York (EST/EDT)</option>
        <!-- ... more options -->
    </select>
    <p class="help-text">Auto-detected: {detectedTimezone}</p>
</div>
```

## Files Changed

| Phase | File | Change |
|-------|------|--------|
| 1 | `src/lib/config/system-prompts.ts` | Add `getTemporalContext()`, update `getSystemPromptLayers()` |
| 1 | `src/routes/api/chat/+server.ts` | Pass timezone to prompt builder |
| 2 | `src/lib/types/user.ts` | Add `timezone` to `UserPreferences` |
| 2 | `src/routes/login/+page.svelte` | Detect & store timezone on login |
| 2 | `src/routes/+layout.svelte` | Fallback timezone detection |
| 2 | `src/routes/api/user/preferences/+server.ts` | Handle timezone in PATCH |
| 3 | `src/lib/components/settings/SettingsGeneral.svelte` | Timezone selector (optional) |

## Prompt Layer Architecture (Updated)

```
┌─────────────────────────────────────────┐
│ Layer 0: Temporal Context (date/tz)     │ ← NEW
├─────────────────────────────────────────┤
│ Layer 1: Platform Prompt (model-specific)│
├─────────────────────────────────────────┤
│ Layer 2: Space Prompt (org/personal)    │
├─────────────────────────────────────────┤
│ Layer 3: Focus Area Prompt (context)    │
├─────────────────────────────────────────┤
│ Layer 4: Task Prompt (current work)     │
├─────────────────────────────────────────┤
│ Layer 5: Task Context (linked docs)     │
└─────────────────────────────────────────┘
```

## Caching Considerations

- **Layer 0 (Temporal):** `shouldCache: false` - Changes daily
- **Layer 1 (Platform):** `shouldCache: true` - Stable across all users

The temporal context is small (~50 tokens) so the cache miss cost is negligible.

## Testing

1. **Verify date in responses:**
   - Ask: "What's today's date?"
   - Ask: "What day of the week is it?"
   - Expect correct answer

2. **Verify relative dates:**
   - Ask: "What's the date next Monday?"
   - Ask: "When is Q1 2026?"
   - Expect correct calculations

3. **Verify web search context:**
   - Ask: "What are the latest developments in [topic]?"
   - Expect 2026 results, not 2025

4. **Verify timezone:**
   - Ask: "What time is it?"
   - Should acknowledge timezone (even if can't give exact time)

## Future Enhancements

- **Time of day:** Include current time for "good morning/evening" awareness
- **Business context:** Add "Week 3 of Q1 2026" for enterprise users
- **Holiday awareness:** Note public holidays for scheduling context
- **Per-conversation timezone:** Allow override for discussing other timezones

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Browser detection | Automatic, no user action required |
| Store in preferences | Persists across sessions, allows manual override |
| IANA timezone format | Standard, works with `Intl` API, unambiguous |
| Default to SAST | Current user base is South Africa |
| Don't cache Layer 0 | Changes daily, small enough to not matter |
| Layer 0 position | Universal context should come first |
