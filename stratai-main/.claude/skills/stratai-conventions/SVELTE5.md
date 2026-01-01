# Svelte 5 Runes Patterns

This project uses **Svelte 5** with runes. Do NOT use Svelte 4 patterns.

## Runes Quick Reference

| Rune | Purpose | Example |
|------|---------|---------|
| `$state` | Reactive state | `count = $state(0)` |
| `$derived` | Computed values | `double = $derived(count * 2)` |
| `$derived.by` | Complex derived | `$derived.by(() => items.filter(...))` |
| `$effect` | Side effects | `$effect(() => console.log(count))` |
| `$props` | Component props | `let { name } = $props()` |
| `$bindable` | Two-way binding | `let { value = $bindable() } = $props()` |

## Store Pattern (Class-Based)

```typescript
// src/lib/stores/example.svelte.ts
import { SvelteMap } from 'svelte/reactivity';
import type { Item } from '$lib/types/items';

class ItemStore {
    // Use SvelteMap for reactive Map operations
    items = $state<SvelteMap<string, Item>>(new SvelteMap());
    isLoading = $state(false);
    error = $state<string | null>(null);

    // Version counter - increment when mutating collections
    // This forces $derived.by to recalculate
    _version = $state(0);

    // Derived values
    itemList = $derived.by(() => {
        const _ = this._version; // Depend on version
        return Array.from(this.items.values());
    });

    itemCount = $derived(this.items.size);

    // Methods
    async loadItems(): Promise<void> {
        this.isLoading = true;
        this.error = null;
        try {
            const response = await fetch('/api/items');
            const data = await response.json();
            for (const item of data.items) {
                this.items.set(item.id, item);
            }
            this._version++; // Trigger derived recalculation
        } catch (e) {
            this.error = e instanceof Error ? e.message : 'Failed to load';
        } finally {
            this.isLoading = false;
        }
    }

    addItem(item: Item): void {
        this.items.set(item.id, item);
        this._version++;
    }

    deleteItem(id: string): void {
        this.items.delete(id);
        this._version++;
    }
}

export const itemStore = new ItemStore();
```

## Component Pattern

```svelte
<!-- src/lib/components/ItemCard.svelte -->
<script lang="ts">
    import type { Item } from '$lib/types/items';

    interface Props {
        item: Item;
        onEdit: (id: string) => void;
        onDelete?: (id: string) => Promise<void>;
        isSelected?: boolean;
    }

    let { item, onEdit, onDelete, isSelected = false }: Props = $props();

    // Local state
    let isDeleting = $state(false);

    // Derived from props
    let displayTitle = $derived(item.title || 'Untitled');

    // Event handlers
    async function handleDelete() {
        if (!onDelete) return;
        isDeleting = true;
        await onDelete(item.id);
        isDeleting = false;
    }
</script>

<div class="card" class:selected={isSelected}>
    <h3>{displayTitle}</h3>
    <button onclick={() => onEdit(item.id)}>Edit</button>
    {#if onDelete}
        <button onclick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
    {/if}
</div>
```

## SvelteMap vs Regular Map

**CRITICAL**: Regular `Map` does not trigger reactivity. Use `SvelteMap`.

```typescript
import { SvelteMap } from 'svelte/reactivity';

// CORRECT - triggers reactivity
items = $state<SvelteMap<string, Item>>(new SvelteMap());
items.set('123', newItem); // UI updates

// WRONG - does NOT trigger reactivity
items = $state<Map<string, Item>>(new Map());
items.set('123', newItem); // UI does NOT update
```

## Version Counter Pattern

When mutating collections (Map, Set, Array), Svelte may not detect changes. Use a version counter:

```typescript
class Store {
    items = $state<SvelteMap<string, Item>>(new SvelteMap());
    _version = $state(0);

    // Derived depends on version
    sortedItems = $derived.by(() => {
        const _ = this._version; // Force dependency
        return Array.from(this.items.values())
            .sort((a, b) => a.name.localeCompare(b.name));
    });

    updateItem(id: string, updates: Partial<Item>): void {
        const item = this.items.get(id);
        if (item) {
            this.items.set(id, { ...item, ...updates });
            this._version++; // Trigger recalculation
        }
    }
}
```

## Bindable Props (Two-Way Binding)

```svelte
<!-- Parent -->
<SearchInput bind:query={searchQuery} />

<!-- Child (SearchInput.svelte) -->
<script lang="ts">
    interface Props {
        query: string;
    }

    let { query = $bindable('') }: Props = $props();
</script>

<input bind:value={query} placeholder="Search..." />
```

## Effects for Side Effects

```typescript
class Store {
    activeId = $state<string | null>(null);

    constructor() {
        // Run effect when activeId changes
        $effect(() => {
            if (this.activeId) {
                console.log('Active item changed:', this.activeId);
                // Fetch additional data, update URL, etc.
            }
        });
    }
}
```

## Common Mistakes

### 1. Using Svelte 4 stores

```typescript
// WRONG
import { writable } from 'svelte/store';
const count = writable(0);

// CORRECT
let count = $state(0);
```

### 2. Using reactive statements

```svelte
<!-- WRONG -->
<script>
    $: doubled = count * 2;
</script>

<!-- CORRECT -->
<script>
    let doubled = $derived(count * 2);
</script>
```

### 3. Regular Map for reactive state

```typescript
// WRONG
items = $state(new Map());

// CORRECT
items = $state(new SvelteMap());
```

### 4. Forgetting version counter

```typescript
// WRONG - derived may not update
items.set(id, newItem);

// CORRECT - forces recalculation
items.set(id, newItem);
this._version++;
```

## File Reference

Real examples in codebase:
- `src/lib/stores/chat.svelte.ts` - Complex store with multiple derived values
- `src/lib/stores/tasks.svelte.ts` - Store with related data caching
- `src/lib/components/tasks/TaskPanel.svelte` - Component with local state
