<script lang="ts">
	/**
	 * AreaMemberSearchInput.svelte - Autocomplete search for adding members
	 *
	 * Features:
	 * - Search users and groups by name/email
	 * - Debounced API calls (300ms)
	 * - Keyboard navigation (arrows, enter, escape)
	 * - Click-outside to close
	 * - Loading and empty states
	 */

	import { onMount } from 'svelte';
	import { Search, Loader2, Users as UsersIcon } from 'lucide-svelte';
	import { debounce } from '$lib/utils/debounce';
	import type { AreaMemberRole } from '$lib/types/area-memberships';

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
		areaId: string;
		onSelect: (entity: User | Group, role: AreaMemberRole) => void;
	}

	let { areaId, onSelect }: Props = $props();

	// State
	let searchQuery = $state('');
	let userResults = $state<User[]>([]);
	let groupResults = $state<Group[]>([]);
	let isSearching = $state(false);
	let showDropdown = $state(false);
	let selectedIndex = $state(0);
	let selectedRole = $state<AreaMemberRole>('member');
	let inputRef: HTMLInputElement | null = $state(null);

	// Derived
	let allResults = $derived([...userResults, ...groupResults]);
	let hasResults = $derived(allResults.length > 0);

	// Search function (called by debounced wrapper)
	async function performSearchAsync(query: string) {
		if (query.length < 2) {
			userResults = [];
			groupResults = [];
			return;
		}

		isSearching = true;

		try {
			const res = await fetch(
				`/api/areas/${areaId}/members/search?q=${encodeURIComponent(query)}`
			);

			if (!res.ok) {
				throw new Error('Search failed');
			}

			const data = await res.json();
			userResults = data.users || [];
			groupResults = data.groups || [];
			selectedIndex = 0;
		} catch (e) {
			console.error('Search error:', e);
			userResults = [];
			groupResults = [];
		} finally {
			isSearching = false;
		}
	}

	// Debounced search function (fire-and-forget)
	const performSearch = debounce((...args: unknown[]) => {
		const query = args[0] as string;
		performSearchAsync(query);
	}, 300);

	// Handle input change
	function handleInput() {
		showDropdown = true;
		performSearch(searchQuery);
	}

	// Handle keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (!showDropdown || allResults.length === 0) {
			if (e.key === 'Escape') showDropdown = false;
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % allResults.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = (selectedIndex - 1 + allResults.length) % allResults.length;
				break;
			case 'Enter':
				e.preventDefault();
				if (allResults[selectedIndex]) {
					handleSelect(allResults[selectedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				showDropdown = false;
				break;
		}
	}

	// Handle result selection
	function handleSelect(entity: User | Group) {
		onSelect(entity, selectedRole);

		// Reset state
		searchQuery = '';
		userResults = [];
		groupResults = [];
		showDropdown = false;
		selectedIndex = 0;
	}

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

	onMount(() => {
		// Auto-focus input
		inputRef?.focus();

		// Click-outside handling
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Element;
			if (!target.closest('.search-container')) {
				showDropdown = false;
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="search-container">
	<div class="search-input-wrapper">
		<Search size={16} class="search-icon" />
		<input
			bind:this={inputRef}
			type="text"
			placeholder="Search by name or email..."
			bind:value={searchQuery}
			oninput={handleInput}
			onfocus={() => (showDropdown = true)}
			onkeydown={handleKeydown}
			aria-label="Search for users or groups"
			aria-autocomplete="list"
			aria-controls="search-results"
			aria-expanded={showDropdown}
		/>
		{#if isSearching}
			<Loader2 size={16} class="loading-spinner" />
		{/if}
	</div>

	{#if showDropdown && searchQuery.length >= 2}
		<div class="search-dropdown" role="listbox" id="search-results">
			{#if isSearching}
				<div class="dropdown-loading">
					<Loader2 size={18} class="loading-icon" />
					<span>Searching...</span>
				</div>
			{:else if hasResults}
				{#each allResults as result, i}
					<button
						class="search-result-item"
						class:selected={i === selectedIndex}
						role="option"
						aria-selected={i === selectedIndex}
						onclick={() => handleSelect(result)}
						onmouseenter={() => (selectedIndex = i)}
					>
						{#if 'email' in result}
							<!-- User result -->
							<div class="user-avatar">{getInitials(result.displayName)}</div>
							<div class="result-info">
								<span class="result-name">{result.displayName || result.username}</span>
								<span class="result-email">{result.email}</span>
							</div>
							<span class="result-type user-type">User</span>
						{:else}
							<!-- Group result -->
							<div class="group-icon">
								<UsersIcon size={18} />
							</div>
							<div class="result-info">
								<span class="result-name">{result.name}</span>
								<span class="result-meta">{result.memberCount} members</span>
							</div>
							<span class="result-type group-type">Group</span>
						{/if}
					</button>
				{/each}
			{:else}
				<div class="dropdown-empty">No users or groups found</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.search-container {
		position: relative;
		width: 100%;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input-wrapper :global(.search-icon) {
		position: absolute;
		left: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		pointer-events: none;
	}

	.search-input-wrapper input {
		width: 100%;
		padding: 0.625rem 2.5rem 0.625rem 2.5rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		outline: none;
		transition: all 0.15s ease;
	}

	.search-input-wrapper input:focus {
		background: rgba(255, 255, 255, 0.08);
		border-color: #3b82f6;
	}

	.search-input-wrapper input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.search-input-wrapper :global(.loading-spinner) {
		position: absolute;
		right: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Dropdown */
	.search-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		max-height: 300px;
		overflow-y: auto;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
		z-index: 50;
	}

	.dropdown-loading,
	.dropdown-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.5rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		text-align: center;
	}

	.dropdown-loading :global(.loading-icon) {
		animation: spin 1s linear infinite;
	}

	/* Result Item */
	.search-result-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem;
		text-align: left;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.search-result-item:last-child {
		border-bottom: none;
	}

	.search-result-item:hover,
	.search-result-item.selected {
		background: rgba(255, 255, 255, 0.05);
	}

	.search-result-item.selected {
		background: rgba(59, 130, 246, 0.1);
	}

	/* Avatars */
	.user-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		font-size: 0.8125rem;
		font-weight: 600;
		background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
		color: white;
		flex-shrink: 0;
	}

	.group-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
		flex-shrink: 0;
	}

	/* Result Info */
	.result-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.result-name {
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-email,
	.result-meta {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Result Type Badge */
	.result-type {
		flex-shrink: 0;
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		border-radius: 4px;
	}

	.user-type {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.group-type {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
	}

	/* Light mode */
	:global(html.light) .search-input-wrapper :global(.search-icon) {
		color: rgba(0, 0, 0, 0.4);
	}

	:global(html.light) .search-input-wrapper input {
		color: rgba(0, 0, 0, 0.9);
		background: rgba(0, 0, 0, 0.03);
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(html.light) .search-input-wrapper input:focus {
		background: rgba(0, 0, 0, 0.05);
		border-color: #3b82f6;
	}

	:global(html.light) .search-input-wrapper input::placeholder {
		color: rgba(0, 0, 0, 0.4);
	}

	:global(html.light) .search-input-wrapper :global(.loading-spinner) {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .search-dropdown {
		background: #ffffff;
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(html.light) .search-result-item {
		border-color: rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .search-result-item:hover,
	:global(html.light) .search-result-item.selected {
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.light) .search-result-item.selected {
		background: rgba(59, 130, 246, 0.08);
	}

	:global(html.light) .group-icon {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	:global(html.light) .result-name {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .result-email,
	:global(html.light) .result-meta {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .dropdown-loading,
	:global(html.light) .dropdown-empty {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .user-type {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	:global(html.light) .group-type {
		background: rgba(16, 185, 129, 0.1);
		color: #059669;
	}
</style>
