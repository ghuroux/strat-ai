<script lang="ts">
	/**
	 * CreateMeetingModal — 3-step wizard for creating meetings
	 *
	 * Steps: Purpose & Outcomes → People & Ownership → Schedule
	 * On submit: POST /api/meetings → POST /api/meetings/:id/schedule
	 *
	 * Phase 3: Calendar integration check, Teams toggle, enhanced submit with
	 * calendar event creation + owner task creation (server-side orchestration).
	 * State is ephemeral (no global store).
	 */
	import { fly, fade } from 'svelte/transition';
	import { X, ChevronLeft, Loader2 } from 'lucide-svelte';
	import ProgressIndicator from '$lib/components/guided-creation/ProgressIndicator.svelte';
	import MeetingPurposeStep from './MeetingPurposeStep.svelte';
	import MeetingPeopleStep from './MeetingPeopleStep.svelte';
	import MeetingScheduleStep from './MeetingScheduleStep.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { WizardOutcome } from '$lib/types/meeting-wizard';
	import type { ExpectedOutcome, CreateAttendeeInput } from '$lib/types/meetings';
	import type { SpaceMembershipWithUser } from '$lib/types/space-memberships';

	interface Props {
		open: boolean;
		spaceId: string;
		areaId: string;
		areaName: string;
		currentUserId: string;
		onClose: () => void;
		onCreated?: (meetingId: string) => void;
	}

	let {
		open,
		spaceId,
		areaId,
		areaName,
		currentUserId,
		onClose,
		onCreated
	}: Props = $props();

	// Wizard navigation
	let currentStep = $state(0);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	// Step 1 state
	let meetingTitle = $state('');
	let purpose = $state('');
	let outcomes = $state<WizardOutcome[]>([]);

	// Step 2 state
	let selectedMemberIds = $state<string[]>([]);
	let externalEmails = $state<{ email: string; name?: string }[]>([]);
	let ownerId = $state('');

	// Step 3 state
	let date = $state('');
	let time = $state('');
	let durationMinutes = $state(30);
	let calendarConnected = $state(false);
	let isOnlineMeeting = $state(false);

	// Members loaded from store
	let members = $state<SpaceMembershipWithUser[]>([]);

	const TOTAL_STEPS = 3;
	const STEP_TITLES = ['Purpose & Outcomes', 'People & Ownership', 'Schedule'];

	const isLastStep = $derived(currentStep === TOTAL_STEPS - 1);
	const canGoBack = $derived(currentStep > 0);

	// Reset all state when modal opens
	$effect(() => {
		if (open) {
			currentStep = 0;
			isSubmitting = false;
			submitError = null;
			meetingTitle = '';
			purpose = '';
			outcomes = [];
			selectedMemberIds = [];
			externalEmails = [];
			ownerId = currentUserId;
			date = '';
			time = getDefaultTime();
			durationMinutes = 30;
			calendarConnected = false;
			isOnlineMeeting = false;

			// Load members
			spacesStore.loadMembers(spaceId).then(() => {
				members = spacesStore.getMembersForSpace(spaceId);
			});

			// Check calendar integration status
			checkCalendarConnection();
		}
	});

	async function checkCalendarConnection() {
		try {
			const res = await fetch('/api/integrations/calendar');
			if (res.ok) {
				const data = await res.json();
				calendarConnected = data.connected === true;
			}
		} catch {
			// Silently fail — calendar check is non-critical
			calendarConnected = false;
		}
	}

	function getDefaultTime(): string {
		const now = new Date();
		// Round up to next 30-minute slot
		const minutes = now.getMinutes();
		const roundedMinutes = minutes < 30 ? 30 : 0;
		const hours = minutes < 30 ? now.getHours() : now.getHours() + 1;
		const h = String(hours).padStart(2, '0');
		const m = String(roundedMinutes).padStart(2, '0');
		return `${h}:${m}`;
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

	async function handleSubmit() {
		isSubmitting = true;
		submitError = null;

		try {
			// Use explicit title, fall back to purpose, then default
			const title = meetingTitle.trim()
				|| purpose.trim().slice(0, 100)
				|| 'Untitled Meeting';

			// Map selected outcomes to ExpectedOutcome (strip wizard-only fields)
			const expectedOutcomes: ExpectedOutcome[] = outcomes
				.filter(o => o.selected)
				.map(o => ({
					id: o.id,
					label: o.label,
					type: o.type
				}));

			// Map selected members to attendee inputs
			const memberAttendees: CreateAttendeeInput[] = selectedMemberIds
				.map(userId => {
					const member = members.find(m => m.userId === userId);
					return {
						email: member?.user?.email || '',
						displayName: member?.user?.displayName || undefined,
						userId,
						attendeeType: 'required' as const,
						isOwner: userId === ownerId
					};
				})
				.filter(a => a.email); // Only include members with email

			// Map external emails to attendee inputs
			const externalAttendees: CreateAttendeeInput[] = externalEmails.map(e => ({
				email: e.email,
				displayName: e.name,
				attendeeType: 'required' as const
			}));

			const attendees = [...memberAttendees, ...externalAttendees];

			// Compute scheduled times if date+time provided
			let scheduledStart: string | undefined;
			let scheduledEnd: string | undefined;
			const hasSchedule = date && time;

			if (hasSchedule) {
				const startDate = new Date(`${date}T${time}`);
				const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
				scheduledStart = startDate.toISOString();
				scheduledEnd = endDate.toISOString();
			}

			// POST /api/meetings
			const createResponse = await fetch('/api/meetings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					purpose: purpose.trim() || undefined,
					durationMinutes,
					spaceId,
					areaId,
					expectedOutcomes: expectedOutcomes.length > 0 ? expectedOutcomes : undefined,
					scheduledStart,
					scheduledEnd,
					attendees: attendees.length > 0 ? attendees : undefined
				})
			});

			if (!createResponse.ok) {
				const err = await createResponse.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to create meeting');
			}

			const { meeting } = await createResponse.json();

			// If scheduled, transition to 'scheduled' status (server handles calendar + task)
			if (hasSchedule && meeting?.id) {
				const scheduleBody: Record<string, unknown> = {};
				if (calendarConnected && isOnlineMeeting) {
					scheduleBody.isOnlineMeeting = true;
				}

				const scheduleResponse = await fetch(`/api/meetings/${meeting.id}/schedule`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(scheduleBody)
				});

				if (scheduleResponse.ok) {
					const scheduleResult = await scheduleResponse.json();

					// Build toast message based on what happened
					if (scheduleResult.calendarEventCreated && scheduleResult.joinUrl) {
						toastStore.success('Meeting created with Teams link');
					} else if (scheduleResult.calendarEventCreated) {
						toastStore.success('Meeting created & calendar invite sent');
					} else {
						toastStore.success('Meeting created');
					}
				} else {
					console.warn('Meeting created but failed to schedule:', await scheduleResponse.text());
					toastStore.success('Meeting created');
				}
			} else {
				toastStore.success('Meeting created');
			}

			onCreated?.(meeting.id);
			onClose();
		} catch (err) {
			console.error('Failed to create meeting:', err);
			submitError = err instanceof Error ? err.message : 'Failed to create meeting';
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
			aria-labelledby="meeting-modal-title"
			transition:fly={{ y: 20, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4
			            border-b border-zinc-200 dark:border-zinc-700/50">
				<div class="flex items-center gap-3">
					<h2 id="meeting-modal-title" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						New Meeting
					</h2>
					<span class="px-2 py-0.5 text-xs font-medium rounded-full
					             bg-zinc-100 dark:bg-zinc-800
					             text-zinc-600 dark:text-zinc-400
					             border border-zinc-200 dark:border-zinc-700">
						{areaName}
					</span>
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
				{#key currentStep}
					<div transition:fly={{ x: 30, duration: 200 }}>
						{#if currentStep === 0}
							<MeetingPurposeStep
								title={meetingTitle}
								{purpose}
								{outcomes}
								{areaId}
								{areaName}
								onTitleChange={(v) => (meetingTitle = v)}
								onPurposeChange={(v) => (purpose = v)}
								onOutcomesChange={(o) => (outcomes = o)}
							/>
						{:else if currentStep === 1}
							<MeetingPeopleStep
								{members}
								{selectedMemberIds}
								{externalEmails}
								{ownerId}
								{currentUserId}
								onSelectedMemberIdsChange={(ids) => (selectedMemberIds = ids)}
								onExternalEmailsChange={(emails) => (externalEmails = emails)}
								onOwnerIdChange={(id) => (ownerId = id)}
							/>
						{:else if currentStep === 2}
							<MeetingScheduleStep
								{date}
								{time}
								{durationMinutes}
								{calendarConnected}
								{isOnlineMeeting}
								onDateChange={(v) => (date = v)}
								onTimeChange={(v) => (time = v)}
								onDurationChange={(v) => (durationMinutes = v)}
								onOnlineMeetingChange={(v) => (isOnlineMeeting = v)}
							/>
						{/if}
					</div>
				{/key}
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
				<div>
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
							Creating...
						{:else if isLastStep}
							Create Meeting
						{:else}
							Next
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
