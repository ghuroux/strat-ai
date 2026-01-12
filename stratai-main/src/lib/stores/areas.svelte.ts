/**
 * Areas Store - Area management with PostgreSQL persistence
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 *
 * Areas are navigable sub-spaces within spaces. Each space has at least
 * a "General" area which cannot be deleted.
 *
 * Handles:
 * - Area CRUD operations
 * - Space-based filtering
 * - Active area selection
 */

import { SvelteMap } from 'svelte/reactivity';
import type { Area, CreateAreaInput, UpdateAreaInput, AreaWithStats } from '$lib/types/areas';
import type {
	AreaMemberWithDetails,
	AreaMemberRole,
	AddMemberInput,
	AreaAccessResult,
	AreaAccessSource
} from '$lib/types/area-memberships';

class AreaStore {
	// Area cache by ID
	areas = new SvelteMap<string, Area>();

	// Areas by space: spaceId -> area[]
	areasBySpace = new SvelteMap<string, Area[]>();

	// Currently selected area per space: spaceId -> areaId | null
	selectedArea = new SvelteMap<string, string | null>();

	// Member cache by area: areaId -> members[]
	membersByArea = new SvelteMap<string, AreaMemberWithDetails[]>();

	// User access info by area: areaId -> { userRole, accessSource }
	accessByArea = new SvelteMap<string, { userRole: AreaMemberRole | 'inherited'; accessSource: AreaAccessSource }>();

	// Loading and error states
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Version counter for fine-grained reactivity
	_version = $state(0);

	// Track which spaces have been loaded
	private loadedSpaces = new Set<string>();

	// Track which area members have been loaded
	private loadedAreaMembers = new Set<string>();

