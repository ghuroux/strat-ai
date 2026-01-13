<script lang="ts">
	/**
	 * AreaSharedIndicator.svelte - Compact badge showing shared status
	 *
	 * Features:
	 * - Shows users icon + member count
	 * - Lock icon if restricted
	 * - Color-coded: blue (open), red (restricted)
	 * - Tooltip with restriction status
	 * - Clickable to open share modal
	 */

	import { Lock, Users } from 'lucide-svelte';

	interface Props {
		memberCount: number;
		isRestricted: boolean;
		onClick?: (e: MouseEvent) => void;
	}

	let { memberCount, isRestricted, onClick }: Props = $props();

	// Generate tooltip text
	function getTooltip(): string {
		const base = `${memberCount} member${memberCount === 1 ? '' : 's'}`;
		return isRestricted ? `${base} (Restricted)` : base;
	}
</script>

<button
	class="shared-indicator"
	class:restricted={isRestricted}
	onclick={onClick}
	aria-label="{memberCount} member{memberCount === 1 ? '' : 's'}"
	title={getTooltip()}
>
	{#if isRestricted}
		<Lock size={12} strokeWidth={2} />
	{/if}
	<Users size={12} strokeWidth={2} />
	<span class="count">{memberCount}</span>
</button>

<style>
	.shared-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		color: #3b82f6;
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.shared-indicator:hover {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.3);
	}

	.shared-indicator.restricted {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.shared-indicator.restricted:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.count {
		font-weight: 600;
		line-height: 1;
	}

	/* Light mode */
	:global(html.light) .shared-indicator {
		background: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.2);
		color: #2563eb;
	}

	:global(html.light) .shared-indicator:hover {
		background: rgba(59, 130, 246, 0.12);
		border-color: rgba(59, 130, 246, 0.3);
	}

	:global(html.light) .shared-indicator.restricted {
		background: rgba(220, 38, 38, 0.08);
		border-color: rgba(220, 38, 38, 0.2);
		color: #dc2626;
	}

	:global(html.light) .shared-indicator.restricted:hover {
		background: rgba(220, 38, 38, 0.12);
		border-color: rgba(220, 38, 38, 0.3);
	}
</style>
