<!--
	PanelBase.svelte

	Shared scaffolding for slide-out panels in Areas.
	Provides consistent header, transitions, keyboard handling, and scrollable content area.

	Usage:
	<PanelBase isOpen={true} title="Tasks" position="right" onClose={() => {}}>
		{#snippet content()}
			<div>Panel content here</div>
		{/snippet}
		{#snippet footer()}
			<button>Action</button>
		{/snippet}
	</PanelBase>
-->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	interface Props {
		isOpen: boolean;
		title: string;
		subtitle?: string;
		position?: 'left' | 'right';
		width?: string; // CSS width value
		showBackdrop?: boolean;
		onClose: () => void;
		content: Snippet;
		header?: Snippet; // Optional custom header content (after title)
		footer?: Snippet;
	}

	let {
		isOpen,
		title,
		subtitle,
		position = 'right',
		width = '20rem', // 320px default
		showBackdrop = true,
		onClose,
		content,
		header,
		footer
	}: Props = $props();

	// Calculate fly direction based on position
	let flyX = $derived(position === 'left' ? -320 : 320);

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	{#if showBackdrop}
		<div
			class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
			transition:fade={{ duration: 150 }}
			onclick={onClose}
			role="presentation"
		></div>
	{/if}

	<!-- Panel -->
	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<aside
		class="panel fixed top-0 h-full flex flex-col bg-surface-900/98 backdrop-blur-md border-surface-700 shadow-2xl z-50"
		class:left-0={position === 'left'}
		class:right-0={position === 'right'}
		class:border-r={position === 'left'}
		class:border-l={position === 'right'}
		style="width: {width};"
		transition:fly={{ x: flyX, duration: 200, opacity: 1 }}
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-surface-700">
			<div class="flex-1 min-w-0">
				<h2 class="text-sm font-semibold text-surface-100 truncate">{title}</h2>
				{#if subtitle}
					<p class="text-xs text-surface-500 truncate">{subtitle}</p>
				{/if}
			</div>

			{#if header}
				<div class="flex items-center gap-2 mx-3">
					{@render header()}
				</div>
			{/if}

			<button
				type="button"
				class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors flex-shrink-0"
				onclick={onClose}
				title="Close (Esc)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content Area -->
		<div class="flex-1 overflow-y-auto">
			{@render content()}
		</div>

		<!-- Footer (optional) -->
		{#if footer}
			<div class="px-4 py-3 border-t border-surface-700">
				{@render footer()}
			</div>
		{/if}
	</aside>
{/if}

<style>
	.panel {
		/* Premium glassmorphism effect */
		box-shadow:
			-4px 0 24px rgba(0, 0, 0, 0.3),
			inset 1px 0 0 rgba(255, 255, 255, 0.03);
	}

	.panel.left-0 {
		box-shadow:
			4px 0 24px rgba(0, 0, 0, 0.3),
			inset -1px 0 0 rgba(255, 255, 255, 0.03);
	}

	/* Smooth scrollbar */
	.panel :global(::-webkit-scrollbar) {
		width: 6px;
	}

	.panel :global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	.panel :global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.panel :global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
