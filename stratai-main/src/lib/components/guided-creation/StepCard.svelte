<script lang="ts">
	/**
	 * Step Card Component
	 *
	 * Wrapper for individual step content with title and optional badge.
	 * Renders children (step fields) within a styled container.
	 */

	import type { Snippet } from 'svelte';
	import type { StepDefinition } from '$lib/types/guided-creation';

	interface Props {
		step: StepDefinition;
		children: Snippet;
	}

	let { step, children }: Props = $props();
</script>

<div class="step-card">
	<div class="step-header">
		<h3 class="step-title">{step.title}</h3>
		{#if step.optional}
			<span class="optional-badge">Optional</span>
		{/if}
	</div>

	{#if step.description}
		<p class="step-description">{step.description}</p>
	{/if}

	<div class="step-content">
		{@render children()}
	</div>
</div>

<style>
	.step-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.step-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.step-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #f4f4f5;
		margin: 0;
	}

	.optional-badge {
		font-size: 0.75rem;
		color: #a1a1aa;
		background: #27272a;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		border: 1px solid #3f3f46;
	}

	.step-description {
		font-size: 0.875rem;
		color: #a1a1aa;
		margin: 0;
		line-height: 1.5;
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-top: 0.5rem;
	}
</style>
