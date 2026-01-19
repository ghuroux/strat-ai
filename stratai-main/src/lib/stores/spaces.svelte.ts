/**
 * Spaces Store - Space management with PostgreSQL persistence
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 *
 * Handles:
 * - Space CRUD operations (custom spaces only for create/delete)
 * - System space seeding
 * - Space lookup by slug
 */

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { Space, CreateSpaceInput, UpdateSpaceInput } from '$lib/types/spaces';
import type { SpaceMembershipWithUser, SpaceRole } from '$lib/types/space-memberships';
import { toastStore } from './toast.svelte';
import { debugLog } from '$lib/utils/debug';

class SpacesStore {
	// Space cache by ID
	spaces = new SvelteMap<string, Space>();

	// Space lookup by slug for URL routing
	spacesBySlug = new SvelteMap<string, Space>();

	// Loading and error states
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Version counter for fine-grained reactivity
	_version = $state(0);

	// Track if spaces have been loaded
	private loaded = $state(false);

	// ============================================
	// MEMBER MANAGEMENT STATE
	// ============================================

	// Member cache by space ID
	membersBySpaceId = new SvelteMap<string, SpaceMembershipWithUser[]>();

	// Track which spaces have had members loaded
	private membersLoadedSet = new SvelteSet<string>();

	// Loading state per space
	private membersLoading = new SvelteMap<string, boolean>();

	// Member-specific errors
	lastMemberError = $state<string | null>(null);
	lastMemberErrorData = $state<{ code: string; [key: string]: unknown } | null>(null);

	// Member version counter for reactivity
	private _memberVersion = $state(0);

	// ============================================
	// PINNING STATE (Phase C: Navigation Redesign)
	// ============================================

	// Track pinned count for UI display
	pinnedCount = $state(0);

	// Pinning operation in progress
	isPinning = $state(false);

	// Pinning-specific error
	lastPinError = $state<string | null>(null);
	lastPinErrorCode = $state<string | null>(null);

