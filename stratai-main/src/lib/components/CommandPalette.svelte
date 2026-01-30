<script lang="ts">
	/**
	 * Command Palette Component
	 *
	 * A VS Code / Linear style command palette for quick navigation and actions.
	 * Triggered globally with ⌘K (Mac) or Ctrl+K (Windows).
	 *
	 * Features:
	 * - Fuzzy search across all commands
	 * - Keyboard navigation (↑↓, Enter, Esc)
	 * - Grouped by category
	 * - Dynamic commands from stores (spaces, areas, tasks)
	 */

	import { fade, fly } from 'svelte/transition';
	import { Search, Loader2 } from 'lucide-svelte';
	import { commandPaletteStore } from '$lib/stores/commandPalette.svelte';
	import {
		getAllCommands,
		filterWithConversations,
		sortByRelevance,
		groupByCategory,
		categoryConfig,
		convertSearchResults,
		type Command,
		type CommandCategory
	} from '$lib/config/commands';

	// Refs
	let inputRef: HTMLInputElement | undefined = $state();
	let listRef: HTMLDivElement | undefined = $state();

	// Selection state
	let selectedIndex = $state(0);

	// Get all commands (reactive)
	let allCommands = $derived(getAllCommands());

	// Filter and sort based on search (includes conversation search when query >= 2 chars)
	let filteredCommands = $derived.by(() => {
		const filtered = filterWithConversations(allCommands, commandPaletteStore.searchQuery);
		return sortByRelevance(filtered, commandPaletteStore.searchQuery);
	});

	// Server-side search state
	let searchResults = $state<Command[]>([]);
	let isSearching = $state(false);
	let searchVersion = 0;

	// Debounced server search when query >= 2 chars
	$effect(() => {
		const query = commandPaletteStore.searchQuery.trim();
		const version = ++searchVersion;

		if (!commandPaletteStore.isOpen || query.length < 2) {
			searchResults = [];
			isSearching = false;
			return;
		}

		isSearching = true;
		const timeout = setTimeout(async () => {
			try {
				const response = await fetch(
					`/api/search?q=${encodeURIComponent(query)}&types=pages,tasks,areas,spaces&limit=5`
				);
				if (response.ok && version === searchVersion) {
					const data = await response.json();
					searchResults = convertSearchResults(data.results);
				}
			} catch {
				// Silently fail — client-side results still available
			} finally {
				if (version === searchVersion) {
					isSearching = false;
				}
			}
		}, 250);

		return () => clearTimeout(timeout);
	});

	// Deduplicate: remove server results already shown as client-side commands
	let deduplicatedSearchResults = $derived.by(() => {
		if (searchResults.length === 0) return [];

		const clientEntityIds = new Set<string>();
		for (const cmd of filteredCommands) {
			for (const prefix of ['nav-space-', 'nav-area-', 'nav-task-', 'nav-page-', 'conv-']) {
				if (cmd.id.startsWith(prefix)) {
					clientEntityIds.add(cmd.id.slice(prefix.length));
					break;
				}
			}
		}

		return searchResults.filter((cmd) => {
			const match = cmd.id.match(/^search-\w+-(.+)$/);
			return !match || !clientEntityIds.has(match[1]);
		});
	});

	// Merge client-side commands with deduplicated server search results
	let allDisplayCommands = $derived(
		deduplicatedSearchResults.length > 0
			? [...filteredCommands, ...deduplicatedSearchResults]
			: filteredCommands
	);

	// Group for display
	let groupedCommands = $derived(groupByCategory(allDisplayCommands));

	// Reset selection when search changes
	$effect(() => {
		// Dependency on searchQuery
		commandPaletteStore.searchQuery;
		selectedIndex = 0;
	});

	// Focus input when opened
	$effect(() => {
		if (commandPaletteStore.isOpen) {
			// Small delay to ensure DOM is ready
			setTimeout(() => inputRef?.focus(), 10);
		}
	});

	/**
	 * Handle keyboard navigation
	 */
	function handleKeydown(e: KeyboardEvent) {
		if (!commandPaletteStore.isOpen) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, allDisplayCommands.length - 1);
				scrollSelectedIntoView();
				break;

			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				scrollSelectedIntoView();
				break;

			case 'Enter':
				e.preventDefault();
				if (allDisplayCommands[selectedIndex]) {
					executeCommand(allDisplayCommands[selectedIndex]);
				}
				break;

			case 'Escape':
				e.preventDefault();
				commandPaletteStore.close();
				break;

			case 'Tab':
				// Prevent tab from moving focus outside
				e.preventDefault();
				break;
		}
	}

	/**
	 * Scroll the selected item into view
	 */
	function scrollSelectedIntoView() {
		requestAnimationFrame(() => {
			const selected = listRef?.querySelector(`[data-index="${selectedIndex}"]`);
			selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		});
	}

	/**
	 * Execute a command and close the palette
	 */
	function executeCommand(cmd: Command) {
		commandPaletteStore.close();
		// Small delay to allow close animation
		setTimeout(() => cmd.action(), 50);
	}

	/**
	 * Handle clicking outside the modal
	 */
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			commandPaletteStore.close();
		}
	}

	/**
	 * Get the global index for a command in a category
	 */
	function getGlobalIndex(cmd: Command): number {
		return allDisplayCommands.indexOf(cmd);
	}
