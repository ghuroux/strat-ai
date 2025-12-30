/**
 * Focus Areas Store - Focus area management with PostgreSQL persistence
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 *
 * Handles:
 * - Focus area CRUD operations
 * - Space-based filtering
 * - Active focus area selection
 */

import { SvelteMap } from 'svelte/reactivity';
import type {
	FocusArea,
	CreateFocusAreaInput,
	UpdateFocusAreaInput,
	FocusAreaWithStats
} from '$lib/types/focus-areas';

class FocusAreaStore {
	// Focus area cache by ID
	focusAreas = new SvelteMap<string, FocusArea>();

	// Focus areas by space: spaceId -> focusArea[]
	focusAreasBySpace = new SvelteMap<string, FocusArea[]>();

	// Currently selected focus area per space: spaceId -> focusAreaId | null
	selectedFocusArea = new SvelteMap<string, string | null>();

	// Loading and error states
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Version counter for fine-grained reactivity
	_version = $state(0);

	// Track which spaces have been loaded
	private loadedSpaces = new Set<string>();

	/**
	 * Load all focus areas for a space
	 */
	async loadFocusAreas(spaceId: string): Promise<void> {
		if (this.loadedSpaces.has(spaceId)) return;

		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/focus-areas?spaceId=${spaceId}`);

			if (!response.ok) {
				if (response.status === 401) return;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.focusAreas) {
				const focusAreasForSpace: FocusArea[] = [];

				for (const fa of data.focusAreas) {
					// Convert date strings to Date objects
					const focusArea: FocusArea = {
						...fa,
						createdAt: new Date(fa.createdAt),
						updatedAt: new Date(fa.updatedAt),
						deletedAt: fa.deletedAt ? new Date(fa.deletedAt) : undefined
					};

					this.focusAreas.set(fa.id, focusArea);
					focusAreasForSpace.push(focusArea);
				}

				this.focusAreasBySpace.set(spaceId, focusAreasForSpace);
				this.loadedSpaces.add(spaceId);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load focus areas:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load focus areas';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Create a new focus area
	 */
	async createFocusArea(input: CreateFocusAreaInput): Promise<FocusArea | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch('/api/focus-areas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Create failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.focusArea) {
				const focusArea: FocusArea = {
					...data.focusArea,
					createdAt: new Date(data.focusArea.createdAt),
					updatedAt: new Date(data.focusArea.updatedAt)
				};

				// Add to cache
				this.focusAreas.set(focusArea.id, focusArea);

				// Update space list
				const spaceList = this.focusAreasBySpace.get(input.spaceId) ?? [];
				this.focusAreasBySpace.set(input.spaceId, [...spaceList, focusArea]);

				this._version++;
				return focusArea;
			}
			return null;
		} catch (e) {
			console.error('Failed to create focus area:', e);
			this.error = e instanceof Error ? e.message : 'Failed to create focus area';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Update an existing focus area
	 */
	async updateFocusArea(id: string, updates: UpdateFocusAreaInput): Promise<FocusArea | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/focus-areas/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Update failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.focusArea) {
				const focusArea: FocusArea = {
					...data.focusArea,
					createdAt: new Date(data.focusArea.createdAt),
					updatedAt: new Date(data.focusArea.updatedAt)
				};

				// Update cache
				this.focusAreas.set(focusArea.id, focusArea);

				// Update space list
				const spaceList = this.focusAreasBySpace.get(focusArea.spaceId);
				if (spaceList) {
					const index = spaceList.findIndex(fa => fa.id === id);
					if (index !== -1) {
						spaceList[index] = focusArea;
						this.focusAreasBySpace.set(focusArea.spaceId, [...spaceList]);
					}
				}

				this._version++;
				return focusArea;
			}
			return null;
		} catch (e) {
			console.error('Failed to update focus area:', e);
			this.error = e instanceof Error ? e.message : 'Failed to update focus area';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Delete a focus area
	 */
	async deleteFocusArea(id: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			const focusArea = this.focusAreas.get(id);
			if (!focusArea) return false;

			const response = await fetch(`/api/focus-areas/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Delete failed: ${response.status}`);
			}

			// Remove from cache
			this.focusAreas.delete(id);

			// Remove from space list
			const spaceList = this.focusAreasBySpace.get(focusArea.spaceId);
			if (spaceList) {
				this.focusAreasBySpace.set(
					focusArea.spaceId,
					spaceList.filter(fa => fa.id !== id)
				);
			}

			// Clear selection if this was selected
			if (this.selectedFocusArea.get(focusArea.spaceId) === id) {
				this.selectedFocusArea.set(focusArea.spaceId, null);
			}

			this._version++;
			return true;
		} catch (e) {
			console.error('Failed to delete focus area:', e);
			this.error = e instanceof Error ? e.message : 'Failed to delete focus area';
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Get focus areas for a space (reactive)
	 */
	getFocusAreasForSpace(spaceId: string): FocusArea[] {
		// Access version to make this reactive
		void this._version;
		return this.focusAreasBySpace.get(spaceId) ?? [];
	}

	/**
	 * Get a focus area by ID (reactive)
	 */
	getFocusAreaById(id: string): FocusArea | undefined {
		void this._version;
		return this.focusAreas.get(id);
	}

	/**
	 * Select a focus area for a space
	 */
	selectFocusArea(spaceId: string, focusAreaId: string | null): void {
		this.selectedFocusArea.set(spaceId, focusAreaId);
		this._version++;
	}

	/**
	 * Get selected focus area for a space (reactive)
	 */
	getSelectedFocusArea(spaceId: string): string | null {
		void this._version;
		return this.selectedFocusArea.get(spaceId) ?? null;
	}

	/**
	 * Get selected focus area object for a space (reactive)
	 */
	getSelectedFocusAreaObject(spaceId: string): FocusArea | null {
		void this._version;
		const id = this.selectedFocusArea.get(spaceId);
		if (!id) return null;
		return this.focusAreas.get(id) ?? null;
	}

	/**
	 * Clear cache for a space (force reload)
	 */
	clearCache(spaceId?: string): void {
		if (spaceId) {
			this.loadedSpaces.delete(spaceId);
			const list = this.focusAreasBySpace.get(spaceId);
			if (list) {
				for (const fa of list) {
					this.focusAreas.delete(fa.id);
				}
			}
			this.focusAreasBySpace.delete(spaceId);
		} else {
			this.loadedSpaces.clear();
			this.focusAreas.clear();
			this.focusAreasBySpace.clear();
		}
		this._version++;
	}

	/**
	 * Check if focus areas have been loaded for a space
	 */
	isSpaceLoaded(spaceId: string): boolean {
		return this.loadedSpaces.has(spaceId);
	}
}

export const focusAreaStore = new FocusAreaStore();
