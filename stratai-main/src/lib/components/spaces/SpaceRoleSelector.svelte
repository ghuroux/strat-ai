<script lang="ts">
	/**
	 * SpaceRoleSelector.svelte - Dropdown for changing space member roles
	 *
	 * Features:
	 * - Click badge to open dropdown
	 * - Shows available roles (admin/member/guest)
	 * - Each role has description
	 * - Auto-saves on selection
	 * - Loading state during API call
	 * - Keyboard navigation (Escape to close)
	 * - Fixed positioning to escape overflow containers (modals)
	 *
	 * Mirrors AreaRoleSelector pattern.
	 */

	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Loader2, ChevronDown } from 'lucide-svelte';
	import type { SpaceRole } from '$lib/types/space-memberships';
	import {
		SPACE_ROLE_LABELS,
		SPACE_ROLE_DESCRIPTIONS,
		SPACE_ASSIGNABLE_ROLES
	} from '$lib/types/space-memberships';
	import SpaceRoleBadge from './SpaceRoleBadge.svelte';

	interface Props {
		currentRole: SpaceRole;
		memberId: string;
		memberName: string;
		spaceId: string;
		disabled?: boolean;
		onChange?: (newRole: SpaceRole) => Promise<void>;
	}

	let { currentRole, memberId, memberName, spaceId, disabled = false, onChange }: Props = $props();

	// State
	let isOpen = $state(false);
	let isUpdating = $state(false);
	let dropdownRef: HTMLDivElement | null = $state(null);
	let triggerRef: HTMLButtonElement | null = $state(null);
	let dropdownStyle = $state('');

	// Calculate dropdown position based on trigger button
	function updateDropdownPosition() {
		if (!triggerRef) return;

		const rect = triggerRef.getBoundingClientRect();
		const dropdownHeight = 200; // Approximate dropdown height
		const viewportHeight = window.innerHeight;
		const spaceBelow = viewportHeight - rect.bottom;
		const spaceAbove = rect.top;

		// Decide whether to show above or below
		const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

		if (showAbove) {
			dropdownStyle = `position: fixed; bottom: ${viewportHeight - rect.top + 8}px; left: ${rect.left}px;`;
		} else {
			dropdownStyle = `position: fixed; top: ${rect.bottom + 8}px; left: ${rect.left}px;`;
		}
	}

	// Toggle dropdown
	function toggleDropdown() {
		if (disabled || isUpdating) return;

		if (!isOpen) {
			updateDropdownPosition();
		}
		isOpen = !isOpen;
	}

	// Handle role selection
	async function handleRoleChange(newRole: SpaceRole) {
		if (newRole === currentRole) {
			isOpen = false;
			return;
		}

		isUpdating = true;

		try {
			await onChange?.(newRole);
			isOpen = false;
		} catch (e) {
			console.error('Role change error:', e);
			// Error handled by parent, keep dropdown open for retry
		} finally {
			isUpdating = false;
		}
	}

	// Click outside to close
	function handleClickOutside(e: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	// Keyboard handling
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	onMount(() => {
		return () => {
			// Cleanup handled by Svelte
		};
	});
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="role-selector" bind:this={dropdownRef}>
	<!-- Trigger Button -->
	<button
		type="button"
		class="role-trigger"
		bind:this={triggerRef}
		onclick={toggleDropdown}
		disabled={disabled || isUpdating}
		aria-label="Change role for {memberName}"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		title="Click to change role"
	>
		<SpaceRoleBadge role={currentRole} size="sm" />
		<span class="chevron-wrapper" class:rotate={isOpen}>
			<ChevronDown size={14} />
		</span>
	</button>

	<!-- Dropdown Menu (fixed position to escape overflow containers) -->
	{#if isOpen}
		<div class="role-dropdown" style={dropdownStyle} transition:fade={{ duration: 150 }} role="listbox">
			<div class="dropdown-header">
				<span class="dropdown-label">Change Role</span>
			</div>

			<div class="dropdown-items">
				{#each SPACE_ASSIGNABLE_ROLES as role}
					<button
						type="button"
						class="role-option"
						class:active={currentRole === role}
						role="option"
						aria-selected={currentRole === role}
						onclick={() => handleRoleChange(role)}
						disabled={isUpdating}
					>
						<SpaceRoleBadge {role} size="sm" />
						<div class="role-details">
							<span class="role-name">{SPACE_ROLE_LABELS[role]}</span>
							<span class="role-description">{SPACE_ROLE_DESCRIPTIONS[role]}</span>
						</div>
						{#if currentRole === role}
							<svg class="checkmark" viewBox="0 0 16 16" fill="none" stroke="currentColor">
								<path
									d="M13 4L6 11L3 8"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						{/if}
					</button>
				{/each}
			</div>

			{#if isUpdating}
				<div class="updating-state">
					<Loader2 size={14} class="spinner" />
					<span>Updating...</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.role-selector {
		position: relative;
		display: inline-block;
	}

	.role-trigger {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0 0.375rem 0 0;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.role-trigger:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
	}

	.role-trigger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.chevron-wrapper {
		display: inline-flex;
		align-items: center;
		color: rgba(255, 255, 255, 0.4);
		transition: transform 0.15s ease;
	}

	.chevron-wrapper.rotate {
		transform: rotate(180deg);
	}

	/* Dropdown - uses fixed positioning via inline style to escape overflow containers */
	.role-dropdown {
		min-width: 220px;
		background: rgba(23, 23, 23, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
		z-index: 1000; /* High z-index to appear above modals */
		overflow: hidden;
	}

	.dropdown-header {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
	}

	.dropdown-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.dropdown-items {
		padding: 0.375rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.role-option {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.role-option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
	}

	.role-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.role-option.active {
		background: rgba(59, 130, 246, 0.1);
	}

	.role-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.role-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.role-description {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.3;
	}

	.checkmark {
		width: 1rem;
		height: 1rem;
		color: #3b82f6;
		flex-shrink: 0;
	}

	.updating-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.updating-state :global(.spinner) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Light mode */
	:global(html.light) .chevron-wrapper {
		color: rgba(0, 0, 0, 0.4);
	}

	:global(html.light) .role-dropdown {
		background: rgba(255, 255, 255, 0.98);
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(html.light) .dropdown-header {
		border-color: rgba(0, 0, 0, 0.08);
		background: rgba(0, 0, 0, 0.02);
	}

	:global(html.light) .dropdown-label {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .role-option:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .role-option.active {
		background: rgba(59, 130, 246, 0.08);
	}

	:global(html.light) .role-name {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .role-description {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .checkmark {
		color: #2563eb;
	}

	:global(html.light) .updating-state {
		border-color: rgba(0, 0, 0, 0.08);
		background: rgba(0, 0, 0, 0.02);
		color: rgba(0, 0, 0, 0.5);
	}
</style>
