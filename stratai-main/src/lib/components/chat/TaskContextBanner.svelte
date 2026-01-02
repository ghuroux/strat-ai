<!--
	TaskContextBanner.svelte

	Sticky banner shown at the top of a conversation when it's linked to a task.
	Provides awareness and a path to Task Focus mode.
-->
<script lang="ts">
	interface Props {
		taskId: string;
		taskTitle: string;
		taskColor?: string;
		onOpenTaskFocus: () => void;
	}

	let { taskId, taskTitle, taskColor = '#3b82f6', onOpenTaskFocus }: Props = $props();
</script>

<div class="task-banner" style="--task-color: {taskColor}">
	<div class="banner-content">
		<div class="task-info">
			<svg class="task-icon" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clip-rule="evenodd" />
			</svg>
			<span class="label">Part of task:</span>
			<span class="task-title">{taskTitle}</span>
		</div>
		<button
			type="button"
			class="focus-button"
			onclick={onOpenTaskFocus}
		>
			Open Task Focus
			<svg class="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
		</button>
	</div>
</div>

<style>
	.task-banner {
		padding: 0.625rem 2rem;
		background: color-mix(in srgb, var(--task-color) 10%, rgba(10, 10, 15, 0.95));
		border-bottom: 1px solid color-mix(in srgb, var(--task-color) 25%, transparent);
	}

	.banner-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
	}

	.task-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.task-icon {
		width: 1rem;
		height: 1rem;
		color: var(--task-color);
		flex-shrink: 0;
	}

	.label {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.task-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--task-color);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.focus-button {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--task-color);
		background: color-mix(in srgb, var(--task-color) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--task-color) 30%, transparent);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.focus-button:hover {
		background: color-mix(in srgb, var(--task-color) 25%, transparent);
		border-color: color-mix(in srgb, var(--task-color) 50%, transparent);
	}

	.arrow-icon {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.task-banner {
			padding: 0.5rem 1rem;
		}

		.label {
			display: none;
		}
	}
</style>
