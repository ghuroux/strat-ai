<script lang="ts">
	/**
	 * ShareAreaModal.svelte - Area sharing and member management
	 *
	 * Phase 1: Display current members with roles (read-only)
	 * Future phases will add member invite, removal, and role management.
	 *
	 * Features:
	 * - Shows all area members (users and groups)
	 * - Color-coded role badges
	 * - Highlights current user
	 * - Lock icon for owners (immutable)
	 * - Empty state for areas with no additional members
	 */

	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { X, Loader2, AlertCircle, Lock as LockIcon } from 'lucide-svelte';
	import type { Area } from '$lib/types/areas';
	import type { AreaMemberWithDetails, AreaMemberRole, AddMemberInput } from '$lib/types/area-memberships';
	import { getRoleLabel } from '$lib/types/area-memberships';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import AreaMemberList from './AreaMemberList.svelte';
	import AreaRoleBadge from './AreaRoleBadge.svelte';
	import EmptyMemberState from './EmptyMemberState.svelte';
	import AreaMemberSearchInput from './AreaMemberSearchInput.svelte';
	import RemoveMemberConfirmModal from './RemoveMemberConfirmModal.svelte';
	import AreaAccessToggle from './AreaAccessToggle.svelte';

	interface User {
		id: string;
		displayName: string | null;
		username: string;
		email: string;
	}

	interface Group {
		id: string;
		name: string;
		description: string | null;
		memberCount: number;
	}

	interface Props {
		open: boolean;
		area: Area | null;
		onClose: () => void;
	}

	let { open, area, onClose }: Props = $props();

	// State
	let members = $state<AreaMemberWithDetails[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Phase 2: Add/Remove state
	let showRemoveConfirm = $state(false);
	let memberToRemove = $state<AreaMemberWithDetails | null>(null);
	let isRemoving = $state(false);
	let removingMemberId = $state<string | null>(null);
	let isAddingMember = $state(false);

	// Phase 5: Space membership required prompt
	let notSpaceMemberPrompt = $state<{
		show: boolean;
		userId?: string;
		groupId?: string;
		entityName: string;
		role: AreaMemberRole;
		spaceName: string;
		spaceId: string;
	} | null>(null);
	let isInvitingToSpace = $state(false);

	// Phase 4: Mobile detection
	let isMobile = $state(false);

	// Derived
	let currentUserId = $derived(userStore.id ?? null);
	let userAccessInfo = $derived(area?.id ? areaStore.getAccessInfo(area.id) : null);
	let canManage = $derived(
		userAccessInfo?.userRole === 'owner' || userAccessInfo?.userRole === 'admin'
	);
	let space = $derived.by(() => {
		if (!area?.spaceId) return null;
		return spacesStore.getSpaceById(area.spaceId);
	});

	// Load members when modal opens
	$effect(() => {
		if (open && area?.id) {
			loadMembers();
		}
	});

	// Phase 4: Mobile detection
	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	async function loadMembers() {
		if (!area?.id) return;

		isLoading = true;
		error = null;

		try {
			await areaStore.loadMembers(area.id);
			members = areaStore.getMembersForArea(area.id);
		} catch (e) {
			console.error('Failed to load area members:', e);

			// Set user-friendly error message
			if (e instanceof Error) {
				if (e.message.includes('403')) {
					error = 'Access denied. You don\'t have permission to view members.';
				} else if (e.message.includes('404')) {
					error = 'Area not found.';
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
		if (e.key === 'Escape' && !isLoading) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isLoading) {
			onClose();
		}
	}

	// Phase 2: Add member handler
	async function handleAddMember(entity: User | Group, role: AreaMemberRole) {
		if (!area?.id) return;

		isAddingMember = true;
		error = null;

		const input: AddMemberInput = {
			userId: 'email' in entity ? entity.id : undefined,
			groupId: 'memberCount' in entity ? entity.id : undefined,
			role
		};

		const entityName = 'email' in entity ? entity.displayName || entity.username : entity.name;

		try {
			const success = await areaStore.addMember(area.id, input);

			if (success) {
				toastStore.success(`Added ${entityName} as ${role}`);
				// Members list updates automatically via store reactivity
				members = areaStore.getMembersForArea(area.id);
			} else {
				// Phase 5: Check for NOT_SPACE_MEMBER error
				if (areaStore.lastErrorData?.code === 'NOT_SPACE_MEMBER') {
					notSpaceMemberPrompt = {
						show: true,
						userId: input.userId,
						groupId: input.groupId,
						entityName,
						role,
						spaceName: areaStore.lastErrorData.spaceName || 'this space',
						spaceId: areaStore.lastErrorData.spaceId || ''
					};
				} else {
					error = areaStore.error || 'Failed to add member';
					toastStore.error(error);
				}
			}
		} catch (e) {
			error = 'Failed to add member';
			toastStore.error(error);
			console.error('Add member error:', e);
		} finally {
			isAddingMember = false;
		}
	}

	// Phase 5: Handle "Add to Space + Share Area" combo action
	async function handleInviteToSpaceAndShare() {
		if (!notSpaceMemberPrompt || !area?.id) return;

		isInvitingToSpace = true;
		error = null;

		try {
			// 1. Add user/group to space as guest
			const response = await fetch(`/api/spaces/${notSpaceMemberPrompt.spaceId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: notSpaceMemberPrompt.userId,
					groupId: notSpaceMemberPrompt.groupId,
					role: 'guest' // Default to guest for external sharing
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to add to space');
			}

			// 2. Now add to area (will succeed since they're a space member)
			const areaSuccess = await areaStore.addMember(area.id, {
				userId: notSpaceMemberPrompt.userId,
				groupId: notSpaceMemberPrompt.groupId,
				role: notSpaceMemberPrompt.role
			});

			if (areaSuccess) {
				toastStore.success(
					`Added ${notSpaceMemberPrompt.entityName} as guest to space and ${notSpaceMemberPrompt.role} to area`
				);
				members = areaStore.getMembersForArea(area.id);
				notSpaceMemberPrompt = null;
			} else {
				error = areaStore.error || 'Failed to add to area';
				toastStore.error(error);
			}
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Failed to invite to space';
			error = errorMsg;
			toastStore.error(errorMsg);
			console.error('Invite to space error:', e);
		} finally {
			isInvitingToSpace = false;
		}
	}

	// Phase 2: Initiate remove (show confirmation)
	function handleInitiateRemove(memberId: string, memberName: string) {
		const member = members.find((m) => m.id === memberId);
		if (!member) return;

		memberToRemove = member;
		showRemoveConfirm = true;
	}

	// Phase 2: Confirm and remove member
	async function handleRemoveMember() {
		if (!memberToRemove || !area?.id) return;

		const memberName = memberToRemove.userName ?? memberToRemove.groupName ?? 'Member';
		const memberId = memberToRemove.id;

		isRemoving = true;
		removingMemberId = memberId;

		try {
			const success = await areaStore.removeMember(area.id, memberId);

			if (success) {
				toastStore.success(`Removed ${memberName}`);
				showRemoveConfirm = false;
				memberToRemove = null;
				// Members list updates automatically via store reactivity
				members = areaStore.getMembersForArea(area.id);
			} else {
				error = areaStore.error || 'Failed to remove member';
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

	// Phase 3: Handle role change from dropdown
	async function handleRoleChange(memberId: string, newRole: AreaMemberRole, memberName: string) {
		if (!area?.id) return;

		error = null;

		try {
			const success = await areaStore.updateMemberRole(area.id, memberId, newRole);

			if (success) {
				toastStore.success(`Changed ${memberName} to ${getRoleLabel(newRole)}`);
				// Members list updates automatically via store reactivity
				members = areaStore.getMembersForArea(area.id);
			} else {
				error = areaStore.error || 'Failed to update role';
				toastStore.error(error);
			}
		} catch (e) {
			error = 'Failed to update role';
			toastStore.error(error);
			console.error('Role change error:', e);
		}
	}

	// Phase 3: Handle access control toggle
	async function handleAccessChange(newRestricted: boolean) {
		if (!area?.id) return;

		error = null;

		try {
			const success = await areaStore.updateArea(area.id, { isRestricted: newRestricted });

			if (success) {
				const message = newRestricted
					? 'Area is now restricted to invited members'
					: 'Area is now open to space members';
				toastStore.success(message);
			} else {
				error = areaStore.error || 'Failed to update access control';
				toastStore.error(error);
			}
		} catch (e) {
			error = 'Failed to update access control';
			toastStore.error(error);
			console.error('Access control error:', e);
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
				<div class="modal-title-row">
					<h2 id="modal-title" class="modal-title">
						Share {area?.name ?? 'Area'}
					</h2>
					{#if area?.isRestricted}
						<span class="restricted-badge" title="Only invited members can access">
							<LockIcon size={12} strokeWidth={2} />
							Restricted
						</span>
					{/if}
				</div>
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
				{:else if error}
					<!-- Error state -->
					<div class="error-state">
						<AlertCircle size={32} strokeWidth={2} />
						<p class="error-text">{error}</p>
					</div>
				{:else}
					<!-- Phase 2: Add Members Section -->
					{#if canManage}
						<section class="add-member-section">
							<label class="section-label">Add people or groups</label>
							<AreaMemberSearchInput areaId={area?.id ?? ''} onSelect={handleAddMember} />
						</section>
					{/if}

					<!-- Member list -->
					<section class="member-section">
						<h3 class="section-header">Current Members ({members.length})</h3>
						{#if members.length === 0}
							<EmptyMemberState />
						{:else}
							<AreaMemberList
								{members}
								{currentUserId}
								{canManage}
								areaId={area?.id ?? ''}
								onRemove={handleInitiateRemove}
								onRoleChange={handleRoleChange}
								{removingMemberId}
							/>
						{/if}
					</section>

					<!-- ACCESS CONTROL SECTION - Phase 3 -->
					{#if canManage}
						<section class="access-control-section">
							<h3 class="section-header">Access Control</h3>
							<AreaAccessToggle
								isRestricted={area?.isRestricted ?? false}
								areaName={area?.name ?? 'Area'}
								spaceName={space?.name ?? 'space'}
								onChange={handleAccessChange}
								disabled={userAccessInfo?.userRole !== 'owner'}
								isGeneral={area?.isGeneral ?? false}
							/>
						</section>
					{/if}

					<!-- Phase 5: Space membership required prompt -->
					{#if notSpaceMemberPrompt?.show}
						<div class="space-member-prompt" transition:fade={{ duration: 150 }}>
							<div class="prompt-content">
								<AlertCircle size={20} class="prompt-icon" />
								<div class="prompt-text">
									<p class="prompt-title">
										<strong>{notSpaceMemberPrompt.entityName}</strong> is not a member of "{notSpaceMemberPrompt.spaceName}".
									</p>
									<p class="prompt-hint">
										Add them to the space as a guest first to share this area.
									</p>
								</div>
							</div>
							<div class="prompt-actions">
								<button
									class="btn-secondary"
									onclick={() => (notSpaceMemberPrompt = null)}
									disabled={isInvitingToSpace}
								>
									Cancel
								</button>
								<button
									class="btn-primary"
									onclick={handleInviteToSpaceAndShare}
									disabled={isInvitingToSpace}
								>
									{#if isInvitingToSpace}
										<Loader2 size={16} class="spinner" />
										Adding...
									{:else}
										Add as Guest & Share
									{/if}
								</button>
							</div>
						</div>
					{/if}
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

<!-- Phase 2: Remove Member Confirmation Modal -->
<RemoveMemberConfirmModal
	open={showRemoveConfirm}
	member={memberToRemove}
	onClose={() => {
		showRemoveConfirm = false;
		memberToRemove = null;
	}}
	onConfirm={handleRemoveMember}
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

	.modal-title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
	}

	.restricted-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
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

	/* Access Control Section */
	.access-control-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
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

	/* Phase 5: Space membership prompt */
	.space-member-prompt {
		margin-top: 1.5rem;
		padding: 1rem;
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.3);
		border-radius: 0.5rem;
	}

	.prompt-content {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.prompt-content :global(.prompt-icon) {
		color: #fbbf24;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.prompt-text {
		flex: 1;
	}

	.prompt-title {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.95);
		margin: 0 0 0.25rem 0;
	}

	.prompt-hint {
		font-size: 0.813rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
	}

	.prompt-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: #6366f1;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary:hover:not(:disabled) {
		background: #4f46e5;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary :global(.spinner) {
		animation: spin 1s linear infinite;
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

	:global(html.light) .add-member-section {
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .section-label {
		color: rgba(0, 0, 0, 0.7);
	}

	:global(html.light) .section-header {
		color: rgba(0, 0, 0, 0.6);
	}

	:global(html.light) .access-control-section {
		border-color: rgba(0, 0, 0, 0.08);
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

	:global(html.light) .space-member-prompt {
		background: rgba(251, 191, 36, 0.08);
		border-color: rgba(217, 119, 6, 0.3);
	}

	:global(html.light) .prompt-title {
		color: rgba(0, 0, 0, 0.95);
	}

	:global(html.light) .prompt-hint {
		color: rgba(0, 0, 0, 0.6);
	}

	/* Phase 4: Mobile full-screen optimization */
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
