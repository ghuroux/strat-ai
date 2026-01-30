<!--
	MemberSelector.svelte

	Dropdown for selecting a Space member (assignee).
	Supports two modes:
	- Self-loading: fetches members from spacesStore (default)
	- Pre-loaded: accepts `members` prop directly (e.g., meeting capture wizard)

	Shows current user first with "(You)" suffix.
	Includes "Unassigned" option (maps to null).
-->
<script lang="ts">
	import type { SpaceMembershipWithUser } from '$lib/types/space-memberships';
	import { spacesStore } from '$lib/stores/spaces.svelte';

	interface Props {
		spaceId: string;
		value: string | null;
		onchange: (userId: string | null) => void;
		label?: string;
		placeholder?: string;
		currentUserId?: string;
		members?: SpaceMembershipWithUser[];
		compact?: boolean;
		disabled?: boolean;
	}

	let {
		spaceId,
		value,
		onchange,
		label = 'Assign to',
		placeholder = 'Unassigned',
		currentUserId,
		members: membersProp,
		compact = false,
		disabled = false
	}: Props = $props();

	// Load members from store if not provided via prop
	$effect(() => {
		if (!membersProp && spaceId) {
			spacesStore.loadMembers(spaceId);
		}
	});

	// Resolve member list: prop > store
	let memberList = $derived.by(() => {
		const raw = membersProp ?? spacesStore.getMembersForSpace(spaceId);
		// Filter to user memberships only (not group memberships), with a valid user
		return raw.filter(m => m.userId && m.user);
	});

	// Sort: current user first, then alphabetical by display name
	let sortedMembers = $derived.by(() => {
		return [...memberList].sort((a, b) => {
			if (a.userId === currentUserId) return -1;
			if (b.userId === currentUserId) return 1;
			const nameA = a.user?.displayName || a.user?.email || '';
			const nameB = b.user?.displayName || b.user?.email || '';
			return nameA.localeCompare(nameB);
		});
	});

	// Get display name for a member
	function displayName(member: SpaceMembershipWithUser): string {
		const name = member.user?.displayName || member.user?.email?.split('@')[0] || 'Unknown';
		if (member.userId === currentUserId) {
			return `${name} (You)`;
		}
		return name;
	}

	function handleChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const val = select.value;
		onchange(val === '' ? null : val);
	}
</script>

{#if !compact}
	<div class="field">
		<label for="member-selector" class="field-label">{label}</label>
		<select
			id="member-selector"
			class="field-input"
			value={value ?? ''}
			onchange={handleChange}
			{disabled}
		>
			<option value="">{placeholder}</option>
			{#each sortedMembers as member (member.userId)}
				<option value={member.userId}>
					{displayName(member)}
				</option>
			{/each}
		</select>
	</div>
{:else}
	<select
		class="compact-select"
		value={value ?? ''}
		onchange={handleChange}
		{disabled}
		aria-label={label}
	>
		<option value="">{placeholder}</option>
		{#each sortedMembers as member (member.userId)}
			<option value={member.userId}>
				{displayName(member)}
			</option>
		{/each}
	</select>
{/if}

<style>
	.field {
		margin-bottom: 1.25rem;
	}

	.field-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	:global(.light) .field-label,
	:global([data-theme='light']) .field-label {
		color: rgba(0, 0, 0, 0.8);
	}

	.field-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9375rem;
		transition: all 0.15s ease;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1rem;
		padding-right: 2.5rem;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--space-color, #3b82f6);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
	}

	.field-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.light) .field-input,
	:global([data-theme='light']) .field-input {
		background: white;
		border-color: rgba(0, 0, 0, 0.15);
		color: #111827;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300000050'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
	}

	:global(.light) .field-input:focus,
	:global([data-theme='light']) .field-input:focus {
		border-color: var(--space-color, #3b82f6);
	}

	/* Compact mode */
	.compact-select {
		padding: 0.375rem 2rem 0.375rem 0.625rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.375rem;
		color: #fff;
		font-size: 0.8125rem;
		transition: all 0.15s ease;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		background-size: 0.875rem;
	}

	.compact-select:focus {
		outline: none;
		border-color: var(--space-color, #3b82f6);
	}

	.compact-select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.light) .compact-select,
	:global([data-theme='light']) .compact-select {
		background: white;
		border-color: rgba(0, 0, 0, 0.15);
		color: #111827;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300000050'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
	}
</style>
