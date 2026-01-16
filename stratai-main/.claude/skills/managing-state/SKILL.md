---
name: managing-state
description: |
  Use when creating or modifying Svelte 5 stores (.svelte.ts files) in src/lib/stores/.
  MANDATORY for: State management, reactive stores, API sync, data caching.
  READ THIS SKILL before working with stores - covers critical Svelte 5 patterns.
  Covers: Class-based stores, $state/$derived, SvelteMap reactivity, version counter pattern, hydration, API sync.
globs:
  - "src/lib/stores/**/*.svelte.ts"
---

# Managing State with Svelte 5

## Store Architecture

StratAI uses **class-based Svelte 5 stores** with runes for reactive state management.

### Basic Store Structure

```typescript
// src/lib/stores/items.svelte.ts
import { SvelteMap } from 'svelte/reactivity';
import type { Item } from '$lib/types/items';

class ItemStore {
    // Reactive state using $state
    items = $state<SvelteMap<string, Item>>(new SvelteMap());
    isLoading = $state(false);
    error = $state<string | null>(null);
    
    // Version counter for fine-grained reactivity
    _version = $state(0);
    
    // Derived values using $derived.by()
    itemList = $derived.by(() => {
        const _ = this._version;  // Subscribe to version changes
        return Array.from(this.items.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    
    itemCount = $derived(this.items.size);
    hasItems = $derived(this.items.size > 0);
    
    // Methods
    async loadItems(): Promise<void> {
        this.isLoading = true;
        try {
            const response = await fetch('/api/items');
            const data = await response.json();
            
            for (const item of data.items) {
                this.items.set(item.id, item);
            }
            this._version++;  // Trigger derived updates
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Failed to load items';
        } finally {
            this.isLoading = false;
        }
    }
}

// Export singleton instance
export const itemStore = new ItemStore();
```

## Critical Pattern: SvelteMap vs Map

⚠️ **ALWAYS use `SvelteMap` for reactive collections**

```typescript
// ❌ WRONG - Regular Map doesn't trigger reactivity
items = $state<Map<string, Item>>(new Map());

// ✅ CORRECT - SvelteMap triggers reactivity on add/delete
items = $state<SvelteMap<string, Item>>(new SvelteMap());
```

**Why**: Regular JavaScript `Map` doesn't notify Svelte when items are added/deleted. `SvelteMap` from `svelte/reactivity` provides reactive tracking.

## Version Counter Pattern

Use `_version` to trigger derived updates when mutating collections:

```typescript
class TaskStore {
    tasks = $state<SvelteMap<string, Task>>(new SvelteMap());
    _version = $state(0);
    
    // Derived values subscribe to _version
    taskList = $derived.by(() => {
        const _ = this._version;  // This line is critical!
        return Array.from(this.tasks.values());
    });
    
    // Increment version after mutations
    addTask(task: Task): void {
        this.tasks.set(task.id, task);
        this._version++;  // Triggers taskList recalculation
    }
    
    updateTask(id: string, updates: Partial<Task>): void {
        const task = this.tasks.get(id);
        if (task) {
            // Mutate in place
            Object.assign(task, updates);
            this._version++;  // Triggers taskList recalculation
        }
    }
    
    deleteTask(id: string): void {
        this.tasks.delete(id);
        this._version++;  // Triggers taskList recalculation
    }
}
```

**When to increment `_version`**:
- After adding/removing items from collections
- After mutating properties of items in collections
- When derived values need to recalculate but Svelte wouldn't detect the change

**When NOT to increment**:
- When setting primitive `$state` values (already reactive)
- When replacing entire collections (already reactive)
- In every method "just in case" (adds noise)

## Derived Values

### Simple Derived

```typescript
// Automatically recomputes when dependency changes
itemCount = $derived(this.items.size);
hasItems = $derived(this.items.size > 0);
```

### Complex Derived with Version

```typescript
// Use $derived.by() for complex computations
taskList = $derived.by(() => {
    const _ = this._version;  // Subscribe to version changes
    
    // Complex filtering/sorting
    return Array.from(this.tasks.values())
        .filter(t => t.status !== 'deleted')
        .sort((a, b) => {
            // Priority sort
            const priorityOrder = { high: 0, normal: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
});
```

## Hydration & Persistence

### LocalStorage Pattern