	/**
	 * Load all areas for a space
	 */
	async loadAreas(spaceId: string): Promise<void> {
		if (this.loadedSpaces.has(spaceId)) return;

		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/areas?spaceId=${spaceId}`);

			if (!response.ok) {
				if (response.status === 401) return;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.areas) {
				const areasForSpace: Area[] = [];

				for (const a of data.areas) {
					// Convert date strings to Date objects
					const area: Area = {
						...a,
						createdAt: new Date(a.createdAt),
						updatedAt: new Date(a.updatedAt),
						deletedAt: a.deletedAt ? new Date(a.deletedAt) : undefined
					};

					this.areas.set(a.id, area);
					areasForSpace.push(area);
				}

				// Sort so General is first
				areasForSpace.sort((a, b) => {
					if (a.isGeneral) return -1;
					if (b.isGeneral) return 1;
					return a.orderIndex - b.orderIndex;
				});

				this.areasBySpace.set(spaceId, areasForSpace);
				this.loadedSpaces.add(spaceId);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load areas:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load areas';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Create a new area
	 */
	async createArea(input: CreateAreaInput): Promise<Area | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch('/api/areas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Create failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.area) {
				const area: Area = {
					...data.area,
					createdAt: new Date(data.area.createdAt),
					updatedAt: new Date(data.area.updatedAt)
				};

				// Add to cache
				this.areas.set(area.id, area);

				// Update space list
				const spaceList = this.areasBySpace.get(input.spaceId) ?? [];
				this.areasBySpace.set(input.spaceId, [...spaceList, area]);

				this._version++;
				return area;
			}
			return null;
		} catch (e) {
			console.error('Failed to create area:', e);
			this.error = e instanceof Error ? e.message : 'Failed to create area';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Update an existing area
	 */
	async updateArea(id: string, updates: UpdateAreaInput): Promise<Area | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/areas/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Update failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.area) {
				const area: Area = {
					...data.area,
					createdAt: new Date(data.area.createdAt),
					updatedAt: new Date(data.area.updatedAt)
				};

				// Update cache
				this.areas.set(area.id, area);

				// Update space list
				const spaceList = this.areasBySpace.get(area.spaceId);
				if (spaceList) {
					const index = spaceList.findIndex((a) => a.id === id);
					if (index !== -1) {
						spaceList[index] = area;
						this.areasBySpace.set(area.spaceId, [...spaceList]);
					}
				}

				this._version++;
				return area;
			}
			return null;
		} catch (e) {
			console.error('Failed to update area:', e);
			this.error = e instanceof Error ? e.message : 'Failed to update area';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Delete an area (General areas cannot be deleted)
	 *
	 * @param id - Area ID to delete
	 * @param options.deleteContent - If true, deletes all conversations and tasks.
	 *                                If false (default), moves conversations to General and unlinks tasks.
	 */
	async deleteArea(
		id: string,
		options: { deleteContent?: boolean } = {}
	): Promise<boolean> {
		const { deleteContent = false } = options;

		this.isLoading = true;
		this.error = null;

		try {
			const area = this.areas.get(id);
			if (!area) return false;

			// Prevent deletion of General area on client side
			if (area.isGeneral) {
				this.error = 'Cannot delete the General area';
				return false;
			}

			const response = await fetch(
				`/api/areas/${id}?deleteContent=${deleteContent}`,
				{ method: 'DELETE' }
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Delete failed: ${response.status}`);
			}

			// Remove from cache
			this.areas.delete(id);

			// Remove from space list
			const spaceList = this.areasBySpace.get(area.spaceId);
			if (spaceList) {
				this.areasBySpace.set(
					area.spaceId,
					spaceList.filter((a) => a.id !== id)
				);
			}

			// Clear selection if this was selected
			if (this.selectedArea.get(area.spaceId) === id) {
				this.selectedArea.set(area.spaceId, null);
			}

			this._version++;
			return true;
		} catch (e) {
			console.error('Failed to delete area:', e);
			this.error = e instanceof Error ? e.message : 'Failed to delete area';
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Get areas for a space (reactive)
	 */
	getAreasForSpace(spaceId: string): Area[] {
		// Access version to make this reactive
		void this._version;
		return this.areasBySpace.get(spaceId) ?? [];
	}

	/**
	 * Get an area by ID (reactive)
	 */
	getAreaById(id: string): Area | undefined {
		void this._version;
		return this.areas.get(id);
	}

	/**
	 * Get the General area for a space (reactive)
	 */
	getGeneralArea(spaceId: string): Area | undefined {
		void this._version;
		const areas = this.areasBySpace.get(spaceId);
		return areas?.find((a) => a.isGeneral);
	}

	/**
	 * Get an area by slug within a space (reactive)
	 */
	getAreaBySlug(spaceId: string, slug: string): Area | undefined {
		void this._version;
		const areas = this.areasBySpace.get(spaceId);
		return areas?.find((a) => a.slug === slug);
	}

	/**
	 * Select an area for a space
	 */
	selectArea(spaceId: string, areaId: string | null): void {
		this.selectedArea.set(spaceId, areaId);
		this._version++;
	}

	/**
	 * Get selected area for a space (reactive)
	 */
	getSelectedArea(spaceId: string): string | null {
		void this._version;
		return this.selectedArea.get(spaceId) ?? null;
	}

	/**
	 * Get selected area object for a space (reactive)
	 */
	getSelectedAreaObject(spaceId: string): Area | null {
		void this._version;
		const id = this.selectedArea.get(spaceId);
		if (!id) return null;
		return this.areas.get(id) ?? null;
	}

	/**
	 * Clear cache for a space (force reload)
	 */
	clearCache(spaceId?: string): void {
		if (spaceId) {
			this.loadedSpaces.delete(spaceId);
			const list = this.areasBySpace.get(spaceId);
			if (list) {
				for (const a of list) {
					this.areas.delete(a.id);
				}
			}
			this.areasBySpace.delete(spaceId);
		} else {
			this.loadedSpaces.clear();
			this.areas.clear();
			this.areasBySpace.clear();
		}
		this._version++;
	}

	/**
	 * Check if areas have been loaded for a space
	 */
	isSpaceLoaded(spaceId: string): boolean {
		return this.loadedSpaces.has(spaceId);
	}

	/**
	 * Get deletable areas (excludes General)
	 */
	getDeletableAreas(spaceId: string): Area[] {
		void this._version;
		const areas = this.areasBySpace.get(spaceId) ?? [];
		return areas.filter((a) => !a.isGeneral);
	}

	// ==========================================
	// Area Membership Methods
	// ==========================================

	/**
	 * Load members for an area
	 */
	async loadMembers(areaId: string, forceReload = false): Promise<AreaMemberWithDetails[]> {
		if (!forceReload && this.loadedAreaMembers.has(areaId)) {
			return this.membersByArea.get(areaId) ?? [];
		}

		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/areas/${areaId}/members`);

			if (!response.ok) {
				if (response.status === 401) return [];
				if (response.status === 403) {
					this.error = 'Access denied';
					return [];
				}
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();

			// Store members
			const members: AreaMemberWithDetails[] = data.members?.map((m: AreaMemberWithDetails) => ({
				...m,
				createdAt: new Date(m.createdAt)
			})) ?? [];

			this.membersByArea.set(areaId, members);

			// Store access info
			if (data.userRole && data.accessSource) {
				this.accessByArea.set(areaId, {
					userRole: data.userRole,
					accessSource: data.accessSource
				});
			}

			this.loadedAreaMembers.add(areaId);
			this._version++;

			return members;
		} catch (e) {
			console.error('Failed to load area members:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load members';
			return [];
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Add a member (user or group) to an area
	 */
	async addMember(areaId: string, input: AddMemberInput): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/areas/${areaId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to add member: ${response.status}`);
			}

			// Reload members to get the updated list
			await this.loadMembers(areaId, true);
			return true;
		} catch (e) {
			console.error('Failed to add area member:', e);
			this.error = e instanceof Error ? e.message : 'Failed to add member';
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Remove a member from an area
	 */
	async removeMember(areaId: string, memberId: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/areas/${areaId}/members/${memberId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to remove member: ${response.status}`);
			}

			// Remove from cache
			const members = this.membersByArea.get(areaId);
			if (members) {
				this.membersByArea.set(areaId, members.filter((m) => m.id !== memberId));
			}

			this._version++;
			return true;
		} catch (e) {
			console.error('Failed to remove area member:', e);
			this.error = e instanceof Error ? e.message : 'Failed to remove member';
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Update a member's role
	 */
	async updateMemberRole(areaId: string, memberId: string, role: AreaMemberRole): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(`/api/areas/${areaId}/members/${memberId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to update role: ${response.status}`);
			}

			// Update in cache
			const members = this.membersByArea.get(areaId);
			if (members) {
				const index = members.findIndex((m) => m.id === memberId);
				if (index !== -1) {
					members[index] = { ...members[index], role };
					this.membersByArea.set(areaId, [...members]);
				}
			}

			this._version++;
			return true;
		} catch (e) {
			console.error('Failed to update member role:', e);
			this.error = e instanceof Error ? e.message : 'Failed to update role';
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Get members for an area (reactive)
	 */
	getMembersForArea(areaId: string): AreaMemberWithDetails[] {
		void this._version;
		return this.membersByArea.get(areaId) ?? [];
	}

	/**
	 * Get user's access info for an area (reactive)
	 */
	getAccessInfo(areaId: string): { userRole: AreaMemberRole | 'inherited'; accessSource: AreaAccessSource } | null {
		void this._version;
		return this.accessByArea.get(areaId) ?? null;
	}

	/**
	 * Check if members have been loaded for an area
	 */
	areMembersLoaded(areaId: string): boolean {
		return this.loadedAreaMembers.has(areaId);
	}

	/**
	 * Clear member cache for an area
	 */
	clearMemberCache(areaId?: string): void {
		if (areaId) {
			this.loadedAreaMembers.delete(areaId);
			this.membersByArea.delete(areaId);
			this.accessByArea.delete(areaId);
		} else {
			this.loadedAreaMembers.clear();
			this.membersByArea.clear();
			this.accessByArea.clear();
		}
		this._version++;
	}

	// ==========================================
	// Backwards compatibility aliases
	// These methods exist for gradual migration from focusAreaStore
	// New code should use the non-prefixed methods above
	// ==========================================

	async loadFocusAreas(spaceId: string): Promise<void> {
		return this.loadAreas(spaceId);
	}

	async createFocusArea(input: CreateAreaInput): Promise<Area | null> {
		return this.createArea(input);
	}

	async updateFocusArea(id: string, updates: UpdateAreaInput): Promise<Area | null> {
		return this.updateArea(id, updates);
	}

	async deleteFocusArea(id: string, options?: { deleteContent?: boolean }): Promise<boolean> {
		return this.deleteArea(id, options);
	}

	getFocusAreasForSpace(spaceId: string): Area[] {
		return this.getAreasForSpace(spaceId);
	}

	getFocusAreaById(id: string): Area | undefined {
		return this.getAreaById(id);
	}

	selectFocusArea(spaceId: string, areaId: string | null): void {
		this.selectArea(spaceId, areaId);
	}

	getSelectedFocusArea(spaceId: string): string | null {
		return this.getSelectedArea(spaceId);
	}
}

export const areaStore = new AreaStore();

// Backwards compatibility export
export { areaStore as focusAreaStore };
