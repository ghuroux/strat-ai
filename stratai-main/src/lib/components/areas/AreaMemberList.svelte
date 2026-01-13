<script lang="ts">
	/**
	 * AreaMemberList.svelte - Display list of area members
	 *
	 * Shows all members with avatars, names, emails, and role badges.
	 * Highlights current user and indicates immutable roles (owner).
	 */

	import { fade } from 'svelte/transition';
	import { Lock, Users as GroupIcon, X, Loader2 } from 'lucide-svelte';
	import type { AreaMemberWithDetails, AreaMemberRole } from '$lib/types/area-memberships';
	import AreaRoleBadge from './AreaRoleBadge.svelte';
	import AreaRoleSelector from './AreaRoleSelector.svelte';

	interface Props {
		members: AreaMemberWithDetails[];
		currentUserId: string | null;
		canManage: boolean;
		areaId: string; // Phase 3: For role selector
		onRemove?: (memberId: string, memberName: string) => void;
		onRoleChange?: (memberId: string, newRole: AreaMemberRole, memberName: string) => Promise<void>; // Phase 3
		removingMemberId?: string | null;
	}

	let { members, currentUserId, canManage, areaId, onRemove, onRoleChange, removingMemberId }: Props =
		$props();

	// Sort members: owners first, then alphabetically by name
	let sortedMembers = $derived.by(() => {
		const membersCopy = [...members];

		membersCopy.sort((a, b) => {
			// Owners first
			if (a.role === 'owner' && b.role !== 'owner') return -1;
			if (a.role !== 'owner' && b.role === 'owner') return 1;

			// Then alphabetically by name
			const nameA = a.userName ?? a.groupName ?? '';
			const nameB = b.userName ?? b.groupName ?? '';
			return nameA.localeCompare(nameB);
		});

		return membersCopy;
	});

	// Phase 4: Staggered animation delay
	function getDelay(index: number): number {
		return Math.min(index * 50, 500); // Max 500ms delay
	}
</script>

<ul class="member-list" role="list">
	{#each sortedMembers as member, i (member.id)}
		<li
			class="member-item"
			class:current-user={member.userId === currentUserId}
			role="listitem"
			transition:fade={{ duration: 200, delay: getDelay(i) }}
		>
			<!-- Avatar/Icon -->
			<div class="member-avatar">
				{#if member.userId}
					<!-- User avatar - using initials for now -->
					<div class="user-avatar" title={member.userName ?? 'User'}>
						{#if member.userName}
							{member.userName
								.split(' ')
								.map((n) => n[0])
								.join('')
								.slice(0, 2)
								.toUpperCase()}
						{:else}
							U
						{/if}
					</div>
				{:else}
					<!-- Group icon -->
					<div class="group-avatar" title={member.groupName ?? 'Group'}>
						<GroupIcon size={18} strokeWidth={2} />
					</div>
				{/if}
			</div>

			<!-- Member Info -->
			<div class="member-info">
				<span class="member-name">
					{member.userName ?? member.groupName}
					{#if member.userId === currentUserId}
						<span class="you-badge">(You)</span>
					{/if}
				</span>
				{#if member.userEmail}
					<span class="member-email">{member.userEmail}</span>
				{:else if member.groupName}
					<span class="member-type">Group</span>
				{/if}
			</div>

			<!-- Role Badge / Selector -->
			<div class="member-role">
				{#if member.role === 'owner'}
					<!-- Owners: Static badge + lock (immutable) -->
					<AreaRoleBadge role={member.role} size="sm" />
					<span class="lock-icon-wrapper" title="Owners cannot be changed">
						<Lock size={14} class="lock-icon" />
					</span>
				{:else if canManage && onRoleChange && member.userId !== currentUserId}
					<!-- Non-owners (except self): Role selector -->
					<AreaRoleSelector
						currentRole={member.role}
						memberId={member.id}
						memberName={member.userName ?? member.groupName ?? 'Member'}
						{areaId}
						onChange={async (newRole) => {
							await onRoleChange?.(member.id, newRole, member.userName ?? member.groupName ?? 'Member');
						}}
					/>
				{:else}
					<!-- Self or no manage permission: Static badge -->
					<AreaRoleBadge role={member.role} size="sm" />
				{/if}

				<!-- Remove button (Phase 2) -->
				{#if canManage && onRemove && member.role !== 'owner' && member.userId !== currentUserId}
					<button
						class="remove-button"
						onclick={() =>
							onRemove?.(member.id, member.userName ?? member.groupName ?? 'Member')}
						disabled={removingMemberId !== null}
						class:removing={removingMemberId === member.id}
						aria-label="Remove {member.userName ?? member.groupName}"
						title="Remove member"
					>
						{#if removingMemberId === member.id}
							<Loader2 size={14} class="spinner-sm" />
						{:else}
							<X size={14} />
						{/if}
					</button>
				{/if}
			</div>
		</li>
	{/each}
</ul>

<style>
	.member-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.member-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		transition: background-color 0.15s ease;
	}

	.member-item:hover {
		background-color: rgba(255, 255, 255, 0.03);
	}

	.member-item.current-user {
		background-color: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.member-avatar {
		flex-shrink: 0;
	}

	.user-avatar,
	.group-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.user-avatar {
		background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
		color: white;
	}

	.group-avatar {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.member-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.member-name {
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.you-badge {
		font-size: 0.75rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.4);
	}

	.member-email,
	.member-type {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.member-role {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.lock-icon-wrapper {
		display: inline-flex;
		align-items: center;
		cursor: help;
	}

	.member-role :global(.lock-icon) {
		color: rgba(255, 255, 255, 0.3);
	}

	.remove-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		color: rgba(255, 255, 255, 0.4);
		background: transparent;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.remove-button:hover:not(:disabled) {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.remove-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.remove-button.removing {
		color: rgba(255, 255, 255, 0.6);
	}

	.remove-button :global(.spinner-sm) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Light mode */
	:global(html.light) .member-item {
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .member-item:hover {
		background-color: rgba(0, 0, 0, 0.03);
	}

	:global(html.light) .member-item.current-user {
		background-color: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.2);
	}

	:global(html.light) .group-avatar {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	:global(html.light) .member-name {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .you-badge {
		color: rgba(0, 0, 0, 0.4);
	}

	:global(html.light) .member-email,
	:global(html.light) .member-type {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .member-role :global(.lock-icon) {
		color: rgba(0, 0, 0, 0.3);
	}

	:global(html.light) .remove-button {
		color: rgba(0, 0, 0, 0.4);
	}

	:global(html.light) .remove-button:hover:not(:disabled) {
		color: #dc2626;
		background: rgba(220, 38, 38, 0.1);
	}

	:global(html.light) .remove-button.removing {
		color: rgba(0, 0, 0, 0.6);
	}

	/* Phase 4: Accessibility - Respect user's motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.member-item {
			transition: none !important;
		}
	}
</style>
