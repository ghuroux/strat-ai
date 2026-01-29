<!--
	CalendarEventCard.svelte

	Displays a calendar event in the unified timeline.
	Supports standard (2-line with attendees) and compact (single-line) modes.
	Matches TaskCard spacing for visual consistency.
-->
<script lang="ts">
	import { Calendar, ExternalLink } from 'lucide-svelte';
	import type { CalendarEventSummary, EventDisplayMode } from '$lib/types/calendar';

	interface Props {
		event: CalendarEventSummary;
		mode?: EventDisplayMode;
		isPast?: boolean;
		showDayBadge?: boolean;
	}

	let { event, mode = 'standard', isPast = false, showDayBadge = false }: Props = $props();

	// Format time range: "09:00 – 09:30" or "All day"
	let timeDisplay = $derived.by(() => {
		if (event.isAllDay) return 'All day';
		const start = formatTime(event.startDateTime);
		const end = formatTime(event.endDateTime);
		return `${start}\u2009\u2013\u2009${end}`;
	});

	// Duration display for compact mode: "(30m)" or "(1h)" or "(1h 30m)"
	let durationDisplay = $derived.by(() => {
		if (event.isAllDay) return '';
		const startMs = new Date(event.startDateTime).getTime();
		const endMs = new Date(event.endDateTime).getTime();
		const minutes = Math.round((endMs - startMs) / (1000 * 60));

		if (minutes < 60) return `(${minutes}m)`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `(${h}h ${m}m)` : `(${h}h)`;
	});

	// Attendee display for standard mode: "with Sarah, Mike, Jennifer" or "with 8 attendees"
	let attendeeDisplay = $derived.by(() => {
		if (event.attendeeCount === 0) return '';
		if (event.attendeeCount <= 3) {
			return `with ${event.attendees.map(a => a.name.split(' ')[0]).join(', ')}`;
		}
		return `with ${event.attendeeCount} attendees`;
	});

	// Day label for day badge: "Mon", "Tue", etc.
	let dayLabel = $derived.by(() => {
		if (!showDayBadge) return '';
		const date = new Date(event.startDateTime);
		return date.toLocaleDateString(undefined, { weekday: 'short' });
	});

	function formatTime(iso: string): string {
		const date = new Date(iso);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
	}

	function handleClick() {
		if (event.webLink) {
			window.open(event.webLink, '_blank', 'noopener');
		}
	}

	function handleJoinClick(e: MouseEvent) {
		e.stopPropagation();
		if (event.onlineMeetingUrl) {
			window.open(event.onlineMeetingUrl, '_blank', 'noopener');
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="event-card"
	class:past={isPast}
	class:cancelled={event.isCancelled}
	class:compact={mode === 'compact'}
	onclick={handleClick}
>
	<div class="event-icon">
		<Calendar size={14} />
	</div>

	{#if mode === 'compact'}
		<!-- Compact mode: single line -->
		<div class="event-content compact-content">
			{#if dayLabel}<span class="day-badge">{dayLabel}</span>{/if}
			<span class="event-time">{event.isAllDay ? 'All day' : formatTime(event.startDateTime)}</span>
			<span class="event-subject">{event.subject}</span>
			{#if durationDisplay}
				<span class="event-duration">{durationDisplay}</span>
			{/if}
		</div>
	{:else}
		<!-- Standard mode: two lines -->
		<div class="event-content">
			<div class="event-main">
				{#if dayLabel}<span class="day-badge">{dayLabel}</span>{/if}
				<span class="event-time">{timeDisplay}</span>
				<span class="event-subject">{event.subject}</span>
			</div>
			{#if attendeeDisplay}
				<div class="event-meta">{attendeeDisplay}</div>
			{/if}
		</div>
	{/if}

	<!-- Join button (if online meeting) -->
	{#if event.onlineMeetingUrl && !isPast}
		<button
			type="button"
			class="join-btn"
			onclick={handleJoinClick}
			title="Join meeting"
		>
			<span>Join</span>
			<ExternalLink size={11} />
		</button>
	{/if}
</div>

<style>
	.event-card {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.5rem;
		border-left: 2px solid rgba(99, 102, 241, 0.4);
		background: rgba(99, 102, 241, 0.04);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	:global(.light) .event-card,
	:global([data-theme='light']) .event-card {
		background: rgba(99, 102, 241, 0.06);
		border-left-color: rgba(99, 102, 241, 0.5);
	}

	.event-card:hover {
		background: rgba(99, 102, 241, 0.08);
	}

	:global(.light) .event-card:hover,
	:global([data-theme='light']) .event-card:hover {
		background: rgba(99, 102, 241, 0.1);
	}

	.event-card.compact {
		align-items: center;
		padding: 0.375rem 0.75rem;
	}

	.event-card.past {
		opacity: 0.4;
	}

	.event-card.cancelled .event-subject {
		text-decoration: line-through;
	}

	/* Icon */
	.event-icon {
		flex-shrink: 0;
		color: rgba(99, 102, 241, 0.7);
		margin-top: 0.0625rem;
	}

	.compact .event-icon {
		margin-top: 0;
	}

	/* Content */
	.event-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.compact-content {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.event-main {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.event-time {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(99, 102, 241, 0.8);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	:global(.light) .event-time,
	:global([data-theme='light']) .event-time {
		color: rgba(79, 70, 229, 0.9);
	}

	.event-subject {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.85);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.light) .event-subject,
	:global([data-theme='light']) .event-subject {
		color: rgba(0, 0, 0, 0.85);
	}

	.event-duration {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.35);
		white-space: nowrap;
	}

	:global(.light) .event-duration,
	:global([data-theme='light']) .event-duration {
		color: rgba(0, 0, 0, 0.35);
	}

	.event-meta {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.light) .event-meta,
	:global([data-theme='light']) .event-meta {
		color: rgba(0, 0, 0, 0.45);
	}

	/* Day badge */
	.day-badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(99, 102, 241, 0.12);
		border-radius: 0.25rem;
		color: rgba(99, 102, 241, 0.7);
		letter-spacing: 0.02em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	:global(.light) .day-badge,
	:global([data-theme='light']) .day-badge {
		background: rgba(79, 70, 229, 0.1);
		color: rgba(79, 70, 229, 0.8);
	}

	/* Join button */
	.join-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgba(99, 102, 241, 0.8);
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.2);
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
		align-self: center;
	}

	.join-btn:hover {
		color: rgba(99, 102, 241, 1);
		background: rgba(99, 102, 241, 0.15);
		border-color: rgba(99, 102, 241, 0.3);
	}
</style>
