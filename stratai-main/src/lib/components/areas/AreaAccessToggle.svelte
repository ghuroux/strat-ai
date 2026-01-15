<script lang="ts">
	/**
	 * AreaAccessToggle.svelte - Toggle between open and restricted access modes
	 *
	 * Features:
	 * - Card-style radio buttons for visual clarity
	 * - Confirmation required when restricting access
	 * - No confirmation when opening (less destructive)
	 * - Info box explaining current mode
	 */

	import { Unlock, Lock, Info } from 'lucide-svelte';
	import RestrictAccessConfirmModal from './RestrictAccessConfirmModal.svelte';

	interface Props {
		isRestricted: boolean;
		areaName: string;
		spaceName: string;
		onChange: (isRestricted: boolean) => Promise<void>;
		disabled?: boolean;
		isGeneral?: boolean;
	}

	let { isRestricted, areaName, spaceName, onChange, disabled = false, isGeneral = false }: Props = $props();

	// State
	let isChanging = $state(false);
	let showConfirm = $state(false);
	let pendingValue = $state<boolean | null>(null);

	// Handle option click
	function handleOptionClick(newValue: boolean) {
		if (newValue === isRestricted || disabled) return;

		// Restricting requires confirmation
		if (newValue === true) {
			pendingValue = newValue;
			showConfirm = true;
		} else {
			// Opening doesn't require confirmation (less destructive)
			applyChange(newValue);
		}
	}

	// Confirm restriction
	async function handleConfirmRestrict() {
		if (pendingValue === null) return;
		await applyChange(pendingValue);
		showConfirm = false;
		pendingValue = null;
	}

	// Apply access mode change
	async function applyChange(newValue: boolean) {
		isChanging = true;

		try {
			await onChange(newValue);
			// Success toast handled by parent
		} catch (e) {
			console.error('Access control change error:', e);
			// Error handled by parent
		} finally {
			isChanging = false;
		}
	}
</script>

{#if isGeneral}
	<!-- General Area Info Message -->
	<div class="general-area-info">
		<Info size={18} class="info-icon" />
		<div class="info-content">
			<p class="info-title">Always Open</p>
			<p class="info-description">
				The General area is always accessible to all space members.
			</p>
		</div>
	</div>
{:else}
	<div class="access-toggle">
		<!-- Open Option -->
		<button
			type="button"
			class="access-option"
			class:selected={!isRestricted}
			onclick={() => handleOptionClick(false)}
			disabled={disabled || isChanging}
			role="radio"
			aria-checked={!isRestricted}
		>
			<div class="option-radio">
				{#if !isRestricted}
					<div class="radio-dot"></div>
				{/if}
			</div>
			<div class="option-content">
				<div class="option-header">
					<Unlock size={18} class="option-icon" />
					<span class="option-title">Open to Space</span>
				</div>
				<p class="option-description">
					Anyone with access to {spaceName} can view and participate
				</p>
			</div>
		</button>

		<!-- Restricted Option -->
		<button
			type="button"
			class="access-option"
			class:selected={isRestricted}
			onclick={() => handleOptionClick(true)}
			disabled={disabled || isChanging}
			role="radio"
			aria-checked={isRestricted}
		>
			<div class="option-radio">
				{#if isRestricted}
					<div class="radio-dot"></div>
				{/if}
			</div>
			<div class="option-content">
				<div class="option-header">
					<Lock size={18} class="option-icon" />
					<span class="option-title">Restricted</span>
				</div>
				<p class="option-description">
					Only invited members have access. Requires explicit invites.
				</p>
			</div>
		</button>
	</div>

	<!-- Info Box -->
	<div class="access-info">
		<Info size={16} class="info-icon" />
		<p class="info-text">
			{#if isRestricted}
				This area is private. Only invited members can access it.
			{:else}
				All space members can access this area by default.
			{/if}
		</p>
	</div>
{/if}

<!-- Restriction Confirmation Modal -->
<RestrictAccessConfirmModal
	open={showConfirm}
	{areaName}
	onClose={() => {
		showConfirm = false;
		pendingValue = null;
	}}
	onConfirm={handleConfirmRestrict}
/>

<style>
	/* General Area Info */
	.general-area-info {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: 0.5rem;
	}

	.general-area-info :global(.info-icon) {
		color: #22c55e;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.info-content {
		flex: 1;
	}

	.info-title {
		font-weight: 600;
		color: #22c55e;
		margin: 0 0 0.25rem 0;
	}

	.info-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.4;
		margin: 0;
	}

	/* Light mode - General Area */
	:global(html.light) .general-area-info {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(22, 163, 74, 0.3);
	}

	:global(html.light) .general-area-info :global(.info-icon) {
		color: #16a34a;
	}

	:global(html.light) .info-title {
		color: #16a34a;
	}

	:global(html.light) .info-description {
		color: rgba(0, 0, 0, 0.7);
	}

	.access-toggle {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.access-option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
	}

	.access-option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.access-option.selected {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.4);
	}

	.access-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.option-radio {
		width: 1.125rem;
		height: 1.125rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 0.125rem;
		transition: border-color 0.15s ease;
	}

	.access-option.selected .option-radio {
		border-color: #3b82f6;
	}

	.radio-dot {
		width: 0.5rem;
		height: 0.5rem;
		background: #3b82f6;
		border-radius: 50%;
	}

	.option-content {
		flex: 1;
		min-width: 0;
	}

	.option-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.option-header :global(.option-icon) {
		color: rgba(255, 255, 255, 0.6);
		flex-shrink: 0;
	}

	.access-option.selected .option-header :global(.option-icon) {
		color: #3b82f6;
	}

	.option-title {
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
	}

	.option-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.4;
		margin: 0;
	}

	/* Info Box */
	.access-info {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.15);
		border-radius: 0.5rem;
		margin-top: 0.5rem;
	}

	.access-info :global(.info-icon) {
		color: #3b82f6;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.info-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.5;
		margin: 0;
	}

	/* Light mode */
	:global(html.light) .access-option {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(html.light) .access-option:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.15);
	}

	:global(html.light) .access-option.selected {
		background: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.4);
	}

	:global(html.light) .option-radio {
		border-color: rgba(0, 0, 0, 0.3);
	}

	:global(html.light) .access-option.selected .option-radio {
		border-color: #2563eb;
	}

	:global(html.light) .radio-dot {
		background: #2563eb;
	}

	:global(html.light) .option-header :global(.option-icon) {
		color: rgba(0, 0, 0, 0.6);
	}

	:global(html.light) .access-option.selected .option-header :global(.option-icon) {
		color: #2563eb;
	}

	:global(html.light) .option-title {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .option-description {
		color: rgba(0, 0, 0, 0.6);
	}

	:global(html.light) .access-info {
		background: rgba(59, 130, 246, 0.05);
		border-color: rgba(59, 130, 246, 0.15);
	}

	:global(html.light) .access-info :global(.info-icon) {
		color: #2563eb;
	}

	:global(html.light) .info-text {
		color: rgba(0, 0, 0, 0.7);
	}
</style>
