<script lang="ts">
	/**
	 * Progress Ring Component
	 *
	 * A circular progress indicator with animated fill.
	 * Shows fraction text in the center (e.g., "6/10").
	 */

	interface Props {
		completed: number;
		total: number;
		size?: number;
		strokeWidth?: number;
		color?: string;
	}

	let { completed, total, size = 64, strokeWidth = 4, color = '#22c55e' }: Props = $props();

	// Calculate percentage
	let percentage = $derived(total > 0 ? (completed / total) * 100 : 0);

	// SVG circle calculations
	let radius = $derived((size - strokeWidth) / 2);
	let circumference = $derived(2 * Math.PI * radius);
	let offset = $derived(circumference - (percentage / 100) * circumference);

	// Center coordinates
	let center = $derived(size / 2);
</script>

<div class="progress-ring" style="width: {size}px; height: {size}px;">
	<svg viewBox="0 0 {size} {size}" class="ring-svg">
		<!-- Background circle -->
		<circle
			cx={center}
			cy={center}
			r={radius}
			fill="none"
			stroke="rgba(255, 255, 255, 0.1)"
			stroke-width={strokeWidth}
		/>

		<!-- Progress circle -->
		<circle
			cx={center}
			cy={center}
			r={radius}
			fill="none"
			stroke={color}
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			class="progress-circle"
			transform="rotate(-90 {center} {center})"
		/>
	</svg>

	<!-- Center text -->
	<div class="ring-center">
		<span class="ring-count">{completed}/{total}</span>
	</div>
</div>

<style>
	.progress-ring {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.ring-svg {
		position: absolute;
		inset: 0;
	}

	.progress-circle {
		transition:
			stroke-dashoffset 0.5s ease,
			stroke 0.3s ease;
	}

	.ring-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	.ring-count {
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
	}
</style>
