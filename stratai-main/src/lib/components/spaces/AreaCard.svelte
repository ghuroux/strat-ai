<script lang="ts">
	/**
	 * AreaCard - Clickable area card for Space Dashboard
	 *
	 * Premium, clean design with:
	 * - Area name and icon
	 * - Conversation count and last activity
	 * - Hover effects and visual feedback
	 * - Special styling for General area
	 */
	import type { Area } from '$lib/types/areas';

	interface Props {
		area: Area;
		conversationCount?: number;
		lastActivity?: Date | null;
		spaceColor?: string;
		onclick: () => void;
	}

	let {
		area,
		conversationCount = 0,
		lastActivity = null,
		spaceColor = '#3b82f6',
		onclick
	}: Props = $props();

	// Format relative time
	function formatRelativeTime(date: Date | null): string {
		if (!date) return '';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	let activityText = $derived(formatRelativeTime(lastActivity));
	let chatLabel = $derived(conversationCount === 1 ? 'chat' : 'chats');
	let cardColor = $derived(area.color || spaceColor);
</script>

<button
	type="button"
	class="area-card"
	class:general={area.isGeneral}
	style="--card-color: {cardColor}"
	onclick={onclick}
>
	<div class="card-header">
		<div class="card-icon">
			{#if area.icon}
				<span class="icon-emoji">{area.icon}</span>
			{:else if area.isGeneral}
				<svg class="icon-svg" viewBox="0 0 20 20" fill="currentColor">
					<path
						d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
					/>
				</svg>
			{:else}
				<svg class="icon-svg" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z"
						clip-rule="evenodd"
					/>
					<path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
				</svg>
			{/if}
		</div>
		<div class="card-title">
			<h3 class="title">{area.name}</h3>
			{#if area.isGeneral}
				<span class="badge">Default</span>
			{/if}
		</div>
	</div>

	<div class="card-meta">
		<span class="stat">
			{conversationCount} {chatLabel}
		</span>
		{#if activityText}
			<span class="separator">·</span>
			<span class="activity">{activityText}</span>
		{/if}
	</div>

	{#if area.context}
		<div class="card-context">
			<span class="context-indicator" title="Has context">
				<svg class="context-icon" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
				Context added
			</span>
		</div>
	{/if}

	<div class="card-arrow">
		<svg viewBox="0 0 20 20" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>
</button>

<style>
	.area-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		min-height: 120px;
	}

	.area-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: color-mix(in srgb, var(--card-color) 40%, transparent);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.3);
	}

	.area-card:focus-visible {
		outline: 2px solid var(--card-color);
		outline-offset: 2px;
	}

	.area-card.general {
		border-color: rgba(255, 255, 255, 0.12);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: color-mix(in srgb, var(--card-color) 15%, transparent);
		border-radius: 0.5rem;
		color: var(--card-color);
		flex-shrink: 0;
	}

	.icon-emoji {
		font-size: 1.25rem;
	}

	.icon-svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.card-title {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.title {
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
		line-height: 1.3;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--card-color);
		background: color-mix(in srgb, var(--card-color) 15%, transparent);
		border-radius: 0.25rem;
		width: fit-content;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.stat {
		color: rgba(255, 255, 255, 0.7);
	}

	.separator {
		color: rgba(255, 255, 255, 0.3);
	}

	.activity {
		color: rgba(255, 255, 255, 0.4);
	}

	.card-context {
		margin-top: auto;
	}

	.context-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.context-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: var(--card-color);
		opacity: 0.7;
	}

	.card-arrow {
		position: absolute;
		top: 50%;
		right: 1rem;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.2);
		transition: all 0.2s ease;
	}

	.area-card:hover .card-arrow {
		color: var(--card-color);
		transform: translateY(-50%) translateX(4px);
	}
</style>