	/**
	 * Load all spaces (system + custom)
	 */
	async loadSpaces(): Promise<void> {
		if (this.loaded) return;

		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch('/api/spaces');

			if (!response.ok) {
				if (response.status === 401) return;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.spaces) {
				for (const s of data.spaces) {
					const space: Space = {
						...s,
						createdAt: new Date(s.createdAt),
						updatedAt: new Date(s.updatedAt)
					};

					this.spaces.set(space.id, space);
					this.spacesBySlug.set(space.slug, space);
				}

				this.loaded = true;
				this._version++;
			}
		} catch (e) {
			debugLog('SPACES_STORE', 'Failed to load spaces:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load spaces';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Create a new custom space
	 */
	async createSpace(input: CreateSpaceInput): Promise<Space | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch('/api/spaces', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Create failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.space) {
				const space: Space = {
					...data.space,
					createdAt: new Date(data.space.createdAt),
					updatedAt: new Date(data.space.updatedAt)
				};

				this.spaces.set(space.id, space);
				this.spacesBySlug.set(space.slug, space);
				this._version++;
				toastStore.success('Space created');
				return space;
			}
			return null;
		} catch (e) {
			debugLog('SPACES_STORE', 'Failed to create space:', e);
			this.error = e instanceof Error ? e.message : 'Failed to create space';
			toastStore.error(this.error);
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Update a space
	 * Note: System spaces only allow context updates
	 */
	async updateSpace(id: string, updates: UpdateSpaceInput): Promise<Space | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const oldSpace = this.spaces.get(id);

			const response = await fetch(`/api/spaces/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Update failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.space) {
				const space: Space = {
					...data.space,
					createdAt: new Date(data.space.createdAt),
					updatedAt: new Date(data.space.updatedAt)
				};

				// Update cache
				this.spaces.set(space.id, space);

				// Update slug lookup if slug changed
				if (oldSpace && oldSpace.slug !== space.slug) {
					this.spacesBySlug.delete(oldSpace.slug);
				}
				this.spacesBySlug.set(space.slug, space);

				this._version++;
				toastStore.success('Space updated');
				return space;
			}
			return null;
		} catch (e) {
			debugLog('SPACES_STORE', 'Failed to update space:', e);
			this.error = e instanceof Error ? e.message : 'Failed to update space';
			toastStore.error(this.error);
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Delete a custom space
	 * Note: System spaces cannot be deleted
	 * Returns cascade counts for toast message (US-008)
	 */
	async deleteSpace(id: string): Promise<boolean> {
		this.isLoading = true;
		this.error = null;

		try {
			const space = this.spaces.get(id);
			if (!space) return false;

			const response = await fetch(`/api/spaces/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Delete failed: ${response.status}`);
			}

			// Parse response to get cascade counts (US-008 format)
			const data = await response.json();

			// Remove from caches
			this.spaces.delete(id);
			this.spacesBySlug.delete(space.slug);
			this._version++;

			// Build toast message with cascade counts (AC #10, #11)
			const areas = data.deleted?.areas ?? 0;
			const tasks = data.deleted?.tasks ?? 0;
			const conversations = data.deleted?.conversations ?? 0;

			if (areas > 0 || tasks > 0 || conversations > 0) {
				const parts: string[] = [];
				if (areas > 0) parts.push(`${areas} area${areas !== 1 ? 's' : ''}`);
				if (tasks > 0) parts.push(`${tasks} task${tasks !== 1 ? 's' : ''}`);
				if (conversations > 0)
					parts.push(`${conversations} conversation${conversations !== 1 ? 's' : ''}`);
				toastStore.success(`Space deleted along with ${parts.join(', ')}.`);
			} else {
				toastStore.success('Space deleted.');
			}

			return true;
		} catch (e) {
			debugLog('SPACES_STORE', 'Failed to delete space:', e);
			this.error = e instanceof Error ? e.message : 'Failed to delete space';
			toastStore.error(this.error);
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Get all spaces sorted by order (reactive)
	 */
	getAllSpaces(): Space[] {
		void this._version;
		return Array.from(this.spaces.values()).sort((a, b) => a.orderIndex - b.orderIndex);
	}

	/**
	 * Get system spaces (reactive)
	 */
	getSystemSpaces(): Space[] {
		void this._version;
		return Array.from(this.spaces.values())
			.filter((s) => s.type === 'system')
			.sort((a, b) => a.orderIndex - b.orderIndex);
	}

	/**
	 * Get custom spaces (reactive)
	 */
	getCustomSpaces(): Space[] {
		void this._version;
		return Array.from(this.spaces.values())
			.filter((s) => s.type === 'custom')
			.sort((a, b) => a.orderIndex - b.orderIndex);
	}

	/**
	 * Get a space by slug (reactive)
	 */
	getSpaceBySlug(slug: string): Space | undefined {
		void this._version;
		return this.spacesBySlug.get(slug);
	}

	/**
	 * Get a space by ID (reactive)
	 */
	getSpaceById(id: string): Space | undefined {
		void this._version;
		return this.spaces.get(id);
	}

	/**
	 * Check if spaces have been loaded
	 */
	isLoaded(): boolean {
		return this.loaded;
	}

	/**
	 * Get custom space count (reactive)
	 */
	getCustomSpaceCount(): number {
		void this._version;
		return Array.from(this.spaces.values()).filter((s) => s.type === 'custom').length;
	}

	// ============================================
	// MEMBER MANAGEMENT FUNCTIONS
	// ============================================

	/**
	 * Load members for a space
	 */
	async loadMembers(spaceId: string, forceReload = false): Promise<void> {
		// Skip if already loaded and not forcing reload
		if (!forceReload && this.membersLoadedSet.has(spaceId)) {
			return;
		}

		this.membersLoading.set(spaceId, true);
		this.lastMemberError = null;
		this.lastMemberErrorData = null;

		try {
			const response = await fetch(`/api/spaces/${spaceId}/members`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.lastMemberErrorData = errorData.error || null;
				throw new Error(errorData.error?.message || `Failed to load members: ${response.status}`);
			}

			const data = await response.json();
			if (data.members) {
				// Convert date strings to Date objects
				const members: SpaceMembershipWithUser[] = data.members.map(
					(m: SpaceMembershipWithUser & { createdAt: string; updatedAt: string }) => ({
						...m,
						createdAt: new Date(m.createdAt),
						updatedAt: new Date(m.updatedAt)
					})
				);

				this.membersBySpaceId.set(spaceId, members);
				this.membersLoadedSet.add(spaceId);
				this._memberVersion++;
			}
		} catch (e) {
			console.error('Failed to load space members:', e);
			this.lastMemberError = e instanceof Error ? e.message : 'Failed to load members';
		} finally {
			this.membersLoading.set(spaceId, false);
		}
	}

	/**
	 * Add a member to a space
	 */
	async addMember(
		spaceId: string,
		input: { targetUserId?: string; groupId?: string; role: SpaceRole }
	): Promise<boolean> {
		this.lastMemberError = null;
		this.lastMemberErrorData = null;

		try {
			const response = await fetch(`/api/spaces/${spaceId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.lastMemberErrorData = errorData.error || null;
				throw new Error(errorData.error?.message || `Failed to add member: ${response.status}`);
			}

			// Refresh member list to get hydrated data
			await this.loadMembers(spaceId, true);
			toastStore.success('Member added');
			return true;
		} catch (e) {
			debugLog('SPACES_STORE', 'Failed to add space member:', e);
			this.lastMemberError = e instanceof Error ? e.message : 'Failed to add member';
			toastStore.error(this.lastMemberError);
			return false;
		}
	}

	/**
	 * Remove a member from a space
	 */
	async removeMember(spaceId: string, memberId: string): Promise<boolean> {
		this.lastMemberError = null;
		this.lastMemberErrorData = null;

		try {
			const response = await fetch(`/api/spaces/${spaceId}/members/${memberId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.lastMemberErrorData = errorData.error || null;
				throw new Error(errorData.error?.message || `Failed to remove member: ${response.status}`);
			}

			// Remove from local cache
			const members = this.membersBySpaceId.get(spaceId);
			if (members) {
				this.membersBySpaceId.set(
					spaceId,
					members.filter((m) => m.id !== memberId)
				);
				this._memberVersion++;
			}

			toastStore.success('Member removed');
			return true;
		} catch (e) {
			console.error('Failed to remove space member:', e);
			this.lastMemberError = e instanceof Error ? e.message : 'Failed to remove member';
			toastStore.error(this.lastMemberError);
			return false;
		}
	}

	/**
	 * Update a member's role
	 */
	async updateMemberRole(spaceId: string, memberId: string, role: SpaceRole): Promise<boolean> {
		this.lastMemberError = null;
		this.lastMemberErrorData = null;

		try {
			const response = await fetch(`/api/spaces/${spaceId}/members/${memberId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role })
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.lastMemberErrorData = errorData.error || null;
				throw new Error(
					errorData.error?.message || `Failed to update member role: ${response.status}`
				);
			}

			// Update local cache
			const members = this.membersBySpaceId.get(spaceId);
			if (members) {
				const updated = members.map((m) => (m.id === memberId ? { ...m, role } : m));
				this.membersBySpaceId.set(spaceId, updated);
				this._memberVersion++;
			}

			return true;
		} catch (e) {
			console.error('Failed to update member role:', e);
			this.lastMemberError = e instanceof Error ? e.message : 'Failed to update member role';
			return false;
		}
	}

