---
name: creating-components
description: |
  Use when creating ANY new Svelte component (.svelte file) in src/lib/components/.
  MANDATORY for: modals, panels, forms, cards, lists, layouts.
  READ THIS SKILL before writing component code.
  Covers: Svelte 5 runes, prop patterns, modal/form templates, Tailwind styling.
globs:
  - "src/lib/components/**/*.svelte"
---

# Creating Svelte Components

## Component Location

All components go in `src/lib/components/`, organized by feature:

```
src/lib/components/
├── arena/        # Model Arena components
├── chat/         # Chat interface components
├── focus-areas/  # Focus area UI
├── layout/       # Header, Sidebar, etc.
├── spaces/       # Space-related components
├── tasks/        # Task management UI
└── (root)        # Shared components (ModelSelector, etc.)
```

## Component Template

```svelte
<script lang="ts">
    import { fade, fly, slide } from 'svelte/transition';

    // 1. Define Props interface
    interface Props {
        // Required props
        itemId: string;
        onClose: () => void;

        // Optional props with defaults
        isOpen?: boolean;
        onSave?: (data: FormData) => Promise<void>;
    }

    // 2. Destructure props with defaults
    let {
        itemId,
        onClose,
        isOpen = true,
        onSave
    }: Props = $props();

    // 3. Local state with $state
    let isLoading = $state(false);
    let formData = $state({
        title: '',
        description: ''
    });

    // 4. Derived values with $derived
    let isValid = $derived(formData.title.length >= 3);
    let submitLabel = $derived(isLoading ? 'Saving...' : 'Save');

    // 5. Event handlers
    async function handleSubmit() {
        if (!onSave || !isValid) return;

        isLoading = true;
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            isLoading = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') onClose();
    }
</script>

<!-- 6. Use svelte:window for global listeners -->
<svelte:window onkeydown={handleKeydown} />

<!-- 7. Template with Tailwind classes -->
{#if isOpen}
    <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="bg-zinc-800 rounded-lg p-6 w-full max-w-md shadow-xl"
            transition:fly={{ y: 20, duration: 200 }}
        >
            <h2 class="text-lg font-semibold text-white mb-4">
                Component Title
            </h2>

            <form onsubmit={handleSubmit}>
                <input
                    type="text"
                    bind:value={formData.title}
                    class="w-full bg-zinc-700 text-white rounded px-3 py-2"
                    placeholder="Enter title"
                />

                <div class="flex justify-end gap-2 mt-4">
                    <button
                        type="button"
                        onclick={onClose}
                        class="px-4 py-2 text-zinc-400 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!isValid || isLoading}
                        class="px-4 py-2 bg-blue-600 text-white rounded
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitLabel}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
```

## Prop Patterns

### Required vs Optional

```typescript
interface Props {
    // Required - no default
    id: string;
    onAction: () => void;

    // Optional - provide default
    variant?: 'primary' | 'secondary';
    isDisabled?: boolean;
}

let {
    id,
    onAction,
    variant = 'primary',
    isDisabled = false
}: Props = $props();
```

### Callback Props

```typescript
interface Props {
    // Simple callback
    onClose: () => void;

    // Async callback
    onSave: (data: FormData) => Promise<void>;

    // Optional callback
    onDelete?: (id: string) => Promise<boolean>;

    // Event callback with data
    onChange: (value: string, isValid: boolean) => void;
}
```

### Bindable Props

```svelte
<script lang="ts">
    interface Props {
        value: string;
        isOpen: boolean;
    }

    let {
        value = $bindable(''),
        isOpen = $bindable(false)
    }: Props = $props();
</script>

<!-- Parent can use bind: -->
<!-- <MyComponent bind:value={searchQuery} bind:isOpen={modalOpen} /> -->
```

## Modal Pattern

```svelte
<script lang="ts">
    interface Props {
        isOpen: boolean;
        onClose: () => void;
        title: string;
    }

    let { isOpen, onClose, title }: Props = $props();

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) onClose();
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') onClose();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onclick={handleBackdropClick}
        transition:fade={{ duration: 150 }}
    >
        <!-- Modal content -->
        <div
            class="bg-zinc-800 rounded-lg shadow-xl max-w-lg w-full mx-4"
            transition:fly={{ y: 20, duration: 200 }}
            onclick={(e) => e.stopPropagation()}
        >
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-zinc-700">
                <h2 class="text-lg font-semibold text-white">{title}</h2>
                <button
                    onclick={onClose}
                    class="text-zinc-400 hover:text-white"
                >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Body -->
            <div class="p-4">
                <slot />
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-2 p-4 border-t border-zinc-700">
                <slot name="footer" />
            </div>
        </div>
    </div>
{/if}
```

