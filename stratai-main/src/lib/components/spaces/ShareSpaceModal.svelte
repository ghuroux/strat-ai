<script lang="ts">
	/**
	 * ShareSpaceModal.svelte - Space member management modal
	 *
	 * Allows space owners/admins to manage space members:
	 * - View current members with roles
	 * - Add new members (users or groups)
	 * - Change member roles
	 * - Remove members
	 *
	 * Key differences from ShareAreaModal:
	 * - No "Access Control" section (Spaces don't have is_restricted)
	 * - No "Space membership required" prompt (we're adding TO the Space)
	 * - Title: "Manage Members" not "Share"
	 */

	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { X, Loader2, AlertCircle } from 'lucide-svelte';
	import type { Space } from '$lib/types/spaces';
	import type { SpaceMembershipWithUser, SpaceRole } from '$lib/types/space-memberships';
	import { SPACE_ROLE_LABELS, canManageSpaceMembers } from '$lib/types/space-memberships';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import SpaceMemberList from './SpaceMemberList.svelte';
	import SpaceMemberSearchInput from './SpaceMemberSearchInput.svelte';

	interface User {
		id: string;
		displayName: string | null;
		email: string;
	}

	interface Group {
		id: string;
		name: string;
		description: string | null;
	}

	interface Props {
		open: boolean;
		space: Space | null;
		onClose: () => void;
	}

	let { open, space, onClose }: Props = $props();

	// State
	let members = $state<SpaceMembershipWithUser[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Add/Remove state
	let showRemoveConfirm = $state(false);
	let memberToRemove = $state<SpaceMembershipWithUser | null>(null);
	let isRemoving = $state(false);
	let removingMemberId = $state<string | null>(null);
	let isAddingMember = $state(false);

	// Mobile detection
	let isMobile = $state(false);

	// Derived
	let currentUserId = $derived(userStore.id ?? null);
	let userRole = $derived.by(() => {
		if (!space?.id || !currentUserId) return null;
		return spacesStore.getUserRoleInSpace(space.id, currentUserId);
	});
	let canManage = $derived(canManageSpaceMembers(userRole));

	// Load members when modal opens
	$effect(() => {
		if (open && space?.id) {
			loadMembers();
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

	async function loadMembers() {
		if (!space?.id) return;

		isLoading = true;
		error = null;

		try {
			await spacesStore.loadMembers(space.id, true); // Force reload
			members = spacesStore.getMembersForSpace(space.id);
		} catch (e) {
			console.error('Failed to load space members:', e);

			// Set user-friendly error message
			if (e instanceof Error) {
				if (e.message.includes('403')) {
					error = "Access denied. You don't have permission to view members.";
				} else if (e.message.includes('404')) {
					error = 'Space not found.';
				} else {
					error = 'Failed to load members. Please try again.';
				}
			} else {
				error = 'Failed to load members. Please try again.';
			}
		} finally {
			isLoading = false;
		}
	}

	// Handle keyboard events
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isLoading && !showRemoveConfirm) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isLoading && !showRemoveConfirm) {
			onClose();
		}
	}

	// Add member handler
	async function handleAddMember(entity: User | Group, role: SpaceRole) {
		if (!space?.id) return;

		isAddingMember = true;
		error = null;

		const input = {
			targetUserId: 'email' in entity ? entity.id : undefined,
			groupId: !('email' in entity) ? entity.id : undefined,
			role
		};

		const entityName = 'email' in entity ? entity.displayName || 'User' : entity.name;

		try {
			const success = await spacesStore.addMember(space.id, input);

			if (success) {
				toastStore.success(`Added ${entityName} as ${SPACE_ROLE_LABELS[role]}`);
				// Members list updates automatically via store reactivity
				members = spacesStore.getMembersForSpace(space.id);
			} else {
				error = spacesStore.lastMemberError || 'Failed to add member';
				toastStore.error(error);
			}
		} catch (e) {
			error = 'Failed to add member';
			toastStore.error(error);
			console.error('Add member error:', e);
		} finally {
			isAddingMember = false;
		}
	}

	// Get member name helper
	function getMemberName(member: SpaceMembershipWithUser): string {
		return member.user?.displayName ?? member.group?.name ?? 'Member';
	}

	// Initiate remove (show confirmation)
	function handleInitiateRemove(memberId: string, memberName: string) {
		const member = members.find((m) => m.id === memberId);
		if (!member) return;

		memberToRemove = member;
		showRemoveConfirm = true;
	}

	// Confirm and remove member
	async function handleRemoveMember() {
		if (!memberToRemove || !space?.id) return;

		const memberName = getMemberName(memberToRemove);
		const memberId = memberToRemove.id;

		isRemoving = true;
		removingMemberId = memberId;

		try {
			const success = await spacesStore.removeMember(space.id, memberId);

			if (success) {
				toastStore.success(`Removed ${memberName}`);
				showRemoveConfirm = false;
				memberToRemove = null;
				// Members list updates automatically via store reactivity
				members = spacesStore.getMembersForSpace(space.id);
			} else {
				error = spacesStore.lastMemberError || 'Failed to remove member';
				toastStore.error(error);
			}
		} catch (e) {
			error = 'Failed to remove member';
			toastStore.error(error);
			console.error('Remove member error:', e);
		} finally {
			isRemoving = false;
			removingMemberId = null;
		}
	}

	// Cancel remove confirmation
	function handleCancelRemove() {
		showRemoveConfirm = false;
		memberToRemove = null;
	}

	// Handle role change from dropdown
	async function handleRoleChange(memberId: string, newRole: SpaceRole, memberName: string) {
		if (!space?.id) return;

		error = null;

		try {
			const success = await spacesStore.updateMemberRole(space.id, memberId, newRole);

			if (success) {
				toastStore.success(`Changed ${memberName} to ${SPACE_ROLE_LABELS[newRole]}`);
				// Members list updates automatically via store reactivity
				members = spacesStore.getMembersForSpace(space.id);
			} else {
				error = spacesStore.lastMemberError || 'Failed to update role';
				toastStore.error(error);
			}
		} catch (e) {
			error = 'Failed to update role';
			toastStore.error(error);
			console.error('Role change error:', e);
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
			aria-labelledby="modal-title"
		>
			<!-- Header -->
			<div class="modal-header">
				<h2 id="modal-title" class="modal-title">
					Manage {space?.name ?? 'Space'} Members
				</h2>
				<button class="close-button" onclick={onClose} aria-label="Close modal" title="Close">
					<X size={20} strokeWidth={2} />
				</button>
			</div>

			<!-- Content -->
			<div class="modal-content">
				{#if isLoading}
					<!-- Loading state -->
					<div class="loading-state">
						<Loader2 size={32} class="spinner" strokeWidth={2} />
						<p class="loading-text">Loading members...</p>
					</div>
				{:else if error && !showRemoveConfirm}
					<!-- Error state -->
					<div class="error-state">
						<AlertCircle size={32} strokeWidth={2} />
						<p class="error-text">{error}</p>
					</div>
				{:else}
					<!-- Add Members Section -->
					{#if canManage}
						<section class="add-member-section">
							<label class="section-label">Add people or groups</label>
							<SpaceMemberSearchInput spaceId={space?.id ?? ''} onSelect={handleAddMember} />
						</section>
					{/if}

					<!-- Member list -->
					<section class="member-section">
						<h3 class="section-header">Current Members ({members.length})</h3>
						{#if members.length === 0}
							<div class="empty-state">
								<p class="empty-text">No members yet</p>
								<p class="empty-hint">Add users or groups to give them access to this space.</p>
							</div>
						{:else}
							<SpaceMemberList
								{members}
								{currentUserId}
								{canManage}
								spaceId={space?.id ?? ''}
								onRemove={handleInitiateRemove}
								onRoleChange={handleRoleChange}
								{removingMemberId}
							/>
						{/if}
					</section>
				{/if}
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isLoading}>Close</button>
			</div>
		</div>
	</div>
{/if}

<!-- Remove Member Confirmation Modal -->
{#if showRemoveConfirm && memberToRemove}
	<div
		class="modal-backdrop confirm-backdrop"
		transition:fade={{ duration: 150 }}
		role="presentation"
	>
		<div class="confirm-modal" transition:fly={{ y: 20, duration: 200 }} role="alertdialog">
			<div class="confirm-header">
				<h3 class="confirm-title">Remove Member</h3>
			</div>
			<div class="confirm-content">
				<p>
					Are you sure you want to remove <strong>{getMemberName(memberToRemove)}</strong> from this
					space?
				</p>
				<p class="confirm-hint">
					They will lose access to all areas and content in this space.
				</p>
			</div>
			<div class="confirm-footer">
				<button class="btn-secondary" onclick={handleCancelRemove} disabled={isRemoving}>
					Cancel
				</button>
				<button class="btn-danger" onclick={handleRemoveMember} disabled={isRemoving}>
					{#if isRemoving}
						<Loader2 size={16} class="spinner" />
						Removing...
					{:else}
						Remove
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

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

	.confirm-backdrop {
		z-index: 110;
	}

	.modal {
		width: 100%;
		max-width: 28rem;
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
		from {
			transform: rotate(0deg);
		}
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

	/* Empty state */
	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
	}

	.empty-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 0.5rem 0;
	}

	.empty-hint {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	/* Add Member Section */
	.add-member-section {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.section-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 0.5rem;
	}

	/* Member Section */
	.member-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-header {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
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

	/* Confirm Modal */
	.confirm-modal {
		width: 100%;
		max-width: 24rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.confirm-header {
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.confirm-title {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
	}

	.confirm-content {
		padding: 1.25rem;
	}

	.confirm-content p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 0.5rem 0;
	}

	.confirm-hint {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5) !important;
	}

	.confirm-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
	}

	.btn-danger {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: #ef4444;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger :global(.spinner) {
		animation: spin 1s linear infinite;
	}

	/* Light mode */
	:global(html.light) .modal,
	:global(html.light) .confirm-modal {
		background: #ffffff;
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(html.light) .modal-header,
	:global(html.light) .modal-footer,
	:global(html.light) .confirm-header,
	:global(html.light) .confirm-footer {
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .modal-title,
	:global(html.light) .confirm-title {
		color: rgba(0, 0, 0, 0.95);
	}

	:global(html.light) .close-button {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .close-button:hover {
		color: rgba(0, 0, 0, 0.9);
		background: rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .add-member-section {
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .section-label {
		color: rgba(0, 0, 0, 0.7);
	}

	:global(html.light) .section-header {
		color: rgba(0, 0, 0, 0.6);
	}

	:global(html.light) .loading-state :global(.spinner) {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .loading-text,
	:global(html.light) .error-text {
		color: rgba(0, 0, 0, 0.7);
	}

	:global(html.light) .empty-text {
		color: rgba(0, 0, 0, 0.6);
	}

	:global(html.light) .empty-hint {
		color: rgba(0, 0, 0, 0.4);
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

	:global(html.light) .modal-footer,
	:global(html.light) .confirm-footer {
		background: rgba(0, 0, 0, 0.02);
	}

	:global(html.light) .confirm-content p {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .confirm-hint {
		color: rgba(0, 0, 0, 0.5) !important;
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

		.modal.mobile-fullscreen .add-member-section {
			position: sticky;
			top: 3.75rem;
			background: rgb(23, 23, 23);
			z-index: 9;
			margin-bottom: 0;
			padding-bottom: 1rem;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		}

		.modal.mobile-fullscreen .modal-content {
			padding: 1rem;
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
		}

		.modal.mobile-fullscreen :global(.remove-button),
		.modal.mobile-fullscreen :global(.role-trigger) {
			min-width: 44px;
			min-height: 44px;
		}
	}

	/* Light mode mobile */
	@media (max-width: 768px) {
		:global(html.light) .modal.mobile-fullscreen .modal-header {
			background: #ffffff;
		}

		:global(html.light) .modal.mobile-fullscreen .add-member-section {
			background: #ffffff;
		}
	}
</style>