	/**
	 * Get members for a space (reactive)
	 */
	getMembersForSpace(spaceId: string): SpaceMembershipWithUser[] {
		void this._memberVersion;
		return this.membersBySpaceId.get(spaceId) || [];
	}

	/**
	 * Check if members are loading for a space
	 */
	isMembersLoading(spaceId: string): boolean {
		return this.membersLoading.get(spaceId) || false;
	}

	/**
	 * Get the current user's role in a space (from loaded members)
	 * Returns null if members not loaded or user not found
	 */
	getUserRoleInSpace(spaceId: string, userId: string): SpaceRole | null {
		void this._memberVersion;
		const members = this.membersBySpaceId.get(spaceId);
		if (!members) return null;

		const membership = members.find((m) => m.userId === userId);
		return membership?.role ?? null;
	}

	/**
	 * Clear cache (force reload)
	 */
	clearCache(): void {
		this.loaded = false;
		this.spaces.clear();
		this.spacesBySlug.clear();
		this._version++;

		// Also clear member cache
		this.membersBySpaceId.clear();
		this.membersLoadedSet.clear();
		this.membersLoading.clear();
		this._memberVersion++;

		// Reset pinning state
		this.pinnedCount = 0;
		this.lastPinError = null;
		this.lastPinErrorCode = null;
	}

	// ============================================
	// PINNING FUNCTIONS (Phase C: Navigation Redesign)
	// ============================================

	/**
	 * Maximum number of pinned spaces allowed
	 */
	static readonly MAX_PINNED = 6;

	/**
	 * Get pinned spaces (reactive)
	 * Returns spaces where isPinned=true, sorted by order
	 */
	getPinnedSpaces(): Space[] {
		void this._version;
		return Array.from(this.spaces.values())
			.filter((s) => s.isPinned === true)
			.sort((a, b) => a.orderIndex - b.orderIndex);
	}

	/**
	 * Get unpinned owned spaces (reactive)
	 * Returns spaces where isPinned=false/undefined AND userId matches currentUserId
	 */
	getUnpinnedOwnedSpaces(currentUserId: string): Space[] {
		void this._version;
		return Array.from(this.spaces.values())
			.filter((s) => s.isPinned !== true && s.userId === currentUserId)
			.sort((a, b) => a.orderIndex - b.orderIndex);
	}

