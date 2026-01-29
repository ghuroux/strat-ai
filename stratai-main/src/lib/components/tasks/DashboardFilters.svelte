<!--
	DashboardFilters.svelte

	Filter bar for Global Tasks Dashboard.
	Space dropdown + status toggle chips + view toggle (All/Tasks/Calendar).
-->
<script lang="ts">
	import type { Space } from '$lib/types/spaces';
	import type { DashboardView } from '$lib/types/calendar';

	interface Props {
		spaces: Space[];
		activeSpaceSlug: string | null;
		activeStatus: string | null;
		onSpaceChange: (slug: string | null) => void;
		onStatusChange: (status: string | null) => void;
		// Calendar view toggle (optional — backward-compatible)
		activeView?: DashboardView;
		calendarConnected?: boolean;
		onViewChange?: (view: DashboardView) => void;
	}

	let {
		spaces,
		activeSpaceSlug,
		activeStatus,
		onSpaceChange,
		onStatusChange,
		activeView = 'all',
		calendarConnected = false,
		onViewChange
	}: Props = $props();

	function handleSpaceSelect(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		onSpaceChange(value || null);
	}

	function handleViewClick(view: DashboardView) {
		onViewChange?.(view);
	}
</script>

<div class="filter-bar">
	<!-- Space dropdown -->
	<div class="filter-group">
		<select
			class="space-select"
			value={activeSpaceSlug ?? ''}
			onchange={handleSpaceSelect}
		>
			<option value="">All spaces</option>
			{#each spaces as space (space.id)}
				<option value={space.slug}>{space.name}</option>
			{/each}
		</select>
	</div>

	<!-- Status chips -->
	<div class="status-chips">
		<button
			type="button"
			class="status-chip"
			class:active={activeStatus === null || activeStatus === 'active'}
			onclick={() => onStatusChange(activeStatus === 'active' ? null : 'active')}
		>
			Active
		</button>
		<button
			type="button"
			class="status-chip"
			class:active={activeStatus === 'planning'}
			onclick={() => onStatusChange(activeStatus === 'planning' ? null : 'planning')}
		>
			Planning
		</button>
		<button
			type="button"
			class="status-chip"
			class:active={activeStatus === 'all'}
			onclick={() => onStatusChange(activeStatus === 'all' ? null : 'all')}
		>
			All
		</button>
	</div>

	<!-- View toggle (only when calendar is connected) -->
	{#if calendarConnected && onViewChange}
		<div class="view-separator"></div>
		<div class="status-chips">
			<button
				type="button"
				class="status-chip view-chip"
				class:active={activeView === 'all'}
				onclick={() => handleViewClick('all')}
			>
				All
			</button>
			<button
				type="button"
				class="status-chip view-chip"
				class:active={activeView === 'tasks'}
				onclick={() => handleViewClick('tasks')}
			>
				Tasks
			</button>
			<button
				type="button"
				class="status-chip view-chip"
				class:active={activeView === 'calendar'}
				onclick={() => handleViewClick('calendar')}
			>
				Calendar
			</button>
		</div>
	{/if}
</div>

<style>
	.filter-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
		flex-wrap: wrap;
	}

	.filter-group {
		display: flex;
		align-items: center;
	}

	.space-select {
		appearance: none;
		padding: 0.375rem 2rem 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
	}

	:global(.light) .space-select,
	:global([data-theme='light']) .space-select {
		color: rgba(0, 0, 0, 0.8);
		background-color: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.15);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(0,0,0,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
	}

	.space-select:hover {
		background-color: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.space-select option {
		background: #1a1a1a;
		color: rgba(255, 255, 255, 0.9);
	}

	.status-chips {
		display: flex;
		gap: 0.375rem;
	}

	.status-chip {
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	:global(.light) .status-chip,
	:global([data-theme='light']) .status-chip {
		color: rgba(0, 0, 0, 0.5);
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.status-chip:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.status-chip.active {
		color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.3);
	}

	/* View toggle separator */
	.view-separator {
		width: 1px;
		height: 1.25rem;
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.light) .view-separator,
	:global([data-theme='light']) .view-separator {
		background: rgba(0, 0, 0, 0.1);
	}

	/* View chip uses indigo accent instead of blue */
	.view-chip.active {
		color: #6366f1;
		background: rgba(99, 102, 241, 0.1);
		border-color: rgba(99, 102, 241, 0.3);
	}

	/* Responsive: stack on narrow screens */
	@media (max-width: 480px) {
		.filter-bar {
			gap: 0.5rem;
		}

		.space-select {
			width: 100%;
		}
	}
</style>
