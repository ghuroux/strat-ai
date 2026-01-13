<script lang="ts">
	/**
	 * AreaAvatarStack.svelte - Display member avatars in overlapping stack
	 *
	 * Features:
	 * - Shows first 3 member avatars (user initials or group icon)
	 * - Avatars overlap by 12px (40% overlap)
	 * - White border on each for separation
	 * - "+N more" indicator if > 3 members
	 * - Tooltip with member names
	 * - Clickable to open share modal
	 */

	import { Users as UsersIcon } from 'lucide-svelte';
	import { areaStore } from '$lib/stores/areas.svelte';

	interface Props {
		areaId: string;
		maxDisplay?: number;
		size?: 'sm' | 'md';
		onClick?: () => void;
	}

	let { areaId, maxDisplay = 3, size = 'md', onClick }: Props = $props();

	// Derived state
	let members = $derived(areaStore.getMembersForArea(areaId));
	let displayMembers = $derived(members.slice(0, maxDisplay));
	let remainingCount = $derived(Math.max(0, members.length - maxDisplay));
	let tooltipText = $derived(generateTooltip());

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

	// Generate tooltip text
	function generateTooltip(): string {
		if (members.length === 0) return 'No members';
		if (members.length === 1) return '1 member';

		const names = members
			.slice(0, 5)
			.map((m) => m.userName ?? m.groupName)
			.filter(Boolean)
			.join(', ');

		return members.length <= 5 ? names : `${names}, and ${members.length - 5} more`;
	}
</script>

<button
	class="avatar-stack"
	class:size-sm={size === 'sm'}
	onclick={onClick}
	aria-label="View {members.length} members"
	title={tooltipText}
>
	<div class="avatars">
		{#each displayMembers as member, i}
			{#if member.userId}
				<div class="avatar user-avatar" style="z-index: {displayMembers.length - i}">
					{getInitials(member.userName)}
				</div>
			{:else}
				<div class="avatar group-avatar" style="z-index: {displayMembers.length - i}">
					<UsersIcon size={16} strokeWidth={2} />
				</div>
			{/if}
		{/each}
	</div>

	{#if remainingCount > 0}
		<div class="avatar remaining-avatar" style="z-index: 0">
			+{remainingCount}
		</div>
	{/if}
</button>

<style>
	.avatar-stack {
		display: flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: none;
		border-radius: 20px;
		transition: background-color 0.15s ease;
		cursor: pointer;
	}

	.avatar-stack:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.avatars {
		display: flex;
		margin-right: -0.375rem;
	}

	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 2px solid rgb(23, 23, 23);
		font-size: 0.75rem;
		font-weight: 600;
		margin-left: -12px;
		flex-shrink: 0;
	}

	.avatar:first-child {
		margin-left: 0;
	}

	.user-avatar {
		background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
		color: white;
	}

	.group-avatar {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.remaining-avatar {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.6875rem;
	}

	/* Size variant */
	.avatar-stack.size-sm .avatar {
		width: 24px;
		height: 24px;
		font-size: 0.625rem;
		margin-left: -8px;
		border-width: 1.5px;
	}

	.avatar-stack.size-sm .avatar:first-child {
		margin-left: 0;
	}

	.avatar-stack.size-sm .remaining-avatar {
		font-size: 0.625rem;
	}

	/* Light mode */
	:global(html.light) .avatar-stack:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.light) .avatar {
		border-color: #ffffff;
	}

	:global(html.light) .group-avatar {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	:global(html.light) .remaining-avatar {
		background: rgba(0, 0, 0, 0.08);
		color: rgba(0, 0, 0, 0.7);
	}
</style>
