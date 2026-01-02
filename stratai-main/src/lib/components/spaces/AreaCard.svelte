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
				<!-- Inbox/Home icon for General area -->
				<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
				</svg>
			{:else}
				<!-- Folder icon for custom areas -->
				<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
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
				<svg class="context-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Context added
			</span>
		</div>
	{/if}

	<div class="card-arrow">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
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