```typescript
class SettingsStore {
    settings = $state<UserSettings>({
        theme: 'dark',
        language: 'en'
    });
    
    private initialized = false;
    private persistDebounced: () => void;
    
    constructor() {
        // Debounce persistence to avoid excessive writes
        this.persistDebounced = debounce(() => this.persist(), 500);
        
        // Browser-only operations
        if (typeof window !== 'undefined') {
            this.hydrate();
        }
    }
    
    private hydrate(): void {
        if (this.initialized) return;
        
        try {
            const stored = localStorage.getItem('settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults (in case schema changed)
                this.settings = { ...this.settings, ...parsed };
            }
        } catch (err) {
            console.error('Failed to hydrate settings:', err);
        }
        
        this.initialized = true;
    }
    
    private persist(): void {
        if (!this.initialized) return;
        
        try {
            localStorage.setItem('settings', JSON.stringify(this.settings));
        } catch (err) {
            console.error('Failed to persist settings:', err);
        }
    }
    
    updateSetting(key: keyof UserSettings, value: unknown): void {
        this.settings[key] = value;
        this.persistDebounced();  // Debounced save
    }
}
```

## API Sync Pattern

### Optimistic Updates with Rollback

```typescript
class TaskStore {
    tasks = $state<SvelteMap<string, Task>>(new SvelteMap());
    isLoading = $state(false);
    error = $state<string | null>(null);
    
    private syncQueue = new Map<string, Task>();
    private isSyncing = false;
    
    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
        const task = this.tasks.get(id);
        if (!task) return;
        
        // Store original for rollback
        const original = { ...task };
        
        // Optimistic update
        Object.assign(task, updates);
        this._version++;
        
        // Queue for sync
        this.syncQueue.set(id, task);
        this.syncFromQueue();
        
        try {
            // API call
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                throw new Error('Update failed');
            }
            
            const updated = await response.json();
            this.tasks.set(id, updated.task);
            this._version++;
        } catch (err) {
            // Rollback on failure
            this.tasks.set(id, original);
            this._version++;
            this.error = err instanceof Error ? err.message : 'Update failed';
        }
    }
    
    private async syncFromQueue(): Promise<void> {
        if (this.isSyncing || this.syncQueue.size === 0) return;
        
        this.isSyncing = true;
        // Sync logic here
        this.isSyncing = false;
    }
}
```

### Load-Once Pattern

```typescript
class SpacesStore {
    spaces = $state<SvelteMap<string, Space>>(new SvelteMap());
    private loaded = false;
    
    async loadSpaces(): Promise<void> {
        // Guard against multiple loads
        if (this.loaded) return;
        
        this.isLoading = true;
        try {
            const response = await fetch('/api/spaces');
            const data = await response.json();
            
            for (const space of data.spaces) {
                this.spaces.set(space.id, space);
            }
            
            this.loaded = true;
            this._version++;
        } finally {
            this.isLoading = false;
        }
    }
}
```

### Granular Load Tracking

```typescript
class AreaStore {
    areas = $state<SvelteMap<string, Area>>(new SvelteMap());
    
    // Track which spaces have been loaded
    private loadedSpaces = new Set<string>();
    
    async loadAreas(spaceId: string): Promise<void> {
        // Skip if already loaded for this space
        if (this.loadedSpaces.has(spaceId)) return;
        
        try {
            const response = await fetch(`/api/areas?spaceId=${spaceId}`);
            const data = await response.json();
            
            for (const area of data.areas) {
                this.areas.set(area.id, area);
            }
            
            this.loadedSpaces.add(spaceId);
            this._version++;
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Failed to load areas';
        }
    }
    
    clearSpace(spaceId: string): void {
        // Remove all areas for this space
        for (const [id, area] of this.areas) {
            if (area.spaceId === spaceId) {
                this.areas.delete(id);
            }
        }
        this.loadedSpaces.delete(spaceId);
        this._version++;
    }
}
```

## Cache Pattern

### Related Data Cache

```typescript
class TaskStore {
    tasks = $state<SvelteMap<string, Task>>(new SvelteMap());
    
    // Related data caches
    relatedTasks = new SvelteMap<string, RelatedTaskInfo[]>();
    taskContext = new SvelteMap<string, TaskContextInfo>();
    
    // Track what's been loaded
    private loadedRelatedTasks = new Set<string>();
    private loadedTaskContext = new Set<string>();
    
    async loadRelatedTasks(taskId: string): Promise<void> {
        if (this.loadedRelatedTasks.has(taskId)) return;
        
        const response = await fetch(`/api/tasks/${taskId}/related`);
        const data = await response.json();
        
        this.relatedTasks.set(taskId, data.relatedTasks);
        this.loadedRelatedTasks.add(taskId);
        this._version++;
    }
    
    // Clear cache when task is updated
    clearTaskCache(taskId: string): void {
        this.relatedTasks.delete(taskId);
        this.taskContext.delete(taskId);
        this.loadedRelatedTasks.delete(taskId);
        this.loadedTaskContext.delete(taskId);
    }
}
```

## Common Patterns

### Abort Controller for Cancellable Requests