## Form Component Pattern

```svelte
<script lang="ts">
    import { taskStore } from '$lib/stores/tasks.svelte';
    import type { CreateTaskInput, TaskPriority } from '$lib/types/tasks';

    interface Props {
        spaceId: string;
        onSuccess: (taskId: string) => void;
        onCancel: () => void;
    }

    let { spaceId, onSuccess, onCancel }: Props = $props();

    // Form state
    let form = $state<CreateTaskInput>({
        title: '',
        spaceId,
        priority: 'normal'
    });

    let isSubmitting = $state(false);
    let error = $state<string | null>(null);

    // Validation
    let isValid = $derived(form.title.trim().length >= 1);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!isValid || isSubmitting) return;

        isSubmitting = true;
        error = null;

        try {
            const task = await taskStore.createTask(form);
            onSuccess(task.id);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to create task';
        } finally {
            isSubmitting = false;
        }
    }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
    {#if error}
        <div class="text-red-400 text-sm">{error}</div>
    {/if}

    <input
        type="text"
        bind:value={form.title}
        placeholder="Task title"
        class="w-full bg-zinc-700 text-white rounded px-3 py-2"
        disabled={isSubmitting}
    />

    <select
        bind:value={form.priority}
        class="w-full bg-zinc-700 text-white rounded px-3 py-2"
        disabled={isSubmitting}
    >
        <option value="normal">Normal Priority</option>
        <option value="high">High Priority</option>
    </select>

    <div class="flex justify-end gap-2">
        <button type="button" onclick={onCancel}>Cancel</button>
        <button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Task'}
        </button>
    </div>
</form>
```

## Tailwind Class Patterns

```svelte
<!-- Consistent button styles -->
<button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded
               disabled:opacity-50 disabled:cursor-not-allowed
               transition-colors">
    Primary Button
</button>

<button class="px-4 py-2 text-zinc-400 hover:text-white transition-colors">
    Secondary Button
</button>

<!-- Input styles -->
<input class="w-full bg-zinc-700 text-white rounded px-3 py-2
              border border-zinc-600 focus:border-blue-500 focus:outline-none
              placeholder:text-zinc-500" />

<!-- Card/panel styles -->
<div class="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
    Content
</div>

<!-- Conditional classes -->
<div class:selected={isSelected} class:disabled={isDisabled}>
```

## Transitions

```svelte
<script>
    import { fade, fly, slide, scale } from 'svelte/transition';
</script>

<!-- Fade in/out -->
<div transition:fade={{ duration: 150 }}>

<!-- Fly in from bottom -->
<div transition:fly={{ y: 20, duration: 200 }}>

<!-- Slide for accordions -->
<div transition:slide={{ duration: 200 }}>

<!-- In-only vs out-only -->
<div in:fly={{ y: 20 }} out:fade>
```

## Icons

**Standard:** Use `lucide-svelte` for all icons in new components.

**Why:** Provides consistency, tree-shaking, maintainability, and typed props.

```svelte
<script lang="ts">
    import { X, Check, AlertCircle, Loader2, Info, Lock, Unlock } from 'lucide-svelte';
</script>

<!-- Basic icon -->
<button onclick={onClose}>
    <X size={20} />
    Close
</button>

<!-- Loading state -->
{#if isLoading}
    <Loader2 class="animate-spin" size={20} />
{/if}

<!-- Conditional icon -->
<button>
    {#if isValid}
        <Check size={16} class="text-green-500" />
    {:else}
        <AlertCircle size={16} class="text-red-500" />
    {/if}
    Submit
</button>

<!-- Icon with custom classes -->
<Info size={18} class="text-blue-400 flex-shrink-0" />

<!-- Dynamic sizing -->
<X size={iconSize} strokeWidth={2} />
```

