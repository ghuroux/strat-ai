# StratAI UI Cleanup Audit

> **Document Purpose:** Comprehensive audit of UI issues across mobile responsiveness, light mode compatibility, and general cleanup. Use this as the authoritative reference for implementation work.
>
> **Created:** January 2026
> **Status:** Ready for Implementation
> **Scope:** 111 components, 10 routes

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Mobile Responsiveness](#mobile-responsiveness)
3. [Light Mode Compatibility](#light-mode-compatibility)
4. [General UI Cleanup](#general-ui-cleanup)
5. [Implementation Phases](#implementation-phases)
6. [Quick Wins](#quick-wins)
7. [Verification Plan](#verification-plan)

---

## Executive Summary

### Audit Scope
- **Components audited:** 111 Svelte components in `src/lib/components/`
- **Routes audited:** 10 route files in `src/routes/`
- **Focus areas:** Mobile responsiveness, light mode, UI consistency, accessibility

### Findings Overview

| Category | Critical | Major | Minor | Total |
|----------|----------|-------|-------|-------|
| Mobile Responsiveness | 15 | 20+ | 10+ | 45+ |
| Light Mode | 5 infrastructure | 90+ components | - | 95+ |
| UI Consistency | - | 5 categories | 40+ items | 45+ |
| Accessibility | - | 42 suppressions | 30+ aria issues | 72+ |

### Estimated Effort

| Phase | Focus | Duration |
|-------|-------|----------|
| Phase 1 | Critical Mobile Fixes | 1-2 days |
| Phase 2 | Light Mode Infrastructure | 1-2 days |
| Phase 3 | Light Mode Components | 1 week |
| Phase 4 | UI Consistency | 1 week |

---

## Mobile Responsiveness

### Critical Issues

These issues completely break the mobile experience and should be fixed first.

#### 1. Second Opinion Panel - Fixed Viewport Width
**File:** `src/lib/components/chat/SecondOpinionPanel.svelte:61`

**Current:**
```svelte
class="second-opinion-panel w-[40vw] min-w-80 max-w-2xl h-full flex flex-col..."
```

**Problem:** `w-[40vw]` with `min-w-80` (320px) exceeds mobile viewport entirely. On iPhone (390px), panel is 156px + main content 234px = unreadable.

**Fix:**
```svelte
class="second-opinion-panel w-full md:w-[40vw] md:min-w-80 max-w-2xl h-full flex flex-col..."
```

Also update `src/routes/+page.svelte:1166`:
```svelte
<!-- Add responsive margin -->
class:mr-0={isSecondOpinionOpen && screenWidth < 768}
class:mr-[40vw]={isSecondOpinionOpen && screenWidth >= 768}
```

---

#### 2. Sidebar Fixed Width
**File:** `src/lib/components/layout/Sidebar.svelte:192`

**Current:**
```svelte
class="fixed lg:relative z-50 h-full w-[280px]..."
```

**Problem:** Fixed 280px width doesn't adapt on mobile. On 320px phone, sidebar + content = 600px total.

**Fix:**
```svelte
class="fixed lg:relative z-50 h-full w-full md:w-[280px]..."
```

---

#### 3. Message Action Buttons - Hover Only
**File:** `src/lib/components/ChatMessage.svelte:407-409`

**Current:**
```svelte
<div
  class="absolute -bottom-2 {isUser ? '-left-8' : '-right-8'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
>
```

**Problem:** Touch devices don't have hover. Mobile users cannot access Edit, Resend, Regenerate, or Second Opinion buttons.

**Fix:**
```svelte
<div
  class="absolute -bottom-2 {isUser ? '-left-8' : '-right-8'} flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
>
```

Alternative (better UX): Show buttons inline on mobile:
```svelte
{#if $isMobile}
  <div class="flex gap-1 mt-2">
    <!-- action buttons -->
  </div>
{:else}
  <div class="absolute -bottom-2 ... opacity-0 group-hover:opacity-100">
    <!-- action buttons -->
  </div>
{/if}
```

---

#### 4. Chat Input - No Safe Area Padding
**File:** `src/lib/components/ChatInput.svelte:297`

**Current:**
```svelte
class="chat-input-container border-t border-surface-800 p-4 bg-surface-900/80 backdrop-blur-xl relative"
```

**Problem:** No `safe-area-inset-bottom` consideration. Virtual keyboard covers input on iOS.

**Fix:**
```svelte
class="chat-input-container border-t border-surface-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 bg-surface-900/80 backdrop-blur-xl relative"
```

---

#### 5. Code Blocks - No Scroll Indicator
**File:** `src/lib/components/chat/MarkdownRenderer.svelte:336`

**Current:**
```css
.markdown-content :global(.code-block-wrapper pre) {
  overflow-x: auto;
}
```

**Problem:** Hidden scrollbars on mobile. Users don't know code is scrollable.

**Fix:**
```css
.markdown-content :global(.code-block-wrapper pre) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 640px) {
  .markdown-content :global(.code-block-wrapper pre) {
    font-size: 0.75em;
  }

  .markdown-content :global(.code-block-wrapper pre)::-webkit-scrollbar {
    height: 6px;
    display: block;
  }

  .markdown-content :global(.code-block-wrapper pre)::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 3px;
  }
}
```

---

#### 6. Toast - No Safe Area
**File:** `src/lib/components/Toast.svelte:13`

**Current:**
```svelte
<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
```

**Problem:** Overlaps iOS home indicator.

**Fix:**
```svelte
<div
  class="fixed bottom-4 right-4 z-50 flex flex-col gap-3"
  style="padding-bottom: calc(env(safe-area-inset-bottom, 0px)); padding-right: calc(env(safe-area-inset-right, 0px));"
>
```

---

#### 7. ConversationDrawer - Fixed Width
**File:** `src/lib/components/chat/ConversationDrawer.svelte:228`

**Current:**
```svelte
class="fixed top-0 left-0 h-full w-80 bg-surface-900..."
```

**Problem:** 320px drawer on 375px phone takes 85% of screen.

**Fix:**
```svelte
class="fixed top-0 left-0 h-full w-full sm:w-80 bg-surface-900..."
```

---

#### 8. Dropdown Menu Positioning
**File:** `src/lib/components/layout/ConversationItem.svelte:86-94`

**Current:**
```typescript
menuPosition = {
  top: Math.max(8, rect.top - menuHeight + rect.height),
  left: rect.right + 8  // Always right
};
```

**Problem:** Menu goes off-screen on mobile when trigger is near right edge.

**Fix:**
```typescript
const viewport = window.innerWidth;
const shouldPlaceLeft = rect.right + 140 > viewport; // menu is 140px
menuPosition = {
  top: Math.max(8, rect.top - menuHeight + rect.height),
  left: shouldPlaceLeft ? Math.max(8, rect.left - 140) : rect.right + 8
};
```

---

#### 9. Touch Targets Too Small
**Files:** Multiple

**Problem:** Interactive elements below 44x44px minimum.

**Affected:**
- `Header.svelte:110-119` - Hamburger button ~24px
- `Sidebar.svelte:239-251` - Close button ~20px
- `ConversationItem.svelte:224-237` - Menu trigger ~16px
- `MarkdownRenderer.svelte:303` - Copy button ~24x20px

**Fix Pattern:**
```svelte
<!-- Add minimum touch target -->
class="p-3 min-h-12 min-w-12 flex items-center justify-center"
```

---

#### 10. Arena Voting Grid - Dynamic Tailwind Bug
**File:** `src/lib/components/arena/ArenaVotingPrompt.svelte:45`

**Current:**
```svelte
<div class="grid grid-cols-2 md:grid-cols-{models.length} gap-3 mb-4">
```

**Problem:** Dynamic Tailwind classes don't work. `md:grid-cols-{models.length}` is not recognized.

**Fix:**
```svelte
<div
  class="grid gap-3 mb-4"
  class:grid-cols-2={models.length <= 2}
  class:md:grid-cols-3={models.length === 3}
  class:md:grid-cols-4={models.length === 4}
>
```

---

#### 11. Arena Response Card Heights
**File:** `src/lib/components/arena/ArenaResponseCard.svelte:141-146`

**Current:**
```svelte
class="... min-h-[300px] max-h-[600px]..."
```

**Problem:** Fixed heights unreasonable on mobile (667-812px viewport).

**Fix:**
```svelte
class="... min-h-0 sm:min-h-[300px] max-h-none sm:max-h-[600px]..."
```

---

#### 12. Prose Content Overflow
**File:** `src/lib/components/arena/ArenaResponseCard.svelte:271`

**Problem:** Code blocks and tables overflow on mobile.

**Fix:**
```svelte
class="prose prose-invert max-w-none prose-pre:overflow-x-auto prose-pre:max-w-[calc(100vw-2rem)] prose-table:overflow-x-auto"
```

---

#### 13. AddContextModal Width
**File:** `src/lib/components/tasks/AddContextModal.svelte:517`

**Current:**
```css
.modal {
  max-width: 520px;
}
```

**Problem:** 520px exceeds mobile viewport.

**Fix:**
```css
.modal {
  width: 100%;
  max-width: min(90vw, 520px);
}
```

---

#### 14. MoveChatModal - No Scroll
**File:** `src/lib/components/chat/MoveChatModal.svelte:338`

**Current:**
```css
.space-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
```

**Problem:** Many spaces = list exceeds viewport, buttons unreachable.

**Fix:**
```css
.space-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}
```

---

#### 15. TaskContextPanel Fixed Width
**File:** `src/lib/components/tasks/TaskContextPanel.svelte:500`

**Current:**
```css
.context-panel {
  width: 280px;
  min-width: 280px;
}
```

**Problem:** 280px panel pushes chat off-screen on mobile.

**Fix:**
```css
.context-panel {
  width: 280px;
  min-width: 280px;
}

@media (max-width: 640px) {
  .context-panel {
    width: 100%;
    min-width: 100%;
    position: fixed;
    inset: 0;
    z-index: 40;
  }
}
```

---

### Major Issues

#### Arena Grid Breakpoints
**File:** `src/lib/components/arena/ArenaGrid.svelte:17-66`

Uses hardcoded `768px` and `1024px` instead of Tailwind standards. Gap not responsive.

#### Space Dashboard Layout
**File:** `src/lib/components/spaces/SpaceDashboard.svelte:304-400`

Two-column layout persists 768-1024px (too cramped). Should switch at 768px.

#### Modal Backdrop Padding
**Pattern in:** AreaModal, SpaceModal, TaskModal, etc.

All use `p-4` padding on backdrop. Should be `p-2 sm:p-4` for mobile.

#### Welcome Screen Grid
**File:** `src/lib/components/chat/WelcomeScreen.svelte:237`

```svelte
<!-- Current -->
<div class="mt-8 grid grid-cols-2 gap-4 text-left">

<!-- Fix -->
<div class="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
```

---

### Mobile Testing Checklist

**Devices:**
- iPhone 12/13/14 (390px)
- iPhone 14 Pro Max (430px)
- iPhone SE (375px)
- iPad Mini (768px)
- Galaxy S22 (360px)

**Critical Flows:**
- [ ] Send message on mobile
- [ ] Access message action buttons (edit, regenerate)
- [ ] Open Second Opinion panel
- [ ] Navigate conversations in drawer
- [ ] Complete Arena battle
- [ ] Create/edit task in modal
- [ ] Use dropdown menus near screen edge

---

## Light Mode Compatibility

### Infrastructure Fixes (DO FIRST)

These must be completed before component updates will work.

#### 1. Root Layout Background
**File:** `src/routes/+layout.svelte:11`

**Current:**
```svelte
<div class="min-h-screen" style="background: #0f0f11;">
```

**Problem:** Hardcoded dark background bypasses theming.

**Fix:**
```svelte
<div class="min-h-screen bg-white dark:bg-surface-950">
```

Or use CSS variable:
```svelte
<div class="min-h-screen" style="background: var(--bg-body-gradient);">
```

---

#### 2. Theme Hydration Script
**File:** `src/app.html`

**Problem:** Theme flashes dark before JavaScript loads.

**Add to `<head>`:**
```html
<script>
  const settings = localStorage.getItem('strathost-settings');
  const theme = settings ? JSON.parse(settings).theme || 'dark' : 'dark';
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('light', !prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
</script>
```

---

#### 3. Tailwind Dark Mode Config
**File:** `tailwind.config.js`

**Add:**
```javascript
module.exports = {
  darkMode: 'class',  // Enable class-based dark mode
  // ... rest of config
}
```

---

#### 4. Focus Ring Offset
**File:** `src/app.css:893`

**Current:**
```css
.focus-ring {
  @apply focus:ring-offset-surface-900;
}
```

**Add after:**
```css
html.light .focus-ring {
  @apply focus:ring-offset-surface-50;
}
```

---

#### 5. Light Mode CSS Variables
**File:** `src/app.css` (in `html.light` section)

**Add:**
```css
html.light {
  --bg-body: #ffffff;
  --bg-body-gradient: linear-gradient(180deg, #ffffff 0%, #f4f4f5 100%);
  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-muted: #71717a;
  --gradient-surface: linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%);
  color-scheme: light;
}
```

---

### Component Transformation Patterns

#### Pattern 1: Background Colors
```svelte
<!-- Before -->
class="bg-surface-800"

<!-- After -->
class="bg-white dark:bg-surface-800"
```

#### Pattern 2: Text Colors
```svelte
<!-- Before -->
class="text-white"

<!-- After -->
class="text-gray-900 dark:text-white"
```

#### Pattern 3: Border Colors
```svelte
<!-- Before -->
class="border-surface-700"

<!-- After -->
class="border-gray-300 dark:border-surface-700"
```

#### Pattern 4: Prose Styling
```svelte
<!-- Before -->
class="prose prose-invert"

<!-- After -->
class="prose dark:prose-invert"
```

#### Pattern 5: Inline Dark Styles
```css
/* Before */
background: #1a1a1a;

/* After - Option A: CSS function */
background: light-dark(#ffffff, #1a1a1a);

/* After - Option B: CSS variable */
background: var(--bg-surface);
```

---

### Components by Priority

#### Tier 1 - Critical (Breaks Light Mode)

| Component | Dark Color Instances | Priority |
|-----------|---------------------|----------|
| `assists/WorkingPanel.svelte` | 17+ | Critical |
| `tasks/TaskPanel.svelte` | 15+ | Critical |
| `chat/ConversationDrawer.svelte` | 18+ | Critical |
| `layout/Sidebar.svelte` | 3+ | Critical |
| `arena/ArenaContinueModal.svelte` | inline #1a1a1a | Critical |
| `tasks/TaskDashboard.svelte` | inline #1a1a1a | Critical |

#### Tier 2 - High Impact

| Component | Issue | Instances |
|-----------|-------|-----------|
| `arena/ArenaResponseCard.svelte` | prose-invert + dark | 10+ |
| `chat/GreetingMessage.svelte` | prose-invert | 3+ |
| `chat/SecondOpinionPanel.svelte` | prose-invert | - |
| `chat/MarkdownRenderer.svelte` | prose-invert | - |
| `ModelSelector.svelte` | bg-surface-* | 8+ |

#### Tier 3 - Standard Refactor (35+ components)

<details>
<summary>Full Component List</summary>

**Chat Components:**
- `ChatMessage.svelte` - 9 instances
- `FilePreview.svelte` - 4 instances
- `WelcomeScreen.svelte` - dark colors
- `AreaWelcomeScreen.svelte` - dark colors
- `BringToContextModal.svelte` - dark colors

**Layout Components:**
- `Header.svelte` - 4 instances
- `ConversationItem.svelte` - dark colors
- `ClearConversationsModal.svelte` - dark colors

**Settings Components:**
- `LLMSettings.svelte` - 11 instances
- `DisplaySettings.svelte` - dark colors
- `SettingsPanel.svelte` - dark colors

**Spaces Components:**
- `SpaceSettingsPanel.svelte` - 3 instances
- `SpaceDashboard.svelte` - dark colors
- `SpaceModal.svelte` - dark colors
- `TaskModal.svelte` - dark colors
- `AreaCard.svelte` - dark colors

**Tasks Components:**
- `FocusedTaskWelcome.svelte` - 6 instances
- `SubtaskWelcome.svelte` - text-white
- `TaskCard.svelte` - dark colors
- `DeleteTaskModal.svelte` - text-white, zinc colors
- `CompleteTaskModal.svelte` - text-white, zinc colors

**Arena Components:**
- `ArenaModelSelection.svelte` - 6 instances
- `ArenaQuickStart.svelte` - 5 instances
- `ArenaModelSelector.svelte` - 8+ instances
- `ArenaInput.svelte` - dark colors
- `ArenaWelcome.svelte` - text-white

**Area Components:**
- `AreaModal.svelte` - dark colors
- `DeleteAreaModal.svelte` - dark colors
- `panels/PanelBase.svelte` - 3 instances

</details>

---

### Routes Requiring Updates

| Route | Issue | Priority |
|-------|-------|----------|
| `+layout.svelte:11` | inline #0f0f11 | Critical |
| `+page.svelte:1165,1176` | bg-surface-950, bg-surface-800/90 | High |
| `arena/+page.svelte` | Multiple surface colors | High |
| `spaces/+page.svelte:141,173,228` | surface-900, surface-950 | Medium |
| `spaces/[space]/[area]/+page.svelte:1440,1625` | CSS vars with dark fallbacks | Medium |
| `spaces/[space]/task/[taskId]/+page.svelte:1786` | background: #0f0f0f | Medium |
| `login/+page.svelte:17-38` | bg-gray-800, text-gray-300/400 | Medium |

---

## General UI Cleanup

### Consistency Issues

#### Button Styles (13 variants found)

**Current patterns:**
- `.btn-ghost` with various paddings
- `.btn-icon` with inconsistent sizes
- `.btn-secondary` variations
- Inline `px-4 py-2` patterns
- Mixed rounded corners

**Standard to adopt (define in `app.css`):**
```css
.btn-primary { @apply px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700; }
.btn-secondary { @apply px-4 py-2 rounded-lg bg-surface-700 text-surface-100 hover:bg-surface-600; }
.btn-ghost { @apply px-3 py-1.5 rounded-lg text-surface-300 hover:bg-surface-800; }
.btn-icon { @apply p-2 rounded-lg text-surface-400 hover:bg-surface-800 min-w-10 min-h-10; }
```

---

#### Padding Scale (602+ variations)

**Standard to adopt:**
- `p-2` (8px) - Tight spacing
- `p-3` (12px) - Default
- `p-4` (16px) - Comfortable
- `p-6` (24px) - Generous (modals, cards)

**Avoid:** `p-2.5`, `p-3.5`, arbitrary values

---

#### Border Radius (5+ patterns)

**Standard to adopt:**
- `rounded-lg` - Default (buttons, inputs)
- `rounded-xl` - Cards, modals
- `rounded-2xl` - Large containers
- `rounded-full` - Avatars, pills

**Avoid:** `rounded`, `rounded-md`, inline values

---

#### Transitions (261 variations)

**Standard to adopt:**
```css
--transition-fast: 150ms;
--transition-normal: 300ms;
--transition-slow: 500ms;
```

Use consistently:
- Hover effects: `duration-150`
- Panel slides: `duration-300`
- Page transitions: `duration-500`

---

#### Icon Sizes (6 variations)

**Standard to adopt:**
- `w-3.5 h-3.5` (14px) - Small inline
- `w-4 h-4` (16px) - Default
- `w-5 h-5` (20px) - Prominent
- `w-6 h-6` (24px) - Large

---

### Accessibility Fixes

#### Suppressed Warnings (42 instances)

Files with `<!-- svelte-ignore a11y -->`:
- `ChatInput.svelte` - drag-drop div
- `Sidebar.svelte` - navigation interactions
- `MarkdownRenderer.svelte` - interactive content
- `BringToContextModal.svelte` - modal interactions
- 25+ other components

**Action:** Address underlying issues with proper ARIA, roles, keyboard handlers.

---

#### Missing aria-labels (30+ buttons)

Pattern to apply:
```svelte
<!-- Before -->
<button class="btn-icon" title="Close">
  <X class="w-4 h-4" />
</button>

<!-- After -->
<button class="btn-icon" title="Close" aria-label="Close">
  <X class="w-4 h-4" />
</button>
```

---

#### Missing Focus Indicators (80+ components)

Add global focus styles in `app.css`:
```css
.btn-icon:focus-visible,
.btn-ghost:focus-visible,
.btn-primary:focus-visible,
.btn-secondary:focus-visible {
  @apply outline-none ring-2 ring-primary-500/50 ring-offset-2 ring-offset-surface-900;
}

html.light .btn-icon:focus-visible,
html.light .btn-ghost:focus-visible {
  @apply ring-offset-white;
}
```

---

#### Color Contrast Issues

**Problematic colors:**
- `text-surface-500` on dark backgrounds - May fail WCAG AA
- `rgba(255, 255, 255, 0.3)` - Too faint
- `surface-400` timestamps - Borderline contrast

**Action:** Audit with contrast checker, bump to `surface-300` minimum.

---

### Code Duplication

| Function | Duplicate Locations | Extract To |
|----------|---------------------|------------|
| `getProviderColor()` | `ModelSelector.svelte`, `ArenaResponseCard.svelte` | `$lib/utils/model-display.ts` |
| `formatDueDate()` | `TaskCard.svelte`, `GreetingMessage.svelte` | `$lib/utils/date-formatting.ts` |
| `getDueDateClass()` | `TaskCard.svelte`, `GreetingMessage.svelte` | `$lib/utils/date-formatting.ts` |

---

### Large Components to Split

| Component | Lines | Suggested Split |
|-----------|-------|-----------------|
| `ChatInput.svelte` | 634 | Extract FileUpload logic |
| `ModelSelector.svelte` | 436 | Extract dropdown rendering |
| `TaskPanel.svelte` | Large | Split sections into sub-components |
| `arena/+page.svelte` | Large | Extract setup/battle/results phases |

---

## Implementation Phases

### Phase 1: Critical Mobile (Day 1-2)

1. **SecondOpinionPanel** - Responsive width
2. **ChatMessage** - Touch-accessible action buttons
3. **ChatInput** - Safe-area padding
4. **Toast** - Safe-area padding
5. **ConversationDrawer** - Responsive width
6. **ConversationItem** - Dropdown positioning

### Phase 2: Light Mode Infrastructure (Day 3-4)

1. **+layout.svelte** - Remove hardcoded background
2. **app.html** - Add theme hydration script
3. **tailwind.config.js** - Add `darkMode: 'class'`
4. **app.css** - Add light mode CSS variables
5. **app.css** - Fix focus ring offsets

### Phase 3: Light Mode Components (Week 2)

Systematic updates by tier:
1. Tier 1 Critical components (6 files)
2. Tier 2 High-impact components (5 files)
3. Tier 3 Standard components (35+ files)
4. Route files (7 files)

### Phase 4: UI Consistency (Week 3)

1. **Button standardization** - Define 4 variants in `app.css`
2. **Spacing audit** - Enforce p-2/p-3/p-4 scale
3. **Border radius** - Standardize to 4 values
4. **Accessibility** - Address suppressed warnings
5. **Focus indicators** - Add global styles

---

## Quick Wins

These can be fixed in minutes with high impact:

- [ ] **Toast safe area** - Add `env(safe-area-inset-bottom)` (1 line)
- [ ] **Welcome grid** - Change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`
- [ ] **Prose overflow** - Add `prose-pre:overflow-x-auto`
- [ ] **Tailwind config** - Add `darkMode: 'class'`
- [ ] **30 aria-labels** - Add to icon-only buttons

---

## Verification Plan

### Device Testing

| Device | Width | Test Focus |
|--------|-------|------------|
| iPhone SE | 375px | Minimum viable |
| iPhone 12/13/14 | 390px | Common size |
| iPhone 14 Pro Max | 430px | Large phone |
| iPad Mini | 768px | Tablet breakpoint |
| iPad Pro | 1024px | Large tablet |

### Theme Testing

1. Set theme to Light in settings
2. Verify no dark flash on page reload
3. Check all focus rings have proper offsets
4. Test chat message styling (user/assistant)
5. Verify sidebar and header styling
6. Test modals and overlays
7. Check Arena cards and responses
8. Verify markdown code blocks

### Accessibility Testing

1. Run Lighthouse accessibility audit
2. Test keyboard navigation through app
3. Verify all buttons have labels
4. Check color contrast ratios
5. Test with screen reader

---

## Related Documents

- `CONTEXT_STRATEGY.md` - Context/memory architecture
- `context-loading-architecture.md` - Just-in-time context loading
- `BACKLOG.md` - Feature backlog and priorities
