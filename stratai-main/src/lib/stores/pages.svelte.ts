/**
 * Pages Store - AI-native document management
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 *
 * Handles:
 * - Page CRUD operations
 * - Version management
 * - Area-based filtering
 * - Search functionality
 */

import { SvelteMap } from 'svelte/reactivity';
import type {
	Page,
	PageVersion,
	PageConversation,
	CreatePageInput,
	UpdatePageInput,
	PageType,
	PageVisibility,
	PageSummary,
	PageConversationRelationship,
	TipTapContent
} from '$lib/types/page';

/**
 * Pages Store - manages pages with API sync
 */
class PageStore {
	// Page cache by ID
	pages = new SvelteMap<string, Page>();

	// Version cache: pageId -> versions
	versions = new SvelteMap<string, PageVersion[]>();

	// Conversation links cache: pageId -> conversations
	conversations = new SvelteMap<string, PageConversation[]>();

	// Loading and error states
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Currently editing page
	editingPageId = $state<string | null>(null);

	// Dirty state tracking for unsaved changes
	isDirty = $state(false);

	// Version counter for fine-grained reactivity
	_version = $state(0);

	// Track which areas have been loaded
	private loadedAreas = new Set<string>();
	private loadedVersions = new Set<string>();
	private loadedConversations = new Set<string>();

	// =====================================================
	// Derived Values
	// =====================================================

	/**
	 * All pages as a sorted array (most recently updated first)
	 */
	pageList = $derived.by(() => {
		const _ = this._version;
		return Array.from(this.pages.values()).sort(
			(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		);
	});

	/**
	 * Total page count
	 */
	pageCount = $derived.by(() => {
		return this.pages.size;
	});

	/**
	 * Whether any pages exist
	 */
	hasPages = $derived.by(() => {
		return this.pages.size > 0;
	});

	/**
	 * Currently editing page
	 */
	editingPage = $derived.by(() => {
		const _ = this._version;
		if (!this.editingPageId) return null;
		return this.pages.get(this.editingPageId) ?? null;
	});

	// =====================================================
	// API Methods
	// =====================================================

	/**
	 * Load pages for an area
	 */
	async loadPages(areaId: string): Promise<void> {
		if (this.loadedAreas.has(areaId)) return;

		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/pages?areaId=${areaId}`);

			if (!response.ok) {
				if (response.status === 401) return;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.pages) {
				for (const page of data.pages) {
					this.pages.set(page.id, this.parseDates(page));
				}
				this.loadedAreas.add(areaId);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load pages:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load pages';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Get a single page by ID (fetches from API if not cached)
	 */
	async getPage(id: string): Promise<Page | null> {
		// Check cache first
		const cached = this.pages.get(id);
		if (cached) return cached;

		try {
			const response = await fetch(`/api/pages/${id}`);

			if (!response.ok) {
				if (response.status === 404) return null;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.page) {
				const page = this.parseDates(data.page);
				this.pages.set(page.id, page);
				this._version++;
				return page;
			}

			return null;
		} catch (e) {
			console.error('Failed to get page:', e);
			this.error = e instanceof Error ? e.message : 'Failed to get page';
			return null;
		}
	}

	/**
	 * Create a new page
	 */
	async createPage(input: CreatePageInput): Promise<Page | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch('/api/pages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Create failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.page) {
				const page = this.parseDates(data.page);
				this.pages.set(page.id, page);
				this._version++;
				return page;
			}

			return null;
		} catch (e) {
			console.error('Failed to create page:', e);
			this.error = e instanceof Error ? e.message : 'Failed to create page';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Update an existing page
	 */
	async updatePage(id: string, updates: UpdatePageInput): Promise<Page | null> {
		this.error = null;

		try {
			const response = await fetch(`/api/pages/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				if (response.status === 404) {
					this.pages.delete(id);
					this._version++;
					return null;
				}
				throw new Error(`Update failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.page) {
				const page = this.parseDates(data.page);
				this.pages.set(page.id, page);
				this.isDirty = false;
				this._version++;
				return page;
			}

			return null;
		} catch (e) {
			console.error('Failed to update page:', e);
			this.error = e instanceof Error ? e.message : 'Failed to update page';
			return null;
		}
	}

	/**
	 * Delete a page (soft delete)
	 */
	async deletePage(id: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/pages/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok && response.status !== 404) {
				throw new Error(`Delete failed: ${response.status}`);
			}

			this.pages.delete(id);
			this.versions.delete(id);
			this.conversations.delete(id);
			this.loadedVersions.delete(id);
			this.loadedConversations.delete(id);

			if (this.editingPageId === id) {
				this.editingPageId = null;
			}

			this._version++;
			return true;
		} catch (e) {
			console.error('Failed to delete page:', e);
			this.error = e instanceof Error ? e.message : 'Failed to delete page';
			return false;
		}
	}

	/**
	 * Duplicate a page
	 */
	async duplicatePage(id: string): Promise<Page | null> {
		try {
			const response = await fetch(`/api/pages/${id}/duplicate`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`Duplicate failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.page) {
				const page = this.parseDates(data.page);
				this.pages.set(page.id, page);
				this._version++;
				return page;
			}

			return null;
		} catch (e) {
			console.error('Failed to duplicate page:', e);
			this.error = e instanceof Error ? e.message : 'Failed to duplicate page';
			return null;
		}
	}