**Common icons:**
- `X` - Close buttons
- `Check` - Success states
- `AlertCircle` - Errors/warnings
- `Info` - Information messages
- `Loader2` - Loading spinners (with `animate-spin`)
- `Lock`, `Unlock` - Access control
- `ChevronDown`, `ChevronUp` - Dropdowns
- `Plus`, `Minus` - Add/remove actions
- `Trash2` - Delete actions
- `Edit` - Edit actions
- `Search`, `Filter` - Search/filter UI
- `Settings`, `User` - Settings/profile

**Props reference:**
- `size` - Number (default: 24)
- `color` - String (default: 'currentColor')
- `strokeWidth` - Number (default: 2)
- `class` - String for Tailwind classes

### When Inline SVG is Acceptable

**Only use inline SVG for:**
1. Custom brand icons not available in lucide
2. Complex illustrations with unique animations
3. One-off designs that won't be reused

```svelte
<!-- Custom brand logo (not in lucide) -->
<svg viewBox="0 0 100 100" class="w-8 h-8" aria-label="Company logo">
    <path d="M..." fill="currentColor" />
</svg>
```

**Note:** ~124 legacy components use inline SVG. When refactoring existing components, consider migrating to `lucide-svelte` for consistency.

## Data Loading Pattern

Components that load data should handle loading, error, and empty states.

```svelte
<script lang="ts">
    import { onMount } from 'svelte';
    import { Loader2, AlertCircle } from 'lucide-svelte';
    import type { Entity } from '$lib/types/entity';

    interface Props {
        entityId: string;
    }

    let { entityId }: Props = $props();

    let data = $state<Entity | null>(null);
    let isLoading = $state(true);
    let error = $state<string | null>(null);

    onMount(async () => {
        try {
            const response = await fetch(`/api/entities/${entityId}`);
            if (!response.ok) {
                throw new Error('Failed to load entity');
            }
            data = await response.json();
        } catch (e) {
            error = e instanceof Error ? e.message : 'Unknown error';
        } finally {
            isLoading = false;
        }
    });
</script>

<!-- Loading state -->
{#if isLoading}
    <div class="flex items-center justify-center p-8">
        <Loader2 class="animate-spin text-zinc-400" size={24} />
    </div>

<!-- Error state -->
{:else if error}
    <div class="flex items-center gap-2 text-red-400 p-4 bg-red-950/20 rounded">
        <AlertCircle size={20} />
        <span>{error}</span>
    </div>

<!-- Empty state -->
{:else if !data}
    <div class="text-zinc-400 text-center p-8">
        No data available
    </div>

<!-- Data loaded -->
{:else}
    <div class="p-4">
        <h2>{data.title}</h2>
        <p>{data.description}</p>
    </div>
{/if}
```

### Reactive Data Loading

For data that depends on props:

```svelte
<script lang="ts">
    import { onMount } from 'svelte';

    interface Props {
        userId: string;
    }

    let { userId }: Props = $props();

    let data = $state<User | null>(null);
    let isLoading = $state(false);

    // Reactive effect - runs when userId changes
    $effect(() => {
        loadUser(userId);
    });

    async function loadUser(id: string) {
        isLoading = true;
        try {
            const response = await fetch(`/api/users/${id}`);
            data = await response.json();
        } finally {
            isLoading = false;
        }
    }
</script>
```

## Click-Outside Detection

For dropdowns, modals, and context menus that close when clicking outside.

```svelte
<script lang="ts">
    interface Props {
        isOpen: boolean;
        onClose: () => void;
    }

    let { isOpen, onClose }: Props = $props();

    let buttonRef: HTMLButtonElement | undefined = $state();
    let menuRef: HTMLDivElement | undefined = $state();

    function handleClickOutside(e: MouseEvent) {
        if (
            isOpen &&
            buttonRef &&
            menuRef &&
            !buttonRef.contains(e.target as Node) &&
            !menuRef.contains(e.target as Node)
        ) {
            onClose();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isOpen) {
            onClose();
        }
    }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<button bind:this={buttonRef} onclick={() => isOpen = !isOpen}>
    Toggle Menu
</button>

{#if isOpen}
    <div bind:this={menuRef} class="dropdown-menu">
        <!-- Menu content -->
    </div>
{/if}
```

**Key points:**
- Use `bind:this` to get DOM references
- Check if refs exist before using
- Type refs as `HTMLElement | undefined` for safety
- Use `contains()` to check if click is inside

## Context Menu Pattern

For right-click menus (advanced pattern).

