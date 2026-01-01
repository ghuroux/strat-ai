---
name: creating-components
description: Creates Svelte 5 components following StratAI patterns. Use when creating new UI components, modals, panels, or form components.
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

## File Reference

- `src/lib/components/tasks/DeleteTaskModal.svelte` - Modal example
- `src/lib/components/tasks/TaskPanel.svelte` - Complex panel
- `src/lib/components/chat/SecondOpinionPanel.svelte` - Side panel
- `src/lib/components/ModelSelector.svelte` - Dropdown component
