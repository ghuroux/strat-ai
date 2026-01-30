<script lang="ts">
	/**
	 * MeetingCaptureBanner — In-Area nudge for meetings awaiting capture
	 *
	 * Shows an amber/gold banner when meetings in the current Area have
	 * ended and need post-meeting capture. "Capture Now" CTA opens the
	 * MeetingCaptureModal.
	 *
	 * Dismissable per-meeting (localStorage, comes back after 24h).
	 * Auto-fetches awaiting meetings on mount.
	 */
	import { fly } from 'svelte/transition';
	import { ClipboardCheck, X, ChevronRight } from 'lucide-svelte';
	import type { Meeting } from '$lib/types/meetings';

	interface Props {
		areaId: string;
		onCapture: (meetingId: string) => void;
	}

	let { areaId, onCapture }: Props = $props();

	let meetings = $state<Meeting[]>([]);
	let dismissed = $state<Set<string>>(new Set());
	let isLoading = $state(true);

	const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

	const visibleMeetings = $derived(
		meetings.filter(m => !dismissed.has(m.id))
	);

	// Load awaiting-capture meetings on mount / when areaId changes
	$effect(() => {
		if (areaId) {
			loadAwaitingMeetings();
			loadDismissals();
		}
	});

	async function loadAwaitingMeetings() {
		isLoading = true;
		try {
			const res = await fetch(`/api/meetings/awaiting-capture?areaId=${areaId}`);
			if (res.ok) {
				const data = await res.json();
				meetings = data.meetings || [];
			}
		} catch {
			// Silent failure — banner is non-critical
		} finally {
			isLoading = false;
		}
	}

	function loadDismissals() {
		try {
			const key = `strathost-capture-dismissed`;
			const stored = localStorage.getItem(key);
			if (stored) {
				const entries: Record<string, number> = JSON.parse(stored);
				const now = Date.now();
				const active = new Set<string>();
				for (const [id, timestamp] of Object.entries(entries)) {
					if (now - timestamp < DISMISS_DURATION_MS) {
						active.add(id);
					}
				}
				dismissed = active;
			}
		} catch {
			// Ignore storage errors
		}
	}

	function dismiss(meetingId: string) {
		dismissed = new Set([...dismissed, meetingId]);
		// Persist to localStorage
		try {
			const key = `strathost-capture-dismissed`;
			const stored = localStorage.getItem(key);
			const entries: Record<string, number> = stored ? JSON.parse(stored) : {};
			entries[meetingId] = Date.now();
			localStorage.setItem(key, JSON.stringify(entries));
		} catch {
			// Ignore storage errors
		}
	}

	function formatTimeAgo(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - new Date(date).getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffHours / 24);

		if (diffDays > 0) return `${diffDays}d ago`;
		if (diffHours > 0) return `${diffHours}h ago`;
		return 'just now';
	}
</script>

{#if !isLoading && visibleMeetings.length > 0}
	<div class="space-y-2 mb-4" transition:fly={{ y: -10, duration: 200 }}>
		{#each visibleMeetings as meeting (meeting.id)}
			<div
				class="flex items-center justify-between gap-3 px-4 py-3 rounded-lg
				       bg-amber-50 dark:bg-amber-900/15
				       border border-amber-200 dark:border-amber-700/40"
				transition:fly={{ y: -10, duration: 200 }}
			>
				<div class="flex items-center gap-3 min-w-0">
					<div class="shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800/30
					            flex items-center justify-center">
						<ClipboardCheck class="w-4 h-4 text-amber-600 dark:text-amber-400" />
					</div>
					<div class="min-w-0">
						<p class="text-sm font-medium text-amber-900 dark:text-amber-200 truncate">
							{meeting.title}
						</p>
						<p class="text-xs text-amber-600 dark:text-amber-400/70">
							Ended {meeting.scheduledEnd ? formatTimeAgo(meeting.scheduledEnd) : 'recently'}
							— Ready for capture
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onclick={() => onCapture(meeting.id)}
						class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
						       bg-amber-500 text-white
						       hover:bg-amber-600
						       transition-all duration-150"
					>
						Capture Now
						<ChevronRight class="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onclick={() => dismiss(meeting.id)}
						class="p-1 rounded text-amber-400 dark:text-amber-500
						       hover:text-amber-600 dark:hover:text-amber-300
						       hover:bg-amber-200/50 dark:hover:bg-amber-800/30
						       transition-all duration-150"
						aria-label="Dismiss"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}
