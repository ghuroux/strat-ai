<script lang="ts">
	/**
	 * PagePermissionSelector.svelte - Dropdown for changing page permissions
	 *
	 * Features:
	 * - Click badge to open dropdown
	 * - Shows available permissions (viewer/editor/admin)
	 * - Each permission has description
	 * - Auto-saves on selection
	 * - Loading state during API call
	 * - Keyboard navigation (Escape to close)
	 *
	 * Pattern: Follows AreaRoleSelector.svelte for consistency.
	 */

	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Loader2, ChevronDown } from 'lucide-svelte';
	import type { PagePermission } from '$lib/types/page-sharing';
	import { PAGE_PERMISSION_LABELS, PAGE_PERMISSION_DESCRIPTIONS } from '$lib/types/page-sharing';
	import PagePermissionBadge from './PagePermissionBadge.svelte';

	// Assignable permissions (all 3 for pages)
	const ASSIGNABLE_PERMISSIONS: PagePermission[] = ['viewer', 'editor', 'admin'];

	interface Props {
		currentPermission: PagePermission;
		disabled?: boolean;
		onChange?: (newPermission: PagePermission) => Promise<void>;
	}

	let { currentPermission, disabled = false, onChange }: Props = $props();

	// State
	let isOpen = $state(false);
	let isUpdating = $state(false);
	let dropdownRef: HTMLDivElement | null = $state(null);

	// Toggle dropdown
	function toggleDropdown() {
		if (disabled || isUpdating) return;
		isOpen = !isOpen;
	}

	// Handle permission selection
	async function handlePermissionChange(newPermission: PagePermission) {
		if (newPermission === currentPermission) {
			isOpen = false;
			return;
		}

		isUpdating = true;

		try {
			await onChange?.(newPermission);
			isOpen = false;
		} catch (e) {
			console.error('Permission change error:', e);
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

<div class="permission-selector" bind:this={dropdownRef}>
	<!-- Trigger Button -->
	<button
		type="button"
		class="permission-trigger"
		onclick={toggleDropdown}
		disabled={disabled || isUpdating}
		aria-label="Change permission"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		title="Click to change permission"
	>
		<PagePermissionBadge permission={currentPermission} size="sm" showTooltip={false} />
		<span class="chevron-wrapper" class:rotate={isOpen}>
			<ChevronDown size={14} />
		</span>
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<div class="permission-dropdown" transition:fade={{ duration: 150 }} role="listbox">
			<div class="dropdown-header">
				<span class="dropdown-label">Change Permission</span>
			</div>

			<div class="dropdown-items">
				{#each ASSIGNABLE_PERMISSIONS as permission}
					<button
						type="button"
						class="permission-option"
						class:active={currentPermission === permission}
						role="option"
						aria-selected={currentPermission === permission}
						onclick={() => handlePermissionChange(permission)}
						disabled={isUpdating}
					>
						<PagePermissionBadge {permission} size="sm" showTooltip={false} />
						<div class="permission-details">
							<span class="permission-name">{PAGE_PERMISSION_LABELS[permission]}</span>
							<span class="permission-description">{PAGE_PERMISSION_DESCRIPTIONS[permission]}</span>
						</div>
						{#if currentPermission === permission}
							<svg class="checkmark" viewBox="0 0 16 16" fill="none" stroke="currentColor">
								<path d="M13 4L6 11L3 8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
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
	.permission-selector {
		position: relative;
		display: inline-block;
	}

	.permission-trigger {
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

	.permission-trigger:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
	}

	.permission-trigger:disabled {
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

	/* Dropdown */
	.permission-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0; /* Align to right so it opens toward modal center */
		min-width: 240px;
		background: rgba(23, 23, 23, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
		z-index: 100; /* Higher z-index to ensure visibility in modals */
		overflow: visible;
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

	.permission-option {
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

	.permission-option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
	}

	.permission-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.permission-option.active {
		background: rgba(59, 130, 246, 0.1);
	}

	.permission-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.permission-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.permission-description {
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

	:global(html.light) .permission-dropdown {
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

	:global(html.light) .permission-option:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .permission-option.active {
		background: rgba(59, 130, 246, 0.08);
	}

	:global(html.light) .permission-name {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .permission-description {
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
