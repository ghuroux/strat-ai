<script lang="ts">
	/**
	 * Guided Creation Flow Component
	 *
	 * Main orchestrator component that renders steps and manages navigation.
	 * Displays progress indicator, step content, and navigation buttons.
	 *
	 * See: docs/GUIDED_CREATION.md Phase 2
	 */

	import type { TemplateSchema, GuidedCreationData } from '$lib/types/guided-creation';
	import { guidedCreationFlowStore } from '$lib/stores/guidedCreationFlow.svelte';
	import ProgressIndicator from './ProgressIndicator.svelte';
	import StepCard from './StepCard.svelte';
	import FieldRenderer from './FieldRenderer.svelte';
	import { fade, fly } from 'svelte/transition';
	import { ChevronLeft, ChevronRight, X, SkipForward } from 'lucide-svelte';

	interface Props {
		schema: TemplateSchema;
		spaceId: string;
		areaId: string | null;
		onComplete: (data: GuidedCreationData) => void;
		onCancel: () => void;
	}

	let { schema, spaceId, areaId, onComplete, onCancel }: Props = $props();

	// Initialize store on mount
	$effect(() => {
		guidedCreationFlowStore.start(schema, spaceId, areaId);
		return () => guidedCreationFlowStore.reset();
	});

	// Step titles for progress indicator
	const stepTitles = $derived(schema.steps.map((s) => s.title));

	function handleNext() {
		if (guidedCreationFlowStore.isLastStep) {
			onComplete(guidedCreationFlowStore.getData());
		} else {
			guidedCreationFlowStore.nextStep();
		}
	}

	function handleBack() {
		guidedCreationFlowStore.previousStep();
	}

	function handleSkipStep() {
		guidedCreationFlowStore.nextStep();
	}

	function handleStepClick(index: number) {
		guidedCreationFlowStore.goToStep(index);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}

	function handleFieldUpdate(fieldId: string, value: unknown) {
		guidedCreationFlowStore.updateField(fieldId, value);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="guided-creation-flow" transition:fade={{ duration: 150 }}>
	<!-- Header -->
	<div class="flow-header">
		<div class="header-top">
			<span class="template-badge">{schema.type.replace(/_/g, ' ')}</span>
			<button type="button" class="close-btn" onclick={onCancel} aria-label="Close">
				<X class="w-5 h-5" />
			</button>
		</div>
		<ProgressIndicator
			totalSteps={guidedCreationFlowStore.totalSteps}
			currentStep={guidedCreationFlowStore.currentStepIndex}
			{stepTitles}
			onStepClick={handleStepClick}
		/>
	</div>

	<!-- Content -->
	<div class="flow-content">
		{#if guidedCreationFlowStore.currentStep}
			{#key guidedCreationFlowStore.currentStepIndex}
				<div class="step-wrapper" transition:fly={{ x: 20, duration: 200 }}>
					<StepCard step={guidedCreationFlowStore.currentStep}>
						{#each guidedCreationFlowStore.currentStep.fields as field (field.id)}
							<FieldRenderer
								{field}
								value={guidedCreationFlowStore.getFieldValue(field.id)}
								onUpdate={(value) => handleFieldUpdate(field.id, value)}
							/>
						{/each}
					</StepCard>
				</div>
			{/key}
		{/if}
	</div>

	<!-- Footer -->
	<div class="flow-footer">
		<div class="footer-left">
			{#if guidedCreationFlowStore.currentStep?.optional && !guidedCreationFlowStore.isLastStep}
				<button type="button" class="btn-skip" onclick={handleSkipStep}>
					<SkipForward class="w-4 h-4" />
					Skip this step
				</button>
			{/if}
		</div>
		<div class="footer-right">
			<button type="button" class="btn-secondary" onclick={onCancel}>
				Cancel
			</button>
			{#if guidedCreationFlowStore.canGoBack}
				<button type="button" class="btn-secondary" onclick={handleBack}>
					<ChevronLeft class="w-4 h-4" />
					Back
				</button>
			{/if}
			<button type="button" class="btn-primary" onclick={handleNext}>
				{guidedCreationFlowStore.isLastStep ? 'Create Document' : 'Next'}
				{#if !guidedCreationFlowStore.isLastStep}
					<ChevronRight class="w-4 h-4" />
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.guided-creation-flow {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 450px;
		max-height: 80vh;
		width: 100%;
		max-width: 600px;
		background: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 1rem;
		overflow: hidden;
	}

	.flow-header {
		display: flex;
		flex-direction: column;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #27272a;
		background: #18181b;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.template-badge {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #a1a1aa;
		background: #27272a;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: #71717a;
		border-radius: 6px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.close-btn:hover {
		background: #27272a;
		color: #f4f4f5;
	}

	.flow-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.step-wrapper {
		height: 100%;
	}

	.flow-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-top: 1px solid #27272a;
		background: #18181b;
	}

	.footer-left {
		flex: 1;
	}

	.footer-right {
		display: flex;
		gap: 0.75rem;
	}

	.btn-skip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		color: #71717a;
		font-size: 0.875rem;
		cursor: pointer;
		border-radius: 6px;
		transition: all 150ms ease;
	}

	.btn-skip:hover {
		color: #a1a1aa;
		background: #27272a;
	}

	.btn-secondary {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border: 1px solid #3f3f46;
		background: transparent;
		color: #e4e4e7;
		border-radius: 8px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-secondary:hover {
		background: #27272a;
		border-color: #52525b;
	}

	.btn-primary {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1.25rem;
		border: none;
		background: #6366f1;
		color: white;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-primary:hover {
		background: #4f46e5;
	}
</style>
