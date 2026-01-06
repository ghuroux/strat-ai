<!--
	StatsRow.svelte

	Compact stats display for Task Dashboard.
	Shows motivational metrics: completed today, streak, needs attention.
-->
<script lang="ts">
	interface Props {
		completedToday: number;
		streak: number;
		activeCount: number;
		needsAttentionCount: number;
		spaceColor: string;
	}

	let {
		completedToday,
		streak,
		activeCount,
		needsAttentionCount,
		spaceColor
	}: Props = $props();

	// Determine streak display
	let streakDisplay = $derived.by(() => {
		if (streak === 0) return { show: false, text: '', class: '' };
		return {
			show: true,
			text: `${streak} day${streak === 1 ? '' : 's'}`,
			class: streak >= 7 ? 'streak-hot' : streak >= 3 ? 'streak-warm' : ''
		};
	});
</script>

<div class="stats-row" style="--space-color: {spaceColor}">
	<!-- Completed Today -->
	<div class="stat" class:has-value={completedToday > 0}>
		<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
		</svg>
		<span class="stat-value">{completedToday}</span>
		<span class="stat-label">today</span>
	</div>

	<!-- Streak -->
	{#if streakDisplay.show}
		<div class="stat stat-streak {streakDisplay.class}">
			<span class="stat-icon-emoji">🔥</span>
			<span class="stat-value">{streakDisplay.text}</span>
			<span class="stat-label">streak</span>
		</div>
	{/if}

	<!-- Active Tasks -->
	<div class="stat">
		<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
		</svg>
		<span class="stat-value">{activeCount}</span>
		<span class="stat-label">active</span>
	</div>

	<!-- Needs Attention (only show if > 0) -->
	{#if needsAttentionCount > 0}
		<div class="stat stat-attention">
			<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
			<span class="stat-value">{needsAttentionCount}</span>
			<span class="stat-label">attention</span>
		</div>
	{/if}
</div>

<style>
	.stats-row {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.stat.has-value {
		color: rgba(34, 197, 94, 0.8);
	}

	.stat-icon {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
	}

	.stat-icon-emoji {
		font-size: 0.875rem;
		line-height: 1;
	}

	.stat-value {
		font-size: 0.8125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
	}

	.stat.has-value .stat-value {
		color: #22c55e;
	}

	.stat-label {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	/* Streak styling */
	.stat-streak {
		color: rgba(255, 255, 255, 0.5);
	}

	.stat-streak .stat-value {
		color: rgba(255, 255, 255, 0.7);
	}

	.stat-streak.streak-warm {
		color: rgba(251, 191, 36, 0.7);
	}

	.stat-streak.streak-warm .stat-value {
		color: #fbbf24;
	}

	.stat-streak.streak-hot {
		color: rgba(249, 115, 22, 0.7);
	}

	.stat-streak.streak-hot .stat-value {
		color: #f97316;
	}

	/* Attention styling */
	.stat-attention {
		color: rgba(245, 158, 11, 0.7);
	}

	.stat-attention .stat-value {
		color: #f59e0b;
	}

	.stat-attention .stat-icon {
		color: #f59e0b;
	}

	/* Responsive - stack on very small screens */
	@media (max-width: 400px) {
		.stats-row {
			flex-wrap: wrap;
			gap: 0.75rem 1rem;
		}
	}
</style>
