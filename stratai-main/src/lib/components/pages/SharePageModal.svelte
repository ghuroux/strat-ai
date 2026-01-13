<script lang="ts">
	/**
	 * SharePageModal.svelte - Page sharing and permission management
	 *
	 * Main modal for managing page visibility and sharing:
	 * - 3 visibility options (private/area/space) as radio cards
	 * - User/group search and invite (private pages only)
	 * - Permission management (viewer/editor/admin)
	 * - Confirmation dialogs for destructive actions
	 *
	 * Pattern: Follows ShareAreaModal.svelte for consistency.
	 */

	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { X, Loader2, AlertCircle, Lock, Globe, Users, User } from 'lucide-svelte';
	import type { Page, PageVisibility } from '$lib/types/page';
	import type {
		PageUserShareWithDetails,
		PageGroupShareWithDetails,
		PagePermission,
		GetPageSharesResponse
	} from '$lib/types/page-sharing';
	import { userStore } from '$lib/stores/user.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import PageShareList from './PageShareList.svelte';
	import PageMemberSearchInput from './PageMemberSearchInput.svelte';
	import RemovePageShareConfirmModal from './RemovePageShareConfirmModal.svelte';
	import VisibilityChangeConfirmModal from './VisibilityChangeConfirmModal.svelte';

	// Local types for search results (avoid conflict with other imports)
	interface SearchUser {
		id: string;
		displayName: string | null;
		username: string;
		email: string;
	}

	interface SearchGroup {
		id: string;
		name: string;
		description: string | null;
		memberCount: number;
	}

	interface Props {
		open: boolean;
		page: Page | null;
		areaId: string;
		areaName: string;
		spaceName: string;
		currentUserId: string;
		onClose: () => void;
		onVisibilityChange?: (visibility: PageVisibility) => void;
	}

	let {
		open,
		page,
		areaId,
		areaName,
		spaceName,
		currentUserId,
		onClose,
		onVisibilityChange
	}: Props = $props();

	// State
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let userShares = $state<PageUserShareWithDetails[]>([]);
	let groupShares = $state<PageGroupShareWithDetails[]>([]);
	let currentVisibility = $state<PageVisibility>('private');

	// Confirmation modals
	let showRemoveConfirm = $state(false);
	let shareToRemove = $state<{
		userId: string | null;
		groupId: string | null;
		name: string;
		type: 'user' | 'group';
	} | null>(null);
	let showVisibilityConfirm = $state(false);
	let pendingVisibility = $state<PageVisibility | null>(null);

	// Operation states
	let isAddingShare = $state(false);
	let removingId = $state<string | null>(null);
	let isChangingVisibility = $state(false);

	// Mobile detection
	let isMobile = $state(false);

	// Derived
	let shareCount = $derived(userShares.length + groupShares.length);
	let excludeUserIds = $derived([
		page?.userId ?? '',
		...userShares.map((s) => s.userId)
	].filter(Boolean));
	let excludeGroupIds = $derived(groupShares.map((s) => s.groupId));
	let isOwner = $derived(page?.userId === currentUserId);
	let canManage = $derived(isOwner); // For now, only owner can manage. Later: check user permission

	// Owner info for display
	let ownerInfo = $derived({
		id: page?.userId ?? '',
		name: page?.userId === currentUserId ? userStore.displayName ?? 'You' : 'Owner',
		email: page?.userId === currentUserId ? userStore.email : null
	});

	// Load shares when modal opens
	$effect(() => {
		if (open && page?.id) {
			loadShares();
			currentVisibility = page.visibility ?? 'private';
		}
	});

	// Mobile detection
	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	async function loadShares() {
		if (!page?.id) return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/pages/${page.id}/share`);

			if (!response.ok) {
				if (response.status === 403) {
					error = "You don't have permission to view sharing settings.";
				} else if (response.status === 404) {
					error = 'Page not found.';
				} else {
					throw new Error(`API error: ${response.status}`);
				}
				return;
			}

			const data: GetPageSharesResponse = await response.json();
			userShares = data.users;
			groupShares = data.groups;
		} catch (e) {
			console.error('Failed to load shares:', e);
			error = 'Failed to load sharing settings. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	// Handle keyboard events
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isLoading && !showRemoveConfirm && !showVisibilityConfirm) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isLoading && !showRemoveConfirm && !showVisibilityConfirm) {
			onClose();
		}
	}

	// Handle visibility selection
	function handleVisibilitySelect(newVisibility: PageVisibility) {
		if (newVisibility === currentVisibility) return;

		// If changing from private to area/space and we have shares, confirm first
		if (currentVisibility === 'private' && shareCount > 0 && newVisibility !== 'private') {
			pendingVisibility = newVisibility;
			showVisibilityConfirm = true;
		} else {
			changeVisibility(newVisibility);
		}
	}

	// Perform visibility change
	async function changeVisibility(newVisibility: PageVisibility) {
		if (!page?.id) return;

		isChangingVisibility = true;
		error = null;

		try {
			const response = await fetch(`/api/pages/${page.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ visibility: newVisibility })
			});

			if (!response.ok) {
				throw new Error(`Failed to change visibility: ${response.status}`);
			}

			currentVisibility = newVisibility;
			onVisibilityChange?.(newVisibility);

			// If we changed away from private, shares were cleared
			if (newVisibility !== 'private') {
				userShares = [];
				groupShares = [];
			}

			const visibilityLabels: Record<PageVisibility, string> = {
				private: 'private',
				area: `visible to ${areaName}`,
				space: `visible to ${spaceName}`
			};
			toastStore.success(`Page is now ${visibilityLabels[newVisibility]}`);
		} catch (e) {
			console.error('Failed to change visibility:', e);
			toastStore.error('Failed to change visibility');
		} finally {
			isChangingVisibility = false;
			showVisibilityConfirm = false;
			pendingVisibility = null;
		}
	}

	// Handle add member
	async function handleAddShare(entity: SearchUser | SearchGroup, permission: PagePermission) {
		if (!page?.id) return;

		isAddingShare = true;
		error = null;

		const isUser = 'email' in entity;
		const entityName = isUser ? entity.displayName || entity.username : entity.name;

		try {
			const body = isUser
				? { userId: entity.id, permission }
				: { groupId: entity.id, permission };

			const response = await fetch(`/api/pages/${page.id}/share`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Add share failed: ${response.status}`);
			}

			// Reload shares to get updated list
			await loadShares();
			toastStore.success(`Added ${entityName} as ${permission}`);
		} catch (e) {
			console.error('Failed to add share:', e);
			const message = e instanceof Error ? e.message : 'Failed to add share';
			toastStore.error(message);
		} finally {
			isAddingShare = false;
		}
	}

	// Handle permission change
	async function handlePermissionChange(
		userId: string | null,
		groupId: string | null,
		newPermission: PagePermission,
		memberName: string
	) {
		if (!page?.id) return;

		error = null;

		try {
			const endpoint = userId
				? `/api/pages/${page.id}/share/users/${userId}`
				: `/api/pages/${page.id}/share/groups/${groupId}`;

			const response = await fetch(endpoint, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ permission: newPermission })
			});

			if (!response.ok) {
				throw new Error(`Failed to update permission: ${response.status}`);
			}

			// Reload shares to get updated list
			await loadShares();
			toastStore.success(`Changed ${memberName} to ${newPermission}`);
		} catch (e) {
			console.error('Failed to update permission:', e);
			toastStore.error('Failed to update permission');
		}
	}

	// Initiate remove (show confirmation)
	function handleInitiateRemove(userId: string | null, groupId: string | null, name: string) {
		shareToRemove = {
			userId,
			groupId,
			name,
			type: userId ? 'user' : 'group'
		};
		showRemoveConfirm = true;
	}

	// Confirm and remove share
	async function handleRemoveShare() {
		if (!shareToRemove || !page?.id) return;

		const { userId, groupId, name } = shareToRemove;

		// Find the share ID for removingId state
		const shareId = userId
			? userShares.find((s) => s.userId === userId)?.id
			: groupShares.find((s) => s.groupId === groupId)?.id;

		removingId = shareId ?? null;

		try {
			const endpoint = userId
				? `/api/pages/${page.id}/share/users/${userId}`
				: `/api/pages/${page.id}/share/groups/${groupId}`;

			const response = await fetch(endpoint, { method: 'DELETE' });

			if (!response.ok && response.status !== 404) {
				throw new Error(`Failed to remove share: ${response.status}`);
			}

			// Reload shares to get updated list
			await loadShares();
			toastStore.success(`Removed ${name}`);
			showRemoveConfirm = false;
			shareToRemove = null;
		} catch (e) {
			console.error('Failed to remove share:', e);
			toastStore.error('Failed to remove share');
		} finally {
			removingId = null;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="modal-backdrop"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="presentation"
	>
		<div
			class="modal"
			class:mobile-fullscreen={isMobile}
			transition:fly={{ y: isMobile ? window.innerHeight : 20, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<!-- Header -->
			<div class="modal-header">
				<h2 id="modal-title" class="modal-title">
					Share "{page?.title ?? 'Page'}"
				</h2>
				<button class="close-button" onclick={onClose} aria-label="Close modal" title="Close">
					<X size={20} strokeWidth={2} />
				</button>
			</div>

			<!-- Content -->
			<div class="modal-content">
				{#if isLoading}
					<div class="loading-state">
						<Loader2 size={32} class="spinner" strokeWidth={2} />
						<p class="loading-text">Loading sharing settings...</p>
					</div>
				{:else if error}
					<div class="error-state">
						<AlertCircle size={32} strokeWidth={2} />
						<p class="error-text">{error}</p>
					</div>
				{:else}
					<!-- Visibility Section -->
					<section class="visibility-section">
						<h3 class="section-header">Page Visibility</h3>
						<div class="visibility-options">
							<!-- Private -->
							<button
								class="visibility-card"
								class:selected={currentVisibility === 'private'}
								onclick={() => handleVisibilitySelect('private')}
								disabled={isChangingVisibility}
							>
								<div class="visibility-icon private">
									<Lock size={20} strokeWidth={2} />
								</div>
								<div class="visibility-info">
									<span class="visibility-title">Private</span>
									<span class="visibility-description">Only you and people you invite</span>
								</div>
								{#if currentVisibility === 'private'}
									<span class="check-indicator">
										<svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
											<path d="M13 4L6 11L3 8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
										</svg>
									</span>
								{/if}
							</button>

							<!-- Area -->
							<button
								class="visibility-card"
								class:selected={currentVisibility === 'area'}
								onclick={() => handleVisibilitySelect('area')}
								disabled={isChangingVisibility}
							>
								<div class="visibility-icon area">
									<Users size={20} strokeWidth={2} />
								</div>
								<div class="visibility-info">
									<span class="visibility-title">Area</span>
									<span class="visibility-description">All members of {areaName}</span>
								</div>
								{#if currentVisibility === 'area'}
									<span class="check-indicator">
										<svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
											<path d="M13 4L6 11L3 8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
										</svg>
									</span>
								{/if}
							</button>

							<!-- Space -->
							<button
								class="visibility-card"
								class:selected={currentVisibility === 'space'}
								onclick={() => handleVisibilitySelect('space')}
								disabled={isChangingVisibility}
							>
								<div class="visibility-icon space">
									<Globe size={20} strokeWidth={2} />
								</div>
								<div class="visibility-info">
									<span class="visibility-title">Space</span>
									<span class="visibility-description">All members of {spaceName}</span>
								</div>
								{#if currentVisibility === 'space'}
									<span class="check-indicator">
										<svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
											<path d="M13 4L6 11L3 8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
										</svg>
									</span>
								{/if}
							</button>
						</div>

						{#if isChangingVisibility}
							<div class="visibility-loading">
								<Loader2 size={16} class="spinner" />
								<span>Changing visibility...</span>
							</div>
						{/if}
					</section>

					<!-- Add People Section (Private only) -->
					{#if currentVisibility === 'private' && canManage}
						<section class="add-share-section">
							<h3 class="section-header">Add People or Groups</h3>
							<PageMemberSearchInput
								{areaId}
								{excludeUserIds}
								{excludeGroupIds}
								onSelect={handleAddShare}
							/>
							{#if isAddingShare}
								<div class="adding-indicator">
									<Loader2 size={14} class="spinner" />
									<span>Adding...</span>
								</div>
							{/if}
						</section>
					{/if}

					<!-- Current Shares Section (Private only) -->
					{#if currentVisibility === 'private'}
						<section class="shares-section">
							<h3 class="section-header">
								People with Access ({shareCount + 1})
							</h3>
							<PageShareList
								users={userShares}
								groups={groupShares}
								owner={ownerInfo}
								{currentUserId}
								{canManage}
								onPermissionChange={handlePermissionChange}
								onRemove={handleInitiateRemove}
								{removingId}
							/>
						</section>
					{/if}

					<!-- Info Box -->
					<div class="info-box">
						{#if currentVisibility === 'private'}
							<User size={16} />
							<span>Only you and {shareCount} {shareCount === 1 ? 'person' : 'people'} you've invited can access this page.</span>
						{:else if currentVisibility === 'area'}
							<Users size={16} />
							<span>All members of <strong>{areaName}</strong> can access this page based on their area role.</span>
						{:else}
							<Globe size={16} />
							<span>All members of <strong>{spaceName}</strong> can access this page based on their space role.</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isLoading}>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Remove Share Confirmation Modal -->
<RemovePageShareConfirmModal
	open={showRemoveConfirm}
	shareName={shareToRemove?.name ?? ''}
	shareType={shareToRemove?.type ?? 'user'}
	onClose={() => {
		showRemoveConfirm = false;
		shareToRemove = null;
	}}
	onConfirm={handleRemoveShare}
/>

<!-- Visibility Change Confirmation Modal -->
<VisibilityChangeConfirmModal
	open={showVisibilityConfirm}
	newVisibility={pendingVisibility ?? 'area'}
	{shareCount}
	{areaName}
	{spaceName}
	onClose={() => {
		showVisibilityConfirm = false;
		pendingVisibility = null;
	}}
	onConfirm={() => changeVisibility(pendingVisibility!)}
/>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		z-index: 100;
	}

	.modal {
		width: 100%;
		max-width: 32rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		max-height: 90vh;
		display: flex;
		flex-direction: column;
	}

	/* Header */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: calc(100% - 3rem);
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.close-button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
	}

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		min-height: 200px;
	}

	/* States */
	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
		gap: 1rem;
	}

	.loading-state :global(.spinner) {
		color: rgba(255, 255, 255, 0.5);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.error-state :global(svg) {
		color: #ef4444;
	}

	.error-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
	}

	/* Section headers */
	.section-header {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 0.75rem 0;
	}

	/* Visibility Section */
	.visibility-section {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.visibility-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.visibility-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.875rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.visibility-card:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.visibility-card:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.visibility-card.selected {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.3);
	}

	.visibility-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.5rem;
		flex-shrink: 0;
	}

	.visibility-icon.private {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.visibility-icon.area {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.visibility-icon.space {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
	}

	.visibility-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.visibility-title {
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.visibility-description {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.check-indicator {
		width: 1.25rem;
		height: 1.25rem;
		color: #3b82f6;
		flex-shrink: 0;
	}

	.visibility-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.visibility-loading :global(.spinner) {
		animation: spin 1s linear infinite;
	}

	/* Add Share Section */
	.add-share-section {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.adding-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.adding-indicator :global(.spinner) {
		animation: spin 1s linear infinite;
	}

	/* Shares Section */
	.shares-section {
		margin-bottom: 1.5rem;
		overflow: visible; /* Allow permission dropdown to overflow */
		padding-bottom: 8rem; /* Extra space for dropdown when last item is selected */
	}

	/* Info Box */
	.info-box {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.875rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.5;
	}

	.info-box :global(svg) {
		flex-shrink: 0;
		margin-top: 0.125rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.info-box strong {
		color: rgba(255, 255, 255, 0.8);
	}

	/* Footer */
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Light mode */
	:global(html.light) .modal {
		background: #ffffff;
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(html.light) .modal-header,
	:global(html.light) .modal-footer {
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .modal-title {
		color: rgba(0, 0, 0, 0.95);
	}

	:global(html.light) .close-button {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .close-button:hover {
		color: rgba(0, 0, 0, 0.9);
		background: rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .section-header {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .visibility-section,
	:global(html.light) .add-share-section {
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .visibility-card {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .visibility-card:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.12);
	}

	:global(html.light) .visibility-card.selected {
		background: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.25);
	}

	:global(html.light) .visibility-title {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .visibility-description {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .check-indicator {
		color: #2563eb;
	}

	:global(html.light) .visibility-loading,
	:global(html.light) .adding-indicator {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .info-box {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.08);
		color: rgba(0, 0, 0, 0.6);
	}

	:global(html.light) .info-box :global(svg) {
		color: rgba(0, 0, 0, 0.4);
	}

	:global(html.light) .info-box strong {
		color: rgba(0, 0, 0, 0.8);
	}

	:global(html.light) .loading-state :global(.spinner) {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .loading-text,
	:global(html.light) .error-text {
		color: rgba(0, 0, 0, 0.7);
	}

	:global(html.light) .btn-secondary {
		color: rgba(0, 0, 0, 0.9);
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.2);
	}

	:global(html.light) .btn-secondary:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.1);
		border-color: rgba(0, 0, 0, 0.3);
	}

	:global(html.light) .modal-footer {
		background: rgba(0, 0, 0, 0.02);
	}

	/* Mobile full-screen optimization */
	@media (max-width: 768px) {
		.modal.mobile-fullscreen {
			max-width: 100%;
			max-height: 100%;
			height: 100vh;
			border-radius: 0;
			margin: 0;
		}

		.modal.mobile-fullscreen .modal-header {
			position: sticky;
			top: 0;
			background: rgb(23, 23, 23);
			z-index: 10;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}

		.modal.mobile-fullscreen .modal-content {
			padding: 1rem;
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
		}

		.modal.mobile-fullscreen .visibility-card {
			min-height: 64px;
		}
	}

	/* Light mode mobile */
	@media (max-width: 768px) {
		:global(html.light) .modal.mobile-fullscreen .modal-header {
			background: #ffffff;
		}
	}
</style>
