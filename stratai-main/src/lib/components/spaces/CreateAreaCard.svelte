<script lang="ts">
	/**
	 * CreateAreaCard - Dashed card for creating new areas
	 *
	 * Inviting design that encourages area creation
	 * Matches the visual style of AreaCard but with dashed border
	 */

	interface Props {
		spaceColor?: string;
		onclick: () => void;
	}

	let { spaceColor = '#3b82f6', onclick }: Props = $props();
</script>

<button type="button" class="create-card" style="--card-color: {spaceColor}" onclick={onclick}>
	<div class="card-icon">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
		</svg>
	</div>
	<span class="card-text">Create Area</span>
	<p class="card-hint">Organize chats by topic or project</p>
</button>

<style>
	.create-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1.5rem;
		background: color-mix(in srgb, var(--card-color) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--card-color) 25%, transparent);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center;
		min-height: 120px;
	}

	.create-card:hover {
		background: color-mix(in srgb, var(--card-color) 12%, transparent);
		border-color: color-mix(in srgb, var(--card-color) 40%, transparent);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.3);
	}

	.create-card:focus-visible {
		outline: 2px solid var(--card-color);
		outline-offset: 2px;
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
		transition: all 0.2s ease;
	}

	.create-card:hover .card-icon {
		background: color-mix(in srgb, var(--card-color) 25%, transparent);
	}

	.card-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.card-text {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--card-color);
		transition: color 0.2s ease;
	}

	.create-card:hover .card-text {
		color: var(--card-color);
	}

	.card-hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
		max-width: 140px;
		line-height: 1.4;
	}
</style>
