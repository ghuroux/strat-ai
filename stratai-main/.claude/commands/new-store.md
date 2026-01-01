# Create New Svelte Store

Scaffold a new Svelte 5 store following StratAI patterns.

## Arguments

This command expects the user to provide:
- Store name (e.g., "notifications", "preferences")
- Entity type (e.g., "Notification", "Preference")

## Template

Create a new file at `src/lib/stores/{name}.svelte.ts`:

```typescript
/**
 * {Name} Store - {Description}
 * Uses Svelte 5 runes for reactivity
 */

import { SvelteMap } from 'svelte/reactivity';
import type { {Entity}, Create{Entity}Input, Update{Entity}Input } from '$lib/types/{name}';

class {Name}Store {
    // Reactive state
    items = $state<SvelteMap<string, {Entity}>>(new SvelteMap());
    isLoading = $state(false);
    error = $state<string | null>(null);

    // Version counter for fine-grained updates
    _version = $state(0);

    // Derived values
    itemList = $derived.by(() => {
        const _ = this._version;
        return Array.from(this.items.values());
    });

    itemCount = $derived(this.items.size);

    // Load all items
    async loadItems(spaceId?: string): Promise<void> {
        this.isLoading = true;
        this.error = null;

        try {
            const params = spaceId ? `?spaceId=${spaceId}` : '';
            const response = await fetch(`/api/{name}${params}`);

            if (!response.ok) {
                throw new Error(`Failed to load: ${response.status}`);
            }

            const data = await response.json();
            for (const item of data.items) {
                this.items.set(item.id, item);
            }
            this._version++;
        } catch (e) {
            this.error = e instanceof Error ? e.message : 'Failed to load';
            console.error('[{Name}Store] loadItems error:', e);
        } finally {
            this.isLoading = false;
        }
    }

    // Get single item
    getItem(id: string): {Entity} | undefined {
        return this.items.get(id);
    }

    // Create new item
    async createItem(input: Create{Entity}Input): Promise<{Entity}> {
        const response = await fetch('/api/{name}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create');
        }

        const { item } = await response.json();
        this.items.set(item.id, item);
        this._version++;
        return item;
    }

    // Update existing item
    async updateItem(id: string, input: Update{Entity}Input): Promise<{Entity} | null> {
        const response = await fetch(`/api/{name}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            const error = await response.json();
            throw new Error(error.error || 'Failed to update');
        }

        const { item } = await response.json();
        this.items.set(item.id, item);
        this._version++;
        return item;
    }

    // Delete item
    async deleteItem(id: string): Promise<boolean> {
        const response = await fetch(`/api/{name}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            if (response.status === 404) return false;
            throw new Error('Failed to delete');
        }

        this.items.delete(id);
        this._version++;
        return true;
    }
}

export const {name}Store = new {Name}Store();
```

## Also Create

1. Types file at `src/lib/types/{name}.ts`
2. API endpoints at `src/routes/api/{name}/+server.ts`
3. Repository at `src/lib/server/persistence/{name}-postgres.ts`
4. Schema at `src/lib/server/persistence/{name}-schema.sql`

## Usage

After creating, import in components:

```typescript
import { {name}Store } from '$lib/stores/{name}.svelte';
```
