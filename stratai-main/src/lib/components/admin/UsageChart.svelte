<script lang="ts">
	/**
	 * UsageChart - SVG-based chart component for usage visualization
	 *
	 * Supports horizontal bar charts for model breakdown and line charts for daily trends.
	 * Pure SVG implementation with Tailwind styling.
	 */

	type ChartType = 'bar' | 'line';

	interface DataPoint {
		label: string;
		value: number;
		color?: string;
	}

	interface Props {
		type?: ChartType;
		data: DataPoint[];
		height?: number;
		showLabels?: boolean;
		formatValue?: (value: number) => string;
	}

	let {
		type = 'bar',
		data,
		height = 200,
		showLabels = true,
		formatValue = (v: number) => v.toLocaleString()
	}: Props = $props();

	// Colors for different bars (if no color specified)
	const defaultColors = [
		'#3b82f6', // blue-500
		'#8b5cf6', // violet-500
		'#ec4899', // pink-500
		'#14b8a6', // teal-500
		'#f59e0b', // amber-500
		'#ef4444', // red-500
		'#22c55e', // green-500
		'#6366f1' // indigo-500
	];

	// Get color for a data point
	function getColor(index: number, color?: string): string {
		return color || defaultColors[index % defaultColors.length];
	}

	// Calculate max value for scaling
	const maxValue = $derived(Math.max(...data.map((d) => d.value), 1));

	// Line chart dimensions (for SVG viewBox)
	const lineWidth = 100;
	const linePadding = { top: 10, right: 10, bottom: showLabels ? 30 : 10, left: 10 };
	const lineChartWidth = lineWidth - linePadding.left - linePadding.right;
	const lineChartHeight = height - linePadding.top - linePadding.bottom;

	// Calculate Y position from value (inverted because SVG Y is top-down)
	function yPos(value: number): number {
		return lineChartHeight - (value / maxValue) * lineChartHeight;
	}

	// Generate line path for line chart
	const linePath = $derived.by(() => {
		if (data.length === 0) return '';

		const points = data.map((d, i) => {
			const x = linePadding.left + (i / Math.max(data.length - 1, 1)) * lineChartWidth;
			const y = linePadding.top + yPos(d.value);
			return `${x},${y}`;
		});

		return `M ${points.join(' L ')}`;
	});

	// Generate area path (for filled line chart)
	const areaPath = $derived.by(() => {
		if (data.length === 0) return '';

		const points = data.map((d, i) => {
			const x = linePadding.left + (i / Math.max(data.length - 1, 1)) * lineChartWidth;
			const y = linePadding.top + yPos(d.value);
			return { x, y };
		});

		const bottomY = linePadding.top + lineChartHeight;
		const startX = points[0]?.x || linePadding.left;
		const endX = points[points.length - 1]?.x || linePadding.left + lineChartWidth;

		return `
			M ${startX},${bottomY}
			L ${points.map((p) => `${p.x},${p.y}`).join(' L ')}
			L ${endX},${bottomY}
			Z
		`;
	});

	// Format large numbers compactly
	function formatCompact(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toLocaleString();
	}
</script>

<div class="usage-chart w-full">
	{#if data.length === 0}
		<div class="flex items-center justify-center text-surface-500 text-sm" style="height: {height}px">
			No data available
		</div>
	{:else if type === 'bar'}
		<!-- Horizontal bar chart - better for reading labels -->
		<div class="space-y-2" style="min-height: {height}px">
			{#each data as item, i}
				{@const barWidth = (item.value / maxValue) * 100}
				<div class="flex items-center gap-3 group">
					<!-- Label -->
					<div class="w-28 text-xs text-surface-400 truncate shrink-0" title={item.label}>
						{item.label}
					</div>
					<!-- Bar container -->
					<div class="flex-1 h-5 bg-surface-700/30 rounded overflow-hidden relative">
						<div
							class="h-full rounded transition-all duration-300"
							style="width: {barWidth}%; background-color: {getColor(i, item.color)}"
						></div>
						<!-- Value on hover or always if there's space -->
						<span
							class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							{formatCompact(item.value)}
						</span>
					</div>
					<!-- Value -->
					<div class="w-14 text-xs text-surface-400 text-right shrink-0">
						{formatCompact(item.value)}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Line chart -->
		<svg viewBox="0 0 {lineWidth} {height}" class="w-full" style="height: {height}px" preserveAspectRatio="xMidYMid meet">
			<!-- Grid lines -->
			{#each [0, 0.25, 0.5, 0.75, 1] as ratio}
				<line
					x1={linePadding.left}
					y1={linePadding.top + lineChartHeight * (1 - ratio)}
					x2={linePadding.left + lineChartWidth}
					y2={linePadding.top + lineChartHeight * (1 - ratio)}
					stroke="currentColor"
					stroke-opacity="0.1"
				/>
			{/each}

			<!-- Filled area under line -->
			<path d={areaPath} fill="url(#areaGradient)" />

			<!-- Gradient definition -->
			<defs>
				<linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
					<stop offset="100%" stop-color="#3b82f6" stop-opacity="0.05" />
				</linearGradient>
			</defs>

			<!-- Line -->
			<path d={linePath} fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

			<!-- Data points -->
			{#each data as item, i}
				{@const x = linePadding.left + (i / Math.max(data.length - 1, 1)) * lineChartWidth}
				{@const y = linePadding.top + yPos(item.value)}

				<circle cx={x} cy={y} r="3" fill="#3b82f6" class="transition-all duration-300">
					<title>{item.label}: {formatValue(item.value)}</title>
				</circle>
			{/each}

			<!-- X-axis labels (show every few based on data count) -->
			{#if showLabels}
				{@const labelInterval = Math.max(1, Math.floor(data.length / 7))}
				{#each data as item, i}
					{#if i % labelInterval === 0 || i === data.length - 1}
						{@const x = linePadding.left + (i / Math.max(data.length - 1, 1)) * lineChartWidth}
						<text x={x} y={linePadding.top + lineChartHeight + 12} text-anchor="middle" class="fill-current text-surface-500" font-size="7">
							{item.label}
						</text>
					{/if}
				{/each}
			{/if}
		</svg>
	{/if}
</div>
