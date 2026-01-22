<script lang="ts">
	/**
	 * CommandMenu.svelte - Slash command dropdown menu
	 *
	 * Renders a filterable list of commands when "/" is typed.
	 * Supports keyboard navigation and mouse selection.
	 * Uses lucide-svelte icons to match site design system.
	 */

	import type { SlashCommandItem } from './extensions/slash-commands';

	interface Props {
		items: SlashCommandItem[];
		command: (item: SlashCommandItem) => void;
		clientRect?: (() => DOMRect | null) | null;
	}

	let { items, command, clientRect }: Props = $props();

	let selectedIndex = $state(0);
	let menuElement: HTMLDivElement | null = $state(null);

	// Reset selection when items change
	$effect(() => {
		items; // Subscribe to items
		selectedIndex = 0;
	});

	// Position the menu near the cursor
	let menuStyle = $derived.by(() => {
		if (!clientRect) return '';

		const rect = clientRect();
		if (!rect) return '';

		// Position below the cursor
		return `top: ${rect.bottom + 8}px; left: ${rect.left}px;`;
	});

	function selectItem(index: number) {
		const item = items[index];
		if (item) {
			command(item);
		}
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = (selectedIndex + items.length - 1) % items.length;
			return true;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % items.length;
			return true;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			selectItem(selectedIndex);
			return true;
		}

		return false;
	}

	// Expose keyboard handler to parent
	export function handleKeyDown(event: KeyboardEvent): boolean {
		return onKeyDown(event);
	}

	// Scroll selected item into view
	$effect(() => {
		if (menuElement && items.length > 0) {
			const selectedEl = menuElement.querySelector(`[data-index="${selectedIndex}"]`);
			selectedEl?.scrollIntoView({ block: 'nearest' });
		}
	});
</script>

{#if items.length > 0}
	<div
		bind:this={menuElement}
		class="command-menu"
		style={menuStyle}
	>
		{#each items as item, index}
			<button
				type="button"
				class="command-item"
				class:selected={index === selectedIndex}
				data-index={index}
				onclick={() => selectItem(index)}
				onmouseenter={() => (selectedIndex = index)}
			>
				<span class="command-icon">
					<svelte:component this={item.icon} size={18} />
				</span>
				<div class="command-text">
					<span class="command-title">{item.title}</span>
					<span class="command-description">{item.description}</span>
				</div>
			</button>
		{/each}
	</div>
{/if}

<style>
	.command-menu {
		position: fixed;
		z-index: 1000;
		min-width: 260px;
		max-width: 300px;
		max-height: 340px;
		overflow-y: auto;
		padding: 0.375rem;
		border-radius: 0.75rem;
		background: white;
		border: 1px solid #e4e4e7;
		box-shadow:
			0 10px 25px -5px rgba(0, 0, 0, 0.1),
			0 8px 10px -6px rgba(0, 0, 0, 0.05);
	}

	/* Dark mode */
	:global(.dark) .command-menu {
		background: #18181b;
		border-color: #3f3f46;
		box-shadow:
			0 10px 25px -5px rgba(0, 0, 0, 0.4),
			0 8px 10px -6px rgba(0, 0, 0, 0.2);
	}

	.command-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
		border: none;
		background: transparent;
		cursor: pointer;
		text-align: left;
		transition: background-color 100ms ease;
	}

	.command-item:hover,
	.command-item.selected {
		background: #f4f4f5;
	}

	:global(.dark) .command-item:hover,
	:global(.dark) .command-item.selected {
		background: #27272a;
	}

	.command-icon {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f4f4f5;
		border-radius: 0.5rem;
		color: #52525b;
	}

	:global(.dark) .command-icon {
		background: #27272a;
		color: #a1a1aa;
	}

	.command-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.command-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #18181b;
	}

	:global(.dark) .command-title {
		color: #fafafa;
	}

	.command-description {
		font-size: 0.75rem;
		color: #71717a;
		line-height: 1.35;
	}

	:global(.dark) .command-description {
		color: #a1a1aa;
	}
</style>