</script>

{#if commandPaletteStore.isOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="backdrop"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<!-- Modal -->
		<div
			class="palette"
			transition:fly={{ y: -20, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-label="Command Palette"
		>
			<!-- Search Input -->
			<div class="search-container">
				<Search class="search-icon" />
				<input
					bind:this={inputRef}
					type="text"
					class="search-input"
					placeholder="Type a command or search..."
					value={commandPaletteStore.searchQuery}
					oninput={(e) => commandPaletteStore.setQuery(e.currentTarget.value)}
					onkeydown={handleKeydown}
				/>
				<div class="search-hint">
					{#if isSearching}
						<Loader2 size={14} class="animate-spin" style="color: rgba(255,255,255,0.4)" />
					{/if}
					<kbd>esc</kbd>
					<span>to close</span>
				</div>
			</div>

			<!-- Results -->
			<div class="results" bind:this={listRef}>
				{#if allDisplayCommands.length > 0}
					{#each [...groupedCommands.entries()] as [category, commands]}
						<div class="category">
							<div class="category-label">
								{categoryConfig[category].label}
							</div>
							{#each commands as cmd}
								{@const globalIndex = getGlobalIndex(cmd)}
								<button
									type="button"
									class="command-item"
									class:selected={selectedIndex === globalIndex}
									data-index={globalIndex}
									onclick={() => executeCommand(cmd)}
									onmouseenter={() => (selectedIndex = globalIndex)}
								>
									<div class="command-icon">
										<svelte:component this={cmd.icon} size={18} />
									</div>
									<div class="command-content">
										<span class="command-label">{cmd.label}</span>
										{#if cmd.description}
											<span class="command-description">{cmd.description}</span>
										{/if}
									</div>
									{#if cmd.shortcut}
										<kbd class="command-shortcut">{cmd.shortcut}</kbd>
									{/if}
								</button>
							{/each}
						</div>
					{/each}
				{:else if isSearching}
					<div class="no-results">
						<Loader2 size={24} class="animate-spin" style="color: rgba(255,255,255,0.3)" />
						<span>Searching...</span>
					</div>
				{:else}
					<div class="no-results">
						<Search class="no-results-icon" />
						<span>No results found for "{commandPaletteStore.searchQuery}"</span>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="footer">
				<div class="footer-hint">
					<kbd>↑</kbd>
					<kbd>↓</kbd>
					<span>Navigate</span>
				</div>
				<div class="footer-hint">
					<kbd>↵</kbd>
					<span>Select</span>
				</div>
				<div class="footer-hint">
					<kbd>esc</kbd>
					<span>Close</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Backdrop */
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		z-index: 9999;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 15vh;
	}

	/* Modal */
	.palette {
		width: 100%;
		max-width: 580px;
		max-height: 70vh;
		margin: 0 1rem;
		background: #1a1a1e;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.05),
			0 25px 50px -12px rgba(0, 0, 0, 0.6),
			0 0 100px rgba(59, 130, 246, 0.1);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* Search Container */
	.search-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.95);
		font-family: inherit;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.search-hint {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.search-hint span {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.35);
	}

	/* Results */
	.results {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
		scroll-behavior: smooth;
	}

	/* Category */
	.category {
		margin-bottom: 0.375rem;
	}

	.category:last-child {
		margin-bottom: 0;
	}

	.category-label {
		padding: 0.5rem 0.75rem 0.375rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.35);
	}

	/* Command Item */
	.command-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.1s ease;
	}

	.command-item:hover,
	.command-item.selected {
		background: rgba(255, 255, 255, 0.06);
	}

	.command-item.selected {
		background: rgba(59, 130, 246, 0.12);
	}

	/* Command Icon */
	.command-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
		transition: all 0.1s ease;
	}

	.command-item.selected .command-icon,
	.command-item:hover .command-icon {
		background: rgba(59, 130, 246, 0.15);
		color: #60a5fa;
	}

	/* Command Content */
	.command-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.command-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.command-item.selected .command-label {
		color: #fff;
	}

	.command-description {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Keyboard Shortcut */
	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.375rem;
		font-size: 0.625rem;
		font-family: inherit;
		font-weight: 500;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.command-shortcut {
		flex-shrink: 0;
		font-size: 0.6875rem;
		padding: 0.25rem 0.5rem;
		height: auto;
	}

	/* No Results */
	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.875rem;
	}

	/* Footer */
	.footer {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.625rem 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
	}

	.footer-hint {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.footer-hint kbd {
		min-width: 1rem;
		height: 1rem;
		font-size: 0.5625rem;
	}

	/* Scrollbar */
	.results::-webkit-scrollbar {
		width: 6px;
	}

	.results::-webkit-scrollbar-track {
		background: transparent;
	}

	.results::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.results::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
