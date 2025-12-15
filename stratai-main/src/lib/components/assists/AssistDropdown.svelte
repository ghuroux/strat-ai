<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { SpaceType } from '$lib/types/chat';
	import { getAssistsForSpace, isPocAssist, ASSIST_ICONS } from '$lib/config/assists';
	import type { Assist } from '$lib/types/assists';

	interface Props {
		space: SpaceType;
		onSelect: (assistId: string) => void;
	}

	let { space, onSelect }: Props = $props();

	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | undefined = $state();
	let dropdownRef: HTMLDivElement | undefined = $state();

	// Get assists available for this space
	let assists = $derived(getAssistsForSpace(space));

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

	function selectAssist(assist: Assist) {
		if (!isPocAssist(assist.id)) return; // Don't select disabled assists
		isOpen = false;
		onSelect(assist.id);
	}

	function getIconPath(iconName: string): string {
		return ASSIST_ICONS[iconName] || ASSIST_ICONS.tasks;
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="assist-dropdown-container">
	<!-- Trigger Button -->
	<button
		bind:this={buttonRef}
		type="button"
		onclick={toggleDropdown}
		class="assist-trigger"
		style="--accent: var(--space-accent, #3b82f6); --accent-muted: var(--space-accent-muted, rgba(59, 130, 246, 0.15));"
		aria-haspopup="true"
		aria-expanded={isOpen}
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13 10V3L4 14h7v7l9-11h-7z"
			/>
		</svg>
		<span>Help me with...</span>
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
			class="assist-dropdown"
			transition:fly={{ y: -8, duration: 150 }}
		>
			<div class="dropdown-header">
				<span class="dropdown-title">Assists</span>
				<span class="dropdown-subtitle">Choose what you need help with</span>
			</div>

			<div class="dropdown-items">
				{#each assists as assist (assist.id)}
					{@const isEnabled = isPocAssist(assist.id)}
					<button
						type="button"
						class="assist-item"
						class:disabled={!isEnabled}
						onclick={() => selectAssist(assist)}
						disabled={!isEnabled}
					>
						<div
							class="assist-icon"
							style="background: var(--space-accent-muted, rgba(59, 130, 246, 0.15));"
						>
							<svg
								class="w-4 h-4"
								style="color: var(--space-accent, #3b82f6);"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={getIconPath(assist.icon)}
								/>
							</svg>
						</div>

						<div class="assist-info">
							<div class="assist-name">
								{assist.name}
								{#if assist.isNew}
									<span class="new-badge">New</span>
								{/if}
							</div>
							<div class="assist-description">{assist.description}</div>
						</div>

						{#if !isEnabled}
							<span class="coming-soon">Soon</span>
						{/if}
					</button>
				{/each}
			</div>

			{#if assists.length === 0}
				<div class="empty-state">
					<p>No assists available for this space yet</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.assist-dropdown-container {
		position: relative;
	}

	.assist-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--accent);
		background: var(--accent-muted);
		border: 1px solid transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.assist-trigger:hover {
		background: color-mix(in srgb, var(--accent) 20%, transparent);
		border-color: color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.assist-trigger:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--accent-muted);
	}

	.chevron {
		transition: transform 0.2s ease;
		margin-left: 0.25rem;
	}

	.chevron.rotate {
		transform: rotate(180deg);
	}

	.assist-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		min-width: 320px;
		max-width: 360px;
		background: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 0.75rem;
		box-shadow:
			0 10px 40px rgba(0, 0, 0, 0.4),
			0 0 0 1px rgba(255, 255, 255, 0.05);
		z-index: 50;
		overflow: hidden;
	}

	.dropdown-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #27272a;
	}

	.dropdown-title {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		color: #a1a1aa;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.dropdown-subtitle {
		display: block;
		font-size: 0.8125rem;
		color: #71717a;
		margin-top: 0.125rem;
	}

	.dropdown-items {
		padding: 0.5rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.assist-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem;
		text-align: left;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.assist-item:hover:not(.disabled) {
		background: #27272a;
	}

	.assist-item.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.assist-icon {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.assist-info {
		flex: 1;
		min-width: 0;
	}

	.assist-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #e4e4e7;
	}

	.new-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #22c55e;
		background: rgba(34, 197, 94, 0.15);
		border-radius: 0.25rem;
	}

	.assist-description {
		font-size: 0.8125rem;
		color: #71717a;
		margin-top: 0.125rem;
		line-height: 1.4;
	}

	.coming-soon {
		flex-shrink: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		color: #71717a;
		background: #27272a;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
	}

	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
	}

	.empty-state p {
		font-size: 0.875rem;
		color: #71717a;
	}

	/* Scrollbar styling */
	.dropdown-items::-webkit-scrollbar {
		width: 6px;
	}

	.dropdown-items::-webkit-scrollbar-track {
		background: transparent;
	}

	.dropdown-items::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.dropdown-items::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
