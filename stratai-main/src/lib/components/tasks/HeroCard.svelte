<!--
	HeroCard.svelte

	Smart hero card for the Global Tasks Dashboard.
	Evaluates a 9-level priority cascade combining calendar awareness,
	capacity analysis, and task urgency. Re-evaluates every 30 seconds
	for responsive meeting-soon/meeting-ended detection.

	Replaces FocusSuggestion in GlobalTaskDashboard only.
	Space-scoped dashboards keep FocusSuggestion (no calendar context there).
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import {
		AlertTriangle, AlertCircle, CheckCircle2, Info, Zap,
		Calendar, ChevronRight, ExternalLink
	} from 'lucide-svelte';
	import type { GlobalTask } from '$lib/types/tasks';
	import type { CalendarEventSummary, HeroState, HeroAction } from '$lib/types/calendar';
	import { evaluateHeroState } from '$lib/utils/hero-intelligence';
	import { getGreeting } from '$lib/utils/temporal-context';

	interface Props {
		tasks: GlobalTask[];
		events: CalendarEventSummary[];
		calendarConnected: boolean;
		calendarLoaded: boolean;
		overdueCount: number;
		staleTasks: GlobalTask[];
		todayTasks: GlobalTask[];
		completedToday: number;
		spaceColor: string;
		onTaskClick: (task: GlobalTask) => void;
		onScrollToSection?: (sectionKey: string) => void;
	}

	let {
		tasks,
		events,
		calendarConnected,
		calendarLoaded,
		overdueCount,
		staleTasks,
		todayTasks,
		completedToday,
		spaceColor,
		onTaskClick,
		onScrollToSection
	}: Props = $props();

	// =====================================================
	// Real-time clock (30s interval for meeting detection)
	// =====================================================

	let now = $state(new Date());
	let timerInterval: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		timerInterval = setInterval(() => {
			now = new Date();
		}, 30_000);
	});

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
	});

	// =====================================================
	// Greeting (computed once on mount)
	// =====================================================

	const greeting = browser ? getGreeting() : 'Good morning';

	// =====================================================
	// Hero State (reactive — re-evaluates on any input change)
	// =====================================================

	let heroState = $derived.by((): HeroState => {
		return evaluateHeroState({
			tasks,
			events,
			calendarConnected,
			calendarLoaded,
			now,
			overdueCount,
			staleTasks,
			todayTasks,
			completedToday,
			greeting
		});
	});

	// Keyed block trigger for message transition
	let stateKey = $derived(`${heroState.priority}-${heroState.message}`);

	// =====================================================
	// Action Handler
	// =====================================================

	function handleAction(action: HeroAction) {
		switch (action.type) {
			case 'focus':
				if (action.task) onTaskClick(action.task);
				break;
			case 'join':
				if (action.url) window.open(action.url, '_blank', 'noopener');
				break;
			case 'triage':
			case 'scroll':
			case 'plan':
				if (action.target) onScrollToSection?.(action.target);
				break;
			case 'capture':
				// Coming soon — Phase 4+ (MEETING_LIFECYCLE.md)
				break;
		}
	}

	// =====================================================
	// Formatting Helpers
	// =====================================================

	function formatDueDate(date: Date): string {
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
		if (diffDays === 0) return 'Due today';
		if (diffDays === 1) return 'Due tomorrow';
		return `Due ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
	}

	function formatEventTime(event: CalendarEventSummary): string {
		const start = new Date(event.startDateTime);
		return start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}
</script>

<div
	class="hero-card variant-{heroState.variant}"
	style="--space-color: {spaceColor}"
	in:fly={{ y: -10, duration: 300 }}
>
	<!-- Zone 1: Message -->
	<div class="hero-message-zone">
		<div class="hero-icon variant-{heroState.variant}">
			{#if heroState.variant === 'urgent'}
				<AlertTriangle size={20} />
			{:else if heroState.variant === 'warning'}
				<AlertCircle size={20} />
			{:else if heroState.variant === 'success'}
				<CheckCircle2 size={20} />
			{:else if heroState.variant === 'info'}
				<Info size={20} />
			{:else}
				<Zap size={20} />
			{/if}
		</div>

		<div class="hero-text">
			{#key stateKey}
				<p class="hero-primary" in:fade={{ duration: 200 }}>{heroState.message}</p>
			{/key}
			{#if heroState.subMessage}
				<p class="hero-sub">{heroState.subMessage}</p>
			{/if}
		</div>
	</div>

	<!-- Zone 2: Featured item -->
	{#if heroState.featuredTask}
		{@const task = heroState.featuredTask}
		<button
			type="button"
			class="featured-item"
			onclick={() => onTaskClick(task)}
			in:fly={{ y: 8, duration: 250 }}
		>
			<div class="featured-indicator" class:high={task.priority === 'high'}>
				{#if task.priority === 'high'}
					<Zap size={14} />
				{:else}
					<div class="priority-dot"></div>
				{/if}
			</div>

			<div class="featured-content">
				<span class="featured-title">{task.title}</span>
				<span class="featured-meta">
					{task.spaceName}{task.areaName ? ` · ${task.areaName}` : ''}
					{#if task.dueDate}
						{@const dueDate = new Date(task.dueDate)}
						<span class="featured-due" class:overdue={task.dueDateType === 'hard' && dueDate < now}>
							· {formatDueDate(dueDate)}
						</span>
					{/if}
				</span>
			</div>

			<div class="featured-arrow">
				<ChevronRight size={16} />
			</div>
		</button>
	{:else if heroState.featuredEvent}
		{@const event = heroState.featuredEvent}
		<button
			type="button"
			class="featured-item event"
			onclick={() => {
				if (event.onlineMeetingUrl) {
					window.open(event.onlineMeetingUrl, '_blank', 'noopener');
				} else if (event.webLink) {
					window.open(event.webLink, '_blank', 'noopener');
				}
			}}
			in:fly={{ y: 8, duration: 250 }}
		>
			<div class="featured-indicator event">
				<Calendar size={14} />
			</div>

			<div class="featured-content">
				<span class="featured-title">{event.subject}</span>
				<span class="featured-meta">
					{formatEventTime(event)}
					{#if event.attendeeCount > 1}
						· {event.attendeeCount} attendees
					{/if}
				</span>
			</div>

			{#if event.onlineMeetingUrl}
				<div class="featured-arrow join">
					<span class="join-label">Join</span>
					<ExternalLink size={12} />
				</div>
			{:else}
				<div class="featured-arrow">
					<ChevronRight size={16} />
				</div>
			{/if}
		</button>
	{/if}

	<!-- Zone 3: Actions -->
	{#if heroState.actions.length > 0}
		<div class="hero-actions" in:fade={{ duration: 200, delay: 100 }}>
			{#each heroState.actions as action, idx}
				<button
					type="button"
					class="hero-action-btn"
					class:capture-disabled={action.type === 'capture'}
					onclick={() => handleAction(action)}
					disabled={action.type === 'capture'}
					title={action.type === 'capture' ? 'Coming soon — meeting capture is in development' : undefined}
					in:fade={{ duration: 200, delay: 100 + idx * 80 }}
				>
					{action.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.hero-card {
		border-radius: 0.75rem;
		padding: 1rem;
		margin-bottom: 1rem;
		min-height: 5rem;
		transition: border-color 0.3s ease, background 0.3s ease;
	}

	/* ─── Variant Styles ─────────────────────────── */

	.hero-card.variant-urgent {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.06) 100%);
		border: 1px solid rgba(239, 68, 68, 0.25);
	}

	.hero-card.variant-warning {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%);
		border: 1px solid rgba(245, 158, 11, 0.2);
	}

	.hero-card.variant-info {
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%);
		border: 1px solid rgba(99, 102, 241, 0.15);
	}

	.hero-card.variant-success {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%);
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	.hero-card.variant-default {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--space-color, #3b82f6) 8%, transparent) 0%,
			color-mix(in srgb, var(--space-color, #3b82f6) 3%, transparent) 100%
		);
		border: 1px solid color-mix(in srgb, var(--space-color, #3b82f6) 15%, transparent);
	}

	/* Light theme variants */
	:global(.light) .hero-card.variant-urgent,
	:global([data-theme='light']) .hero-card.variant-urgent {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(249, 115, 22, 0.03) 100%);
		border-color: rgba(239, 68, 68, 0.2);
	}

	:global(.light) .hero-card.variant-warning,
	:global([data-theme='light']) .hero-card.variant-warning {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(245, 158, 11, 0.02) 100%);
		border-color: rgba(245, 158, 11, 0.18);
	}

	:global(.light) .hero-card.variant-info,
	:global([data-theme='light']) .hero-card.variant-info {
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(99, 102, 241, 0.02) 100%);
		border-color: rgba(99, 102, 241, 0.15);
	}

	:global(.light) .hero-card.variant-success,
	:global([data-theme='light']) .hero-card.variant-success {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.06) 0%, rgba(34, 197, 94, 0.02) 100%);
		border-color: rgba(34, 197, 94, 0.18);
	}

	:global(.light) .hero-card.variant-default,
	:global([data-theme='light']) .hero-card.variant-default {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--space-color, #3b82f6) 6%, transparent) 0%,
			color-mix(in srgb, var(--space-color, #3b82f6) 2%, transparent) 100%
		);
		border-color: color-mix(in srgb, var(--space-color, #3b82f6) 12%, transparent);
	}

	/* ─── Zone 1: Message ────────────────────────── */

	.hero-message-zone {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.hero-icon {
		flex-shrink: 0;
		margin-top: 0.0625rem;
		display: flex;
		align-items: center;
	}

	.hero-icon.variant-urgent {
		color: #ef4444;
		animation: pulse-glow 2s ease-in-out infinite;
	}

	.hero-icon.variant-warning {
		color: #f59e0b;
	}

	.hero-icon.variant-info {
		color: #6366f1;
	}

	.hero-icon.variant-success {
		color: #22c55e;
	}

	.hero-icon.variant-default {
		color: var(--space-color, #3b82f6);
	}

	/* Light theme icon adjustments */
	:global(.light) .hero-icon.variant-info,
	:global([data-theme='light']) .hero-icon.variant-info {
		color: #4f46e5;
	}

	@keyframes pulse-glow {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.hero-text {
		flex: 1;
		min-width: 0;
	}

	.hero-primary {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.85);
		margin: 0;
		line-height: 1.4;
	}

	:global(.light) .hero-primary,
	:global([data-theme='light']) .hero-primary {
		color: rgba(0, 0, 0, 0.8);
	}

	.hero-sub {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0.25rem 0 0;
		line-height: 1.3;
	}

	:global(.light) .hero-sub,
	:global([data-theme='light']) .hero-sub {
		color: rgba(0, 0, 0, 0.5);
	}

	/* ─── Zone 2: Featured Item ──────────────────── */

	.featured-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		margin-top: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	:global(.light) .featured-item,
	:global([data-theme='light']) .featured-item {
		background: rgba(0, 0, 0, 0.03);
		border-color: rgba(0, 0, 0, 0.06);
	}

	.featured-item:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.1);
	}

	:global(.light) .featured-item:hover,
	:global([data-theme='light']) .featured-item:hover {
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.featured-indicator {
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
		flex-shrink: 0;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.light) .featured-indicator,
	:global([data-theme='light']) .featured-indicator {
		background: rgba(0, 0, 0, 0.05);
		color: rgba(0, 0, 0, 0.4);
	}

	.featured-indicator.high {
		background: rgba(251, 191, 36, 0.15);
		color: #fbbf24;
	}

	.featured-indicator.event {
		background: rgba(99, 102, 241, 0.15);
		color: #6366f1;
	}

	:global(.light) .featured-indicator.event,
	:global([data-theme='light']) .featured-indicator.event {
		background: rgba(79, 70, 229, 0.12);
		color: #4f46e5;
	}

	.priority-dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: currentColor;
	}

	.featured-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.featured-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.light) .featured-title,
	:global([data-theme='light']) .featured-title {
		color: rgba(0, 0, 0, 0.85);
	}

	.featured-meta {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.45);
	}

	:global(.light) .featured-meta,
	:global([data-theme='light']) .featured-meta {
		color: rgba(0, 0, 0, 0.45);
	}

	.featured-due.overdue {
		color: #ef4444;
		font-weight: 500;
	}

	.featured-arrow {
		color: rgba(255, 255, 255, 0.3);
		flex-shrink: 0;
		transition: color 0.15s ease;
		display: flex;
		align-items: center;
	}

	:global(.light) .featured-arrow,
	:global([data-theme='light']) .featured-arrow {
		color: rgba(0, 0, 0, 0.25);
	}

	.featured-item:hover .featured-arrow {
		color: rgba(255, 255, 255, 0.6);
	}

	:global(.light) .featured-item:hover .featured-arrow,
	:global([data-theme='light']) .featured-item:hover .featured-arrow {
		color: rgba(0, 0, 0, 0.5);
	}

	.featured-arrow.join {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		width: auto;
		color: #6366f1;
	}

	:global(.light) .featured-arrow.join,
	:global([data-theme='light']) .featured-arrow.join {
		color: #4f46e5;
	}

	.join-label {
		font-size: 0.6875rem;
		font-weight: 600;
		white-space: nowrap;
	}

	/* ─── Zone 3: Actions ────────────────────────── */

	.hero-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
		flex-wrap: wrap;
	}

	.hero-action-btn {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.7);
	}

	:global(.light) .hero-action-btn,
	:global([data-theme='light']) .hero-action-btn {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.08);
		color: rgba(0, 0, 0, 0.6);
	}

	.hero-action-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.9);
	}

	:global(.light) .hero-action-btn:hover:not(:disabled),
	:global([data-theme='light']) .hero-action-btn:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.06);
		border-color: rgba(0, 0, 0, 0.12);
		color: rgba(0, 0, 0, 0.8);
	}

	.hero-action-btn.capture-disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ─── Responsive ─────────────────────────────── */

	@media (max-width: 480px) {
		.hero-card {
			padding: 0.875rem;
		}

		.featured-item {
			padding: 0.5rem 0.625rem;
		}
	}
</style>
