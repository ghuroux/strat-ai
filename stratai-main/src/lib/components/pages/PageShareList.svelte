<script lang="ts">
	/**
	 * PageShareList.svelte - Display list of page shares
	 *
	 * Shows all shares (users and groups) with avatars, names, emails, and permission badges.
	 * Highlights current user and shows owner with lock icon (immutable).
	 *
	 * Pattern: Follows AreaMemberList.svelte for consistency.
	 */

	import { fade } from 'svelte/transition';
	import { Lock, Users as GroupIcon, X, Loader2, Crown } from 'lucide-svelte';
	import type { PageUserShareWithDetails, PageGroupShareWithDetails, PagePermission } from '$lib/types/page-sharing';
	import PagePermissionBadge from './PagePermissionBadge.svelte';
	import PagePermissionSelector from './PagePermissionSelector.svelte';

	// Owner info type (synthesized from page data)
	interface OwnerInfo {
		id: string;
		name: string | null;
		email: string | null;
	}

	interface Props {
		users: PageUserShareWithDetails[];
		groups: PageGroupShareWithDetails[];
		owner: OwnerInfo;
		currentUserId: string | null;
		canManage: boolean;
		onPermissionChange?: (userId: string | null, groupId: string | null, newPermission: PagePermission, name: string) => Promise<void>;
		onRemove?: (userId: string | null, groupId: string | null, name: string) => void;
		removingId?: string | null;
	}

	let { users, groups, owner, currentUserId, canManage, onPermissionChange, onRemove, removingId }: Props = $props();

	// Combined list: owner first, then users, then groups (all sorted alphabetically within their section)
	interface ListItem {
		type: 'owner' | 'user' | 'group';
		id: string;
		userId?: string;
		groupId?: string;
		name: string | null;
		email?: string | null;
		memberCount?: number;
		permission?: PagePermission;
	}

	let sortedItems = $derived.by(() => {
		const items: ListItem[] = [];

		// Owner first (synthesized)
		items.push({
			type: 'owner',
			id: owner.id,
			userId: owner.id,
			name: owner.name,
			email: owner.email
		});

		// Users (sorted alphabetically)
		const sortedUsers = [...users].sort((a, b) =>
			(a.userName ?? '').localeCompare(b.userName ?? '')
		);
		for (const user of sortedUsers) {
			items.push({
				type: 'user',
				id: user.id,
				userId: user.userId,
				name: user.userName,
				email: user.userEmail,
				permission: user.permission
			});
		}

		// Groups (sorted alphabetically)
		const sortedGroups = [...groups].sort((a, b) =>
			(a.groupName ?? '').localeCompare(b.groupName ?? '')
		);
		for (const group of sortedGroups) {
			items.push({
				type: 'group',
				id: group.id,
				groupId: group.groupId,
				name: group.groupName,
				memberCount: group.groupMemberCount,
				permission: group.permission
			});
		}

		return items;
	});

	// Get initials from name
	function getInitials(name: string | null): string {
		if (!name) return 'U';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	// Staggered animation delay
	function getDelay(index: number): number {
		return Math.min(index * 50, 500); // Max 500ms delay
	}
</script>

<ul class="share-list" role="list">
	{#each sortedItems as item, i (item.id)}
		<li
			class="share-item"
			class:current-user={item.userId === currentUserId}
			class:owner-item={item.type === 'owner'}
			role="listitem"
			transition:fade={{ duration: 200, delay: getDelay(i) }}
		>
			<!-- Avatar/Icon -->
			<div class="share-avatar">
				{#if item.type === 'owner' || item.type === 'user'}
					<div class="user-avatar" class:owner-avatar={item.type === 'owner'} title={item.name ?? 'User'}>
						{#if item.type === 'owner'}
							<Crown size={16} strokeWidth={2} />
						{:else}
							{getInitials(item.name)}
						{/if}
					</div>
				{:else}
					<div class="group-avatar" title={item.name ?? 'Group'}>
						<GroupIcon size={18} strokeWidth={2} />
					</div>
				{/if}
			</div>

			<!-- Share Info -->
			<div class="share-info">
				<span class="share-name">
					{item.name ?? 'Unknown'}
					{#if item.userId === currentUserId}
						<span class="you-badge">(You)</span>
					{/if}
				</span>
				{#if item.type === 'owner'}
					<span class="share-meta">Owner</span>
				{:else if item.email}
					<span class="share-email">{item.email}</span>
				{:else if item.type === 'group'}
					<span class="share-meta">{item.memberCount ?? 0} members</span>
				{/if}
			</div>

			<!-- Permission Badge / Selector -->
			<div class="share-permission">
				{#if item.type === 'owner'}
					<!-- Owner: Static badge + lock (immutable) -->
					<div class="owner-badge">
						<span class="owner-label">Owner</span>
					</div>
					<span class="lock-icon-wrapper" title="Owners cannot be changed">
						<Lock size={14} class="lock-icon" />
					</span>
				{:else if canManage && onPermissionChange && item.userId !== currentUserId}
					<!-- Non-owners (except self): Permission selector -->
					<PagePermissionSelector
						currentPermission={item.permission ?? 'viewer'}
						onChange={async (newPermission) => {
							await onPermissionChange?.(
								item.userId ?? null,
								item.groupId ?? null,
								newPermission,
								item.name ?? 'Member'
							);
						}}
					/>
				{:else if item.permission}
					<!-- Self or no manage permission: Static badge -->
					<PagePermissionBadge permission={item.permission} size="sm" />
				{/if}

				<!-- Remove button -->
				{#if canManage && onRemove && item.type !== 'owner' && item.userId !== currentUserId}
					<button
						class="remove-button"
						onclick={() => onRemove?.(
							item.userId ?? null,
							item.groupId ?? null,
							item.name ?? 'Member'
						)}
						disabled={removingId !== null}
						class:removing={removingId === item.id}
						aria-label="Remove {item.name}"
						title="Remove share"
					>
						{#if removingId === item.id}
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

{#if users.length === 0 && groups.length === 0}
	<div class="empty-state">
		<p>No one else has access to this page.</p>
		<p class="empty-hint">Search above to invite people or groups.</p>
	</div>
{/if}

<style>
	.share-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.share-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		transition: background-color 0.15s ease;
	}

	.share-item:hover {
		background-color: rgba(255, 255, 255, 0.03);
	}

	.share-item.current-user {
		background-color: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.share-item.owner-item {
		background-color: rgba(147, 51, 234, 0.08);
		border-color: rgba(147, 51, 234, 0.2);
	}

	.share-avatar {
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

	.user-avatar.owner-avatar {
		background: linear-gradient(135deg, #9333ea 0%, #c084fc 100%);
	}

	.group-avatar {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.share-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.share-name {
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

	.share-email,
	.share-meta {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.share-permission {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.owner-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 500;
		background: var(--role-owner-bg);
		color: var(--role-owner);
	}

	.owner-label {
		line-height: 1;
	}

	.lock-icon-wrapper {
		display: inline-flex;
		align-items: center;
		cursor: help;
	}

	.share-permission :global(.lock-icon) {
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

	/* Empty state */
	.empty-state {
		padding: 1.5rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.875rem;
	}

	.empty-hint {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.35);
	}

	/* Light mode */
	:global(html.light) .share-item {
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .share-item:hover {
		background-color: rgba(0, 0, 0, 0.03);
	}

	:global(html.light) .share-item.current-user {
		background-color: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.2);
	}

	:global(html.light) .share-item.owner-item {
		background-color: rgba(147, 51, 234, 0.06);
		border-color: rgba(147, 51, 234, 0.15);
	}

	:global(html.light) .group-avatar {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	:global(html.light) .share-name {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .you-badge {
		color: rgba(0, 0, 0, 0.4);
	}

	:global(html.light) .share-email,
	:global(html.light) .share-meta {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .share-permission :global(.lock-icon) {
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

	:global(html.light) .empty-state {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .empty-hint {
		color: rgba(0, 0, 0, 0.35);
	}

	/* Accessibility - Respect user's motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.share-item {
			transition: none !important;
		}
	}
</style>
