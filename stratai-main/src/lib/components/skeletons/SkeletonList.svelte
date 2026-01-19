<script lang="ts">
	import SkeletonCard from './SkeletonCard.svelte';
	import SkeletonConversation from './SkeletonConversation.svelte';

	interface Props {
		count?: number;
		variant?: 'card' | 'conversation';
		gap?: 'sm' | 'md' | 'lg';
	}

	let { count = 3, variant = 'card', gap = 'md' }: Props = $props();

	// Map gap prop to Tailwind classes
	const gapClasses = {
		sm: 'gap-2',
		md: 'gap-3',
		lg: 'gap-4'
	};

	const gapClass = $derived(gapClasses[gap]);
</script>

<div class="flex flex-col {gapClass}">
	{#each Array(count) as _, i (i)}
		{#if variant === 'card'}
			<SkeletonCard />
		{:else}
			<SkeletonConversation />
		{/if}
	{/each}
</div>
