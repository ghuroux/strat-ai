<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Props {
		displayName: string | null;
		role: 'owner' | 'admin' | 'member';
	}

	let { displayName, role }: Props = $props();

	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | undefined = $state();
	let dropdownRef: HTMLDivElement | undefined = $state();

	// Can access admin panel?
	let canAccessAdmin = $derived(role === 'owner' || role === 'admin');

	// Display text - use display name or fallback to "User"
	let displayText = $derived(displayName || 'User');

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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="user-menu-container">
	<button
		bind:this={buttonRef}
		onclick={() => (isOpen = !isOpen)}
		class="user-trigger"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<span class="user-name">{displayText}</span>
		<svg
			class="chevron"
			class:rotate={isOpen}
			width="12"
			height="12"
			viewBox="0 0 12 12"
			fill="none"
		>
			<path
				d="M2.5 4.5L6 8L9.5 4.5"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	{#if isOpen}
		<div bind:this={dropdownRef} class="user-dropdown" transition:fly={{ y: -8, duration: 150 }}>
			{#if canAccessAdmin}
				<a href="/admin" class="dropdown-item" onclick={() => (isOpen = false)}>
					<svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
						/>
					</svg>
					Admin
				</a>
			{/if}

			<div class="dropdown-divider"></div>

			<form action="/logout" method="GET" class="logout-form">
				<button type="submit" class="dropdown-item danger">
					<svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Logout
				</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.user-menu-container {
		position: relative;
	}

	.user-trigger {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.user-trigger:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.user-name {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		transition: transform 0.2s ease;
		opacity: 0.6;
	}

	.chevron.rotate {
		transform: rotate(180deg);
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		min-width: 160px;
		background: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 0.75rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
		z-index: 50;
		overflow: hidden;
		padding: 0.375rem;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.9);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.dropdown-item:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.dropdown-item.danger {
		color: #f87171;
	}

	.dropdown-item.danger:hover {
		background: rgba(248, 113, 113, 0.1);
	}

	.item-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.dropdown-divider {
		height: 1px;
		background: #3f3f46;
		margin: 0.375rem 0;
	}

	.logout-form {
		display: contents;
	}
</style>
