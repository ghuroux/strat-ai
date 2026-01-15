<script lang="ts">
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { getSpaceDisplayName } from '$lib/utils/space-display';
	import type { Space } from '$lib/types/spaces';

	interface Props {
		currentUserId: string;
		currentSpaceSlug?: string | null;
	}

	let { currentUserId, currentSpaceSlug = null }: Props = $props();

	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | undefined = $state();
	let dropdownRef: HTMLDivElement | undefined = $state();

	// Derived states from store
	let pinnedSpaces = $derived(spacesStore.getPinnedSpaces());
	let unpinnedOwnedSpaces = $derived(spacesStore.getUnpinnedOwnedSpaces(currentUserId));
	let unpinnedSharedSpaces = $derived(spacesStore.getUnpinnedSharedSpaces(currentUserId));
	let canPinMore = $derived(spacesStore.canPinMore());
	let remainingSlots = $derived(spacesStore.getRemainingPinSlots());
	let isPinning = $derived(spacesStore.isPinning);

	// Handle click outside to close
	function handleClickOutside(e: MouseEvent) {
		if (
			isOpen &&
			buttonRef &&
			dropdownRef &&
			!buttonRef.contains(e.target as Node) &&
			!dropdownRef.contains(e.target as Node)
		) {
			isOpen = false;
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function navigateToSpace(space: Space) {
		isOpen = false;
		goto(`/spaces/${space.slug}`);
	}

	async function handlePin(e: MouseEvent, space: Space) {
		e.stopPropagation();
		await spacesStore.pinSpace(space.id);
	}

	async function handleUnpin(e: MouseEvent, space: Space) {
		e.stopPropagation();
		await spacesStore.unpinSpace(space.id);
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="all-spaces-container">
	<!-- Trigger Button (Grid icon like existing space-nav-all) -->
	<button
		bind:this={buttonRef}
		type="button"
		onclick={toggleDropdown}
		class="all-spaces-trigger"
		aria-haspopup="true"
		aria-expanded={isOpen}
		title="All spaces"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
		</svg>
		<span class="trigger-label">All</span>
		<svg
			class="w-3 h-3 chevron"
			class:rotate={isOpen}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<div
			bind:this={dropdownRef}
			class="all-spaces-dropdown"
			transition:fly={{ y: -8, duration: 150 }}
		>
			<!-- PINNED TO NAV Section -->
			{#if pinnedSpaces.length > 0}
				<div class="dropdown-section">
					<div class="section-header">
						<svg class="section-icon star" viewBox="0 0 24 24" fill="currentColor">
							<path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
						</svg>
						<span>PINNED TO NAV</span>
					</div>
					<div class="section-items">
						{#each pinnedSpaces as space (space.id)}
							<div
								class="space-item"
								class:active={currentSpaceSlug === space.slug}
								style="--space-color: {space.color || '#6b7280'}"
								role="button"
								tabindex="0"
								onclick={() => navigateToSpace(space)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateToSpace(space); }}
							>
								<div class="space-color-dot"></div>
								<span class="space-name">{getSpaceDisplayName(space, currentUserId)}</span>
								<button
									type="button"
									class="action-btn unpin"
									onclick={(e) => handleUnpin(e, space)}
									disabled={isPinning}
									title="Unpin from navigation"
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- YOUR SPACES Section (unpinned owned spaces) -->
			{#if unpinnedOwnedSpaces.length > 0}
				<div class="dropdown-section">
					<div class="section-header">
						<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
						</svg>
						<span>YOUR SPACES</span>
					</div>
					<div class="section-items">
						{#each unpinnedOwnedSpaces as space (space.id)}
							<div
								class="space-item"
								class:active={currentSpaceSlug === space.slug}
								style="--space-color: {space.color || '#6b7280'}"
								role="button"
								tabindex="0"
								onclick={() => navigateToSpace(space)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateToSpace(space); }}
							>
								<div class="space-color-dot"></div>
								<span class="space-name">{getSpaceDisplayName(space, currentUserId)}</span>
								<button
									type="button"
									class="action-btn pin"
									class:disabled={!canPinMore}
									onclick={(e) => handlePin(e, space)}
									disabled={isPinning || !canPinMore}
									title={canPinMore ? 'Pin to navigation' : 'Maximum 6 spaces pinned'}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- SHARED WITH YOU Section (unpinned shared spaces) -->
			{#if unpinnedSharedSpaces.length > 0}
				<div class="dropdown-section">
					<div class="section-header">
						<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
						</svg>
						<span>SHARED WITH YOU</span>
					</div>
					<div class="section-items">
						{#each unpinnedSharedSpaces as space (space.id)}
							<div
								class="space-item"
								class:active={currentSpaceSlug === space.slug}
								style="--space-color: {space.color || '#6b7280'}"
								role="button"
								tabindex="0"
								onclick={() => navigateToSpace(space)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateToSpace(space); }}
							>
								<div class="space-color-dot"></div>
								<span class="space-name">{getSpaceDisplayName(space, currentUserId)}</span>
								<button
									type="button"
									class="action-btn pin"
									class:disabled={!canPinMore}
									onclick={(e) => handlePin(e, space)}
									disabled={isPinning || !canPinMore}
									title={canPinMore ? 'Pin to navigation' : 'Maximum 6 spaces pinned'}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Empty State -->
			{#if pinnedSpaces.length === 0 && unpinnedOwnedSpaces.length === 0 && unpinnedSharedSpaces.length === 0}
				<div class="empty-state">
					<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
					</svg>
					<p>No spaces yet</p>
					<span>Create a space to get started</span>
				</div>
			{/if}

			<!-- Footer -->
			<div class="dropdown-footer">
				<span class="footer-info">
					<svg class="footer-icon" viewBox="0 0 24 24" fill="currentColor">
						<path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
					</svg>
					{remainingSlots} of 6 remaining
				</span>
				<a href="/spaces" class="footer-link" onclick={() => { isOpen = false; }}>
					Manage spaces
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.all-spaces-container {
		position: relative;
	}

	.all-spaces-trigger {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.all-spaces-trigger:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.08);
	}

	.trigger-label {
		display: none;
	}

	@media (min-width: 1024px) {
		.trigger-label {
			display: inline;
		}
	}

	.chevron {
		transition: transform 0.2s ease;
	}

	.chevron.rotate {
		transform: rotate(180deg);
	}

	.all-spaces-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		min-width: 280px;
		max-width: 320px;
		background: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 0.75rem;
		box-shadow:
			0 10px 40px rgba(0, 0, 0, 0.4),
			0 0 0 1px rgba(255, 255, 255, 0.05);
		z-index: 50;
		overflow: hidden;
	}

	.dropdown-section {
		border-bottom: 1px solid #27272a;
	}

	.dropdown-section:last-of-type {
		border-bottom: none;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem 0.375rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: #71717a;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section-icon {
		width: 0.875rem;
		height: 0.875rem;
	}

	.section-icon.star {
		color: #fbbf24;
	}

	.section-items {
		padding: 0 0.375rem 0.375rem;
	}

	.space-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.5rem;
		text-align: left;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.space-item:hover {
		background: #27272a;
	}

	.space-item.active {
		background: color-mix(in srgb, var(--space-color, #3b82f6) 15%, transparent);
	}

	.space-color-dot {
		width: 0.5rem;
		height: 0.5rem;
		background: var(--space-color, #6b7280);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.space-name {
		flex: 1;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #e4e4e7;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.space-item.active .space-name {
		color: var(--space-color, #fff);
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		color: #71717a;
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
	}

	.space-item:hover .action-btn {
		opacity: 1;
	}

	.action-btn svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.action-btn:hover:not(:disabled) {
		color: #e4e4e7;
		background: rgba(255, 255, 255, 0.1);
	}

	.action-btn.unpin:hover:not(:disabled) {
		color: #f87171;
	}

	.action-btn.pin:hover:not(:disabled) {
		color: #fbbf24;
	}

	.action-btn:disabled,
	.action-btn.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 1.5rem 1rem;
		text-align: center;
	}

	.empty-icon {
		width: 2rem;
		height: 2rem;
		color: #52525b;
		margin-bottom: 0.25rem;
	}

	.empty-state p {
		font-size: 0.875rem;
		font-weight: 500;
		color: #a1a1aa;
	}

	.empty-state span {
		font-size: 0.75rem;
		color: #71717a;
	}

	.dropdown-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: #0f0f11;
		border-top: 1px solid #27272a;
	}

	.footer-info {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: #71717a;
	}

	.footer-icon {
		width: 0.75rem;
		height: 0.75rem;
		color: #fbbf24;
	}

	.footer-link {
		font-size: 0.75rem;
		font-weight: 500;
		color: #3b82f6;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.footer-link:hover {
		color: #60a5fa;
	}
</style>
