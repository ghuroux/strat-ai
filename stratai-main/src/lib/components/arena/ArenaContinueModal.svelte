<script lang="ts">
	/**
	 * ArenaContinueModal - Continue battle conversation in a Space/Area
	 *
	 * Shows after user votes, allowing them to continue the conversation
	 * with the winning model in their workspace.
	 */
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import type { Area } from '$lib/types/areas';
	import { fly, fade } from 'svelte/transition';
	import { MessageSquare, FolderOpen, Lock, X, ChevronDown, ArrowRight, Check } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		winnerModelId: string;
		winnerModelName: string;
		winnerProvider?: string;
		battleContextSpaceId?: string;
		battleContextAreaId?: string;
		onConfirm: (spaceId: string | null, areaId: string | null) => void;
		onClose: () => void;
	}

	let {
		isOpen,
		winnerModelId,
		winnerModelName,
		winnerProvider = 'AI',
		battleContextSpaceId,
		battleContextAreaId,
		onConfirm,
		onClose
	}: Props = $props();

	// Destination type: 'main' for Main Chat, 'space' for Space/Area
	type DestinationType = 'main' | 'space';
	let destinationType = $state<DestinationType>(battleContextSpaceId ? 'space' : 'main');

	// Pre-fill from battle context if available
	let selectedSpaceId = $state<string | null>(battleContextSpaceId || null);
	let selectedAreaId = $state<string | null>(battleContextAreaId || null);

	// Sync with battle context when modal opens
	$effect(() => {
		if (isOpen) {
			if (battleContextSpaceId) {
				destinationType = 'space';
				selectedSpaceId = battleContextSpaceId;
				selectedAreaId = battleContextAreaId || null;
			} else {
				destinationType = 'main';
				selectedSpaceId = null;
				selectedAreaId = null;
			}
		}
	});

	// Load areas when space is selected (handles both initial load and user changes)
	$effect(() => {
		if (selectedSpaceId && isOpen) {
			areaStore.loadAreas(selectedSpaceId);
		}
	});

	// Get spaces from store
	let spaces = $derived([...spacesStore.getSystemSpaces(), ...spacesStore.getCustomSpaces()]);

	// Get areas for selected space
	let areas = $derived.by((): Area[] => {
		if (!selectedSpaceId) return [];
		return areaStore.getAreasForSpace(selectedSpaceId);
	});

	// Get provider color for badge
	function getProviderColor(provider: string): string {
		switch (provider.toLowerCase()) {
			case 'anthropic':
				return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
			case 'openai':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			case 'google':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			case 'meta':
				return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
			case 'deepseek':
				return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
			default:
				return 'bg-surface-600/50 text-surface-400 border-surface-500/30';
		}
	}

	function handleDestinationChange(type: DestinationType) {
		destinationType = type;
		if (type === 'main') {
			selectedSpaceId = null;
			selectedAreaId = null;
		}
	}

	function handleSpaceChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const spaceId = target.value || null;
		selectedSpaceId = spaceId;
		selectedAreaId = null; // Clear area when space changes

		// Load areas for the selected space
		if (spaceId) {
			areaStore.loadAreas(spaceId);
		}
	}

	function handleAreaChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedAreaId = target.value || null;
	}

	function handleConfirm() {
		if (destinationType === 'main') {
			onConfirm(null, null);
		} else {
			onConfirm(selectedSpaceId, selectedAreaId);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<button
		type="button"
		class="backdrop"
		onclick={onClose}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
		aria-label="Close modal"
	></button>

	<!-- Modal -->
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<div class="modal-header">
			<h2 id="modal-title" class="modal-title">Continue Conversation</h2>
			<button type="button" class="close-btn" onclick={onClose} aria-label="Close">
				<X class="w-5 h-5" />
			</button>
		</div>

		<div class="modal-body">
			<!-- Locked model badge -->
			<div class="model-badge">
				<div class="flex items-center gap-2">
					<Lock class="w-4 h-4 text-surface-400" />
					<span class="text-sm text-surface-400">Locked to</span>
				</div>
				<div class="flex items-center gap-2 mt-1">
					<span class="px-2 py-0.5 rounded text-xs font-medium border {getProviderColor(winnerProvider)}">
						{winnerProvider}
					</span>
					<span class="font-semibold text-surface-100">{winnerModelName}</span>
				</div>
			</div>

			<!-- Destination options -->
			<div class="destination-label">Where to continue?</div>

			<div class="destination-options">
				<!-- Main Chat option -->
				<button
					type="button"
					class="destination-option {destinationType === 'main' ? 'selected' : ''}"
					onclick={() => handleDestinationChange('main')}
				>
					<div class="option-icon">
						<MessageSquare class="w-5 h-5" />
					</div>
					<div class="option-content">
						<div class="option-title">Main Chat</div>
						<div class="option-desc">Quick conversation without context</div>
					</div>
					{#if destinationType === 'main'}
						<div class="option-check">
							<Check class="w-5 h-5" />
						</div>
					{/if}
				</button>

				<!-- Space/Area option -->
				<button
					type="button"
					class="destination-option {destinationType === 'space' ? 'selected' : ''}"
					onclick={() => handleDestinationChange('space')}
				>
					<div class="option-icon">
						<FolderOpen class="w-5 h-5" />
					</div>
					<div class="option-content">
						<div class="option-title">Space / Area</div>
						<div class="option-desc">Continue with workspace context</div>
					</div>
					{#if destinationType === 'space'}
						<div class="option-check">
							<Check class="w-5 h-5" />
						</div>
					{/if}
				</button>
			</div>

			<!-- Space/Area selectors (shown when space destination selected) -->
			{#if destinationType === 'space'}
				<div class="fields">
					<!-- Space selector -->
					<div class="field">
						<label class="field-label" for="space-select">Space</label>
						<div class="select-wrapper">
							<select
								id="space-select"
								class="select"
								value={selectedSpaceId || ''}
								onchange={handleSpaceChange}
							>
								<option value="">Select a space...</option>
								{#each spaces as space}
									<option value={space.id}>{space.name}</option>
								{/each}
							</select>
							<ChevronDown class="select-arrow" />
						</div>
					</div>

					<!-- Area selector -->
					{#if selectedSpaceId}
						<div class="field">
							<label class="field-label" for="area-select">Area (optional)</label>
							<div class="select-wrapper">
								<select
									id="area-select"
									class="select"
									value={selectedAreaId || ''}
									onchange={handleAreaChange}
									disabled={areas.length === 0}
								>
									<option value="">No specific area</option>
									{#each areas as area}
										<option value={area.id}>{area.icon || ''} {area.name}</option>
									{/each}
								</select>
								<ChevronDown class="select-arrow" />
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button type="button" class="btn-cancel" onclick={onClose}>
				Cancel
			</button>
			<button
				type="button"
				class="btn-continue"
				onclick={handleConfirm}
				disabled={destinationType === 'space' && !selectedSpaceId}
			>
				Continue
				<ArrowRight class="w-4 h-4" />
			</button>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		border: none;
		cursor: default;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 101;
		width: 90%;
		max-width: 440px;
		background: #1a1a1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.modal-title {
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.modal-body {
		padding: 1.25rem;
	}

	/* Locked model badge */
	.model-badge {
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		margin-bottom: 1.25rem;
	}

	/* Destination section */
	.destination-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.destination-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.destination-option {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		width: 100%;
	}

	.destination-option:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.destination-option.selected {
		background: rgba(99, 102, 241, 0.1);
		border-color: rgba(99, 102, 241, 0.4);
	}

	.option-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.625rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.destination-option.selected .option-icon {
		background: rgba(99, 102, 241, 0.2);
		color: #818cf8;
	}

	.option-content {
		flex: 1;
	}

	.option-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #fff;
	}

	.option-desc {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 0.125rem;
	}

	.option-check {
		color: #818cf8;
	}

	/* Space/Area selectors */
	.fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-top: 0.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.select-wrapper {
		position: relative;
	}

	.select {
		width: 100%;
		padding: 0.625rem 2.5rem 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		cursor: pointer;
		appearance: none;
		transition: all 0.15s ease;
	}

	.select:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.08);
	}

	.select:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.3);
	}

	.select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.select option {
		background: #1e1e1e;
		color: #fff;
	}

	:global(.select-arrow) {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
		pointer-events: none;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.btn-cancel {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel:hover {
		color: rgba(255, 255, 255, 0.9);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.btn-continue {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #fff;
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-continue:hover:not(:disabled) {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.btn-continue:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