```typescript
class ChatStore {
    isStreaming = $state(false);
    abortController = $state<AbortController | null>(null);
    
    async sendMessage(message: string): Promise<void> {
        // Cancel previous request if still running
        if (this.abortController) {
            this.abortController.abort();
        }
        
        this.abortController = new AbortController();
        this.isStreaming = true;
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                signal: this.abortController.signal,
                body: JSON.stringify({ message })
            });
            
            // Handle streaming response...
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Request cancelled');
            } else {
                this.error = err.message;
            }
        } finally {
            this.isStreaming = false;
            this.abortController = null;
        }
    }
    
    cancelStream(): void {
        if (this.abortController) {
            this.abortController.abort();
        }
    }
}
```

### Debounced Actions

```typescript
import { debounce } from '$lib/utils/debounce';

class SearchStore {
    query = $state('');
    results = $state<SearchResult[]>([]);
    
    private searchDebounced: (query: string) => void;
    
    constructor() {
        this.searchDebounced = debounce((query: string) => {
            this.performSearch(query);
        }, 300);
    }
    
    setQuery(query: string): void {
        this.query = query;
        this.searchDebounced(query);  // Debounced API call
    }
    
    private async performSearch(query: string): Promise<void> {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        this.results = data.results;
    }
}
```

## Common Gotchas

### 1. Forgetting to Use SvelteMap

```typescript
// ❌ WRONG - Won't trigger reactivity
tasks = $state<Map<string, Task>>(new Map());

// ✅ CORRECT
tasks = $state<SvelteMap<string, Task>>(new SvelteMap());
```

### 2. Forgetting Version Counter in Derived

```typescript
// ❌ WRONG - Won't update when items mutate
taskList = $derived.by(() => {
    return Array.from(this.tasks.values());  // Missing version dependency
});

// ✅ CORRECT
taskList = $derived.by(() => {
    const _ = this._version;  // Subscribe to version
    return Array.from(this.tasks.values());
});
```

### 3. Incrementing Version Too Often

```typescript
// ❌ WRONG - Unnecessary noise
addTask(task: Task): void {
    this.tasks.set(task.id, task);
    this._version++;  // Needed
    this.lastUpdated = Date.now();  // Primitive, already reactive
    this._version++;  // NOT needed - primitive $state is already reactive
}

// ✅ CORRECT
addTask(task: Task): void {
    this.tasks.set(task.id, task);
    this.lastUpdated = Date.now();  // Already reactive
    this._version++;  // Only increment once for collection change
}
```

### 4. Hydration in SSR Context

```typescript
// ❌ WRONG - localStorage doesn't exist on server
constructor() {
    this.hydrate();  // Will crash during SSR
}

// ✅ CORRECT
constructor() {
    if (typeof window !== 'undefined') {
        this.hydrate();  // Browser only
    }
}
```

### 5. Not Guarding Against Multiple Loads

```typescript
// ❌ WRONG - Multiple calls will duplicate data
async loadItems(): Promise<void> {
    const response = await fetch('/api/items');
    // ...
}

// ✅ CORRECT - Guard with flag
private loaded = false;

async loadItems(): Promise<void> {
    if (this.loaded) return;  // Guard
    // ...
    this.loaded = true;
}
```

## File Organization

```
src/lib/stores/
├── chat.svelte.ts           # Conversation management
├── tasks.svelte.ts          # Task management (complex, 1700+ lines)
├── spaces.svelte.ts         # Space management
├── areas.svelte.ts          # Area management
├── pages.svelte.ts          # Document management
├── documents.svelte.ts      # Document uploads
├── settings.svelte.ts       # User settings (localStorage)
├── toast.svelte.ts          # Toast notifications (ephemeral)
└── modelCapabilities.svelte.ts  # Model capabilities cache
```

**Naming convention**: `entity.svelte.ts` (lowercase, singular)

## Example: Complete Store

See these production stores for reference:
- `src/lib/stores/tasks.svelte.ts` - Complex store with caching, API sync
- `src/lib/stores/chat.svelte.ts` - Streaming, abort controllers
- `src/lib/stores/areas.svelte.ts` - Granular load tracking
- `src/lib/stores/settings.svelte.ts` - LocalStorage persistence

## Checklist for New Stores

- [ ] Use `SvelteMap` for reactive collections
- [ ] Add `_version` counter if using derived values on collections
- [ ] Subscribe to `_version` in `$derived.by()` functions
- [ ] Guard hydration with `typeof window !== 'undefined'`
- [ ] Add `isLoading` and `error` states
- [ ] Use `initialized` or `loaded` flags to prevent duplicate loads
- [ ] Debounce persistence operations
- [ ] Use `AbortController` for cancellable requests
- [ ] Implement optimistic updates with rollback
- [ ] Export singleton instance at bottom of file

