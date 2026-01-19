# Skeleton Loading Components

Visual feedback components to indicate loading states throughout the application.

## Components

### SkeletonCard
Card-style skeleton for loading spaces, areas, documents, and other card-based content.

**Features:**
- Icon placeholder (w-10 h-10)
- Title placeholder
- 2-line description placeholder
- Pulse animation

**Usage:**
```svelte
<script>
  import { SkeletonCard } from '$lib/components/skeletons';
</script>

<SkeletonCard />
```

### SkeletonConversation
Compact skeleton for loading sidebar items, conversation lists, and message previews.

**Features:**
- Message icon placeholder (w-4 h-4)
- Title placeholder
- Preview line placeholder
- Pulse animation

**Usage:**
```svelte
<script>
  import { SkeletonConversation } from '$lib/components/skeletons';
</script>

<SkeletonConversation />
```

### SkeletonList
Wrapper component that renders multiple skeleton items of a specified variant.

**Props:**
- `count?: number` - Number of skeleton items to render (default: 3)
- `variant?: 'card' | 'conversation'` - Type of skeleton to render (default: 'card')
- `gap?: 'sm' | 'md' | 'lg'` - Spacing between items (default: 'md')
  - `sm`: gap-2 (8px)
  - `md`: gap-3 (12px)
  - `lg`: gap-4 (16px)

**Usage:**
```svelte
<script>
  import { SkeletonList } from '$lib/components/skeletons';

  let isLoading = $state(true);
</script>

{#if isLoading}
  <SkeletonList count={5} variant="card" gap="md" />
{:else}
  <!-- Actual content -->
{/if}
```

## Complete Example

```svelte
<script>
  import { SkeletonList } from '$lib/components/skeletons';
  import { spacesStore } from '$lib/stores/spaces.svelte';

  let spaces = $derived(spacesStore.allSpaces);
  let isLoading = $derived(spacesStore.isLoading);
</script>

<div class="spaces-container">
  {#if isLoading}
    <!-- Show skeleton loaders while loading -->
    <SkeletonList count={3} variant="card" gap="lg" />
  {:else if spaces.length === 0}
    <!-- Empty state -->
    <p>No spaces found</p>
  {:else}
    <!-- Actual content -->
    {#each spaces as space}
      <SpaceCard {space} />
    {/each}
  {/if}
</div>
```

## Design System

**Colors:**
- Primary placeholders: `bg-zinc-700/70`
- Secondary placeholders: `bg-zinc-700/50`
- Animation: `animate-pulse` (Tailwind utility)

**Spacing:**
- Card variant: `p-4` with `gap-3` internal spacing
- Conversation variant: `p-2` with `gap-2` internal spacing

These components follow the StratAI design system and match the skeleton loader patterns defined in the DESIGN-SYSTEM.md reference.
