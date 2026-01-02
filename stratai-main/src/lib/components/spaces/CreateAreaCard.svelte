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
		<svg viewBox="0 0 20 20" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
				clip-rule="evenodd"
			/>
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
		background: transparent;
		border: 2px dashed rgba(255, 255, 255, 0.15);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center;
		min-height: 120px;
	}

	.create-card:hover {
		background: rgba(255, 255, 255, 0.03);
		border-color: color-mix(in srgb, var(--card-color) 50%, transparent);
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
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.4);
		transition: all 0.2s ease;
	}

	.create-card:hover .card-icon {
		background: color-mix(in srgb, var(--card-color) 15%, transparent);
		color: var(--card-color);
	}

	.card-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.card-text {
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		transition: color 0.2s ease;
	}

	.create-card:hover .card-text {
		color: rgba(255, 255, 255, 0.9);
	}

	.card-hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
		margin: 0;
		max-width: 140px;
		line-height: 1.4;
	}
</style>
