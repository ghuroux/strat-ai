<script lang="ts">
	/**
	 * EmptyState.svelte - Reusable empty state component
	 *
	 * Provides visual feedback when content is empty with optional CTA button.
	 * Used across the app for consistent empty state UI patterns.
	 *
	 * @example
	 * ```svelte
	 * <EmptyState
	 *   icon={MessageSquare}
	 *   iconColor="text-primary-400"
	 *   heading="No conversations yet"
	 *   description="Start a new chat to begin"
	 *   ctaLabel="New Chat"
	 *   onCtaClick={handleNewChat}
	 *   size="md"
	 * />
	 * ```
	 */

	import { Plus } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface Props {
		/** Icon component from lucide-svelte */
		icon: ComponentType;
		/** Tailwind color class for icon */
		iconColor: string;
		/** Main heading text */
		heading: string;
		/** Description text */
		description: string;
		/** CTA button label (optional) */
		ctaLabel?: string;
		/** CTA button click handler (optional) */
		onCtaClick?: () => void;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		icon,
		iconColor,
		heading,
		description,
		ctaLabel,
		onCtaClick,
		size = 'md'
	}: Props = $props();

	// Size-based styles
	const containerPadding = {
		sm: 'py-6',
		md: 'py-10',
		lg: 'py-16'
	}[size];

	const iconContainerSize = {
		sm: 'w-10 h-10',
		md: 'w-12 h-12',
		lg: 'w-14 h-14'
	}[size];

	const iconPixelSize = {
		sm: 20, // Icon size in pixels
		md: 24,
		lg: 28
	}[size];

	const headingSize = {
		sm: 'text-base',
		md: 'text-lg',
		lg: 'text-xl'
	}[size];

	const descriptionSize = {
		sm: 'text-xs',
		md: 'text-sm',
		lg: 'text-sm'
	}[size];
</script>

<div class="flex flex-col items-center justify-center text-center {containerPadding}">
	<!-- Icon Container -->
	<div
		class="flex items-center justify-center {iconContainerSize} mb-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 {iconColor}"
	>
		<svelte:component this={icon} size={iconPixelSize} strokeWidth={1.5} />
	</div>

	<!-- Heading -->
	<h3 class="{headingSize} font-semibold text-zinc-100 mb-2">
		{heading}
	</h3>

	<!-- Description -->
	<p class="{descriptionSize} text-zinc-400 max-w-sm">
		{description}
	</p>

	<!-- CTA Button (Optional) -->
	{#if ctaLabel && onCtaClick}
		<button
			onclick={onCtaClick}
			class="flex items-center gap-2 px-4 py-2 mt-6 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
		>
			<Plus size={16} />
			{ctaLabel}
		</button>
	{/if}
</div>
