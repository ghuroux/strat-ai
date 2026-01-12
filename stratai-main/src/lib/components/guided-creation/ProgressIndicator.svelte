<script lang="ts">
	/**
	 * Progress Indicator Component
	 *
	 * Displays step progress dots with click-to-navigate for completed steps.
	 * Shows checkmarks for completed steps and glow effect on current step.
	 */

	import { Check } from 'lucide-svelte';

	interface Props {
		totalSteps: number;
		currentStep: number;
		stepTitles?: string[];
		onStepClick?: (index: number) => void;
	}

	let { totalSteps, currentStep, stepTitles = [], onStepClick }: Props = $props();
</script>

<div class="progress-indicator">
	{#each Array(totalSteps) as _, index}
		<button
			type="button"
			class="step-dot"
			class:completed={index < currentStep}
			class:current={index === currentStep}
			class:upcoming={index > currentStep}
			onclick={() => index <= currentStep && onStepClick?.(index)}
			disabled={index > currentStep}
			aria-label={stepTitles[index] || `Step ${index + 1}`}
			title={stepTitles[index] || `Step ${index + 1}`}
		>
			{#if index < currentStep}
				<Check class="w-3.5 h-3.5" />
			{/if}
		</button>
		{#if index < totalSteps - 1}
			<div class="step-line" class:completed={index < currentStep}></div>
		{/if}
	{/each}
</div>

<style>
	.progress-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 1rem 0;
	}

	.step-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid #3f3f46;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 150ms ease;
		padding: 0;
		color: white;
	}

	.step-dot:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.step-dot.completed {
		background: #6366f1;
		border-color: #6366f1;
	}

	.step-dot.completed:hover:not(:disabled) {
		background: #4f46e5;
		border-color: #4f46e5;
	}

	.step-dot.current {
		border-color: #6366f1;
		background: #6366f1;
		box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
	}

	.step-dot.upcoming {
		border-color: #3f3f46;
		background: #27272a;
	}

	.step-line {
		width: 40px;
		height: 2px;
		background: #3f3f46;
		transition: background 150ms ease;
	}

	.step-line.completed {
		background: #6366f1;
	}
</style>