```svelte
<script lang="ts">
    import type { Space } from '$lib/types/spaces';

    let showContextMenu = $state(false);
    let contextMenuSpace = $state<Space | null>(null);
    let contextMenuX = $state(0);
    let contextMenuY = $state(0);

    function handleContextMenu(e: MouseEvent, space: Space) {
        e.preventDefault(); // Prevent browser context menu
        contextMenuSpace = space;
        contextMenuX = e.clientX;
        contextMenuY = e.clientY;
        showContextMenu = true;
    }

    function closeContextMenu() {
        showContextMenu = false;
        contextMenuSpace = null;
    }

    function handleClickOutside() {
        if (showContextMenu) {
            closeContextMenu();
        }
    }

    async function handleAction() {
        if (contextMenuSpace) {
            // Perform action with contextMenuSpace
            await doSomething(contextMenuSpace);
        }
        closeContextMenu();
    }
</script>

<svelte:window onclick={handleClickOutside} />

<!-- Item with right-click -->
<div oncontextmenu={(e) => handleContextMenu(e, space)}>
    Space Item
</div>

<!-- Context menu -->
{#if showContextMenu}
    <div
        class="context-menu"
        style="position: fixed; left: {contextMenuX}px; top: {contextMenuY}px;"
    >
        <button onclick={handleAction}>
            Action
        </button>
    </div>
{/if}
```

## Import Organization

Follow this order for clean, consistent imports:

```typescript
// 1. Svelte core
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';

// 2. Transitions and animations
import { fly, fade } from 'svelte/transition';

// 3. Icons
import { X, Check, Loader2 } from 'lucide-svelte';

// 4. Types
import type { Space } from '$lib/types/spaces';
import type { User } from '$lib/types/user';

// 5. Stores
import { spacesStore } from '$lib/stores/spaces.svelte';
import { userStore } from '$lib/stores/user.svelte';

// 6. Utils
import { getDisplayName } from '$lib/utils/display';

// 7. Child components
import ChildModal from './ChildModal.svelte';
import ListItem from './ListItem.svelte';
```

## Advanced Patterns

### Conditional Classes

```svelte
<script lang="ts">
    let isActive = $state(false);
    let isDisabled = $state(false);
    let variant = $state<'primary' | 'secondary'>('primary');
</script>

<!-- Single condition -->
<div class:active={isActive}>

<!-- Multiple conditions -->
<button 
    class:active={isActive}
    class:disabled={isDisabled}
    class:primary={variant === 'primary'}
>

<!-- Derived condition -->
<div class:valid={form.title.length >= 3}>
```

### Slots with Fallbacks

```svelte
<!-- Component definition -->
<div class="card">
    <div class="card-header">
        <slot name="header">
            <!-- Fallback if no header slot provided -->
            <h2>Default Title</h2>
        </slot>
    </div>
    
    <div class="card-body">
        <slot>
            <!-- Default content -->
            <p>No content provided</p>
        </slot>
    </div>
    
    <div class="card-footer">
        <slot name="footer" />
    </div>
</div>

<!-- Usage -->
<Card>
    <svelte:fragment slot="header">
        <h1>Custom Header</h1>
    </svelte:fragment>
    
    <p>Main content</p>
    
    <svelte:fragment slot="footer">
        <button>OK</button>
    </svelte:fragment>
</Card>
```

### Props with Callback Composition

```svelte
<script lang="ts">
    interface Props {
        onSave: (data: FormData) => Promise<void>;
        onError?: (error: Error) => void;
        onSuccess?: () => void;
    }

    let { onSave, onError, onSuccess }: Props = $props();

    async function handleSubmit() {
        try {
            await onSave(formData);
            onSuccess?.(); // Optional callback
        } catch (error) {
            if (onError) {
                onError(error);
            } else {
                // Default error handling
                console.error(error);
            }
        }
    }
</script>
```

## File Reference

- `src/lib/components/tasks/DeleteTaskModal.svelte` - Modal example
- `src/lib/components/tasks/TaskPanel.svelte` - Complex panel
- `src/lib/components/chat/SecondOpinionPanel.svelte` - Side panel
- `src/lib/components/ModelSelector.svelte` - Dropdown component
- `src/lib/components/spaces/AllSpacesDropdown.svelte` - Dropdown with click-outside
- `src/lib/components/spaces/SpaceNavTabs.svelte` - Context menu example
- `src/lib/components/areas/ShareAreaModal.svelte` - Data loading example
