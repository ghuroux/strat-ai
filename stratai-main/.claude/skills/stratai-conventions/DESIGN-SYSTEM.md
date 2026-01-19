# StratAI Design System

## Overview

StratAI follows a **premium, clean aesthetic** with consistent patterns across all components. This document is the authoritative reference for UI/UX implementation.

**Design Principles:**
- **Dark-first**: Dark theme default (zinc-950 background)
- **Subtle depth**: Semi-transparent backgrounds with blur effects
- **Consistent spacing**: 4px base unit (Tailwind's spacing scale)
- **Clear hierarchy**: Typography and color signal importance
- **Smooth interactions**: Fast transitions (150ms), subtle animations

---

## Color Tokens

### Surface Colors (Dark Mode)

| Token | Value | Usage |
|-------|-------|-------|
| `bg-zinc-950` | `#0f0f11` | App background |
| `bg-zinc-900` | `#18181b` | Cards, modals, sidebar |
| `bg-zinc-800` | `#27272a` | Input backgrounds, elevated surfaces |
| `bg-zinc-700` | `#3f3f46` | Borders, dividers, skeleton loaders |

### Text Colors

| Token | Usage |
|-------|-------|
| `text-zinc-100` | Headings, primary text |
| `text-zinc-200` | Body text, button labels |
| `text-zinc-400` | Secondary text, descriptions |
| `text-zinc-500` | Tertiary text, hints, timestamps |

### Primary Brand

```css
--color-primary-400: #4691ff;  /* Hover states, links */
--color-primary-500: #1a6dff;  /* Primary buttons, accents */
--color-primary-600: #0052e0;  /* Active states */
```

| Class | Usage |
|-------|-------|
| `bg-primary-500` | Primary buttons |
| `hover:bg-primary-600` | Primary button hover |
| `text-primary-400` | Links, accents, interactive text |
| `bg-primary-500/15` | Tinted icon containers |

### Semantic Colors

| State | Background | Border | Text |
|-------|------------|--------|------|
| **Success** | `bg-green-500/15` | `border-green-500/30` | `text-green-400` |
| **Error** | `bg-red-500/15` | `border-red-500/30` | `text-red-400` |
| **Warning** | `bg-amber-500/15` | `border-amber-500/30` | `text-amber-400` |
| **Info** | `bg-primary-500/15` | `border-primary-500/30` | `text-primary-400` |

### Role Colors (Memberships)

| Role | Color | Background |
|------|-------|------------|
| Owner | `#9333ea` (purple) | `rgba(147, 51, 234, 0.15)` |
| Admin | `#3b82f6` (blue) | `rgba(59, 130, 246, 0.15)` |
| Member | `#10b981` (green) | `rgba(16, 185, 129, 0.15)` |
| Guest | `#6b7280` (gray) | `rgba(107, 114, 128, 0.15)` |

---

## Typography

### Scale

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem | Badges, fine print, timestamps |
| `text-sm` | 0.875rem | Body text, labels, buttons |
| `text-base` | 1rem | Standard body (rare) |
| `text-lg` | 1.125rem | Section headings |
| `text-xl` | 1.25rem | Page headings |
| `text-2xl` | 1.5rem | Welcome screens, hero text |

### Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Buttons, labels |
| `font-semibold` | 600 | Subheadings |
| `font-bold` | 700 | Headings |

### Common Combinations

```html
<!-- Page heading -->
<h1 class="text-2xl font-bold text-zinc-100">Welcome</h1>

<!-- Section heading -->
<h2 class="text-lg font-semibold text-zinc-100">Settings</h2>

<!-- Body text -->
<p class="text-sm text-zinc-400">Description here...</p>

<!-- Label -->
<label class="text-sm font-medium text-zinc-200">Name</label>
```

---

## Spacing

Based on Tailwind's 4px unit. Common patterns:

| Pattern | Classes | Usage |
|---------|---------|-------|
| Tight | `gap-1`, `p-1` | Inline elements |
| Compact | `gap-2`, `p-2` | Dense UI (sidebar items) |
| Standard | `gap-3`, `p-3` | Cards, list items |
| Comfortable | `gap-4`, `p-4` | Modals, panels |
| Spacious | `gap-6`, `p-6` | Page sections |

---

## Border Radius

| Class | Size | Usage |
|-------|------|-------|
| `rounded` | 0.25rem | Small badges |
| `rounded-md` | 0.375rem | Buttons, inputs |
| `rounded-lg` | 0.5rem | Cards, containers |
| `rounded-xl` | 0.75rem | Modals, large cards |
| `rounded-2xl` | 1rem | Welcome screens, hero sections |
| `rounded-full` | 9999px | Avatars, pills |

---

## Components

### Buttons

**Primary Button:**
```svelte
<button class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
               bg-primary-500 hover:bg-primary-600
               text-sm font-medium text-white
               transition-all duration-150
               disabled:opacity-50 disabled:cursor-not-allowed">
  <Plus class="w-4 h-4" />
  Create
</button>
```

**Secondary Button:**
```svelte
<button class="px-4 py-2 rounded-lg
               bg-zinc-800 hover:bg-zinc-700
               border border-zinc-600
               text-sm font-medium text-zinc-200
               transition-all duration-150">
  Cancel
</button>
```

**Destructive Button:**
```svelte
<button class="inline-flex items-center gap-2 px-4 py-2 rounded-lg
               bg-red-600 hover:bg-red-700
               text-sm font-medium text-white
               transition-all duration-150">
  <Trash2 class="w-4 h-4" />
  Delete
</button>
```

**Ghost/Text Button:**
```svelte
<button class="px-3 py-1.5 rounded-md
               text-sm font-medium text-zinc-400
               hover:text-zinc-200 hover:bg-zinc-800
               transition-colors">
  View More
</button>
```

**Icon-Only Button:**
```svelte
<button class="w-10 h-10 rounded-lg
               flex items-center justify-center
               text-zinc-400 hover:text-zinc-200
               hover:bg-zinc-800
               transition-colors">
  <X class="w-5 h-5" />
</button>
```

### Loading Button Pattern

```svelte
<button disabled={isLoading} class="...">
  {#if isLoading}
    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    Creating...
  {:else}
    <Plus class="w-4 h-4" />
    Create
  {/if}
</button>
```

### Inputs

**Text Input:**
```svelte
<input
  type="text"
  class="w-full px-3 py-2 rounded-lg
         bg-zinc-800 border border-zinc-700
         text-sm text-zinc-100
         placeholder:text-zinc-500
         focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50
         disabled:opacity-50 disabled:cursor-not-allowed"
  placeholder="Enter text..."
/>
```

**Textarea:**
```svelte
<textarea
  class="w-full px-3 py-2 rounded-lg resize-none
         bg-zinc-800 border border-zinc-700
         text-sm text-zinc-100
         placeholder:text-zinc-500
         focus:border-primary-500 focus:outline-none"
  rows="4"
  placeholder="Enter description..."
/>
```

### Cards

**Standard Card:**
```svelte
<div class="p-4 rounded-xl
            bg-zinc-800/50 border border-zinc-700/50
            hover:bg-zinc-800/70
            transition-colors">
  <!-- content -->
</div>
```

**Interactive Card:**
```svelte
<button class="w-full p-4 rounded-xl text-left
               bg-zinc-800/50 border border-zinc-700/50
               hover:bg-zinc-800/70 hover:border-zinc-600
               transition-all duration-150">
  <!-- content -->
</button>
```

### Icon Containers

Used for feature icons, status indicators, etc.

```svelte
<!-- Standard icon container -->
<div class="w-10 h-10 rounded-lg
            bg-zinc-800/50 border border-zinc-700/50
            flex items-center justify-center">
  <Icon class="w-5 h-5 text-zinc-400" />
</div>

<!-- Colored icon container -->
<div class="w-10 h-10 rounded-lg
            bg-primary-500/15 border border-primary-500/30
            flex items-center justify-center">
  <Sparkles class="w-5 h-5 text-primary-400" />
</div>

<!-- Error icon container -->
<div class="w-10 h-10 rounded-lg
            bg-red-500/15 border border-red-500/30
            flex items-center justify-center">
  <AlertTriangle class="w-5 h-5 text-red-400" />
</div>
```

### Alert/Message Boxes

**Info Box:**
```svelte
<div class="p-4 rounded-lg bg-primary-500/10 border border-primary-500/20">
  <div class="flex items-start gap-3">
    <Info class="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
    <p class="text-sm text-zinc-300">Information message here.</p>
  </div>
</div>
```

**Warning Box:**
```svelte
<div class="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
  <div class="flex items-start gap-3">
    <AlertTriangle class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
    <p class="text-sm text-zinc-300">Warning message here.</p>
  </div>
</div>
```

**Error Box:**
```svelte
<div class="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
  <div class="flex items-start gap-3">
    <AlertCircle class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
    <p class="text-sm text-zinc-300">Error message here.</p>
  </div>
</div>
```

---

## Modals

### Standard Modal Structure

```svelte
<!-- Backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4
         bg-black/60 backdrop-blur-sm"
  transition:fade={{ duration: 150 }}
  onclick={onClose}
>
  <!-- Modal -->
  <div
    class="w-full max-w-md
           bg-zinc-900 border border-zinc-700/50 rounded-xl
           shadow-2xl"
    transition:fly={{ y: 20, duration: 200 }}
    onclick|stopPropagation
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-5 border-b border-zinc-700/50">
      <h3 class="text-lg font-semibold text-zinc-100">Modal Title</h3>
      <button onclick={onClose} class="text-zinc-400 hover:text-zinc-200">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="p-5">
      <!-- Modal content -->
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-3 p-4
                border-t border-zinc-700/30 bg-zinc-900/50">
      <button class="px-4 py-2 rounded-lg bg-zinc-800 ...">Cancel</button>
      <button class="px-4 py-2.5 rounded-lg bg-primary-500 ...">Confirm</button>
    </div>
  </div>
</div>
```

### Responsive Modal (Mobile)

```svelte
<!-- Desktop: centered, Mobile: bottom sheet -->
<div class="fixed inset-0 z-50
            flex items-end md:items-center justify-center
            p-0 md:p-4 bg-black/60 backdrop-blur-sm">
  <div class="w-full md:max-w-lg
              max-h-[90vh] md:max-h-[85vh]
              bg-zinc-900 border-t md:border border-zinc-700/50
              rounded-t-2xl md:rounded-xl
              overflow-hidden flex flex-col">
    <!-- Content with safe area -->
    <div class="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
      <!-- ... -->
    </div>
  </div>
</div>
```

---

## Empty States

```svelte
<div class="flex flex-col items-center justify-center text-center py-16 px-8">
  <!-- Icon container -->
  <div class="w-16 h-16 rounded-2xl mb-4
              bg-zinc-800/50 border border-zinc-700/50
              flex items-center justify-center">
    <Layers class="w-8 h-8 text-zinc-400" />
  </div>

  <!-- Heading -->
  <h3 class="text-lg font-semibold text-zinc-200 mb-2">
    No items yet
  </h3>

  <!-- Description -->
  <p class="text-sm text-zinc-400 max-w-xs mb-5">
    Get started by creating your first item.
  </p>

  <!-- CTA -->
  <button class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                 bg-primary-500 hover:bg-primary-600 text-sm font-medium text-white">
    <Plus class="w-4 h-4" />
    Create Item
  </button>
</div>
```

---

## Loading States

### Skeleton Loader

```svelte
<div class="animate-pulse">
  <!-- Card skeleton -->
  <div class="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
    <div class="flex items-start gap-3">
      <!-- Icon placeholder -->
      <div class="w-10 h-10 rounded-lg bg-zinc-700/70"></div>

      <div class="flex-1 space-y-2">
        <!-- Title -->
        <div class="h-4 bg-zinc-700/70 rounded-md w-3/4"></div>
        <!-- Description -->
        <div class="h-3 bg-zinc-700/50 rounded w-full"></div>
        <div class="h-3 bg-zinc-700/50 rounded w-2/3"></div>
      </div>
    </div>
  </div>
</div>
```

### Loading Spinner (Inline SVG)

```svelte
<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
  <circle class="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" stroke-width="4" />
  <path class="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
</svg>
```

### Loading Dots

```svelte
<div class="flex items-center gap-1">
  <div class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
       style="animation-delay: 0ms"></div>
  <div class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
       style="animation-delay: 150ms"></div>
  <div class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
       style="animation-delay: 300ms"></div>
</div>
```

---

## Transitions

### Standard Durations

| Duration | Usage |
|----------|-------|
| 150ms | Button hovers, quick interactions |
| 200ms | Modals, dropdowns |
| 300ms | Page transitions, larger animations |

### Common Patterns

```svelte
import { fade, fly, slide } from 'svelte/transition';

<!-- Backdrop fade -->
<div transition:fade={{ duration: 150 }}>

<!-- Modal fly in -->
<div transition:fly={{ y: 20, duration: 200 }}>

<!-- Accordion slide -->
<div transition:slide={{ duration: 200 }}>

<!-- Standard hover transition -->
class="transition-all duration-150"
class="transition-colors duration-150"
```

---

## Icons

**Standard:** Use `lucide-svelte` for all icons.

### Common Icons

| Icon | Import | Usage |
|------|--------|-------|
| `X` | Close buttons, clear, cancel |
| `Plus` | Create, add actions |
| `Trash2` | Delete actions |
| `Edit`, `Pencil` | Edit actions |
| `Check` | Success, confirm |
| `AlertCircle` | Error states |
| `AlertTriangle` | Warning states |
| `Info` | Information |
| `Loader2` | Loading (with `animate-spin`) |
| `ChevronDown`, `ChevronRight` | Expandable items |
| `Menu` | Hamburger menu |
| `Search` | Search inputs |
| `Settings` | Settings/preferences |

### Icon Sizes

| Size | Class | Usage |
|------|-------|-------|
| 14px | `w-3.5 h-3.5` | Inline with text-xs |
| 16px | `w-4 h-4` | Buttons, small UI |
| 20px | `w-5 h-5` | Standard icons |
| 24px | `w-6 h-6` | Headers, larger UI |

---

## Responsive Patterns

### Breakpoints

| Prefix | Min Width | Usage |
|--------|-----------|-------|
| (none) | 0px | Mobile-first default |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets, desktop |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Large desktop |

### Common Responsive Patterns

```svelte
<!-- Hide on mobile, show on desktop -->
<div class="hidden md:block">Desktop only</div>

<!-- Show on mobile, hide on desktop -->
<div class="md:hidden">Mobile only</div>

<!-- Responsive padding -->
<div class="px-3 md:px-4 lg:px-6">

<!-- Responsive text size -->
<h1 class="text-xl md:text-2xl">

<!-- Responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Touch Targets

Minimum touch target: **36px** (`w-9 h-9`)
Preferred touch target: **40px** (`w-10 h-10`)

```svelte
<!-- Mobile-friendly button -->
<button class="w-10 h-10 flex items-center justify-center rounded-lg ...">
```

### iOS Safe Areas

```svelte
<!-- Bottom padding for iOS home indicator -->
<div class="pb-[env(safe-area-inset-bottom)]">

<!-- Combined with minimum padding -->
<div class="pb-[max(1rem,env(safe-area-inset-bottom))]">
```

---

## Reference Components

| Component | Path | Patterns |
|-----------|------|----------|
| DeleteConfirmModal | `spaces/DeleteConfirmModal.svelte` | Modal, destructive action |
| DeleteTaskModal | `tasks/DeleteTaskModal.svelte` | Modal with options |
| Toast | `Toast.svelte` | Toast notifications |
| TaskCard | `tasks/TaskCard.svelte` | Cards, hover actions |
| AreaWelcomeScreen | `chat/AreaWelcomeScreen.svelte` | Empty states |
| LoadingDots | `LoadingDots.svelte` | Loading animation |

---

## Quick Reference

### Button Variants

| Variant | Background | Hover | Text |
|---------|------------|-------|------|
| Primary | `bg-primary-500` | `hover:bg-primary-600` | `text-white` |
| Secondary | `bg-zinc-800 border-zinc-600` | `hover:bg-zinc-700` | `text-zinc-200` |
| Destructive | `bg-red-600` | `hover:bg-red-700` | `text-white` |
| Ghost | transparent | `hover:bg-zinc-800` | `text-zinc-400` |

### Semantic Backgrounds

| State | Background | Border |
|-------|------------|--------|
| Info | `bg-primary-500/10` | `border-primary-500/20` |
| Success | `bg-green-500/10` | `border-green-500/20` |
| Warning | `bg-amber-500/10` | `border-amber-500/20` |
| Error | `bg-red-500/10` | `border-red-500/20` |
