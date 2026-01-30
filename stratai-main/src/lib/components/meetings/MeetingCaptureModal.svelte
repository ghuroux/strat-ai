<script lang="ts">
	/**
	 * MeetingCaptureModal — 4-step wizard for post-meeting capture
	 *
	 * Steps: Outcomes (Bridge) → Decisions → Action Items → Review
	 * On submit: POST /api/meetings/:id/capture
	 *
	 * The "Creation → Capture Bridge": expected outcomes defined when
	 * creating the meeting are pre-populated as a checklist in Step 1.
	 *
	 * State is ephemeral (no global store), following CreateMeetingModal pattern.
	 */
	import { fly, fade } from 'svelte/transition';
	import { X, ChevronLeft, Loader2, CheckCircle } from 'lucide-svelte';
	import ProgressIndicator from '$lib/components/guided-creation/ProgressIndicator.svelte';
	import CaptureOutcomesStep from './capture/CaptureOutcomesStep.svelte';
	import CaptureDecisionsStep from './capture/CaptureDecisionsStep.svelte';
	import CaptureActionsStep from './capture/CaptureActionsStep.svelte';
	import CaptureReviewStep from './capture/CaptureReviewStep.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Meeting, MeetingAttendee, MeetingWithAttendees } from '$lib/types/meetings';
	import type {
		CaptureData,
		OutcomeResolution,
		CaptureDecision,
		CaptureActionItem,
		CaptureResult
	} from '$lib/types/meeting-capture';

	interface Props {
		open: boolean;
		meetingId: string;
		onClose: () => void;
		onCaptured?: (result: CaptureResult) => void;
	}

	let { open, meetingId, onClose, onCaptured }: Props = $props();

	// Wizard navigation
	let currentStep = $state(0);
	let isSubmitting = $state(false);
	let isLoading = $state(false);
	let submitError = $state<string | null>(null);
	let isComplete = $state(false);
	let completionResult = $state<CaptureResult | null>(null);

	// Meeting data
	let meeting = $state<MeetingWithAttendees | null>(null);

	// Step 1: Outcomes
	let outcomeResolutions = $state<OutcomeResolution[]>([]);
	let summary = $state('');

	// Step 2: Decisions
	let decisions = $state<CaptureDecision[]>([]);

	// Step 3: Action Items
	let actionItems = $state<CaptureActionItem[]>([]);

	// Capture start time
	let captureStartedAt = $state('');

	const TOTAL_STEPS = 4;
	const STEP_TITLES = ['Outcomes', 'Decisions', 'Action Items', 'Review'];

	const isLastStep = $derived(currentStep === TOTAL_STEPS - 1);
	const canGoBack = $derived(currentStep > 0);
	const hasParentTask = $derived(!!meeting?.taskId);

	// Build the current CaptureData for review step
	const captureData = $derived<CaptureData>({
		version: 1,
		summary: summary || undefined,
		outcomeResolutions,
		decisions,
		actionItems,
		captureStartedAt
	});

	// Load meeting data when modal opens
	$effect(() => {
		if (open && meetingId) {
			loadMeetingData();
		}
		if (!open) {
			resetState();
		}
	});

	async function loadMeetingData() {
		isLoading = true;
		submitError = null;

		try {
			const res = await fetch(`/api/meetings/${meetingId}/capture-status`);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to load meeting');
			}

			const data = await res.json();
			meeting = data.meeting;

			if (!data.canCapture) {
				submitError = data.reason || 'Cannot capture this meeting';
				return;
			}

			// Initialize state from meeting data
			captureStartedAt = new Date().toISOString();

			// Pre-populate outcome resolutions from expected outcomes
			outcomeResolutions = (meeting?.expectedOutcomes || []).map(o => ({
				outcomeId: o.id,
				label: o.label,
				status: 'not_addressed' as const
			}));

			// Pre-populate decisions from decision-type outcomes
			const decisionOutcomes = meeting?.expectedOutcomes?.filter(o => o.type === 'decision') || [];
			decisions = decisionOutcomes.map(o => ({
				id: `dec_${o.id}`,
				text: '',
				rationale: undefined,
				ownerId: undefined,
				outcomeId: o.id,
				propagateToContext: true,
				confirmed: true
			}));

			// Action items start empty (added by user)
			actionItems = [];
		} catch (err) {
			console.error('Failed to load meeting for capture:', err);
			submitError = err instanceof Error ? err.message : 'Failed to load meeting';
		} finally {
			isLoading = false;
		}
	}

	function resetState() {
		currentStep = 0;
		isSubmitting = false;
		isLoading = false;
		submitError = null;
		isComplete = false;
		completionResult = null;
		meeting = null;
		outcomeResolutions = [];
		summary = '';
		decisions = [];
		actionItems = [];
		captureStartedAt = '';
	}

	function handleNext() {
		if (isLastStep) {
			handleSubmit();
		} else {
			currentStep++;
		}
	}

	function handleBack() {
		if (currentStep > 0) currentStep--;
	}

	function handleStepClick(index: number) {
		if (index <= currentStep) {
			currentStep = index;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') onClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function handleQuickClose() {
		// "Nothing notable" — submit with minimal capture data
		handleSubmitMinimal();
	}

	async function handleSubmitMinimal() {
		if (!meeting) return;
		isSubmitting = true;
		submitError = null;

		try {
			const minimalData: CaptureData = {
				version: 1,
				summary: 'No notable outcomes.',
				outcomeResolutions: outcomeResolutions.map(r => ({
					...r,
					status: r.status === 'not_addressed' ? 'not_addressed' : r.status
				})),
				decisions: [],
				actionItems: [],
				captureStartedAt: captureStartedAt || new Date().toISOString(),
				captureCompletedAt: new Date().toISOString()
			};

			const res = await fetch(`/api/meetings/${meetingId}/capture`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(minimalData)
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to capture meeting');
			}

			const result: CaptureResult = await res.json();
			toastStore.success('Meeting closed');
			isComplete = true;
			completionResult = result;
			onCaptured?.(result);
		} catch (err) {
			console.error('Failed to quick-close meeting:', err);
			submitError = err instanceof Error ? err.message : 'Failed to close meeting';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleSubmit() {
		if (!meeting) return;
		isSubmitting = true;
		submitError = null;

		try {
			const finalData: CaptureData = {
				version: 1,
				summary: summary || undefined,
				outcomeResolutions,
				decisions: decisions.filter(d => d.text.trim()),
				actionItems: actionItems.filter(a => a.text.trim()),
				captureStartedAt,
				captureCompletedAt: new Date().toISOString()
			};

			const res = await fetch(`/api/meetings/${meetingId}/capture`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(finalData)
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to capture meeting');
			}

			const result: CaptureResult = await res.json();

			// Build descriptive toast
			const parts: string[] = [];
			if (result.page) parts.push('meeting notes created');
			if (result.subtasks.length > 0) parts.push(`${result.subtasks.length} subtask${result.subtasks.length !== 1 ? 's' : ''}`);
			if (result.decisionsCount > 0) parts.push(`${result.decisionsCount} decision${result.decisionsCount !== 1 ? 's' : ''} added to context`);
			toastStore.success(parts.length > 0 ? `Meeting captured: ${parts.join(', ')}` : 'Meeting captured');

			isComplete = true;
			completionResult = result;
			onCaptured?.(result);
		} catch (err) {
			console.error('Failed to capture meeting:', err);
			submitError = err instanceof Error ? err.message : 'Failed to capture meeting';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4
		       bg-black/50 dark:bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-2xl max-h-[85vh] flex flex-col
			       bg-white dark:bg-zinc-900
			       border border-zinc-200 dark:border-zinc-700/50
			       rounded-xl shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="capture-modal-title"
			transition:fly={{ y: 20, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
		>
			{#if isComplete && completionResult}
				<!-- Completion Screen -->
				<div class="flex flex-col items-center justify-center p-8 text-center space-y-4">
					<div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
						<CheckCircle class="w-8 h-8 text-green-500" />
					</div>
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						Meeting Captured!
					</h2>
					<p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
						{#if completionResult.page}
							Meeting notes page created.
						{/if}
						{#if completionResult.subtasks.length > 0}
							{completionResult.subtasks.length} subtask{completionResult.subtasks.length !== 1 ? 's' : ''} created.
						{/if}
						{#if completionResult.decisionsCount > 0}
							{completionResult.decisionsCount} decision{completionResult.decisionsCount !== 1 ? 's' : ''} added to Area context.
						{/if}
						{#if completionResult.errors.length > 0}
							<span class="text-amber-500">
								({completionResult.errors.length} warning{completionResult.errors.length !== 1 ? 's' : ''})
							</span>
						{/if}
					</p>
					<button
						type="button"
						onclick={onClose}
						class="mt-4 px-5 py-2 rounded-lg text-sm font-medium
						       bg-primary-500 text-white hover:bg-primary-600
						       transition-all duration-150"
					>
						Done
					</button>
				</div>
			{:else if isLoading}
				<!-- Loading state -->
				<div class="flex flex-col items-center justify-center p-12 text-center space-y-3">
					<Loader2 class="w-8 h-8 text-primary-500 animate-spin" />
					<p class="text-sm text-zinc-500 dark:text-zinc-400">Loading meeting data...</p>
				</div>
			{:else}
				<!-- Header -->
				<div class="flex items-center justify-between px-6 py-4
				            border-b border-zinc-200 dark:border-zinc-700/50">
					<div class="flex items-center gap-3">
						<h2 id="capture-modal-title" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
							Capture Meeting
						</h2>
						{#if meeting}
							<span class="px-2 py-0.5 text-xs font-medium rounded-full
							             bg-amber-100 dark:bg-amber-900/30
							             text-amber-700 dark:text-amber-400
							             border border-amber-200 dark:border-amber-700/50">
								{meeting.title}
							</span>
						{/if}
					</div>
					<button
						type="button"
						onclick={onClose}
						class="p-1.5 rounded-lg
						       text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
						       hover:bg-zinc-100 dark:hover:bg-zinc-800
						       transition-all duration-150"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<!-- Progress Indicator -->
				<div class="px-6">
					<ProgressIndicator
						totalSteps={TOTAL_STEPS}
						{currentStep}
						stepTitles={STEP_TITLES}
						onStepClick={handleStepClick}
					/>
				</div>

				<!-- Content area -->
				<div class="flex-1 overflow-y-auto px-6 py-4">
					{#if meeting}
						{#key currentStep}
							<div transition:fly={{ x: 30, duration: 200 }}>
								{#if currentStep === 0}
									<CaptureOutcomesStep
										expectedOutcomes={meeting.expectedOutcomes || []}
										resolutions={outcomeResolutions}
										{summary}
										onResolutionsChange={(r) => (outcomeResolutions = r)}
										onSummaryChange={(s) => (summary = s)}
									/>
								{:else if currentStep === 1}
									<CaptureDecisionsStep
										{decisions}
										attendees={meeting.attendees || []}
										onDecisionsChange={(d) => (decisions = d)}
									/>
								{:else if currentStep === 2}
									<CaptureActionsStep
										{actionItems}
										attendees={meeting.attendees || []}
										{hasParentTask}
										onActionItemsChange={(a) => (actionItems = a)}
									/>
								{:else if currentStep === 3}
									<CaptureReviewStep
										{meeting}
										{captureData}
										{hasParentTask}
									/>
								{/if}
							</div>
						{/key}
					{/if}
				</div>

				<!-- Error display -->
				{#if submitError}
					<div class="mx-6 mb-2 px-4 py-2 rounded-lg
					            bg-red-500/10 border border-red-500/20
					            text-sm text-red-600 dark:text-red-400">
						{submitError}
					</div>
				{/if}

				<!-- Footer -->
				<div class="flex items-center justify-between px-6 py-4
				            border-t border-zinc-200 dark:border-zinc-700/50
				            bg-zinc-50/50 dark:bg-zinc-900/50 rounded-b-xl">
					<div class="flex items-center gap-2">
						{#if canGoBack}
							<button
								type="button"
								onclick={handleBack}
								disabled={isSubmitting}
								class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
								       text-zinc-600 dark:text-zinc-400
								       hover:text-zinc-800 dark:hover:text-zinc-200
								       hover:bg-zinc-100 dark:hover:bg-zinc-800
								       disabled:opacity-50
								       transition-all duration-150"
							>
								<ChevronLeft class="w-4 h-4" />
								Back
							</button>
						{/if}
						{#if currentStep === 0}
							<button
								type="button"
								onclick={handleQuickClose}
								disabled={isSubmitting}
								class="px-3 py-2 rounded-lg text-xs font-medium
								       text-zinc-400 dark:text-zinc-500
								       hover:text-zinc-600 dark:hover:text-zinc-300
								       hover:bg-zinc-100 dark:hover:bg-zinc-800
								       disabled:opacity-50
								       transition-all duration-150"
							>
								Nothing notable — close meeting
							</button>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={onClose}
							disabled={isSubmitting}
							class="px-4 py-2 rounded-lg text-sm font-medium
							       text-zinc-600 dark:text-zinc-400
							       hover:text-zinc-800 dark:hover:text-zinc-200
							       hover:bg-zinc-100 dark:hover:bg-zinc-800
							       disabled:opacity-50
							       transition-all duration-150"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={handleNext}
							disabled={isSubmitting}
							class="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium
							       bg-primary-500 text-white
							       hover:bg-primary-600
							       disabled:opacity-60 disabled:cursor-not-allowed
							       transition-all duration-150"
						>
							{#if isSubmitting}
								<Loader2 class="w-4 h-4 animate-spin" />
								Capturing...
							{:else if isLastStep}
								Complete Capture
							{:else}
								Next
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
