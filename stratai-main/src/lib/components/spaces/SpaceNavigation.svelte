<script lang="ts">
	/**
	 * SpaceNavigation - Icon-based navigation for Space dashboard
	 *
	 * Displays navigation items for Tasks, Documents, Pages, and Members
	 * - Desktop (>768px): Shows icon + label below + count badge
	 * - Mobile (<768px): Shows icon + count badge only (labels hidden)
	 * - All sizes: Tooltips on hover showing label + count
	 */
	import { CheckCircle, File, FileEdit, Users } from 'lucide-svelte';

	interface Props {
		spaceSlug: string;
		taskCount?: number;
		pageCount?: number;
		memberCount?: number;
		onMembersClick: () => void;
	}

	let {
		spaceSlug,
		taskCount = 0,
		pageCount = 0,
		memberCount = 0,
		onMembersClick
	}: Props = $props();

	// Generate tooltip text
	function getTooltip(label: string, count?: number): string {
		if (count !== undefined && count > 0) {
			return `${label} (${count})`;
		}
		return label;
	}
</script>

<nav class="space-nav" aria-label="Space navigation">
	<!-- Tasks -->
	<a
		href="/spaces/{spaceSlug}/tasks"
		class="nav-item"
		aria-label={getTooltip('Tasks', taskCount)}
		title={getTooltip('Tasks', taskCount)}
	>
		<div class="icon-wrapper">
			<CheckCircle size={16} strokeWidth={1.5} />
			{#if taskCount > 0}
				<span class="badge">{taskCount}</span>
			{/if}
		</div>
		<span class="label">Tasks</span>
	</a>

	<!-- Documents -->
	<a
		href="/spaces/{spaceSlug}/documents"
		class="nav-item"
		aria-label="Documents"
		title="Documents"
	>
		<div class="icon-wrapper">
			<File size={16} strokeWidth={1.5} />
		</div>
		<span class="label">Docs</span>
	</a>

	<!-- Pages -->
	<a
		href="/spaces/{spaceSlug}/pages"
		class="nav-item"
		aria-label={getTooltip('Pages', pageCount)}
		title={getTooltip('Pages', pageCount)}
	>
		<div class="icon-wrapper">
			<FileEdit size={16} strokeWidth={1.5} />
			{#if pageCount > 0}
				<span class="badge">{pageCount}</span>
			{/if}
		</div>
		<span class="label">Pages</span>
	</a>

	<!-- Members -->
	<button
		type="button"
		class="nav-item"
		aria-label={getTooltip('Members', memberCount)}
		title={getTooltip('Members', memberCount)}
		onclick={onMembersClick}
	>
		<div class="icon-wrapper">
			<Users size={16} strokeWidth={1.5} />
			{#if memberCount > 0}
				<span class="badge">{memberCount}</span>
			{/if}
		</div>
		<span class="label">Members</span>
	</button>
</nav>

<style>
	.space-nav {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		background: transparent;
		border: none;
		cursor: pointer;
		position: relative;
		transition: transform 150ms ease;
		text-decoration: none;
		color: inherit;
		padding: 0;
	}

	.nav-item:hover {
		transform: scale(1.1);
	}

	.icon-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgb(113 113 122); /* zinc-500 - works in both themes */
		transition: color 150ms ease;
	}

	.nav-item:hover .icon-wrapper {
		color: rgb(24 24 27); /* zinc-900 (light) */
	}

	@media (prefers-color-scheme: dark) {
		.icon-wrapper {
			color: rgba(255, 255, 255, 0.6);
		}

		.nav-item:hover .icon-wrapper {
			color: rgba(255, 255, 255, 0.9);
		}
	}

	.label {
		font-size: 0.75rem;
		color: rgb(113 113 122); /* zinc-500 - works in both themes */
		font-weight: 500;
		transition: color 150ms ease;
	}

	.nav-item:hover .label {
		color: rgb(24 24 27); /* zinc-900 (light) */
	}

	@media (prefers-color-scheme: dark) {
		.label {
			color: rgba(255, 255, 255, 0.5);
		}

		.nav-item:hover .label {
			color: rgba(255, 255, 255, 0.8);
		}
	}

	.badge {
		position: absolute;
		top: -6px;
		right: -8px;
		background: rgb(228 228 231 / 0.5); /* zinc-200/50 (light) */
		color: rgb(24 24 27); /* zinc-900 (light) */
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 10px;
		min-width: 18px;
		text-align: center;
		line-height: 1;
	}

	@media (prefers-color-scheme: dark) {
		.badge {
			background: rgba(255, 255, 255, 0.15);
			color: rgba(255, 255, 255, 0.9);
		}
	}

	/* Mobile: Hide labels, keep icons + badges */
	@media (max-width: 768px) {
		.space-nav {
			gap: 1rem;
		}

		.label {
			display: none;
		}
	}

	/* Accessibility: Focus styles */
	.nav-item:focus-visible {
		outline: 2px solid rgb(161 161 170); /* zinc-400 (light) */
		outline-offset: 2px;
		border-radius: 4px;
	}

	@media (prefers-color-scheme: dark) {
		.nav-item:focus-visible {
			outline: 2px solid rgba(255, 255, 255, 0.4);
		}
	}

	/* Ensure keyboard navigation works */
	.nav-item:focus {
		outline: none;
	}
</style>