	/**
	 * Get unpinned shared spaces (reactive)
	 * Returns spaces where isPinned=false/undefined AND userId != currentUserId
	 */
	getUnpinnedSharedSpaces(currentUserId: string): Space[] {
		void this._version;
		return Array.from(this.spaces.values())
			.filter((s) => s.isPinned !== true && s.userId !== currentUserId)
			.sort((a, b) => a.orderIndex - b.orderIndex);
	}

	/**
	 * Check if user can pin more spaces
	 */
	canPinMore(): boolean {
		return this.getPinnedSpaces().length < SpacesStore.MAX_PINNED;
	}

	/**
	 * Get remaining pin slots
	 */
	getRemainingPinSlots(): number {
		return Math.max(0, SpacesStore.MAX_PINNED - this.getPinnedSpaces().length);
	}

	/**
	 * Pin a space to the navigation bar
	 * Returns true on success, false on failure
	 */
	async pinSpace(spaceId: string): Promise<boolean> {
		this.lastPinError = null;
		this.lastPinErrorCode = null;

		// Pre-check: Don't call API if already at max
		if (!this.canPinMore()) {
			this.lastPinError = `Maximum ${SpacesStore.MAX_PINNED} spaces can be pinned.`;
			this.lastPinErrorCode = 'MAX_PINNED_REACHED';
			return false;
		}

		this.isPinning = true;

		try {
			const response = await fetch(`/api/spaces/${spaceId}/pin`, {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.lastPinErrorCode = errorData.code || null;
				throw new Error(errorData.error || `Failed to pin space: ${response.status}`);
			}

			const data = await response.json();

			// Update local state
			if (data.space) {
				const space = this.spaces.get(spaceId);
				if (space) {
					const updatedSpace = {
						...space,
						isPinned: true,
						updatedAt: new Date(data.space.updatedAt)
					};
					this.spaces.set(spaceId, updatedSpace);
					this.spacesBySlug.set(updatedSpace.slug, updatedSpace);
				}
			}

			// Update pinned count from server response
			if (typeof data.pinnedCount === 'number') {
				this.pinnedCount = data.pinnedCount;
			}

			this._version++;
			return true;
		} catch (e) {
			debugLog('SPACES_STORE', 'Failed to pin space:', e);
			this.lastPinError = e instanceof Error ? e.message : 'Failed to pin space';
			toastStore.error(this.lastPinError);
			return false;
		} finally {
			this.isPinning = false;
		}
	}

	/**
	 * Unpin a space from the navigation bar
	 * Returns true on success, false on failure
	 */
	async unpinSpace(spaceId: string): Promise<boolean> {
		this.lastPinError = null;
		this.lastPinErrorCode = null;
		this.isPinning = true;

		try {
			const response = await fetch(`/api/spaces/${spaceId}/unpin`, {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.lastPinErrorCode = errorData.code || null;
				throw new Error(errorData.error || `Failed to unpin space: ${response.status}`);
			}

			const data = await response.json();

			// Update local state
			if (data.space) {
				const space = this.spaces.get(spaceId);
				if (space) {
					const updatedSpace = {
						...space,
						isPinned: false,
						updatedAt: new Date(data.space.updatedAt)
					};
					this.spaces.set(spaceId, updatedSpace);
					this.spacesBySlug.set(updatedSpace.slug, updatedSpace);
				}
			}

			// Update pinned count from server response
			if (typeof data.pinnedCount === 'number') {
				this.pinnedCount = data.pinnedCount;
			}

			this._version++;
			return true;
		} catch (e) {
			debugLog('SPACES_STORE', 'Failed to unpin space:', e);
			this.lastPinError = e instanceof Error ? e.message : 'Failed to unpin space';
			toastStore.error(this.lastPinError);
			return false;
		} finally {
			this.isPinning = false;
		}
	}

	/**
	 * Remove a space from the local cache (for leave/removal scenarios)
	 * This updates the UI immediately without requiring a full reload
	 */
	removeFromCache(spaceId: string): void {
		const space = this.spaces.get(spaceId);
		if (space) {
			this.spaces.delete(spaceId);
			this.spacesBySlug.delete(space.slug);
			this.membersBySpaceId.delete(spaceId);
			this.membersLoadedSet.delete(spaceId);
			this._version++;
		}
	}

	/**
	 * Force reload all spaces (clears cache first)
	 * Use when spaces may have changed server-side (e.g., after leaving an org)
	 */
	async reloadSpaces(): Promise<void> {
		this.loaded = false;
		this.spaces.clear();
		this.spacesBySlug.clear();
		this._version++;
		await this.loadSpaces();
	}
}

export const spacesStore = new SpacesStore();