	/**
	 * Search pages
	 */
	async searchPages(query: string, areaId?: string): Promise<PageSummary[]> {
		if (!query.trim()) return [];

		try {
			const params = new URLSearchParams({ q: query });
			if (areaId) params.set('areaId', areaId);

			const response = await fetch(`/api/pages/search?${params}`);

			if (!response.ok) {
				throw new Error(`Search failed: ${response.status}`);
			}

			const data = await response.json();
			return (data.results || []).map((r: PageSummary) => ({
				...r,
				createdAt: new Date(r.createdAt),
				updatedAt: new Date(r.updatedAt)
			}));
		} catch (e) {
			console.error('Failed to search pages:', e);
			this.error = e instanceof Error ? e.message : 'Failed to search pages';
			return [];
		}
	}

	// =====================================================
	// Version Methods
	// =====================================================

	/**
	 * Load versions for a page
	 */
	async loadVersions(pageId: string): Promise<void> {
		if (this.loadedVersions.has(pageId)) return;

		try {
			const response = await fetch(`/api/pages/${pageId}/versions`);

			if (!response.ok) {
				if (response.status === 404) {
					this.versions.set(pageId, []);
					return;
				}
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.versions) {
				const versions = data.versions.map((v: PageVersion) => ({
					...v,
					createdAt: new Date(v.createdAt)
				}));
				this.versions.set(pageId, versions);
				this.loadedVersions.add(pageId);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load versions:', e);
			this.versions.set(pageId, []);
		}
	}

	/**
	 * Create a version snapshot
	 */
	async createVersion(pageId: string, changeSummary?: string): Promise<PageVersion | null> {
		try {
			const response = await fetch(`/api/pages/${pageId}/versions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ changeSummary })
			});

			if (!response.ok) {
				throw new Error(`Create version failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.version) {
				const version: PageVersion = {
					...data.version,
					createdAt: new Date(data.version.createdAt)
				};

				// Update cache
				const current = this.versions.get(pageId) ?? [];
				this.versions.set(pageId, [version, ...current]);
				this._version++;

				return version;
			}

			return null;
		} catch (e) {
			console.error('Failed to create version:', e);
			this.error = e instanceof Error ? e.message : 'Failed to create version';
			return null;
		}
	}

	/**
	 * Get versions for a page (from cache)
	 */
	getVersions(pageId: string): PageVersion[] {
		void this._version;
		return this.versions.get(pageId) ?? [];
	}

	// =====================================================
	// Conversation Link Methods
	// =====================================================

	/**
	 * Load conversation links for a page
	 */
	async loadConversations(pageId: string): Promise<void> {
		if (this.loadedConversations.has(pageId)) return;

		try {
			const response = await fetch(`/api/pages/${pageId}/conversations`);

			if (!response.ok) {
				if (response.status === 404) {
					this.conversations.set(pageId, []);
					return;
				}
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.conversations) {
				const convos = data.conversations.map((c: PageConversation) => ({
					...c,
					createdAt: new Date(c.createdAt)
				}));
				this.conversations.set(pageId, convos);
				this.loadedConversations.add(pageId);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load conversations:', e);
			this.conversations.set(pageId, []);
		}
	}

	/**
	 * Get conversation links for a page (from cache)
	 */
	getConversations(pageId: string): PageConversation[] {
		void this._version;
		return this.conversations.get(pageId) ?? [];
	}

	// =====================================================
	// Editing Methods
	// =====================================================

	/**
	 * Start editing a page
	 */
	startEditing(pageId: string): void {
		this.editingPageId = pageId;
		this.isDirty = false;
	}

	/**
	 * Stop editing
	 */
	stopEditing(): void {
		this.editingPageId = null;
		this.isDirty = false;
	}

	/**
	 * Mark content as changed
	 */
	markDirty(): void {
		this.isDirty = true;
	}

	/**
	 * Mark content as saved
	 */
	markClean(): void {
		this.isDirty = false;
	}

	// =====================================================
	// Helper Methods
	// =====================================================

	/**
	 * Get pages for a specific area
	 */
	getPagesForArea(areaId: string): Page[] {
		void this._version;
		return this.pageList.filter((p) => p.areaId === areaId);
	}

	/**
	 * Get pages for a specific task
	 */
	getPagesForTask(taskId: string): Page[] {
		void this._version;
		return this.pageList.filter((p) => p.taskId === taskId);
	}

	/**
	 * Get page by ID (from cache)
	 */
	getPageById(id: string): Page | undefined {
		void this._version;
		return this.pages.get(id);
	}

	/**
	 * Force reload pages for an area
	 */
	async reloadArea(areaId: string): Promise<void> {
		this.loadedAreas.delete(areaId);
		// Clear pages for this area
		for (const [id, page] of this.pages) {
			if (page.areaId === areaId) {
				this.pages.delete(id);
			}
		}
		this._version++;
		await this.loadPages(areaId);
	}

	/**
	 * Clear specific page cache
	 */
	clearPageCache(pageId: string): void {
		this.loadedVersions.delete(pageId);
		this.loadedConversations.delete(pageId);
		this.versions.delete(pageId);
		this.conversations.delete(pageId);
		this._version++;
	}

	/**
	 * Clear all caches
	 */
	clearAll(): void {
		this.pages.clear();
		this.versions.clear();
		this.conversations.clear();
		this.loadedAreas.clear();
		this.loadedVersions.clear();
		this.loadedConversations.clear();
		this.editingPageId = null;
		this.isDirty = false;
		this.error = null;
		this._version++;
	}

	/**
	 * Parse date strings from API response into Date objects
	 */
	private parseDates(page: Page): Page {
		return {
			...page,
			createdAt: new Date(page.createdAt),
			updatedAt: new Date(page.updatedAt),
			deletedAt: page.deletedAt ? new Date(page.deletedAt) : undefined
		};
	}
}

// Export singleton instance
export const pageStore = new PageStore();
